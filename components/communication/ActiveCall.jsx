"use client";



import { useCallback, useContext, useEffect, useRef, useState } from "react";

import Image from "next/image";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

import { MyContext } from "@/components/myContext/MyContext";

import { getZIM } from "@/lib/zim";
import { stopCallRingtone } from "@/lib/callRingtones";
import styles from "./ActiveCall.module.css";

import {

  loginZegoRoom,

  startPublishing,

  startVideoOnlyPublishing,

  stopVideoOnlyPublishing,

  playRemoteStream,

  stopPublishing,

  stopRemoteStream,

  logoutZegoRoom,

  getZegoEngine,

  getLocalStream,

  getNativeMediaStream,

  getLocalStreamId,

  enableRemotePlayback,

  setMicrophoneEnabled,

} from "@/lib/zegoRTC";



// ZEGO engine/room are module singletons. Only one ActiveCall effect may control them.

let activeCallEffectOwner = null;



function makeStreamId(userId, kind) {

  const safeUserId = String(userId || "user").replace(

    /[^a-zA-Z0-9_-]/g,

    "_"

  );



  return `${safeUserId}_${kind}_${Date.now()}_${Math.random()

    .toString(36)

    .slice(2, 7)}`;

}



async function readResponseBody(response) {

  const raw = await response.text();



  if (!raw) return null;



  try {

    return JSON.parse(raw);

  } catch {

    return raw.trim();

  }

}



async function requestCallToken({ activeCall, userId, roomId }) {

  const suppliedToken = activeCall?.zegoToken || activeCall?.rtcToken;



  if (suppliedToken) return String(suppliedToken);



  const response = await fetch("/api/zim/token", {

    method: "POST",

    headers: { "Content-Type": "application/json" },

    cache: "no-store",

    body: JSON.stringify({

      userId,

      userID: userId,

      roomId,

      roomID: roomId,

    }),

  });



  const body = await readResponseBody(response);



  if (!response.ok) {

    const message =

      body && typeof body === "object"

        ? body.error || body.message

        : typeof body === "string"

          ? body

          : "";



    throw new Error(

      message || `Could not get the call token (HTTP ${response.status}).`

    );

  }



  const token =

    typeof body === "string"

      ? body.replace(/^"|"$/g, "")

      : body?.token ||

        body?.zegoToken ||

        body?.rtcToken ||

        body?.data?.token ||

        body?.data?.zegoToken ||

        body?.result?.token ||

        body?.accessToken;



  if (!token) {

    throw new Error(

      'The /api/zim/token endpoint did not return a token. It must return { token: "..." } or activeCall must provide zegoToken.'

    );

  }



  return String(token);

}



export default function ActiveCall() {

  const { activeCall, clearActiveCall, callState, clearCallState } =

    useContext(MyContext);

  const [localProfilePhoto, setLocalProfilePhoto] = useState("/default.png");

  useEffect(() => {
    const setphoto=async()=>{
      try {
      const storedPhoto = await localStorage.getItem("profile_photo");
      if (storedPhoto) await setLocalProfilePhoto(storedPhoto);
    } catch (photoError) {
      console.log("Could not read the local profile photo:", photoError);
    }
      
    }
    setphoto();

  }, []);




  const remoteVideoRef = useRef(null);

  const localVideoRef = useRef(null);
  // The preview <video> is conditional, so keep the camera MediaStream even
  // while the video element is not mounted yet.
  const localVideoStreamRef = useRef(null);



  const remoteStreamIdsRef = useRef(new Set());

  const localStreamIdsRef = useRef(new Set());

  const remoteVideoStateRef = useRef(new Map());
  const remoteVideoWatchersRef = useRef(new Map());

  const videoStreamIdRef = useRef(null);

  const endingCallRef = useRef(false);

  const endCallStartedRef = useRef(false);



  // A stale effect cleanup must never stop a newer call using the singleton ZEGO engine.

  const callGenerationRef = useRef(0);

  const ownerTokenRef = useRef(null);



  const [status, setStatus] = useState("connecting");

  const [error, setError] = useState("");

  const [muted, setMuted] = useState(false);



  const [cameraOff, setCameraOff] = useState(

    activeCall?.callType !== "video"

  );



  const [remoteHasVideo, setRemoteHasVideo] = useState(false);

  const [remotePlaybackBlocked, setRemotePlaybackBlocked] = useState(false);

  const [remoteStreamReady, setRemoteStreamReady] = useState(false);

  const [videoBusy, setVideoBusy] = useState(false);

  const [duplicateInstance, setDuplicateInstance] = useState(false);



  const otherPhoto =

    activeCall?.otherPhoto ||

    activeCall?.photo ||

    activeCall?.profilePhoto ||

    activeCall?.userPhoto ||

    "/default.png";



  const contactName = activeCall?.userName || activeCall?.name || "User";



  const initialCallType =

    activeCall?.callType === "video" ? "video" : "audio";



  // Depend on call fields, not the activeCall object identity.

  const activeCallRoomId = String(activeCall?.roomId || "");



  const activeCallSessionRef = useRef({ userName: "", token: "" });



  // Keep mutable session data in an effect, never during render.

  useEffect(() => {

    activeCallSessionRef.current = {

      userName: String(activeCall?.userName || activeCall?.name || ""),

      token: String(activeCall?.zegoToken || activeCall?.rtcToken || ""),

    };

  }, [

    activeCall?.userName,

    activeCall?.name,

    activeCall?.zegoToken,

    activeCall?.rtcToken,

  ]);


  // Attach the local camera stream after the conditional <video> has mounted.
  // Previously the camera code tried to set srcObject before React rendered the
  // video element, leaving the self-preview blank even though video was published.
  useEffect(() => {
    const videoElement = localVideoRef.current;
    const stream = localVideoStreamRef.current;

    if (!videoElement || !stream || cameraOff || status !== "connected") {
      return undefined;
    }

    videoElement.srcObject = stream;
    videoElement.muted = true;
    videoElement.autoplay = true;
    videoElement.playsInline = true;

    void videoElement.play().catch((previewError) => {
      console.log("Local camera preview autoplay was blocked:", previewError);
    });

    return () => {
      if (videoElement.srcObject === stream) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
    };
  }, [cameraOff, status]);


  const refreshRemoteVideoState = useCallback(() => {

    const hasAnyVideo = Array.from(

      remoteVideoStateRef.current.values()

    ).some(Boolean);



    setRemoteHasVideo(hasAnyVideo);

  }, []);



  useEffect(() => {

    if (!activeCallRoomId) return undefined;



    // The Express engine and room are shared singletons.

    // Prevent another ActiveCall instance from starting the same RTC engine.

    if (activeCallEffectOwner !== null) {

      console.log(

        "[ZEGO] Duplicate ActiveCall detected; refusing a second RTC owner."

      );



      // Defer the state update until after the effect body completes.

      const duplicateTimer = setTimeout(() => {

        setDuplicateInstance(true);

      }, 0);

      return () => clearTimeout(duplicateTimer);

    }



    const ownerToken = Symbol("ActiveCallOwner");



    ownerTokenRef.current = ownerToken;
                
    activeCallEffectOwner = ownerToken;



    let initialStateTimer = setTimeout(() => {

      initialStateTimer = null;

      setDuplicateInstance(false);

      setStatus("connecting");

      setError("");

      setMuted(false);

      setCameraOff(initialCallType !== "video");

      setRemoteHasVideo(false);

      setRemotePlaybackBlocked(false);

      setRemoteStreamReady(false);

      setVideoBusy(false);

    }, 0);



    const generation = ++callGenerationRef.current;

    const ownsCurrentCall = () =>

      callGenerationRef.current === generation;



    let cancelled = false;
      
    let streamUpdateHandler = null;

    let publisherStateHandler = null;

    let playerStateHandler = null;

    let roomStateHandler = null;

    let initializationPromise = null;



    const handledStreams = new Set();

    const roomId = activeCallRoomId;

    const callSession = activeCallSessionRef.current;



    remoteStreamIdsRef.current = new Set();

    localStreamIdsRef.current = new Set();

    remoteVideoStateRef.current = new Map();



    videoStreamIdRef.current = null;

    endingCallRef.current = false;

    endCallStartedRef.current = false;



    const handleRemoteStream = async (rawStreamId) => {

      const streamId = String(rawStreamId || "");



      if (!streamId || cancelled || endingCallRef.current) return;

      if (localStreamIdsRef.current.has(streamId)) return;



      console.log("[ZEGO] Remote stream detected:", {

        streamId,

        roomId,

        localStreamIds: [...localStreamIdsRef.current],

      });



      if (handledStreams.has(streamId)) {

        remoteStreamIdsRef.current.add(streamId);

        return;

      }



      handledStreams.add(streamId);

      remoteStreamIdsRef.current.add(streamId);

      setRemoteStreamReady(true);



      try {

        const result = await playRemoteStream({

          streamId,

          container: remoteVideoRef.current,

          onAutoplayBlocked: (blocked) => {

            if (!cancelled) {

              setRemotePlaybackBlocked(Boolean(blocked));

            }

          },

        });



        if (cancelled || !result?.stream || !result?.element) return;



        const audioTracks = result.stream.getAudioTracks?.() || [];

        const videoTracks = result.stream.getVideoTracks?.() || [];



        console.log("[ZEGO] Remote playback details:", {

          streamId,



          audioTracks: audioTracks.map((track) => ({

            label: track.label,

            enabled: track.enabled,

            muted: track.muted,

            readyState: track.readyState,

          })),



          videoTracks: videoTracks.map((track) => ({

            label: track.label,

            enabled: track.enabled,

            muted: track.muted,

            readyState: track.readyState,

          })),



          playbackBlocked: result.playbackBlocked,

          elementMuted: result.element.muted,

          elementVolume: result.element.volume,

          elementPaused: result.element.paused,

        });



        // Keep the remote-photo fallback in sync as video tracks appear/disappear.
        const videoTrackHandlers = new Map();
        const syncRemoteVideoState = () => {
          const currentVideoTracks = result.stream.getVideoTracks?.() || [];

          // A remote stream or its tracks may arrive before video frames start.
          currentVideoTracks.forEach((track) => {
            if (videoTrackHandlers.has(track)) return;

            const handlers = ["ended", "mute", "unmute"].map((eventName) => {
              const handler = () => syncRemoteVideoState();
              track.addEventListener?.(eventName, handler);
              return [eventName, handler];
            });
            videoTrackHandlers.set(track, handlers);
          });

          const hasVideo = currentVideoTracks.some(
            (track) => track.readyState === "live" && track.enabled && !track.muted
          );

          if (result.element.tagName.toLowerCase() === "video") {
            result.element.style.display = hasVideo ? "block" : "none";
          }

          remoteVideoStateRef.current.set(streamId, hasVideo);
          refreshRemoteVideoState();
        };

        // Remove any listeners left by an earlier instance of this stream.
        remoteVideoWatchersRef.current.get(streamId)?.();

        result.stream.addEventListener?.("addtrack", syncRemoteVideoState);
        result.stream.addEventListener?.("removetrack", syncRemoteVideoState);

        remoteVideoWatchersRef.current.set(streamId, () => {
          result.stream.removeEventListener?.("addtrack", syncRemoteVideoState);
          result.stream.removeEventListener?.("removetrack", syncRemoteVideoState);
          videoTrackHandlers.forEach((handlers, track) => {
            handlers.forEach(([eventName, handler]) => {
              track.removeEventListener?.(eventName, handler);
            });
          });
          videoTrackHandlers.clear();
        });

        syncRemoteVideoState();
        setRemotePlaybackBlocked(Boolean(result.playbackBlocked));

      } catch (playError) {

        console.error("[ZEGO] Could not play the remote stream:", {

          streamId,

          error: playError,

        });



        if (!cancelled) {

          setRemotePlaybackBlocked(true);



          setError(

            playError?.message ||

              "The other participant's stream could not be played. Tap the speaker button to retry."

          );

        }

      }

    };



    async function startCall() {

      const currentUserId = String(localStorage.getItem("userId") || "");



      if (!currentUserId || !roomId) {

        throw new Error("Your user ID or the call room ID is missing.");

      }



      const token = await requestCallToken({

        activeCall: { zegoToken: callSession.token },

        userId: currentUserId,

        roomId,

      });



      if (cancelled || !ownsCurrentCall() || endingCallRef.current) return;



      const engine = await getZegoEngine();



      if (cancelled || !ownsCurrentCall() || endingCallRef.current) return;



      publisherStateHandler = (streamID, state, errorCode, extendedData) => {

        console.log("[ZEGO] Publisher state:", {

          streamID,

          state,

          errorCode,

          extendedData,

        });



        if (state === "NO_PUBLISH" && Number(errorCode) !== 0 && !cancelled) {

          setError(

            `Audio publishing stopped (ZEGO ${errorCode}). Check network/RTC logs.`

          );

        }

      };



      playerStateHandler = (streamID, state, errorCode, extendedData) => {

        console.log("[ZEGO] Player state:", {

          streamID,

          state,

          errorCode,

          extendedData,

        });

      };



      roomStateHandler = (eventRoomId, state, errorCode, extendedData) => {

        console.log("[ZEGO] Room state:", {

          eventRoomId,

          state,

          errorCode,

          extendedData,

        });

      };



      engine.on("publisherStateUpdate", publisherStateHandler);

      engine.on("playerStateUpdate", playerStateHandler);

      engine.on("roomStateUpdate", roomStateHandler);



      // Register before joining so a peer publishing at the same time is not missed.

      streamUpdateHandler = (eventRoomId, updateType, streamList) => {

        console.log("[ZEGO] Room stream update:", {

          eventRoomId,

          updateType,

          streamIds: Array.isArray(streamList)

            ? streamList.map((item) => item?.streamID || item?.streamId)

            : [],

        });



        if (

          cancelled ||

          !ownsCurrentCall() ||

          activeCallEffectOwner !== ownerToken ||

          String(eventRoomId) !== roomId ||

          !Array.isArray(streamList)

        ) {

          return;

        }



        for (const item of streamList) {

          const streamId = String(item?.streamID || item?.streamId || "");



          if (!streamId) continue;

          if (localStreamIdsRef.current.has(streamId)) continue;



          if (updateType === "ADD") {

            void handleRemoteStream(streamId);

          } else if (updateType === "DELETE") {

            handledStreams.delete(streamId);
              remoteStreamIdsRef.current.delete(streamId);
              remoteVideoWatchersRef.current.get(streamId)?.();
              remoteVideoWatchersRef.current.delete(streamId);
              remoteVideoStateRef.current.delete(streamId);
              refreshRemoteVideoState();



            void stopRemoteStream(

              streamId,

              remoteVideoRef.current

            ).finally(() => {

              if (!cancelled) {

                refreshRemoteVideoState();



                setRemoteStreamReady(

                  remoteStreamIdsRef.current.size > 0

                );



                if (remoteStreamIdsRef.current.size === 0) {

                  setRemotePlaybackBlocked(false);

                }

              }

            });

          }

        }

      };



      engine.on("roomStreamUpdate", streamUpdateHandler);



      await loginZegoRoom({

        userId: currentUserId,

        userName: callSession.userName || currentUserId,

        roomId,

        token,

      });



      if (cancelled || !ownsCurrentCall() || endingCallRef.current) return;



      // Always start audio first. Audio calls do not request camera access.

      const audioStreamId = makeStreamId(currentUserId, "audio");



      localStreamIdsRef.current.add(audioStreamId);



      await startPublishing({

        audio: true,

        video: false,

        streamId: audioStreamId,

      });



      if (cancelled || !ownsCurrentCall() || endingCallRef.current) return;



      const nativeAudioStream = getNativeMediaStream(getLocalStream());



      if (!nativeAudioStream) {

        throw new Error(

          "The microphone stream was created but could not be accessed."

        );

      }



      const audioTracks = nativeAudioStream.getAudioTracks();



      console.log("[ZEGO] ActiveCall microphone verification:", {

        streamId: getLocalStreamId() || audioStreamId,



        tracks: audioTracks.map((track) => ({

          label: track.label,

          enabled: track.enabled,

          muted: track.muted,

          readyState: track.readyState,

        })),

      });



      if (

        !audioTracks.some(

          (track) => track.readyState === "live" && track.enabled

        )

      ) {

        throw new Error(

          "No enabled, live microphone track is available. Check Chrome's microphone permission and selected input device."

        );

      }



      const actualAudioStreamId = getLocalStreamId();



      if (actualAudioStreamId) {

        localStreamIdsRef.current.add(actualAudioStreamId);

      }



      // Video is a separate stream so the camera cannot replace the audio stream.

      let cameraWarning = "";



      if (initialCallType === "video") {

        const videoStreamId = makeStreamId(currentUserId, "video");



        localStreamIdsRef.current.add(videoStreamId);



        try {

          const videoStream = await startVideoOnlyPublishing({

            streamId: videoStreamId,

          });



          if (cancelled || !ownsCurrentCall() || endingCallRef.current) {

            if (ownsCurrentCall()) {

              await stopVideoOnlyPublishing(videoStreamId);

            }

            return;

          }



          videoStreamIdRef.current = videoStreamId;



          const nativeVideoStream = getNativeMediaStream(videoStream);



          if (!nativeVideoStream) {

            throw new Error("Could not access the camera media stream.");

          }

          localVideoStreamRef.current = nativeVideoStream;


          if (localVideoRef.current) {

            localVideoRef.current.srcObject = nativeVideoStream;

            localVideoRef.current.muted = true;

            localVideoRef.current.autoplay = true;

            localVideoRef.current.playsInline = true;



            await localVideoRef.current.play().catch((previewError) => {

              console.log(

                "Local camera preview autoplay was blocked:",

                previewError

              );

            });

          }

        } catch (cameraError) {

          await stopVideoOnlyPublishing(videoStreamId).catch(() => {});



          localStreamIdsRef.current.delete(videoStreamId);

          videoStreamIdRef.current = null;
          localVideoStreamRef.current = null;


          if (localVideoRef.current) {

            localVideoRef.current.pause();

            localVideoRef.current.srcObject = null;

          }



          cameraWarning =

            cameraError?.name === "NotAllowedError"

              ? "Camera permission was denied. The audio call is connected; allow camera access and tap the video button to retry."

              : `Video could not start. The audio call is connected. ${

                  cameraError?.message || "Tap the video button to retry."

                }`;

        }

      }



      if (cancelled || !ownsCurrentCall() || endingCallRef.current) return;



      const cameraStarted =

        initialCallType === "video" && Boolean(videoStreamIdRef.current);



      setCameraOff(!cameraStarted);

      setStatus("connected");

      setError(cameraWarning);



      console.log("[ZEGO] Call connected:", {

        roomId,

        currentUserId,

        callType: initialCallType,

        audioStreamId: actualAudioStreamId || audioStreamId,

        videoStreamId: videoStreamIdRef.current,

      });

    }



    initializationPromise = startCall().catch(async (startError) => {

      // A superseded or duplicate effect must never tear down the current session.

      if (

        cancelled ||

        !ownsCurrentCall() ||

        activeCallEffectOwner !== ownerToken ||

        endingCallRef.current

      ) {

        return;

      }



      console.error("[ZEGO] Could not initialize the call:", startError);



      try {

        localVideoStreamRef.current = null;
        if (localVideoRef.current) {

          localVideoRef.current.pause();

          localVideoRef.current.srcObject = null;

        }



        const videoStreamId = videoStreamIdRef.current;

        videoStreamIdRef.current = null;



        if (videoStreamId) {

          await stopVideoOnlyPublishing(videoStreamId);

        }



        await Promise.all(

          Array.from(remoteStreamIdsRef.current).map((streamId) =>

            stopRemoteStream(streamId, remoteVideoRef.current)

          )

        );



        remoteVideoWatchersRef.current.forEach((cleanup) => cleanup?.());
        remoteVideoWatchersRef.current.clear();
        remoteVideoStateRef.current.clear();
        setRemoteHasVideo(false);
        remoteStreamIdsRef.current.clear();



        await stopPublishing();

        await logoutZegoRoom();

      } catch (cleanupError) {

        console.warn(

          "Media cleanup after call initialization failure failed:",

          cleanupError

        );

      }



      if (

        cancelled ||

        !ownsCurrentCall() ||

        activeCallEffectOwner !== ownerToken ||

        endingCallRef.current

      ) {

        return;

      }



      setStatus("error");

      setError(startError?.message || "Could not initialize the call.");

    });



    return () => {

      cancelled = true;

      if (initialStateTimer !== null) {

        clearTimeout(initialStateTimer);

        initialStateTimer = null;

      }



      if (activeCallEffectOwner === ownerToken) {

        activeCallEffectOwner = null;

      }



      if (ownerTokenRef.current === ownerToken) {

        ownerTokenRef.current = null;

      }



      if (

        streamUpdateHandler ||

        publisherStateHandler ||

        playerStateHandler ||

        roomStateHandler

      ) {

        void getZegoEngine()

          .then((engine) => {

            if (streamUpdateHandler) {

              engine.off("roomStreamUpdate", streamUpdateHandler);

            }



            if (publisherStateHandler) {

              engine.off("publisherStateUpdate", publisherStateHandler);

            }



            if (playerStateHandler) {

              engine.off("playerStateUpdate", playerStateHandler);

            }



            if (roomStateHandler) {

              engine.off("roomStateUpdate", roomStateHandler);

            }

          })

          .catch((cleanupError) => {

            console.warn(

              "Could not remove the room stream listener:",

              cleanupError

            );

          });

      }



      void (async () => {

        try {

          await initializationPromise;

        } catch {

          // Initialization errors are reported above.

        }



        // React Strict Mode replays effects in development. A newer effect claims

        // the singleton owner before this awaited cleanup resumes; don't stop it.

        if (!ownsCurrentCall() || activeCallEffectOwner !== null) return;



        localVideoStreamRef.current = null;
        if (localVideoRef.current) {

          localVideoRef.current.pause();

          localVideoRef.current.srcObject = null;

        }



        const videoStreamId = videoStreamIdRef.current;

        videoStreamIdRef.current = null;



        if (videoStreamId) {

          await stopVideoOnlyPublishing(videoStreamId);

        }



        remoteVideoWatchersRef.current.forEach((cleanup) => cleanup?.());
        remoteVideoWatchersRef.current.clear();
        remoteVideoStateRef.current.clear();
        const remoteIds = Array.from(remoteStreamIdsRef.current);



        await Promise.all(

          remoteIds.map((streamId) =>

            stopRemoteStream(streamId, remoteVideoRef.current)

          )

        );



        remoteStreamIdsRef.current.clear();



        await stopPublishing();

        await logoutZegoRoom();

      })();

    };

  }, [activeCallRoomId, initialCallType, refreshRemoteVideoState]);



  // Try to unlock remote playback from one of the three main call controls.
  // This keeps the control bar to exactly three buttons while still helping
  // browsers that require a user gesture before playing remote audio.
  const handleEnableRemoteAudio = useCallback(async () => {
    const streamIds = Array.from(remoteStreamIdsRef.current);

    if (!streamIds.length) return;

    let enabledAny = false;

    for (const streamId of streamIds) {
      try {
        const enabled = await enableRemotePlayback(streamId);
        enabledAny = enabledAny || enabled;
      } catch (playbackError) {
        console.log(
          "[ZEGO] Could not unlock remote playback from a call control:",
          playbackError
        );
      }
    }

    if (enabledAny) {
      setRemotePlaybackBlocked(false);
    } else {
      setRemotePlaybackBlocked(true);
    }
  }, []);

  const handleMute = useCallback(() => {

    const nextMuted = !muted;

    const success = setMicrophoneEnabled(!nextMuted);



    if (!success) {

      setError(

        "The microphone stream is unavailable. Try ending and restarting the call."

      );

      return;

    }



    setMuted(nextMuted);

    setError("");

  }, [muted]);



  const handleVideoToggle = useCallback(async () => {

    if (status !== "connected" || videoBusy) return;



    setVideoBusy(true);

    setError("");



    try {

      if (cameraOff) {

        const currentUserId = String(localStorage.getItem("userId") || "");



        if (!currentUserId) {

          throw new Error("Your user ID is missing.");

        }



        const streamId = makeStreamId(currentUserId, "video");



        localStreamIdsRef.current.add(streamId);



        let videoStream;



        try {

          videoStream = await startVideoOnlyPublishing({ streamId });

        } catch (cameraError) {

          localStreamIdsRef.current.delete(streamId);

          throw cameraError;

        }



        videoStreamIdRef.current = streamId;



        const nativeVideoStream = getNativeMediaStream(videoStream);



        if (!nativeVideoStream) {

          throw new Error("Could not access the camera stream.");

        }

        localVideoStreamRef.current = nativeVideoStream;


        if (localVideoRef.current) {

          localVideoRef.current.srcObject = nativeVideoStream;

          localVideoRef.current.muted = true;

          localVideoRef.current.autoplay = true;

          localVideoRef.current.playsInline = true;



          await localVideoRef.current.play().catch((previewError) => {

            console.warn(

              "Local camera preview autoplay was blocked:",

              previewError

            );

          });

        }



        setCameraOff(false);

      } else {

        const streamId = videoStreamIdRef.current;

        videoStreamIdRef.current = null;
        localVideoStreamRef.current = null;



        if (localVideoRef.current) {

          localVideoRef.current.pause();

          localVideoRef.current.srcObject = null;

        }



        if (streamId) {

          await stopVideoOnlyPublishing(streamId);

          localStreamIdsRef.current.delete(streamId);

        }



        setCameraOff(true);

      }

    } catch (videoError) {

      console.error("[ZEGO] Could not switch call video:", videoError);



      if (cameraOff && videoStreamIdRef.current) {

        const failedStreamId = videoStreamIdRef.current;

        videoStreamIdRef.current = null;



        localStreamIdsRef.current.delete(failedStreamId);



        await stopVideoOnlyPublishing(failedStreamId).catch(

          (cleanupError) => {

            console.warn(

              "Could not clean up the failed camera stream:",

              cleanupError

            );

          }

        );



        localVideoStreamRef.current = null;
        if (localVideoRef.current) {

          localVideoRef.current.pause();

          localVideoRef.current.srcObject = null;

        }

      }



      setError(

        videoError?.name === "NotAllowedError"

          ? "Camera permission was denied. Allow camera access in your browser and try again."

          : videoError?.message || "Could not switch the camera on."

      );

    } finally {

      setVideoBusy(false);

    }

  }, [cameraOff, status, videoBusy]);



  const handleEndCall = useCallback(

    async ({ notifyPeer = true } = {}) => {

      if (

        !ownerTokenRef.current ||

        activeCallEffectOwner !== ownerTokenRef.current

      ) {

        console.log(

          "[ZEGO] Ignoring hangup from a non-owning ActiveCall instance."

        );

        return;

      }



      if (endCallStartedRef.current) return;



      endCallStartedRef.current = true;

      endingCallRef.current = true;



      const call = activeCall;

      // Stop ringback synchronously when the local hang-up action is pressed.
      stopCallRingtone("outgoing", call?.callID || null);



      try {

        if (notifyPeer && call) {
          const currentUserId = String(localStorage.getItem("userId") || "");
          const callID = String(
            call.callID ??
              call.callId ??
              call.callInvitationInfo?.callID ??
              call.callInvitationInfo?.callId ??
              callState?.callID ??
              callState?.callId ??
              ""
          );
          const roomId = String(
            call.roomId ?? call.roomID ?? callState?.roomId ?? callState?.roomID ?? ""
          );

          const possiblePeerIds = [
            call.callerId,
            call.callerID,
            call.receiverId,
            call.receiverID,
            call.peerId,
            call.peerID,
            call.otherUserId,
            call.toUserId,
            call.calleeId,
            call.inviteeUserID,
            call.userId,
            call.userID,
            call.callInvitationInfo?.inviter,
            call.callInvitationInfo?.callerUserID,
            call.callInvitationInfo?.inviteeUserID,
          ]
            .filter(Boolean)
            .map(String);

          const otherUserId = possiblePeerIds.find(
            (id) => id !== currentUserId
          );

          if (!otherUserId) {
            console.warn("[ZEGO] Could not determine the peer user ID for hang-up:", {
              currentUserId,
              callID,
              roomId,
              possiblePeerIds,
              call,
            });
          } else {
            const zim = await getZIM();
            const callerIdentityCandidates = [
              call.callerId,
              call.callerID,
              call.callInvitationInfo?.inviter,
              call.callInvitationInfo?.caller,
              call.callInvitationInfo?.callerUserID,
              call.callInvitationInfo?.callerUserId,
              call.callInvitationInfo?.inviterUserID,
              call.callInvitationInfo?.fromUserID,
            ]
              .filter(Boolean)
              .map(String);
            const isLocalCaller = callerIdentityCandidates.includes(currentUserId);
            const callStateID = String(callState?.callID ?? callState?.callId ?? "");
            const callStateText = String(callState?.state ?? "").toLowerCase();
            const acceptedState =
              callStateText === "accepted" || Number(callState?.userState) === 1;
            const invitationWasAccepted =
              status === "connected" ||
              (acceptedState && (!callStateID || !callID || callStateID === callID));

            // Cancel a still-pending invitation. The custom END_CALL signal below
            // is still sent so that the receiver's app can close any stale UI.
            if (
              isLocalCaller &&
              callID &&
              !invitationWasAccepted &&
              typeof zim?.callCancel === "function"
            ) {
              try {
                await zim.callCancel(
                  [otherUserId],
                  callID,
                  {
                    extendedData: JSON.stringify({
                      reason: "caller-cancelled",
                      roomId: roomId || null,
                    }),
                  }
                );
              } catch (cancelError) {
                console.warn(
                  "[ZEGO] Could not cancel pending invitation; continuing with end-call signaling:",
                  cancelError
                );
              }
            }

            // If this ZIM call was created in advanced mode, callEnd also notifies
            // the other participant through callInvitationEnded. It may reject in
            // common mode; the explicit END_CALL message remains the fallback.
            if (
              invitationWasAccepted &&
              callID &&
              typeof zim?.callEnd === "function"
            ) {
              try {
                await zim.callEnd(callID, {
                  extendedData: JSON.stringify({
                    reason: "user-ended-call",
                    roomId: roomId || null,
                  }),
                });
              } catch (callEndError) {
                console.warn(
                  "[ZEGO] ZIM callEnd was unavailable for this invitation mode; sending END_CALL message:",
                  callEndError
                );
              }
            }

            if (typeof zim?.sendMessage === "function") {
              const endMessage = {
                type: 1,
                message: JSON.stringify({
                  type: "END_CALL",
                  reason: "user-ended-call",
                  roomId: roomId || null,
                  callID: callID || null,
                  endedBy: currentUserId || null,
                  sentAt: Date.now(),
                }),
              };

              const sentResult = await zim.sendMessage(
                endMessage,
                otherUserId,
                0,
                { priority: 1 }
              );

              console.log("[ZEGO] Sent END_CALL signal to peer:", {
                otherUserId,
                callID: callID || null,
                roomId: roomId || null,
                result: sentResult,
              });
            } else {
              throw new Error("ZIM sendMessage is not available; the peer could not be notified.");
            }
          }
        }

      } catch (signalError) {

        console.warn(

          "Could not notify the other participant that the call ended:",

          signalError

        );

      }



      try {

        localVideoStreamRef.current = null;
        if (localVideoRef.current) {

          localVideoRef.current.pause();

          localVideoRef.current.srcObject = null;

        }



        const videoStreamId = videoStreamIdRef.current;

        videoStreamIdRef.current = null;



        if (videoStreamId) {

          await stopVideoOnlyPublishing(videoStreamId);

        }



        await Promise.all(

          Array.from(remoteStreamIdsRef.current).map((streamId) =>

            stopRemoteStream(streamId, remoteVideoRef.current)

          )

        );



        remoteStreamIdsRef.current.clear();



        await stopPublishing();

        await logoutZegoRoom();

      } catch (endError) {

        console.error("Call cleanup failed:", endError);

      } finally {

        callGenerationRef.current += 1;

        clearActiveCall();

        clearCallState();

      }

    },

    [activeCall, callState, clearActiveCall, clearCallState, status]

  );



  useEffect(() => {
    if (
      !ownerTokenRef.current ||
      activeCallEffectOwner !== ownerTokenRef.current
    ) {
      return;
    }

    if (!callState || !activeCall) return;

    // Prefer exact callID matching, but also accept a matching room ID.
    // Some invitation callbacks omit or normalize call IDs differently on each
    // client; rejecting every ID mismatch here can leave the peer UI stuck on.
    const stateCallID = String(callState.callID ?? callState.callId ?? "");
    const activeCallID = String(activeCall.callID ?? activeCall.callId ?? "");
    const stateRoomId = String(callState.roomId ?? callState.roomID ?? "");
    const activeRoomId = String(activeCall.roomId ?? activeCall.roomID ?? "");

    const bothCallIdsExist = Boolean(stateCallID && activeCallID);
    const callIdsMatch = bothCallIdsExist && stateCallID === activeCallID;
    const bothRoomIdsExist = Boolean(stateRoomId && activeRoomId);
    const roomIdsMatch = bothRoomIdsExist && stateRoomId === activeRoomId;

    if (bothCallIdsExist && !callIdsMatch && !roomIdsMatch) {
      return;
    }

    if (!bothCallIdsExist && bothRoomIdsExist && !roomIdsMatch) {
      return;
    }

    const stateText = String(callState.state ?? "").toLowerCase();

    const isExplicitlyEnded =
      stateText === "ended" ||
      stateText === "end" ||
      String(callState.status ?? "").toLowerCase() === "ended" ||
      Number(callState.callStatus) === 2;

    // ZEGO ZIM call-user state values: Rejected = 2, Timeout = 6.
    const isRejected =
      stateText === "rejected" ||
      stateText === "declined" ||
      Number(callState.state) === 2 ||
      Number(callState.userState) === 2;
    const isTimedOut = Number(callState.state) === 6;
    const isNotReceived = stateText === "not-received";
    const isCancelled =
      stateText === "cancelled" ||
      stateText === "canceled" ||
      Number(callState.userState) === 3;

    if (isExplicitlyEnded || isRejected || isTimedOut || isNotReceived || isCancelled) {
      console.log("[ZEGO] Closing call UI after terminal call state:", {
        callID: stateCallID || activeCallID,
        state: callState.state,
        reason: callState.reason,
      });
      void handleEndCall({ notifyPeer: false });
    }
  }, [callState, activeCall, handleEndCall]);



  if (!activeCall || duplicateInstance) return null;



  const statusText =
    status === "connecting"
      ? "Connecting…"
      : status === "error"
        ? "Call failed"
        : muted
          ? "Microphone muted"
          : initialCallType === "audio"
            ? "Audio call"
            : cameraOff
              ? "Camera off"
              : "Video call";

  const ownPhoto =
    activeCall?.ownPhoto ||
    activeCall?.myPhoto ||
    activeCall?.currentUserPhoto ||
    localProfilePhoto ||
    "/default.png";

  // In a video call, keep a self tile visible: live preview when the camera
  // is enabled, and the user's profile photo when their camera is off.
  // An audio call stays photo-focused unless the user explicitly turns video on.
  const showSelfTile = initialCallType === "video" || !cameraOff;
  const showLocalVideo = !cameraOff && status === "connected";


  return (
    <main className={styles.callScreen} data-call-type={initialCallType}>
      <section className={styles.callStage}>
        <div
          ref={remoteVideoRef}
          className={styles.remoteMedia}
          aria-label={`${contactName}'s audio and video`}
        />

        {!remoteHasVideo && (
          <div
            className={`${styles.remoteFallback} ${
              initialCallType === "audio" ? styles.audioFallback : ""
            }`}
          >
            <div className={styles.fallbackGlow} aria-hidden="true" />
            <Image
              src={otherPhoto}
              alt={`${contactName}'s profile photo`}
              width={320}
              height={320}
              sizes="(max-width: 480px) 58vw, (max-width: 900px) 42vw, 320px"
              unoptimized
              className={styles.remoteAvatar}
              onError={(event) => {
                if (!event.currentTarget.src.endsWith("/default.png")) {
                  event.currentTarget.src = "/default.png";
                }
              }}
            />
            <h2 className={styles.remoteName}>{contactName}</h2>
            <p className={styles.fallbackStatus}>
              {initialCallType === "video" && !remoteHasVideo
                ? status === "connecting"
                  ? "Connecting…"
                  : "Camera is off"
                : statusText}
            </p>
          </div>
        )}

        {showSelfTile && (
          <aside className={styles.localPreview} aria-label="Your camera preview">
            {showLocalVideo ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                aria-label="Your live camera preview"
                className={styles.localVideo}
              />
            ) : (
              <div className={styles.localFallback}>
                <Image
                  src={ownPhoto}
                  alt="Your profile photo"
                  width={240}
                  height={320}
                  sizes="(max-width: 480px) 28vw, 140px"
                  unoptimized
                  className={styles.localAvatar}
                  onError={(event) => {
                    if (!event.currentTarget.src.endsWith("/default.png")) {
                      event.currentTarget.src = "/default.png";
                    }
                  }}
                />
                <span className={styles.localFallbackText}>
                  {status === "connecting" ? "Connecting camera…" : "Camera off"}
                </span>
              </div>
            )}
            <span className={styles.localPreviewLabel}>You</span>
          </aside>
        )}

        <header className={styles.callHeader}>
          <div className={styles.headerIdentity}>
            <span className={`${styles.connectionDot} ${
              status === "connected" ? styles.connectionDotLive : ""
            }`} />
            <div className={styles.headerText}>
              <h1 className={styles.headerName}>{contactName}</h1>
              <p className={styles.callStatus}>{statusText}</p>
            </div>
          </div>
          <span className={styles.callTypeBadge}>
            {initialCallType === "video" ? "Video call" : "Audio call"}
          </span>
        </header>

        {status === "error" && (
          <div className={styles.errorBanner} role="alert">
            {error || "The call could not be connected."}
          </div>
        )}

        {status !== "error" && (!remoteStreamReady || remotePlaybackBlocked) && (
          <div className={styles.playbackNotice} role="status" aria-live="polite">
            {remotePlaybackBlocked
              ? "Tap the microphone or video control to enable audio"
              : status === "connecting"
                ? "Connecting to the other person…"
                : "Waiting for the other person…"}
          </div>
        )}
      </section>

      {error && status === "connected" && (
        <div className={styles.inlineError} role="alert">
          {error}
        </div>
      )}

      <footer className={styles.controlsBar} aria-label="Call controls">
        <button
          type="button"
          onClick={() => {
            void handleEnableRemoteAudio();
            void handleVideoToggle();
          }}
          disabled={status !== "connected" || videoBusy}
          aria-label={cameraOff ? "Turn video on" : "Turn video off"}
          aria-pressed={!cameraOff}
          title={cameraOff ? "Turn video on" : "Turn video off"}
          className={`${styles.controlButton} ${
            !cameraOff ? styles.controlButtonActive : ""
          }`}
        >
          {videoBusy ? (
            <span className={styles.loadingDots} aria-hidden="true">…</span>
          ) : cameraOff ? (
            <VideoOff size={24} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Video size={24} strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            void handleEnableRemoteAudio();
            handleMute();
          }}
          disabled={status !== "connected"}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          aria-pressed={muted}
          title={muted ? "Unmute microphone" : "Mute microphone"}
          className={`${styles.controlButton} ${
            muted ? styles.controlButtonActive : ""
          }`}
        >
          {muted ? (
            <MicOff size={24} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Mic size={24} strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => void handleEndCall()}
          aria-label="End call"
          title="End call"
          className={`${styles.controlButton} ${styles.endButton}`}
        >
          <PhoneOff size={24} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
