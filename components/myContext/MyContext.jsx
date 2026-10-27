"use client";

import {
  createContext,
  useCallback,
  useRef,
  useState,
} from "react";

export const MyContext = createContext();

export const MyContextProvider = ({ children }) => {

  // =====================================================
  // PROFILE
  // =====================================================

  const [profileUpdate, setProfileUpdate] = useState(null);

  // =====================================================
  // PRIVATE MESSAGE
  // =====================================================

  const [isMessageBox, setIsMessageBox] = useState(false);
  const [messageUserId, setMessageUserId] = useState(null);



  //Private match
  const [isMatchBox, setIsMatchBox] = useState(false);
  const [matchUserId, setMatchUserId] = useState(null);

  //Matching with Other Profile

  const [isMatching, setIsMatching] = useState(true);
  // const [matchingUserId, setMatchingUserId] = useState(null);


  const [isEditpage, setIsEditpage] = useState(false);

  const [isProfilepage, setIsProfilepage] = useState(false);

  // =====================================================
  // ACTIVE CHAT USER
  // =====================================================

  const activeChatUserIdRef = useRef(null);

  // =====================================================
  // UNREAD MESSAGE COUNTS
  // =====================================================

  const [unreadCounts, setUnreadCounts] = useState({});

  // =====================================================
  // REALTIME MESSAGES
  // =====================================================

  const [realtimeMessages, setRealtimeMessages] = useState({});

  // =====================================================
  // INCOMING CALL
  // =====================================================

  const [incomingCall, setIncomingCall] = useState(null);

  // =====================================================
  // ACTIVE CALL
  // =====================================================

  const [activeCall, setActiveCall] = useState(null);

  // =====================================================
  // CALL USER STATE
  //
  // ZIM callUserStateChanged gives:
  //
  // 0 = pending
  // 1 = accepted
  // 2 = rejected
  // 3 = cancelled
  // 4 = timeout
  //
  // We store the complete information here so that
  // another component can access it.
  // =====================================================

  const [callState, setCallState] = useState(null);


  const [isPayment, setIsPayment] = useState(false);
  const [paymentKind, setPaymentKind] = useState(null);

  // =====================================================
  // INCREASE UNREAD COUNT
  // =====================================================

  const increaseUnreadCount = useCallback(
    (userId, count = 1) => {
      if (!userId) {
        return;
      }

      const id = userId.toString();

      setUnreadCounts((previous) => ({
        ...previous,
        [id]: (previous[id] || 0) + count,
      }));
    },
    []
  );

  // =====================================================
  // CLEAR UNREAD COUNT
  // =====================================================

  const clearUnreadCount = useCallback(
    (userId) => {
      if (!userId) {
        return;
      }

      const id = userId.toString();

      setUnreadCounts((previous) => ({
        ...previous,
        [id]: 0,
      }));
    },
    []
  );

  // =====================================================
  // ADD REALTIME MESSAGE
  // =====================================================

  const addRealtimeMessage = useCallback(
    (senderId, message) => {
      if (!senderId || !message) {
        return;
      }

      const id = senderId.toString();

      setRealtimeMessages((previous) => {
        const existingMessages =
          previous[id] || [];

        return {
          ...previous,
          [id]: [
            ...existingMessages,
            message,
          ],
        };
      });
    },
    []
  );

  // =====================================================
  // CLEAR REALTIME MESSAGES
  // =====================================================

  const clearRealtimeMessage = useCallback(
    (userId) => {
      if (!userId) {
        return;
      }

      const id = userId.toString();

      setRealtimeMessages((previous) => {
        if (!previous[id]) {
          return previous;
        }

        const updated = {
          ...previous,
        };

        delete updated[id];

        return updated;
      });
    },
    []
  );

  // =====================================================
  // SHOW INCOMING CALL
  // =====================================================

  const showIncomingCall = useCallback(
    (callInfo) => {
      if (!callInfo) {
        return;
      }

      console.log(
        "Showing incoming call:",
        callInfo
      );

      setIncomingCall(callInfo);
    },
    []
  );

  // =====================================================
  // CLEAR INCOMING CALL
  // =====================================================

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // =====================================================
  // START ACTIVE CALL
  //
  // callInfo.userId = OTHER USER
  // currentUserId  = CURRENT USER
  //
  // Therefore:
  //
  // callerId   = OTHER USER
  // receiverId = CURRENT USER
  //
  // =====================================================

  // const startActiveCall = useCallback(
  //   (callInfo) => {
  //     if (!callInfo) {
  //       return;
  //     }

  //     const currentUserId =
  //       typeof window !== "undefined"
  //         ? localStorage.getItem("userId")
  //         : null;

  //     if (!currentUserId) {
  //       console.error(
  //         "Cannot start active call: current user ID missing"
  //       );

  //       return;
  //     }

  //     if (!callInfo.userId) {
  //       console.error(
  //         "Cannot start active call: callInfo.userId missing"
  //       );

  //       return;
  //     }

  //     const otherUserId =
  //       callInfo.userId.toString();

  //     const ids = [
  //       currentUserId.toString(),
  //       otherUserId,
  //     ].sort();

  //     const roomId =
  //       callInfo.roomId ||
  //       `call_${ids[0]}_${ids[1]}`;

  //     const activeCallData = {

  //       // =================================================
  //       // OTHER USER
  //       // =================================================

  //       callerId:
  //         otherUserId.toString(),

  //       // =================================================
  //       // CURRENT USER
  //       // =================================================

  //       receiverId:
  //         currentUserId.toString(),

  //       // =================================================
  //       // REMOTE / OTHER USER
  //       // =================================================

  //       userId: otherUserId,

  //       userName:
  //         callInfo.userName,
        

  //       callType:
  //         callInfo.callType === "video"
  //           ? "video"
  //           : "audio",

  //       roomId:
  //         roomId.toString(),

  //       otherPhoto:
  //         callInfo.otherPhoto ||
  //         "/default.png",

  //       ownPhoto:
  //         callInfo.ownPhoto ||
  //         "/default.png",

  //       // =================================================
  //       // ORIGINAL CALL INFORMATION
  //       // =================================================

  //       callInvitationInfo:
  //         callInfo.callInvitationInfo ||
  //         null,
  //     };

  //     console.log(
  //       "Starting active call:",
  //       activeCallData
  //     );

  //     setActiveCall(activeCallData);
  //   },
  //   []
  // );
  const startActiveCall = (callInfo) => {
  const currentUserId = localStorage.getItem("userId");

  if (!currentUserId) {
    console.error("Cannot start call: current user ID is missing.");
    return;
  }

  if (!callInfo?.userId) {
    console.error("Cannot start call: other user ID is missing.");
    return;
  }

  const otherUserId = String(callInfo.userId);
  const normalizedCurrentUserId = String(currentUserId);

  if (otherUserId === normalizedCurrentUserId) {
    console.error("Cannot start a call with yourself.");
    return;
  }

  const ids = [
    normalizedCurrentUserId,
    otherUserId,
  ].sort();

  const roomId =
    callInfo.roomId || `call_${ids[0]}_${ids[1]}`;

  const isCaller =
    String(callInfo.callerId || "") === normalizedCurrentUserId;

  setActiveCall({
    ...callInfo,

    // Always store the actual local and remote user IDs.
    currentUserId: normalizedCurrentUserId,
    userId: otherUserId,
    peerId: otherUserId,

    // Preserve caller and receiver identities.
    callerId: callInfo.callerId
      ? String(callInfo.callerId)
      : isCaller
        ? normalizedCurrentUserId
        : otherUserId,

    receiverId: callInfo.receiverId
      ? String(callInfo.receiverId)
      : isCaller
        ? otherUserId
        : normalizedCurrentUserId,

    roomId,
    callType: callInfo.callType === "video" ? "video" : "audio",
  });
};

  // =====================================================
  // END ACTIVE CALL
  // =====================================================

  const clearActiveCall = useCallback(() => {
    console.log(
      "Ending active call"
    );

    setActiveCall(null);
  }, []);

  // =====================================================
  // CLEAR CALL STATE
  //
  // Useful after the call decision has been processed.
  // =====================================================

  const clearCallState = useCallback(() => {
    console.log(
      "Clearing call state"
    );

    setCallState(null);
  }, []);

  // =====================================================
  // PROVIDER
  // =====================================================

  return (
    <MyContext.Provider
      value={{

        // =================================================
        // PROFILE
        // =================================================

        profileUpdate,
        setProfileUpdate,

        // =================================================
        // PRIVATE MESSAGE
        // =================================================

        isMessageBox,
        setIsMessageBox,

        messageUserId,
        setMessageUserId,

        // =================================================
        // OTHER PROFILE
        // =================================================
        isEditpage,
        setIsEditpage,

        isProfilepage,
        setIsProfilepage,


      //Private match
        isMatchBox,
        setIsMatchBox,

        matchUserId,
        setMatchUserId,

        //Matching with Other Profile
        isMatching,
        setIsMatching,

        // =================================================
        // ACTIVE CHAT
        // =================================================

        activeChatUserIdRef,

        // =================================================
        // UNREAD MESSAGES
        // =================================================

        unreadCounts,
        increaseUnreadCount,
        clearUnreadCount,

        // =================================================
        // REALTIME MESSAGES
        // =================================================

        realtimeMessages,
        addRealtimeMessage,
        clearRealtimeMessage,

        // =================================================
        // INCOMING CALL
        // =================================================

        incomingCall,
        showIncomingCall,
        clearIncomingCall,

        // =================================================
        // ACTIVE CALL
        // =================================================

        activeCall,
        startActiveCall,
        clearActiveCall,

        // =================================================
        // CALL STATE
        // =================================================

        callState,
        setCallState,
        clearCallState,

        // =================================================
        // PAYMENT KIND
        // =================================================

    
        paymentKind,
        setPaymentKind,
        isPayment,
        setIsPayment,





      }}
    >
      {children}
    </MyContext.Provider>
  );
};