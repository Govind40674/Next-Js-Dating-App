"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Image from "next/image";

import { MyContext } from "@/components/myContext/MyContext";
import { getZIM } from "@/lib/zim";

import {
  initializeCallAudio,
  playCallRingtone,
  stopCallRingtone,
  unlockCallAudio,
} from "@/lib/callRingtones";

import styles from "./IncomingCall.module.css";

export default function IncomingCall() {
  const {
    incomingCall,
    clearIncomingCall,
    startActiveCall,
    callState,
  } = useContext(MyContext);

  const [processingCallID, setProcessingCallID] = useState(null);
  const [photoFailedCallID, setPhotoFailedCallID] = useState(null);

  // Store the call ID instead of synchronously resetting a boolean in useEffect.
  const [ringtoneBlockedCallID, setRingtoneBlockedCallID] = useState(null);

  const processingRef = useRef({
    callID: null,
    processing: false,
  });

  const callID = String(
    incomingCall?.callID ??
      incomingCall?.callInvitationInfo?.callID ??
      incomingCall?.callInvitationInfo?.callInvitationID ??
      ""
  );

  const roomId = String(incomingCall?.roomId ?? "");

  const processing =
    Boolean(callID) && processingCallID === callID;

  const photoFailed =
    Boolean(callID) && photoFailedCallID === callID;

  // Only show the ringtone warning for the current call.
  const ringtoneBlocked =
    Boolean(callID) && ringtoneBlockedCallID === callID;

  const photoSrc = photoFailed
    ? "/default.png"
    : incomingCall?.otherPhoto ||
      incomingCall?.ownPhoto ||
      "/default.png";

  // =====================================================
  // INCOMING RINGTONE
  // =====================================================

  useEffect(() => {
    if (!incomingCall || !callID) {
      return;
    }

    initializeCallAudio();

    let disposed = false;

    const handleRingtoneStarted = (event) => {
      const detail = event?.detail || {};

      if (
        detail.kind === "incoming" &&
        String(detail.callID) === callID
      ) {
        setRingtoneBlockedCallID((current) =>
          current === callID ? null : current
        );
      }
    };

    const handleRingtoneError = (event) => {
      const detail = event?.detail || {};

      if (
        detail.kind === "incoming" &&
        String(detail.callID) === callID
      ) {
        setRingtoneBlockedCallID(callID);
      }
    };

    window.addEventListener(
      "call-ringtone-started",
      handleRingtoneStarted
    );

    window.addEventListener(
      "call-ringtone-error",
      handleRingtoneError
    );

    void playCallRingtone("incoming", callID)
      .then((started) => {
        if (disposed) return;

        setRingtoneBlockedCallID((current) => {
          if (started) {
            return current === callID ? null : current;
          }

          return callID;
        });
      })
      .catch((error) => {
        if (!disposed) {
          setRingtoneBlockedCallID(callID);
        }

        console.warn(
          "[IncomingCall] Could not start incoming ringtone:",
          error
        );
      });

    return () => {
      disposed = true;

      window.removeEventListener(
        "call-ringtone-started",
        handleRingtoneStarted
      );

      window.removeEventListener(
        "call-ringtone-error",
        handleRingtoneError
      );

      stopCallRingtone("incoming", callID);
    };
  }, [incomingCall, callID]);

  // =====================================================
  // ENABLE RINGTONE
  // =====================================================

  const handleEnableRingtone = async () => {
    if (!callID) return;

    try {
      // A direct user gesture can unlock browser audio playback.
      const unlocked = await unlockCallAudio();

      if (!unlocked) {
        setRingtoneBlockedCallID(callID);
        return;
      }

      const started = await playCallRingtone(
        "incoming",
        callID
      );

      setRingtoneBlockedCallID((current) => {
        if (started) {
          return current === callID ? null : current;
        }

        return callID;
      });
    } catch (error) {
      console.warn(
        "[IncomingCall] Failed to enable ringtone:",
        error
      );

      setRingtoneBlockedCallID(callID);
    }
  };

  // =====================================================
  // AUTOMATIC TIMEOUT FOR THE INCOMING POPUP
  // =====================================================

  useEffect(() => {
    if (!incomingCall || !callID) return;

    const timeout = setTimeout(() => {
      console.log(
        "[IncomingCall] Incoming invitation timed out:",
        callID
      );

      processingRef.current = {
        callID,
        processing: true,
      };

      stopCallRingtone("incoming", callID);
      clearIncomingCall();
    }, 30000);

    return () => clearTimeout(timeout);
  }, [incomingCall, callID, clearIncomingCall]);

  // =====================================================
  // LISTEN FOR ZEGO INVITATION CANCELLATION
  // =====================================================

  useEffect(() => {
    if (!incomingCall || !callID) return;

    let disposed = false;
    let zimInstance = null;
    let cancellationHandler = null;

    const registerCancellationListener = async () => {
      try {
        zimInstance = await getZIM();

        if (disposed || !zimInstance) return;

        cancellationHandler = (zim, data) => {
          const cancelledCallID = String(
            data?.callID ??
              data?.callId ??
              ""
          );

          console.log(
            "[IncomingCall] ZEGO cancellation event:",
            {
              cancelledCallID,
              displayedCallID: callID,
              data,
            }
          );

          // Never close a different or newer incoming call.
          if (
            !cancelledCallID ||
            cancelledCallID !== callID
          ) {
            return;
          }

          console.log(
            "[IncomingCall] Sender cancelled this invitation."
          );

          processingRef.current = {
            callID,
            processing: true,
          };

          stopCallRingtone("incoming", callID);
          clearIncomingCall();
        };

        zimInstance.on(
          "callInvitationCancelled",
          cancellationHandler
        );

        console.log(
          "[IncomingCall] Cancellation listener registered:",
          callID
        );
      } catch (error) {
        console.error(
          "[IncomingCall] Could not register cancellation listener:",
          error
        );
      }
    };

    void registerCancellationListener();

    return () => {
      disposed = true;

      if (zimInstance && cancellationHandler) {
        zimInstance.off(
          "callInvitationCancelled",
          cancellationHandler
        );
      }
    };
  }, [incomingCall, callID, clearIncomingCall]);

  // =====================================================
  // LISTEN FOR THE EXISTING END_CALL SIGNAL
  // =====================================================

  useEffect(() => {
    if (!incomingCall || !callID || !callState) return;

    const stateText = String(
      callState.state ?? ""
    ).toLowerCase();

    const isEnded =
      stateText === "ended" ||
      stateText === "end";

    const isTimedOut =
      Number(callState.state) === 6;

    if (!isEnded && !isTimedOut) return;

    const stateCallID = String(
      callState.callID ?? ""
    );

    const stateRoomId = String(
      callState.roomId ?? ""
    );

    // Prefer exact callID matching. Use roomId only when callID is absent.
    const matchesCall = stateCallID
      ? stateCallID === callID
      : Boolean(
          stateRoomId &&
            roomId &&
            stateRoomId === roomId
        );

    if (!matchesCall) {
      console.log(
        "[IncomingCall] Ignoring an unrelated call-state update:",
        {
          stateCallID,
          callID,
          stateRoomId,
          roomId,
        }
      );

      return;
    }

    // Defer the context update until after the effect runs.
    const dismissTimer = setTimeout(() => {
      console.log(
        "[IncomingCall] Closing popup due to remote call end/timeout:",
        callID
      );

      processingRef.current = {
        callID,
        processing: true,
      };

      stopCallRingtone("incoming", callID);
      clearIncomingCall();
    }, 0);

    return () => clearTimeout(dismissTimer);
  }, [
    incomingCall,
    callID,
    roomId,
    callState,
    clearIncomingCall,
  ]);

  // Do not render the popup when there is no incoming call.
  if (!incomingCall) return null;

  const {
    callType = "audio",
    callerId,
    callerName,
    callInvitationInfo,
  } = incomingCall;

  // =====================================================
  // PREVENT DUPLICATE ACCEPT/REJECT ACTIONS
  // =====================================================

  const beginProcessing = () => {
    if (!callID) {
      console.error(
        "[IncomingCall] Missing invitation ID."
      );

      return false;
    }

    if (
      processingRef.current.callID === callID &&
      processingRef.current.processing
    ) {
      return false;
    }

    processingRef.current = {
      callID,
      processing: true,
    };

    setProcessingCallID(callID);

    return true;
  };

  const finishProcessing = () => {
    if (processingRef.current.callID === callID) {
      processingRef.current = {
        callID,
        processing: false,
      };
    }

    setProcessingCallID((current) =>
      current === callID ? null : current
    );
  };

  // =====================================================
  // ACCEPT CALL
  // =====================================================

  const handleAccept = async () => {
    if (!beginProcessing()) return;

    stopCallRingtone("incoming", callID);

    try {
      const zim = await getZIM();

      await zim.callAccept(callID, {
        extendedData: JSON.stringify({
          type: callType,
          roomId,
        }),
      });

      startActiveCall({
        userId: String(callerId),
        userName: callerName || "User",
        callType,
        roomId,
        callID,
        otherPhoto:
          incomingCall.otherPhoto ||
          incomingCall.ownPhoto ||
          "/default.png",
        ownPhoto:
          incomingCall.ownPhoto ||
          "/default.png",
        callInvitationInfo,
      });

      clearIncomingCall();
    } catch (error) {
      console.error(
        "[IncomingCall] Failed to accept call:",
        error
      );

      finishProcessing();

      try {
        const started = await playCallRingtone(
          "incoming",
          callID
        );

        setRingtoneBlockedCallID((current) => {
          if (started) {
            return current === callID ? null : current;
          }

          return callID;
        });
      } catch (ringtoneError) {
        console.warn(
          "[IncomingCall] Could not restart ringtone:",
          ringtoneError
        );

        setRingtoneBlockedCallID(callID);
      }
    }
  };

  // =====================================================
  // REJECT CALL
  // =====================================================

  const handleReject = async () => {
    if (!beginProcessing()) return;

    stopCallRingtone("incoming", callID);

    try {
      const zim = await getZIM();

      await zim.callReject(callID, {
        extendedData: JSON.stringify({
          reason: "rejected",
        }),
      });
    } catch (error) {
      console.error(
        "[IncomingCall] Failed to reject call:",
        error
      );
    } finally {
      clearIncomingCall();
      finishProcessing();
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Incoming call"
      >
        <p className={styles.callLabel}>
          Incoming{" "}
          {callType === "video" ? "video" : "audio"} call
        </p>

        <div className={styles.photoWrapper}>
          <Image
            key={`${callID}-${photoSrc}`}
            src={photoSrc}
            alt={`${callerName || "Caller"}'s profile photo`}
            fill
            sizes="(max-width: 480px) 96px, 112px"
            className={styles.profilePhoto}
            unoptimized
            onError={() => {
              setPhotoFailedCallID(callID);
            }}
          />
        </div>

        <h2 className={styles.callerName}>
          {callerName || "User"}
        </h2>

        {ringtoneBlocked && (
          <div
            role="status"
            style={{
              width: "100%",
              margin: "12px 0 4px",
              padding: "10px 12px",
              border: "1px solid #f0c7d7",
              borderRadius: "12px",
              background: "#fff6fa",
              color: "#75405a",
              textAlign: "center",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            Your browser blocked automatic sound.

            <button
              type="button"
              onClick={handleEnableRingtone}
              style={{
                display: "block",
                margin: "8px auto 0",
                padding: "8px 13px",
                border: 0,
                borderRadius: "20px",
                background: "#d94e83",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Enable ringtone
            </button>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleReject}
            disabled={processing}
            className={`${styles.actionButton} ${styles.rejectButton}`}
          >
            {processing ? "Please wait..." : "Reject"}
          </button>

          <button
            type="button"
            onClick={handleAccept}
            disabled={processing}
            className={`${styles.actionButton} ${styles.acceptButton}`}
          >
            {processing ? "Please wait..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}