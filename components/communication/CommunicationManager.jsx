"use client";



import { useCallback, useContext, useEffect, useRef } from "react";

import { MyContext } from "@/components/myContext/MyContext";

import { loginZIM } from "@/lib/loginZIM";

import axios from "axios";
import {
  initializeCallAudio,
  playCallRingtone,
  stopCallRingtone,
  stopAllCallRingtones,
} from "@/lib/callRingtones";



export default function CommunicationManager({ children }) {

  const {

    addRealtimeMessage,

    increaseUnreadCount,

    showIncomingCall,

    incomingCall,

    clearIncomingCall,

    activeChatUserIdRef,

    setCallState,

  } = useContext(MyContext);



  // =====================================================

  // ZIM AND EVENT LISTENER REFS

  // =====================================================



  const zimRef = useRef(null);



  const messageListenerRef = useRef(null);

  const callListenerRef = useRef(null);

  const callCancelledListenerRef = useRef(null);

  const callStateListenerRef = useRef(null);
  const connectionListenerRef = useRef(null);
  const callCreatedListenerRef = useRef(null);
  const callEndedListenerRef = useRef(null);

  const userIdRef = useRef(null);

  // Ringtone playback is centralized in lib/callRingtones.js.
  // This manager starts/stops the caller's ringback from ZEGO invitation events.
  const stopOutgoingRingtone = useCallback((callID = null) => {
    stopCallRingtone("outgoing", callID || null);
  }, []);

  const startOutgoingRingtone = useCallback((callID) => {
    void playCallRingtone("outgoing", callID).then((started) => {
      if (!started) {
        console.info(
          "[ZIM] Outgoing ringback is waiting for browser audio permission.",
          String(callID || "")
        );
      }
    }).catch((error) => {
      console.warn("[ZIM] Could not start outgoing ringback:", error);
    });
  }, []);

  // Keep current context values available to ZIM event callbacks.

  const addRealtimeMessageRef = useRef(addRealtimeMessage);

  const increaseUnreadCountRef = useRef(increaseUnreadCount);

  const showIncomingCallRef = useRef(showIncomingCall);

  const incomingCallRef = useRef(incomingCall);

  const clearIncomingCallRef = useRef(clearIncomingCall);

  const activeChatUserIdRefInternal = useRef(activeChatUserIdRef);

  const setCallStateRef = useRef(setCallState);



  useEffect(() => {

    addRealtimeMessageRef.current = addRealtimeMessage;

  }, [addRealtimeMessage]);



  useEffect(() => {

    increaseUnreadCountRef.current = increaseUnreadCount;

  }, [increaseUnreadCount]);



  useEffect(() => {

    showIncomingCallRef.current = showIncomingCall;

  }, [showIncomingCall]);



  useEffect(() => {

    incomingCallRef.current = incomingCall || null;

  }, [incomingCall]);



  useEffect(() => {

    clearIncomingCallRef.current = clearIncomingCall;

  }, [clearIncomingCall]);



  useEffect(() => {

    activeChatUserIdRefInternal.current = activeChatUserIdRef;

  }, [activeChatUserIdRef]);



  useEffect(() => {

    setCallStateRef.current = setCallState;

  }, [setCallState]);



  // =====================================================

  // INITIALIZE COMMUNICATION

  // =====================================================



  useEffect(() => {
    initializeCallAudio();
  }, []);

  useEffect(() => {

    let cancelled = false;



    const initializeCommunication = async () => {

      try {

        // -------------------------------------------------

        // CURRENT USER

        // -------------------------------------------------



        const userId = localStorage.getItem("userId");



        if (!userId) {

          console.log(

            "[CommunicationManager] No userId found. ZIM initialization skipped."

          );

          return;

        }



        userIdRef.current = String(userId);



        console.log("[CommunicationManager] Initializing ZIM:", {

          userId: userIdRef.current,

        });



        // -------------------------------------------------

        // LOGIN TO ZIM

        // -------------------------------------------------



        const zim = await loginZIM(userIdRef.current);



        if (cancelled) return;



        if (!zim) {

          console.error(

            "[CommunicationManager] ZIM instance is unavailable."

          );

          return;

        }



        zimRef.current = zim;



        console.log(

          "[CommunicationManager] ZIM ready:",

          userIdRef.current

        );



        // =================================================

        // MESSAGE RECEIVED

        // =================================================



        const handleMessageReceived = async (zimInstance, data) => {

          const { messageList, receivedInfo } = data || {};



          if (!Array.isArray(messageList) || messageList.length === 0) {

            return;

          }



          for (const receivedMessage of messageList) {

            if (!receivedMessage || receivedMessage.type !== 1) {

              continue;

            }



            const senderId =

              receivedMessage.senderUserID ||

              receivedMessage.conversationID ||

              receivedInfo?.conversationID;



            if (!senderId) {

              console.warn(

                "[ZIM] Received message without a sender ID:",

                receivedMessage

              );

              continue;

            }



            const sender = String(senderId);



            // -----------------------------------------------

            // ACTIVE CALL END CONTROL MESSAGE

            // -----------------------------------------------



            try {

              const controlData =

                typeof receivedMessage.message === "string"

                  ? JSON.parse(receivedMessage.message)

                  : null;



              if (controlData?.type === "END_CALL") {

                console.log("[ZIM] Remote end-call message received:", {

                  sender,

                  roomId: controlData.roomId,

                  callID: controlData.callID,

                });



                setCallStateRef.current({

                  state: "ended",

                  roomId: controlData.roomId || null,

                  callID: controlData.callID || null,

                  userID: sender,

                  endedBy: sender,

                });



                // Do not display call-control messages as chat messages.

                continue;

              }

            } catch {

              // A normal chat message might not be JSON.

            }



            // -----------------------------------------------

            // ACTIVE CHAT AND REALTIME MESSAGES

            // -----------------------------------------------



            const activeUser =

              activeChatUserIdRefInternal.current?.current != null

                ? String(

                    activeChatUserIdRefInternal.current.current

                  )

                : null;



            if (activeUser === sender) {

              try {

                const currentUserId = userIdRef.current;



                addRealtimeMessageRef.current(

                  sender,

                  receivedMessage

                );



                if (!currentUserId) {

                  console.error(

                    "[ZIM] Current user ID is missing."

                  );

                  continue;

                }



                await axios.post("/api/message_controller/read", {

                  userId: currentUserId,

                  otherUserId: sender,

                });



                console.log(

                  "[ZIM] Active-chat message marked as read:",

                  sender

                );

              } catch (error) {

                console.error(

                  "[ZIM] Failed to mark messages as read:",

                  error.response?.data || error.message

                );

              }

            } else {

              increaseUnreadCountRef.current(sender, 1);

            }

          }

        };



        messageListenerRef.current = handleMessageReceived;

        zim.on("messageReceived", messageListenerRef.current);



        console.log("[ZIM] messageReceived listener registered");



        // =================================================

        // CONNECTION STATE

        // =================================================



        const handleConnectionStateChanged = (zimInstance, data) => {

          console.log("[ZIM] Connection state changed:", data);



          if (data?.state === 2) {

            console.log("[ZIM] Connected");

          }



          if (data?.state === 3) {

            console.log("[ZIM] Reconnecting");

          }



          if (data?.state === 0) {

            console.log("[ZIM] Disconnected");



            if (data?.event === 4) {

              console.warn("[ZIM] Connection was kicked out.");

            }

          }

        };



        connectionListenerRef.current =

          handleConnectionStateChanged;



        zim.on(

          "connectionStateChanged",

          connectionListenerRef.current

        );



        console.log(

          "[ZIM] connectionStateChanged listener registered"

        );



        // =================================================

        // INCOMING CALL INVITATION

        // =================================================



        const handleCallInvitationReceived = (zimInstance, data) => {

          console.log("[ZIM] Incoming call invitation:", data);



          try {

            if (!data) {

              console.error(

                "[ZIM] Incoming invitation data is missing."

              );

              return;

            }



            const callID = String(data.callID || "");



            const callerId = String(

              data.inviter ||

                data.caller ||

                data.callerUserID ||

                ""

            );



            if (!callID || !callerId) {

              console.error(

                "[ZIM] Invitation callID or caller ID is missing:",

                data

              );

              return;

            }



            let parsedData = {};



            try {

              parsedData = data.extendedData

                ? typeof data.extendedData === "string"

                  ? JSON.parse(data.extendedData)

                  : data.extendedData

                : {};

            } catch (error) {

              console.error(

                "[ZIM] Could not parse invitation extendedData:",

                error

              );

              return;

            }



            const roomId = parsedData?.roomId;



            if (!roomId) {

              console.error(

                "[ZIM] Invitation roomId is missing:",

                parsedData

              );

              return;

            }



            const currentUserId = localStorage.getItem("userId");



            if (!currentUserId) {

              console.error(

                "[ZIM] Current user ID is missing."

              );

              return;

            }



            const callType =

              parsedData.type === "video" ? "video" : "audio";



            const incomingCallData = {

              callID,

              callerId,

              userId: callerId,

              callerName:

                parsedData.callerName ||

                data.callerUserName ||

                data.inviterUserName ||

                "User",

              receiverId: String(currentUserId),

              callType,

              roomId: String(roomId),



              // The caller's photo is the other user's photo

              // from the receiver's perspective.

              otherPhoto:

                parsedData.ownPhoto ||

                parsedData.otherPhoto ||

                "/default.png",



              ownPhoto:

                localStorage.getItem("profile_photo") ||

                "/default.png",



              callInvitationInfo: {

                ...data,

                callID,

              },

            };



            // Keep the ref updated immediately. This avoids a race

            // if the cancellation event arrives before React's

            // next effect runs.

            incomingCallRef.current = incomingCallData;



            console.log("[ZIM] Showing incoming call:", {

              callID,

              callerId,

              callerName: incomingCallData.callerName,

              callType,

              roomId,

            });



            showIncomingCallRef.current(incomingCallData);

          } catch (error) {

            console.error(

              "[ZIM] Error handling incoming call:",

              error

            );

          }

        };



        callListenerRef.current =

          handleCallInvitationReceived;



        zim.on(

          "callInvitationReceived",

          callListenerRef.current

        );



        console.log(

          "[ZIM] callInvitationReceived listener registered"

        );



        // =================================================

        // INCOMING INVITATION CANCELLED BY CALLER

        // =================================================



        const handleCallInvitationCancelled = (
          zimInstance,
          info
        ) => {
          // This event may also indicate that the caller cancelled a pending call.
          const cancelledCallID = String(
            info?.callID || info?.callId || ""
          );

          if (cancelledCallID) {
            // The cancellation callback is delivered to the invitee. Stop its
            // ringtone immediately, even before React dismisses the popup.
            stopCallRingtone("incoming", cancelledCallID);
          }



          if (!cancelledCallID) {

            console.warn(

              "[ZIM] Cancellation event has no callID:",

              info

            );

            return;

          }



          const pendingCall = incomingCallRef.current;



          const pendingCallID = String(

            pendingCall?.callID ??

              pendingCall?.callInvitationInfo?.callID ??

              pendingCall?.callInvitationInfo?.callInvitationID ??

              ""

          );



          console.log(

            "[ZIM] Invitation cancellation received:",

            {

              cancelledCallID,

              pendingCallID,

            }

          );



          // Close the popup only if this cancellation belongs

          // to the invitation currently displayed.

          if (

            !pendingCall ||

            pendingCallID !== cancelledCallID

          ) {

            console.log(

              "[ZIM] Cancellation does not match the displayed invitation."

            );

            return;

          }



          // Clear the ref before updating React context to avoid

          // processing the same cancellation twice.

          incomingCallRef.current = null;



          clearIncomingCallRef.current();



          console.log(

            "[ZIM] Incoming-call popup dismissed."

          );

        };



        callCancelledListenerRef.current =

          handleCallInvitationCancelled;



        zim.on(

          "callInvitationCancelled",

          callCancelledListenerRef.current

        );



        console.log(

          "[ZIM] callInvitationCancelled listener registered"

        );



        // =================================================
        // OUTGOING CALL INVITATION CREATED
        // The caller receives this event after starting callInvite.
        // Play ringback while waiting for the invitee to respond.
        // =================================================

        const handleCallInvitationCreated = (zimInstance, info) => {
          const createdCallID = String(
            info?.callID ??
              info?.callId ??
              info?.callInvitationID ??
              ""
          );

          if (!createdCallID) {
            console.warn(
              "[ZIM] callInvitationCreated did not contain a callID:",
              info
            );
            return;
          }

          console.log("[ZIM] Outgoing call invitation created:", {
            callID: createdCallID,
            info,
          });

          startOutgoingRingtone(createdCallID);
        };

        callCreatedListenerRef.current = handleCallInvitationCreated;
        zim.on("callInvitationCreated", callCreatedListenerRef.current);
        console.log("[ZIM] callInvitationCreated listener registered");

        // =================================================
        // CALL INVITATION ENDED
        // Extra safety net: stop ringback when ZEGO ends the invitation.
        // =================================================

        const handleCallInvitationEnded = (zimInstance, info) => {
          const endedCallID = String(
            info?.callID ?? info?.callId ?? info?.callInvitationID ?? ""
          );

          if (endedCallID) {
            stopOutgoingRingtone(endedCallID);
            stopCallRingtone("incoming", endedCallID);
          }

          // Close both participants' active-call UI when ZIM itself reports an
          // ended invitation. The explicit END_CALL message is retained as a
          // fallback for common-mode invitations and older SDK flows.
          let extendedData = info?.extendedData ?? info?.callExtendedData ?? null;
          if (typeof extendedData === "string") {
            try {
              extendedData = JSON.parse(extendedData);
            } catch {
              extendedData = null;
            }
          }

          console.log("[ZIM] Call invitation ended:", {
            callID: endedCallID || null,
            info,
          });

          if (endedCallID) {
            setCallStateRef.current({
              state: "ended",
              status: "ended",
              callID: endedCallID,
              roomId:
                extendedData?.roomId ||
                extendedData?.roomID ||
                info?.roomId ||
                info?.roomID ||
                null,
              reason: extendedData?.reason || "call-invitation-ended",
            });
          }
        };

        callEndedListenerRef.current = handleCallInvitationEnded;
        zim.on("callInvitationEnded", callEndedListenerRef.current);
        console.log("[ZIM] callInvitationEnded listener registered");

        // =================================================
        // CALL USER STATE CHANGED
        // =================================================

        const handleCallUserStateChanged = (zimInstance, info) => {
          console.log("[ZIM] Call user state changed:", info);

          const callID = String(info?.callID ?? info?.callId ?? "");
          const callUserList = Array.isArray(info?.callUserList)
            ? info.callUserList
            : [];

          if (!callUserList.length) return;

          callUserList.forEach((userInfo) => {
            console.log("[ZIM] Call participant state:", {
              callID,
              userID: userInfo?.userID,
              state: userInfo?.state,
            });
          });

          // ZEGO Web ZIM states commonly used here:
          // Accepted = 1, Rejected = 2, Cancelled = 3,
          // Received = 5, Timeout = 6, NotYetReceived = 9.
          const acceptedUser = callUserList.find(
            (userInfo) => Number(userInfo?.state) === 1
          );
          const rejectedUser = callUserList.find(
            (userInfo) => Number(userInfo?.state) === 2
          );
          const cancelledUser = callUserList.find(
            (userInfo) => Number(userInfo?.state) === 3
          );
          const timedOutUser = callUserList.find(
            (userInfo) => Number(userInfo?.state) === 6
          );
          const notReceivedUser = callUserList.find(
            (userInfo) => Number(userInfo?.state) === 9
          );

          // Acceptance and unsuccessful terminal states stop the ringback.
          // The callID check protects a newer call from stale events.
          if (acceptedUser) {
            stopOutgoingRingtone(callID);
            stopCallRingtone("incoming", callID);
            setCallStateRef.current({
              callID: callID || null,
              userID: acceptedUser.userID ? String(acceptedUser.userID) : null,
              state: "accepted",
              userState: 1,
              reason: "accepted",
              extendedData: acceptedUser.extendedData || "",
            });
            console.log("[ZIM] Call invitation was accepted; stopped ringtone:", callID);
            return;
          }

          const terminalUser =
            rejectedUser || cancelledUser || timedOutUser || notReceivedUser;
          if (!terminalUser) return;

          stopOutgoingRingtone(callID);
          stopCallRingtone("incoming", callID);

          const terminalState = rejectedUser
            ? "rejected"
            : cancelledUser
              ? "cancelled"
              : timedOutUser
                ? 6
                : "not-received";

          console.log("[ZIM] Stopping outgoing call after invitation result:", {
            callID,
            userID: terminalUser.userID,
            state: terminalState,
          });

          setCallStateRef.current({
            callID: callID || null,
            userID: terminalUser.userID ? String(terminalUser.userID) : null,
            state: terminalState,
            userState: Number(terminalUser.state),
            reason: rejectedUser
              ? "rejected"
              : cancelledUser
                ? "cancelled"
                : timedOutUser
                  ? "timeout"
                  : "not-received",
            extendedData: terminalUser.extendedData || "",
          });
        };

        callStateListenerRef.current =

          handleCallUserStateChanged;



        zim.on(

          "callUserStateChanged",

          callStateListenerRef.current

        );



        console.log(

          "[ZIM] callUserStateChanged listener registered"

        );



        console.log("[CommunicationManager] Communication ready.");

      } catch (error) {

        if (cancelled) return;



        console.log(

          "[CommunicationManager] Initialization failed:",

          error

        );

      }

    };



    void initializeCommunication();



    // =====================================================

    // CLEANUP

    // =====================================================



    return () => {
      cancelled = true;
      stopAllCallRingtones();

      const zim = zimRef.current;

      if (!zim) return;



      console.log(

        "[CommunicationManager] Removing ZIM listeners."

      );



      if (messageListenerRef.current) {

        zim.off(

          "messageReceived",

          messageListenerRef.current

        );



        messageListenerRef.current = null;

      }



      if (callListenerRef.current) {

        zim.off(

          "callInvitationReceived",

          callListenerRef.current

        );



        callListenerRef.current = null;

      }



      if (callCancelledListenerRef.current) {

        zim.off(

          "callInvitationCancelled",

          callCancelledListenerRef.current

        );



        callCancelledListenerRef.current = null;

      }



      if (callCreatedListenerRef.current) {
        zim.off("callInvitationCreated", callCreatedListenerRef.current);
        callCreatedListenerRef.current = null;
      }

      if (callEndedListenerRef.current) {
        zim.off("callInvitationEnded", callEndedListenerRef.current);
        callEndedListenerRef.current = null;
      }

      if (connectionListenerRef.current) {

        zim.off(

          "connectionStateChanged",

          connectionListenerRef.current

        );



        connectionListenerRef.current = null;

      }



      if (callStateListenerRef.current) {

        zim.off(

          "callUserStateChanged",

          callStateListenerRef.current

        );



        callStateListenerRef.current = null;

      }



      zimRef.current = null;



      console.log(

        "[CommunicationManager] ZIM listeners removed; ZIM logout skipped."

      );

    };

  }, [startOutgoingRingtone, stopOutgoingRingtone]);



  return children;

}
