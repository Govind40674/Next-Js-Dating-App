"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  loginZegoRoom,
  addRemoteStreamListener,
  createLocalStream,
  startPublishing,
  playRemoteStream,
  logoutZegoRoom,
} from "@/lib/zegoRTC";

export default function ZegoCall({
  callType = "audio",
  callerId,
  receiverId,
  userName,
  roomId,
  onClose,
}) {
  const remoteVideoRef =
    useRef(null);

  const startedRef =
    useRef(false);

  useEffect(() => {
    let cancelled = false;

    let removeRemoteListener =
      null;

    const startCall =
      async () => {
        // =================================================
        // 1. GET CURRENT LOGGED-IN USER
        // =================================================

        const currentUserId =
          typeof window !== "undefined"
            ? localStorage.getItem(
                "userId"
              )
            : null;

        if (!currentUserId) {
          console.error(
            "ZegoCall: current user ID is missing"
          );

          return;
        }

        // =================================================
        // 2. VALIDATE CALL DATA
        // =================================================

        if (!callerId) {
          console.error(
            "ZegoCall: callerId is missing"
          );

          return;
        }

        if (!receiverId) {
          console.error(
            "ZegoCall: receiverId is missing"
          );

          return;
        }

        if (!roomId) {
          console.error(
            "ZegoCall: roomId is missing"
          );

          return;
        }

        // =================================================
        // 3. DETERMINE LOCAL USER
        // =================================================

        const localUserId =
          currentUserId.toString();

        // =================================================
        // 4. DETERMINE REMOTE USER
        // =================================================

        const remoteUserId =
          localUserId ===
          callerId.toString()
            ? receiverId.toString()
            : callerId.toString();

        console.log(
          "Starting ZEGOCLOUD call:",
          {
            localUserId,

            remoteUserId,

            callerId,

            receiverId,

            roomId,

            callType,
          }
        );

        try {
          // =================================================
          // PREVENT DUPLICATE START
          // =================================================

          if (
            startedRef.current
          ) {
            return;
          }

          startedRef.current =
            true;

          // =================================================
          // 1. LOGIN TO ZEGOCLOUD RTC ROOM
          // =================================================

          console.log(
            "ZEGOCLOUD STEP 1: loginZegoRoom()"
          );

          await loginZegoRoom({
            userId:
              localUserId,

            userName:
              userName ||
              localUserId,

            roomId,
          });

          if (cancelled) {
            return;
          }

          console.log(
            "ZEGOCLOUD STEP 1 COMPLETE: Logged into room",
            roomId
          );

          // =================================================
          // 2. LISTEN FOR REMOTE STREAM
          // =================================================

          console.log(
            "ZEGOCLOUD STEP 2: addRemoteStreamListener()"
          );

          removeRemoteListener =
            addRemoteStreamListener(
              async ({
                type,
                stream,
              }) => {
                if (cancelled) {
                  return;
                }

                // =========================================
                // ONLY NEW STREAMS
                // =========================================

                if (
                  type !== "ADD"
                ) {
                  return;
                }

                // =========================================
                // GET STREAM ID
                // =========================================

                const streamId =
                  stream?.streamID;

                if (!streamId) {
                  console.error(
                    "Remote stream has no streamID:",
                    stream
                  );

                  return;
                }

                // =========================================
                // IGNORE OWN STREAM
                // =========================================

                if (
                  streamId ===
                  `stream_${localUserId}`
                ) {
                  console.log(
                    "Ignoring own Zego stream:",
                    streamId
                  );

                  return;
                }

                console.log(
                  "ZEGOCLOUD STEP 2 COMPLETE: Remote stream detected:",
                  {
                    streamId,

                    remoteUserId,

                    stream,
                  }
                );

                // =========================================
                // 3. PLAY REMOTE STREAM
                // =========================================

                try {
                  console.log(
                    "ZEGOCLOUD STEP 3: playRemoteStream()"
                  );

                  await playRemoteStream(
                    {
                      streamId,

                      container:
                        callType ===
                        "video"
                          ? remoteVideoRef.current
                          : null,
                    }
                  );

                  console.log(
                    "ZEGOCLOUD STEP 3 COMPLETE: Remote stream playing:",
                    streamId
                  );
                } catch (error) {
                  console.error(
                    "Failed to play remote stream:",
                    error
                  );
                }
              }
            );

          if (cancelled) {
            return;
          }

          // =================================================
          // 4. CREATE LOCAL AUDIO/VIDEO STREAM
          // =================================================

          console.log(
            "ZEGOCLOUD STEP 4: createLocalStream()"
          );

          const localStream =
            await createLocalStream({
              callType,
            });

          if (cancelled) {
            return;
          }

          console.log(
            "ZEGOCLOUD STEP 4 COMPLETE: Local stream created:",
            localStream
          );

          // =================================================
          // 5. PUBLISH LOCAL STREAM
          // =================================================

          console.log(
            "ZEGOCLOUD STEP 5: startPublishing()"
          );

          const publishedStream =
            await startPublishing({
              userId:
                localUserId,

              callType,
            });

          if (cancelled) {
            return;
          }

          console.log(
            "ZEGOCLOUD STEP 5 COMPLETE: Local stream published:",
            publishedStream
          );

          console.log(
            "ZEGOCLOUD CALL IS ACTIVE"
          );
        } catch (error) {
          console.error(
            "Failed to start ZEGOCLOUD call:",
            error
          );

          startedRef.current =
            false;
        }
      };

    startCall();

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      cancelled = true;

      if (
        removeRemoteListener
      ) {
        removeRemoteListener();

        removeRemoteListener =
          null;
      }
    };
  }, [
    callerId,
    receiverId,
    roomId,
    callType,
    userName,
  ]);

  // =====================================================
  // END CALL
  // =====================================================

  const handleClose =
    async () => {
      try {
        await logoutZegoRoom();
      } catch (error) {
        console.error(
          "Failed to logout from Zego:",
          error
        );
      }

      startedRef.current =
        false;

      if (onClose) {
        onClose();
      }
    };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      style={{
        position: "fixed",

        inset: 0,

        zIndex: 9999,

        background: "#111",

        display: "flex",

        flexDirection: "column",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          padding: "20px",

          color: "white",
        }}
      >
        <h2>
          {callType === "video"
            ? "Video Call"
            : "Audio Call"}
        </h2>

        <p>
          Caller: {callerId}
        </p>

        <p>
          Receiver: {receiverId}
        </p>

        <p>
          Room: {roomId}
        </p>

        <p>
          Local User:{" "}
          {typeof window !==
          "undefined"
            ? localStorage.getItem(
                "userId"
              )
            : ""}
        </p>
      </div>

      {/* =================================================
          REMOTE VIDEO
      ================================================= */}

      {callType ===
        "video" && (
        <div
          ref={
            remoteVideoRef
          }
          style={{
            flex: 1,

            width: "100%",

            background: "#000",
          }}
        />
      )}

      {/* =================================================
          AUDIO UI
      ================================================= */}

      {callType ===
        "audio" && (
        <div
          style={{
            flex: 1,

            display: "flex",

            alignItems: "center",

            justifyContent:
              "center",

            color: "white",
          }}
        >
          <h1>
            Audio Call
          </h1>
        </div>
      )}

      {/* =================================================
          END CALL
      ================================================= */}

      <div
        style={{
          padding: "20px",

          display: "flex",

          justifyContent:
            "center",
        }}
      >
        <button
          onClick={
            handleClose
          }
          style={{
            padding:
              "12px 30px",

            borderRadius:
              "8px",

            border: "none",

            cursor: "pointer",

            background: "red",

            color: "white",

            fontSize: "16px",
          }}
        >
          End Call
        </button>
      </div>
    </div>
  );
}