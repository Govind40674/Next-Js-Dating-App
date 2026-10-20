"use client";

import React, {
  useEffect,
  useRef,
} from "react";

import {
  ZegoUIKitPrebuilt,
} from "@zegocloud/zego-uikit-prebuilt";

const ZegoCall = ({
  callID,
  userId,
  userName,
  mode = "video",
  onCallEnd,
}) => {
  const containerRef =
    useRef(null);

  const initialized =
    useRef(false);

  useEffect(() => {
    if (
      !containerRef.current ||
      initialized.current
    ) {
      return;
    }

    initialized.current = true;

    let zp;

    const startCall =
      async () => {
        try {
          /*
           * Get Token04 from our server.
           */

          const response =
            await fetch(
              `/api/zego/token?userId=${encodeURIComponent(
                userId
              )}`
            );

          const data =
            await response.json();

          if (!data.success) {
            throw new Error(
              data.message ||
                "Failed to get ZEGO token"
            );
          }

          /*
           * Convert Token04 into
           * Call Kit token.
           */

          const kitToken =
            ZegoUIKitPrebuilt.generateKitTokenForProduction(
              data.appId,
              data.token,
              callID,
              userId,
              userName
            );

          zp =
            ZegoUIKitPrebuilt.create(
              kitToken
            );

          zp.joinRoom({
            container:
              containerRef.current,

            scenario: {
              mode:
                mode === "audio"
                  ? ZegoUIKitPrebuilt.OneONoneCall
                  : ZegoUIKitPrebuilt.OneONoneCall,
            },

            showScreenSharingButton:
              false,

            showTextChat:
              false,

            showUserList:
              false,

            turnOnMicrophoneWhenJoining:
              mode === "audio",

            turnOnCameraWhenJoining:
              mode === "video",

            showPreJoinView:
              false,

            onLeaveRoom:
              () => {
                onCallEnd?.();
              },
          });
        } catch (error) {
          console.error(
            "ZEGO call error:",
            error
          );
        }
      };

    startCall();

    return () => {
      try {
        zp?.leaveRoom();
      } catch (error) {
        console.error(error);
      }
    };
  }, [
    callID,
    userId,
    userName,
    mode,
    onCallEnd,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100vh",
      }}
    />
  );
};

export default ZegoCall;