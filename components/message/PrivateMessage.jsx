"use client";

import React, {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import axios from "axios";

import Image from "next/image";

import { MyContext } from "@/components/myContext/MyContext";

import sendCallInvitation from "@/lib/zegoCall";



import styles from "./PrivateMessage.module.css";

const PrivateMessage = ({
  messageUserId,
}) => {
  const {
    realtimeMessages,
    clearUnreadCount,
    activeChatUserIdRef,
    clearRealtimeMessage,

    // setActiveCall,
    activeCall,
    startActiveCall,
    clearActiveCall,
  } = useContext(MyContext);

  // =====================================================
  // USER
  // =====================================================

  const [messageUser, setMessageUser] =
    useState(null);

  // =====================================================
  // MESSAGES
  // =====================================================

  const [messages, setMessages] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [loadingUser, setLoadingUser] =
    useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(true);

  // =====================================================
  // CALLING
  // =====================================================

  const [calling, setCalling] =
    useState(false);

  // =====================================================
  // REFS
  // =====================================================

  const messagesEndRef =
    useRef(null);

  const processedMessageIdsRef =
    useRef(new Set());

  // =====================================================
  // CURRENT USER ID
  // =====================================================

  const getCurrentUserId = () => {
    if (
      typeof window === "undefined"
    ) {
      return null;
    }

    return localStorage.getItem(
      "userId"
    );
  };

  // =====================================================
  // ACTIVE CHAT USER
  // =====================================================

  useEffect(() => {
    if (!messageUserId) {
      activeChatUserIdRef.current =
        null;

      return;
    }

    const userId =
      messageUserId.toString();

    activeChatUserIdRef.current =
      userId;

    console.log(
      "Active chat user set:",
      userId
    );

    return () => {
      if (
        activeChatUserIdRef.current ===
        userId
      ) {
        activeChatUserIdRef.current =
          null;
      }

      console.log(
        "Active chat user cleared:",
        userId
      );
    };
  }, [
    messageUserId,
    activeChatUserIdRef,
  ]);

  // =====================================================
  // NORMALIZE MESSAGE
  // =====================================================

  const normalizeMessage = (
    incomingMessage
  ) => {
    const currentUserId =
      getCurrentUserId();

    return {
      _id:
        incomingMessage?.messageId ||
        incomingMessage?.messageID ||
        incomingMessage?._id ||
        `${Date.now()}-${Math.random()}`,

      senderId:
        incomingMessage?.senderId?._id ||
        incomingMessage?.senderId ||
        incomingMessage?.senderUserID ||
        incomingMessage?.sender,

      receiverId:
        incomingMessage?.receiverId?._id ||
        incomingMessage?.receiverId ||
        incomingMessage?.receiverUserID ||
        currentUserId,

      message:
        incomingMessage?.message ||
        "",

      status:
        incomingMessage?.status ||
        "read",

      timestamp:
        incomingMessage?.timestamp
          ? new Date(
              incomingMessage.timestamp
            )
          : new Date(),
    };
  };

  // =====================================================
  // GET MESSAGE ID
  // =====================================================

  const getMessageId = (item) => {
    const id =
      item?.messageId ||
      item?.messageID ||
      item?._id ||
      null;

    return id?.toString() || null;
  };

  // =====================================================
  // SCROLL
  // =====================================================

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView(
        {
          behavior: "smooth",
        }
      );
    }, 50);
  };

  // =====================================================
  // FETCH USER + OLD MESSAGES
  // =====================================================

  useEffect(() => {
    if (!messageUserId) {
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoadingUser(true);
        setLoadingMessages(true);

        const currentUserId =
          getCurrentUserId();

        if (!currentUserId) {
          return;
        }

        const [
          userResponse,
          messageResponse,
        ] = await Promise.all([
          axios.get(
            "/api/profile_controller/profile",
            {
              params: {
                userId:
                  messageUserId,
              },
            }
          ),

          axios.get(
            "/api/message_controller/messages",
            {
              params: {
                userId:
                  currentUserId,

                messageUserId:
                  messageUserId,
              },
            }
          ),
        ]);

        if (cancelled) {
          return;
        }

        // =================================================
        // USER
        // =================================================

        if (
          userResponse.data.success
        ) {
          setMessageUser(
            userResponse.data.user
          );
        } else {
          setMessageUser(null);
        }

        // =================================================
        // OLD MESSAGES
        // =================================================

        if (
          messageResponse.data.success
        ) {
          const oldMessages =
            messageResponse.data.messages ||
            [];

          oldMessages.forEach(
            (item) => {
              const id =
                getMessageId(item);

              if (id) {
                processedMessageIdsRef.current.add(
                  id
                );
              }
            }
          );

          setMessages(
            oldMessages
          );
        } else {
          setMessages([]);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Error loading private message:",
          error.response?.data ||
            error.message
        );

        setMessageUser(null);
        setMessages([]);
      } finally {
        if (!cancelled) {
          setLoadingUser(false);
          setLoadingMessages(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [messageUserId]);

  // =====================================================
  // MARK MESSAGES AS READ
  // =====================================================

  useEffect(() => {
    if (!messageUserId) {
      return;
    }

    const markMessagesRead =
      async () => {
        try {
          const currentUserId =
            getCurrentUserId();

          if (!currentUserId) {
            return;
          }

          await axios.post(
            "/api/message_controller/read",
            {
              userId:
                currentUserId,

              otherUserId:
                messageUserId,
            }
          );

          clearUnreadCount(
            messageUserId
          );
        } catch (error) {
          console.error(
            "Mark read error:",
            error.response?.data ||
              error.message
          );
        }
      };

    markMessagesRead();
  }, [
    messageUserId,
    clearUnreadCount,
  ]);

  // =====================================================
  // REALTIME MESSAGE
  // =====================================================

  useEffect(() => {
    if (!messageUserId) {
      return;
    }

    const userId =
      messageUserId.toString();

    const incomingMessages =
      realtimeMessages[userId];

    if (
      !incomingMessages?.length
    ) {
      return;
    }

    console.log(
      "Realtime messages for current chat:",
      incomingMessages
    );

    setMessages((previous) => {
      const existingIds =
        new Set(
          previous
            .map((item) =>
              getMessageId(item)
            )
            .filter(Boolean)
            .map((id) =>
              id.toString()
            )
        );

      const newMessages = [];

      incomingMessages.forEach(
        (incomingMessage) => {
          if (!incomingMessage) {
            return;
          }

          const normalized =
            normalizeMessage(
              incomingMessage
            );

          const messageId =
            getMessageId(
              normalized
            );

          if (!messageId) {
            return;
          }

          const id =
            messageId.toString();

          if (
            existingIds.has(id)
          ) {
            console.log(
              "Message already exists:",
              id
            );

            return;
          }

          existingIds.add(id);

          processedMessageIdsRef.current.add(
            id
          );

          newMessages.push(
            normalized
          );
        }
      );

      if (
        newMessages.length === 0
      ) {
        return previous;
      }

      console.log(
        "Adding messages to current chat:",
        newMessages
      );

      return [
        ...previous,
        ...newMessages,
      ];
    });

    // ===================================================
    // CLEAR AFTER PROCESSING
    // ===================================================

    clearRealtimeMessage(
      userId
    );
  }, [
    realtimeMessages,
    messageUserId,
    // clearRealtimeMessage,
  ]);

  // =====================================================
  // SCROLL WHEN MESSAGES CHANGE
  // =====================================================

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const handleSendMessage =
    async () => {
      const text =
        message.trim();

      if (!text) {
        return;
      }

      const currentUserId =
        getCurrentUserId();

      if (
        !currentUserId ||
        !messageUserId
      ) {
        return;
      }

      try {
        // ===============================================
        // 1. SAVE TO MONGODB
        // ===============================================

        const response =
          await axios.post(
            "/api/message_controller/send",
            {
              senderId:
                currentUserId,

              receiverId:
                messageUserId,

              message: text,
            }
          );

        if (
          !response.data.success
        ) {
          return;
        }

        // ===============================================
        // 2. ADD TO CURRENT UI
        // ===============================================

        const savedMessage =
          response.data.message;

        const savedMessageId =
          getMessageId(
            savedMessage
          );

        if (savedMessageId) {
          processedMessageIdsRef.current.add(
            savedMessageId
          );
        }

        setMessages(
          (previous) => [
            ...previous,
            savedMessage,
          ]
        );

        setMessage("");

        scrollToBottom();

        // ===============================================
        // 3. GET EXISTING ZIM
        // ===============================================

        const {
          getZIM,
        } = await import(
          "@/lib/zim"
        );

        const zim =
          await getZIM();

        if (!zim) {
          console.error(
            "ZIM is not initialized"
          );

          return;
        }

        // ===============================================
        // 4. SEND THROUGH ZIM
        // ===============================================

        const config = {
          priority: 1,
        };

        console.log(
          "========== ZIM SEND =========="
        );

        console.log(
          "Receiver:",
          messageUserId.toString()
        );

        console.log(
          "Text:",
          text
        );

        console.log(
          "==============================",
          messageUserId.toString(),
        );
        

        const result =
          await zim.sendMessage(
            {
              type: 1,
              message: text,
              messageId: savedMessageId,
            },

            messageUserId.toString(),

            0,

            config
          );

        console.log(
          "ZIM message sent:",
          {
            receiverId:
              messageUserId,

            message: text,

            zimMessage:
              result?.message,
          }
        );
      } catch (error) {
        console.log(
          "Error sending message:",
          error.response?.data ||
            error.message
        );
      }
    };

  // =====================================================
  // AUDIO CALL
  // =====================================================

// const handleAudioCall = async () => {
//   if (!messageUserId || calling || activeCall) {
//     return;
//   }

//   try {
//     setCalling(true);

//     console.log("Starting audio call:", {
//       receiverId: messageUserId,
//     });

//     const callInfo = await sendCallInvitation({
//       receiverId: messageUserId,
//       callType: "audio",

//       // Person receiving the call
//       otherPhoto:
//         messageUser?.photo?.[0] || "/default.png",

//       // Person making the call
//       ownPhoto:
//         localStorage.getItem("profile_photo") ||
//         "/default.png",

//       callerName: messageUser?.name || "User",
//     });

//     console.log("Audio call invitation sent:", {
//       callerId: callInfo.callerId,
//       receiverId: callInfo.receiverId,
//       roomId: callInfo.roomId,
//     });

//     startActiveCall(callInfo);
//   } catch (error) {
//     console.error("Audio call failed:", error);
//   } finally {
//     setCalling(false);
//   }
// };
const handleAudioCall = async () => {
  if (!messageUserId || calling || activeCall) {
    return;
  }

  let outgoingCallStarted = false;

  try {
    setCalling(true);

    console.log("[CALL] Starting audio call:", {
      receiverId: messageUserId,
    });

    const callInfo = await sendCallInvitation({
      receiverId: messageUserId,
      callType: "audio",

      otherPhoto:
        messageUser?.photo?.[0] || "/default.png",

      ownPhoto:
        localStorage.getItem("profile_photo") ||
        "/default.png",

      callerName: messageUser?.name || "User",

      // This executes BEFORE zim.callInvite().
      onInvitationStarted: (pendingCallInfo) => {
        console.log(
          "[CALL] Starting local audio stream before invitation:",
          pendingCallInfo
        );

        outgoingCallStarted = true;

        // Mount ActiveCall immediately.
        // It can join the ZEGO room and publish audio while
        // the other user's phone is ringing.
        startActiveCall(pendingCallInfo);
      },
    });

    console.log("[CALL] Audio invitation sent:", {
      callerId: callInfo.callerId,
      receiverId: callInfo.receiverId,
      roomId: callInfo.roomId,
    });

    // Do NOT call startActiveCall(callInfo) again here.
    // It has already been called before the invitation was sent.
  } catch (error) {
    console.log("[CALL] Audio call failed:", error);

    // If the invitation fails, close the outgoing call UI and
    // let ActiveCall perform its normal media cleanup.
    if (outgoingCallStarted) {
      clearActiveCall();
    }
  } finally {
    setCalling(false);
  }
};

  // =====================================================
  // VIDEO CALL
  // =====================================================

  // const handleVideoCall =
  //   async () => {
  //     if (
  //       !messageUserId ||
  //       calling ||
  //       activeCall
  //     ) {
  //       return;
  //     }

  //     try {
  //       setCalling(true);

  //       console.log(
  //         "Starting video call:",
  //         {
  //           receiverId:
  //             messageUserId,
  //         }
  //       );

  //       // ===============================================
  //       // SEND INVITATION
  //       // ===============================================

  //       const callInfo =
  //         await sendCallInvitation({
  //           receiverId:
  //             messageUserId,

  //           callType:
  //             "video",
            
  //           callerName:
  //             messageUser?.name,

  //           otherPhoto:
  //             messageUser?.photo?.[0] ||
  //             "/default.png",

  //           ownPhoto:localStorage.getItem("profile_photo")||"/default.png",
  //         });

  //       console.log(
  //         "Video call invitation sent:",
  //         callInfo
  //       );

  //       // ===============================================
  //       // START CALLER'S ACTIVE CALL
  //       // ===============================================

  //       // setActiveCall({
  //       //   userId:
  //       //     callInfo.receiverId,

  //       //   receiverId:
  //       //     callInfo.userId,

  //       //   userName:
  //       //     callInfo.userName ||
  //       //     messageUser?.name ||
  //       //     "User",

  //       //   callType:
  //       //     "video",

  //       //   roomId:
  //       //     callInfo.roomId,
  //       // });

  //       startActiveCall(callInfo);
  //     } catch (error) {
  //       console.log(
  //         "Video call failed:",
  //         error
  //       );
  //     } finally {
  //       setCalling(false);
  //     }
  //   };

  const handleVideoCall = async () => {
  if (!messageUserId || calling || activeCall) {
    return;
  }

  let outgoingCallStarted = false;

  try {
    setCalling(true);

    console.log("[CALL] Starting video call:", {
      receiverId: messageUserId,
    });

    const callInfo = await sendCallInvitation({
      receiverId: messageUserId,
      callType: "video",

      callerName: messageUser?.name || "User",

      otherPhoto:
        messageUser?.photo?.[0] || "/default.png",

      ownPhoto:
        localStorage.getItem("profile_photo") ||
        "/default.png",

      // Start the caller's ZEGO initialization before
      // transmitting the invitation to the receiver.
      onInvitationStarted: (pendingCallInfo) => {
        console.log(
          "[CALL] Starting local video/audio before invitation:",
          pendingCallInfo
        );

        outgoingCallStarted = true;

        startActiveCall(pendingCallInfo);
      },
    });

    console.log("[CALL] Video invitation sent:", {
      callerId: callInfo.callerId,
      receiverId: callInfo.receiverId,
      roomId: callInfo.roomId,
    });

    // Do not call startActiveCall a second time.
  } catch (error) {
    console.error("[CALL] Video call failed:", error);

    if (outgoingCallStarted) {
      clearActiveCall();
    }
  } finally {
    setCalling(false);
  }
};

  // =====================================================
  // CLOSE CALL
  // =====================================================



  // =====================================================
  // LOADING
  // =====================================================

  if (loadingUser) {
    return (
      <div className="privateMessage">
        <div className="loading">
          Loading user...
        </div>
      </div>
    );
  }

  // =====================================================
  // USER NOT FOUND
  // =====================================================

  if (!messageUser) {
    return (
      <div className="privateMessage">
        <div className="loading">
          User not found
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <>
      <div
        className={
          styles.privateMessage
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className={
            styles.messageHeader
          }
        >
          <div
            className={
              styles.userInfo
            }
          >
            <div
              className={
                styles.userImage
              }
            >
              <Image
                src={
                  messageUser?.photo?.[0] ||
                  "/default.png"
                }
                alt={
                  messageUser?.name ||
                  "Bot"
                }
                width={45}
                height={45}
              />
            </div>

            <div
              className={
                styles.userDetails
              }
            >
              <h3>
                {messageUser?.name ||
                  "User"}
              </h3>

              {messageUser?.isOnline ? (
                <span
                  className={
                    styles.online
                  }
                >
                  Online
                </span>
              ) : (
                <span
                  className={
                    styles.offline
                  }
                >
                  {messageUser?.lastSeen
                    ? `Last seen ${new Date(
                        messageUser.lastSeen
                      ).toLocaleString()}`
                    : "Offline"}
                </span>
              )}
            </div>
          </div>

          {/* =================================================
              CALL BUTTONS
          ================================================= */}

          <div
            className={
              styles.callButtons
            }
          >
            <button
              type="button"
              onClick={
                handleAudioCall
              }
              disabled={
                calling ||
                !!activeCall
              }
              aria-label="Audio call"
            >
              📞
            </button>

            <button
              type="button"
              onClick={
                handleVideoCall
              }
              disabled={
                calling ||
                !!activeCall
              }
              aria-label="Video call"
            >
              📹
            </button>
          </div>
        </div>

        {/* =================================================
            MESSAGES
        ================================================= */}

        <div
          className={
            styles.messages
          }
        >
          {loadingMessages ? (
            <div
              className={
                styles.messageLoading
              }
            >
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div
              className={
                styles.noMessages
              }
            >
              <p>
                No messages yet
              </p>

              <span>
                Send a message to
                start the
                conversation.
              </span>
            </div>
          ) : (
            messages.map(
              (item, index) => {
                const currentUserId =
                  getCurrentUserId();

                const senderId =
                  item?.senderId?._id ||
                  item?.senderId ||
                  item?.sender ||
                  item?.senderUserID;

                const isMine =
                  senderId
                    ?.toString() ===
                  currentUserId?.toString();

                return (
                  <div
                    key={
                      getMessageId(
                        item
                      ) || index
                    }
                    className={
                      isMine
                        ? `${styles.messageRow} ${styles.myMessageRow}`
                        : `${styles.messageRow} ${styles.theirMessageRow}`
                    }
                  >
                    <div
                      className={
                        isMine
                          ? `${styles.messageBubble} ${styles.myMessage}`
                          : `${styles.messageBubble} ${styles.theirMessage}`
                      }
                    >
                      {item?.message}
                    </div>
                  </div>
                );
              }
            )
          )}

          <div
            ref={
              messagesEndRef
            }
          />
        </div>

        {/* =================================================
            INPUT
        ================================================= */}

        <div
          className={
            styles.messageInput
          }
        >
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter"
              ) {
                e.preventDefault();

                handleSendMessage();
              }
            }}
          />

          <button
            type="button"
            onClick={
              handleSendMessage
            }
            disabled={
              !message.trim()
            }
          >
            Send
          </button>
        </div>
      </div>

  


    </>
  );
};

export default React.memo(
  PrivateMessage
);