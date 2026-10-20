"use client";

/**
 * ZEGO Express WebRTC helpers.
 *
 * Audio is published as the main stream. Camera video is published as a
 * separate video-only stream.
 */

let ZegoExpressEngineClass = null;
let zgInstance = null;
let engineLoadPromise = null;

let currentRoomId = null;
let currentUserId = null;

let localStream = null;
let localStreamId = null;

const extraLocalStreams = new Map();
const remoteStreams = new Map();
const remoteMediaElements = new Map();

// Single-flight locks prevent duplicate React effects from joining/publishing twice.
let loginQueue = Promise.resolve();
const loginPromises = new Map();
let localPublishPromise = null;
let stopPublishingPromise = null;
const videoPublishPromises = new Map();
const remotePlayPromises = new Map();

function ensureBrowser() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("ZEGO media functions must run in the browser.");
  }
}

function getZegoConfig() {
  const appID = Number(
    process.env.NEXT_PUBLIC_ZEGO_APP_ID ||
      process.env.ZEGOCLOUD_APP_ID ||
      "0"
  );

  const server = String(
    process.env.NEXT_PUBLIC_ZEGO_SERVER ||
      process.env.ZEGOCLOUD_SERVER ||
      ""
  ).trim();

  if (!Number.isFinite(appID) || appID <= 0) {
    throw new Error("Missing ZEGO App ID. Check NEXT_PUBLIC_ZEGO_APP_ID.");
  }

  if (!server) {
    console.warn(
      "NEXT_PUBLIC_ZEGO_SERVER is not set. Using ZEGO SDK automatic server selection."
    );
  }

  return { appID, server };
}

async function loadZegoSDK() {
  ensureBrowser();

  if (ZegoExpressEngineClass) {
    return ZegoExpressEngineClass;
  }

  if (!engineLoadPromise) {
    engineLoadPromise = import("zego-express-engine-webrtc")
      .then((module) => {
        const Engine =
          module.ZegoExpressEngine ||
          module.default?.ZegoExpressEngine ||
          module.default;

        if (typeof Engine !== "function") {
          throw new Error(
            "Could not find ZegoExpressEngine in the ZEGO SDK package."
          );
        }

        ZegoExpressEngineClass = Engine;
        return Engine;
      })
      .catch((error) => {
        engineLoadPromise = null;
        throw error;
      });
  }

  return engineLoadPromise;
}

export async function getZegoEngine() {
  ensureBrowser();

  if (zgInstance) {
    return zgInstance;
  }

  const { appID, server } = getZegoConfig();
  const Engine = await loadZegoSDK();

  if (!zgInstance) {
    zgInstance = new Engine(appID, server);
  }

  return zgInstance;
}

async function loginZegoRoomInternal({
  roomId,
  userId,
  userName,
  token,
}) {
  ensureBrowser();

  const normalizedRoomId = String(roomId || "").trim();
  const normalizedUserId = String(userId || "").trim();
  const normalizedToken = String(token || "").trim();

  if (!normalizedRoomId || !normalizedUserId) {
    throw new Error("A ZEGO room ID and user ID are required.");
  }

  if (!normalizedToken) {
    throw new Error(
      'A ZEGO room token is missing. The token endpoint must return { token: "..." }.'
    );
  }

  const zg = await getZegoEngine();

  if (
    currentRoomId === normalizedRoomId &&
    currentUserId === normalizedUserId
  ) {
    return zg;
  }

  if (currentRoomId) {
    await logoutZegoRoom();
  }

  const result = await zg.loginRoom(
    normalizedRoomId,
    normalizedToken,
    {
      userID: normalizedUserId,
      userName: String(userName || "User"),
    },
    { userUpdate: true }
  );

  if (result === false) {
    throw new Error(
      "ZEGO could not join the call room. Check the room token and ZEGO project settings."
    );
  }

  currentRoomId = normalizedRoomId;
  currentUserId = normalizedUserId;

  console.log("[ZEGO] Joined room:", {
    roomId: currentRoomId,
    userId: currentUserId,
  });

  return zg;
}

export function loginZegoRoom(options) {
  const roomId = String(options?.roomId || "").trim();
  const userId = String(options?.userId || "").trim();
  const key = `${roomId}::${userId}`;

  const existing = loginPromises.get(key);
  if (existing) return existing;

  const operation = loginQueue.then(() => loginZegoRoomInternal(options));
  loginQueue = operation.catch(() => {});
  loginPromises.set(key, operation);

  const clear = () => {
    if (loginPromises.get(key) === operation) {
      loginPromises.delete(key);
    }
  };

  operation.then(clear, clear);
  return operation;
}

/**
 * Start the main audio stream.
 * Video is disabled by default so audio calls do not request camera access.
 */
async function startPublishingInternal({
  audio = true,
  video = false,
  streamId,
} = {}) {
  ensureBrowser();

  const zg = await getZegoEngine();

  if (!currentRoomId || !currentUserId) {
    throw new Error("Join a ZEGO room before publishing a stream.");
  }

  if (localStream) {
    console.warn("[ZEGO] A local stream already exists:", {
      streamId: localStreamId,
    });

    return localStream;
  }

  const nextStreamId = String(
    streamId || `${currentUserId}_audio_${Date.now()}`
  );

  let createdStream = null;

  try {
    createdStream = await zg.createStream({
      camera: {
        audio: Boolean(audio),
        video: Boolean(video),
      },
    });

    if (!createdStream) {
      throw new Error("ZEGO did not create the microphone stream.");
    }

    const audioTracks = createdStream.getAudioTracks?.() || [];
    const videoTracks = createdStream.getVideoTracks?.() || [];

    console.log("[ZEGO] Local tracks created:", {
      streamId: nextStreamId,
      roomId: currentRoomId,
      userId: currentUserId,
      audioRequested: Boolean(audio),
      videoRequested: Boolean(video),

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
    });

    if (audio && audioTracks.length === 0) {
      throw new Error(
        "The browser did not provide a microphone audio track. Check Chrome's microphone permission and selected input device."
      );
    }

    audioTracks.forEach((track) => {
      track.enabled = Boolean(audio);
    });

    videoTracks.forEach((track) => {
      track.enabled = Boolean(video);
    });

    const liveAudioTracks = audioTracks.filter(
      (track) => track.readyState === "live"
    );

    if (audio && liveAudioTracks.length === 0) {
      throw new Error(
        "The microphone track is not live. Check microphone permissions and whether another application is using the microphone."
      );
    }

    if (audio && liveAudioTracks.every((track) => !track.enabled)) {
      throw new Error("All microphone tracks are disabled.");
    }

    console.log("[ZEGO] Publishing stream:", {
      streamId: nextStreamId,
      roomId: currentRoomId,
      userId: currentUserId,
      audioTrackCount: audioTracks.length,
    });

    const publishResult = await zg.startPublishingStream(
      nextStreamId,
      createdStream
    );

    console.log("[ZEGO] Publish result:", {
      streamId: nextStreamId,
      publishResult,
      roomId: currentRoomId,
      userId: currentUserId,
    });

    if (publishResult === false) {
      throw new Error("ZEGO refused to publish the audio stream.");
    }

    localStream = createdStream;
    localStreamId = nextStreamId;

    console.log("[ZEGO] Audio stream published:", {
      streamId: localStreamId,

      audioTracks: localStream.getAudioTracks().map((track) => ({
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      })),
    });

    return localStream;
  } catch (error) {
    createdStream?.getTracks?.().forEach((track) => {
      try {
        track.stop();
      } catch (stopError) {
        console.warn("[ZEGO] Could not stop failed local track:", stopError);
      }
    });

    console.error("[ZEGO] Audio publishing failed:", {
      streamId: nextStreamId,
      roomId: currentRoomId,
      userId: currentUserId,
      error,
    });

    throw error;
  }
}

export function startPublishing(options = {}) {
  if (stopPublishingPromise) {
    return stopPublishingPromise.then(() => startPublishing(options));
  }

  if (localStream) {
    return Promise.resolve(localStream);
  }

  if (localPublishPromise) {
    console.warn(
      "[ZEGO] Duplicate audio publish request reused the in-flight stream."
    );
    return localPublishPromise;
  }

  const operation = startPublishingInternal(options).finally(() => {
    if (localPublishPromise === operation) {
      localPublishPromise = null;
    }
  });

  localPublishPromise = operation;
  return operation;
}

/**
 * Publish video separately without interrupting the existing audio stream.
 */
async function startVideoOnlyPublishingInternal({ streamId } = {}) {
  ensureBrowser();

  const zg = await getZegoEngine();

  if (!currentRoomId || !currentUserId) {
    throw new Error("Join a ZEGO room before turning on video.");
  }

  const nextStreamId = String(
    streamId || `${currentUserId}_video_${Date.now()}`
  );

  if (extraLocalStreams.has(nextStreamId)) {
    return extraLocalStreams.get(nextStreamId);
  }

  let videoStream = null;

  try {
    videoStream = await zg.createStream({
      camera: {
        audio: false,
        video: true,
      },
    });

    if (!videoStream || !videoStream.getVideoTracks?.().length) {
      throw new Error("The camera did not provide a video track.");
    }

    const publishResult = await zg.startPublishingStream(
      nextStreamId,
      videoStream
    );

    if (publishResult === false) {
      throw new Error("ZEGO refused to publish the camera stream.");
    }

    extraLocalStreams.set(nextStreamId, videoStream);

    console.log("[ZEGO] Video stream published:", {
      streamId: nextStreamId,
      roomId: currentRoomId,
      userId: currentUserId,
    });

    return videoStream;
  } catch (error) {
    videoStream?.getTracks?.().forEach((track) => track.stop());
    throw error;
  }
}

export function startVideoOnlyPublishing(options = {}) {
  if (stopPublishingPromise) {
    return stopPublishingPromise.then(() =>
      startVideoOnlyPublishing(options)
    );
  }

  const streamId = String(
    options?.streamId ||
      `${currentUserId || "user"}_video_${Date.now()}`
  );

  if (extraLocalStreams.has(streamId)) {
    return Promise.resolve(extraLocalStreams.get(streamId));
  }

  const existing = videoPublishPromises.get(streamId);
  if (existing) return existing;

  const operation = startVideoOnlyPublishingInternal({
    ...options,
    streamId,
  }).finally(() => {
    if (videoPublishPromises.get(streamId) === operation) {
      videoPublishPromises.delete(streamId);
    }
  });

  videoPublishPromises.set(streamId, operation);
  return operation;
}

export async function stopVideoOnlyPublishing(streamId) {
  const normalizedId = String(streamId || "");
  if (!normalizedId) return;

  const pendingPublish = videoPublishPromises.get(normalizedId);

  if (pendingPublish) {
    try {
      await pendingPublish;
    } catch {
      // A failed in-flight publish has already cleaned up its local tracks.
    }
  }

  const videoStream = extraLocalStreams.get(normalizedId);
  const zg = zgInstance;

  if (zg) {
    try {
      await zg.stopPublishingStream(normalizedId);
    } catch (error) {
      console.warn("Could not stop the video-only stream:", error);
    }
  }

  videoStream?.getTracks?.().forEach((track) => {
    try {
      track.stop();
    } catch (error) {
      console.warn("Could not release a camera track:", error);
    }
  });

  extraLocalStreams.delete(normalizedId);
}

export function getLocalStream() {
  return localStream;
}

export function getLocalStreamId() {
  return localStreamId;
}

export function getNativeMediaStream(stream) {
  if (!stream) {
    return null;
  }

  if (
    typeof MediaStream !== "undefined" &&
    stream instanceof MediaStream
  ) {
    return stream;
  }

  if (typeof stream.getMediaStream === "function") {
    const mediaStream = stream.getMediaStream();

    if (
      typeof MediaStream !== "undefined" &&
      mediaStream instanceof MediaStream
    ) {
      return mediaStream;
    }
  }

  const candidates = [
    stream.mediaStream,
    stream.stream,
    stream._mediaStream,
  ];

  for (const candidate of candidates) {
    if (
      typeof MediaStream !== "undefined" &&
      candidate instanceof MediaStream
    ) {
      return candidate;
    }
  }

  if (typeof stream.getTracks === "function") {
    return stream;
  }

  return null;
}

export async function playLocalStream(container) {
  ensureBrowser();

  if (!container) {
    throw new Error("Local video container is unavailable.");
  }

  if (!localStream) {
    throw new Error("The local audio stream is not available.");
  }

  let videoElement = container.querySelector("video");

  if (!videoElement) {
    videoElement = document.createElement("video");
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.muted = true;

    Object.assign(videoElement.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    });

    container.appendChild(videoElement);
  }

  videoElement.srcObject = getNativeMediaStream(localStream);

  await videoElement.play().catch((error) => {
    console.warn("Local preview autoplay was blocked:", error);
  });

  return videoElement;
}

/**
 * Play a remote ZEGO stream.
 * Returns { stream, element, playbackBlocked }.
 */
async function playRemoteStreamInternal({
  streamId,
  container,
  onAutoplayBlocked,
} = {}) {
  ensureBrowser();

  const normalizedId = String(streamId || "");

  if (!normalizedId) {
    throw new Error("A remote stream ID is required.");
  }

  if (!container) {
    throw new Error("Remote media container is unavailable.");
  }

  const zg = await getZegoEngine();
  const result = await zg.startPlayingStream(normalizedId);
  const nativeStream = getNativeMediaStream(result);

  if (!nativeStream) {
    throw new Error(
      "ZEGO started the remote player but did not return a media stream."
    );
  }

  const audioTracks = nativeStream.getAudioTracks?.() || [];
  const videoTracks = nativeStream.getVideoTracks?.() || [];

  // Track lists may be empty briefly before WebRTC fires its first track event.
  // Determine the intended stream kind from its ID so an audio element isn't
  // accidentally muted just because the audio track arrived late.
  const isVideoOnlyStream = /(?:^|_)video(?:_|$)/i.test(normalizedId);

  const hasAudio =
    !isVideoOnlyStream &&
    (audioTracks.length > 0 ||
      /(?:^|_)audio(?:_|$)/i.test(normalizedId));

  const hasVideo = videoTracks.some(
    (track) => track.readyState === "live" && track.enabled
  );

  const tagName =
    isVideoOnlyStream ||
    (videoTracks.length > 0 && audioTracks.length === 0)
      ? "video"
      : "audio";

  let mediaElement = remoteMediaElements.get(normalizedId);

  if (mediaElement && mediaElement.tagName.toLowerCase() !== tagName) {
    try {
      mediaElement.pause();
      mediaElement.srcObject = null;
      mediaElement.remove();
    } catch (error) {
      console.warn("Could not replace a remote media element:", error);
    }

    remoteMediaElements.delete(normalizedId);
    mediaElement = null;
  }

  if (!mediaElement) {
    mediaElement = document.createElement(tagName);
    mediaElement.autoplay = true;
    mediaElement.playsInline = true;
    mediaElement.controls = false;
    mediaElement.dataset.zegoStreamId = normalizedId;
    mediaElement.preload = "auto";

    if (tagName === "video") {
      Object.assign(mediaElement.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        background: "transparent",
      });
    } else {
      // Keep the audio element in the DOM without using display:none.
      Object.assign(mediaElement.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        left: "-10000px",
        top: "0",
        opacity: "0",
        pointerEvents: "none",
      });
    }

    remoteMediaElements.set(normalizedId, mediaElement);
  }

  if (mediaElement.parentElement !== container) {
    container.appendChild(mediaElement);
  }

  mediaElement.autoplay = true;
  mediaElement.playsInline = true;
  mediaElement.volume = 1;

  // Mute only the dedicated video-only stream.
  mediaElement.muted = isVideoOnlyStream;
  mediaElement.srcObject = nativeStream;

  remoteStreams.set(normalizedId, nativeStream);

  // Some browsers expose a MediaStream before its tracks are ready.
  // Retry playback if an audio track arrives later.
  if (
    !isVideoOnlyStream &&
    typeof nativeStream.addEventListener === "function"
  ) {
    nativeStream.addEventListener("addtrack", (event) => {
      if (event?.track?.kind !== "audio") return;

      mediaElement.muted = false;
      mediaElement.volume = 1;

      void mediaElement.play().catch((playError) => {
        console.warn(
          "[ZEGO] Playback needs a user gesture after audio track arrival:",
          {
            streamId: normalizedId,
            error: playError,
          }
        );

        if (typeof onAutoplayBlocked === "function") {
          onAutoplayBlocked(true, playError);
        }
      });
    });
  }

  console.log("[ZEGO] Remote stream received:", {
    streamId: normalizedId,
    elementTag: mediaElement.tagName.toLowerCase(),
    hasAudio,
    hasVideo,

    audioTracks: audioTracks.map((track) => ({
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    })),

    videoTracks: videoTracks.map((track) => ({
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    })),

    elementMuted: mediaElement.muted,
    elementVolume: mediaElement.volume,
  });

  let playbackBlocked = false;

  try {
    await mediaElement.play();
  } catch (playError) {
    playbackBlocked = hasAudio;

    console.warn("[ZEGO] Remote media play() was rejected:", {
      streamId: normalizedId,
      hasAudio,
      hasVideo,
      error: playError,
    });

    if (hasAudio && typeof onAutoplayBlocked === "function") {
      onAutoplayBlocked(true, playError);
    }
  }

  return {
    stream: nativeStream,
    element: mediaElement,
    playbackBlocked,
  };
}

export function playRemoteStream(options = {}) {
  const streamId = String(options?.streamId || "");

  if (!streamId) {
    return Promise.reject(
      new Error("A remote ZEGO stream ID is required.")
    );
  }

  const existing = remotePlayPromises.get(streamId);
  if (existing) return existing;

  const operation = playRemoteStreamInternal(options).finally(() => {
    if (remotePlayPromises.get(streamId) === operation) {
      remotePlayPromises.delete(streamId);
    }
  });

  remotePlayPromises.set(streamId, operation);
  return operation;
}

export async function enableRemotePlayback(streamId) {
  ensureBrowser();

  const normalizedId = String(streamId || "");
  const mediaElement = remoteMediaElements.get(normalizedId);
  const stream = remoteStreams.get(normalizedId);

  if (!mediaElement) return false;

  const isVideoOnlyStream = /(?:^|_)video(?:_|$)/i.test(normalizedId);
  const audioTracks = stream?.getAudioTracks?.() || [];
  const isAudioStream =
    !isVideoOnlyStream && /(?:^|_)audio(?:_|$)/i.test(normalizedId);

  try {
    mediaElement.volume = 1;
    mediaElement.muted = isVideoOnlyStream;

    await mediaElement.play();

    console.log("[ZEGO] Remote playback enabled by user gesture:", {
      streamId: normalizedId,
      elementTag: mediaElement.tagName.toLowerCase(),
      audioStreamId: isAudioStream,
      audioTrackCount: audioTracks.length,
      muted: mediaElement.muted,
      volume: mediaElement.volume,
      paused: mediaElement.paused,
    });

    // Return success for an audio stream even if its track list is still warming up.
    return (
      isAudioStream ||
      audioTracks.some((track) => track.readyState === "live")
    );
  } catch (error) {
    console.warn("[ZEGO] Could not enable remote playback:", {
      streamId: normalizedId,
      isAudioStream,
      audioTrackCount: audioTracks.length,
      error,
    });

    return false;
  }
}

export function getRemoteMediaElement(streamId) {
  return remoteMediaElements.get(String(streamId || "")) || null;
}

export function getRemoteStreams() {
  return Array.from(remoteStreams.entries()).map(([streamID, stream]) => ({
    streamID,
    stream,
  }));
}

export function setMicrophoneEnabled(enabled) {
  if (!localStream) {
    return false;
  }

  const tracks = localStream.getAudioTracks?.() || [];

  if (!tracks.length) {
    return false;
  }

  let changedAny = false;

  tracks.forEach((track) => {
    if (track.readyState === "live") {
      track.enabled = Boolean(enabled);
      changedAny = true;
    }
  });

  console.log("[ZEGO] Microphone state changed:", {
    enabled: Boolean(enabled),

    tracks: tracks.map((track) => ({
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    })),
  });

  return changedAny;
}

/**
 * Compatibility helper for existing code using a combined audio/video stream.
 */
export function setCameraEnabled(enabled) {
  if (!localStream) {
    return false;
  }

  const tracks = localStream.getVideoTracks?.() || [];

  if (!tracks.length) {
    return false;
  }

  tracks.forEach((track) => {
    if (track.readyState === "live") {
      track.enabled = Boolean(enabled);
    }
  });

  return true;
}

export function stopPublishing() {
  if (stopPublishingPromise) return stopPublishingPromise;

  const operation = (async () => {
    // If React starts cleanup while getUserMedia/startPublishing is pending,
    // wait for it to settle, then stop the resulting stream.
    const pendingPublish = localPublishPromise;

    if (pendingPublish) {
      try {
        await pendingPublish;
      } catch {
        // The publish operation already cleaned up after its failure.
      }
    }

    const zg = zgInstance;
    const oldStreamId = localStreamId;
    const oldStream = localStream;

    // Clear shared references before awaits so repeated cleanup is harmless.
    localStream = null;
    localStreamId = null;

    if (oldStreamId && zg) {
      try {
        await zg.stopPublishingStream(oldStreamId);
      } catch (error) {
        console.warn("Could not stop publishing the main stream:", error);
      }
    }

    if (oldStream) {
      oldStream.getTracks?.().forEach((track) => {
        try {
          track.stop();
        } catch (error) {
          console.warn("Could not stop a local track:", error);
        }
      });
    }

    const extraIds = new Set([
      ...extraLocalStreams.keys(),
      ...videoPublishPromises.keys(),
    ]);

    await Promise.all(
      Array.from(extraIds).map((id) => stopVideoOnlyPublishing(id))
    );
  })();

  let wrapped;

  wrapped = operation.finally(() => {
    if (stopPublishingPromise === wrapped) {
      stopPublishingPromise = null;
    }
  });

  stopPublishingPromise = wrapped;
  return wrapped;
}

export async function stopRemoteStream(streamId, container) {
  const normalizedId = String(streamId || "");

  if (!normalizedId) {
    return;
  }

  const pendingPlay = remotePlayPromises.get(normalizedId);

  if (pendingPlay) {
    try {
      await pendingPlay;
    } catch {
      // Remote player startup failed; continue with cleanup.
    }
  }

  if (zgInstance) {
    try {
      await zgInstance.stopPlayingStream(normalizedId);
    } catch (error) {
      console.warn("Could not stop a remote stream:", error);
    }
  }

  const mediaElement = remoteMediaElements.get(normalizedId);

  if (mediaElement) {
    try {
      mediaElement.pause();
      mediaElement.srcObject = null;
      mediaElement.remove();
    } catch (error) {
      console.warn("Could not remove a remote media element:", error);
    }
  }

  // Remove the element from its actual parent. The container argument is retained
  // for compatibility with the existing ActiveCall component.
  void container;

  remoteMediaElements.delete(normalizedId);
  remoteStreams.delete(normalizedId);
}

export async function stopAllRemoteStreams() {
  const streamIds = Array.from(remoteMediaElements.keys());

  await Promise.all(
    streamIds.map((streamId) => stopRemoteStream(streamId))
  );
}

export async function logoutZegoRoom() {
  const roomId = currentRoomId;
  const zg = zgInstance;

  await stopPublishing();
  await stopAllRemoteStreams();

  if (zg && roomId) {
    try {
      await zg.logoutRoom(roomId);
    } catch (error) {
      console.warn("Could not log out of the ZEGO room:", error);
    }
  }

  currentRoomId = null;
  currentUserId = null;

  remoteStreams.clear();
  remoteMediaElements.clear();
}

export async function destroyZegoEngine() {
  await logoutZegoRoom();

  if (zgInstance) {
    try {
      zgInstance.destroyEngine();
    } catch (error) {
      console.warn("Could not destroy the ZEGO engine:", error);
    }
  }

  zgInstance = null;
  ZegoExpressEngineClass = null;
  engineLoadPromise = null;
}