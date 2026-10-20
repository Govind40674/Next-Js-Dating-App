
"use client";

import {
  useContext,
  useEffect,
} from "react";

import {
  getToken,
  onMessage,
} from "firebase/messaging";

import {
  getFirebaseMessaging,
} from "@/lib/firebase";

import {
  MyContext,
} from "@/components/myContext/MyContext";

export default function FCMManager({
  children,
}) {
  const {
    increaseUnreadCount,
  } = useContext(MyContext);

  useEffect(() => {
    let unsubscribeMessage = null;

    let isMounted = true;

    const initializeFCM = async () => {
      try {
        // =================================================
        // 1. GET CURRENT USER
        // =================================================

        const userId =
          localStorage.getItem("userId");

        if (!userId) {
          console.log(
            "No userId found. FCM initialization skipped."
          );

          return;
        }

        // =================================================
        // 2. CHECK BROWSER SUPPORT
        // =================================================

        if (
          typeof window === "undefined" ||
          !("Notification" in window) ||
          !("serviceWorker" in navigator)
        ) {
          console.log(
            "FCM is not supported in this browser."
          );

          return;
        }

        // =================================================
        // 3. CHECK NOTIFICATION PERMISSION
        // =================================================

        let permission =
          Notification.permission;

        if (permission === "default") {
          permission =
            await Notification.requestPermission();
        }

        if (permission !== "granted") {
          console.log(
            "Notification permission was not granted."
          );

          return;
        }

        // =================================================
        // 4. GET FIREBASE MESSAGING
        // =================================================

        const messaging =
          await getFirebaseMessaging();

        if (!messaging) {
          console.log(
            "Firebase Messaging is unavailable."
          );

          return;
        }

        // =================================================
        // 5. REGISTER FIREBASE SERVICE WORKER
        // =================================================

        console.log(
          "Registering Firebase service worker..."
        );

        const registration =
          await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js"
          );

        console.log(
          "Firebase service worker registered:",
          registration
        );

        // =================================================
        // 6. WAIT UNTIL SERVICE WORKER IS ACTIVE
        // =================================================

        console.log(
          "Waiting for Firebase service worker to become active..."
        );

        const readyRegistration =
          await navigator.serviceWorker.ready;

        if (!readyRegistration) {
          console.error(
            "Firebase service worker is not ready."
          );

          return;
        }

        console.log(
          "Firebase service worker is active:",
          readyRegistration.active
        );

        // =================================================
        // CHECK COMPONENT IS STILL MOUNTED
        // =================================================

        if (!isMounted) {
          return;
        }

        // =================================================
        // 7. GET VAPID KEY
        // =================================================

        const vapidKey =
          process.env
            .NEXT_PUBLIC_FIREBASE_VAPID_KEY;

        if (!vapidKey) {
          console.error(
            "NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing."
          );

          return;
        }

        // =================================================
        // 8. GET FCM TOKEN
        // =================================================

        console.log(
          "Requesting FCM token..."
        );

        const token =
          await getToken(
            messaging,
            {
              vapidKey,

              serviceWorkerRegistration:
                readyRegistration,
            }
          );

        if (!token) {
          console.log(
            "FCM token was not generated."
          );

          return;
        }

        console.log(
          "FCM token received:",
          token
        );

        // =================================================
        // 9. SAVE TOKEN TO DATABASE
        // =================================================

        const response =
          await fetch(
            "/api/fcm-token",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                userId,

                fcmToken:
                  token,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          console.error(
            "Failed to save FCM token:",
            data
          );

          return;
        }

        console.log(
          "FCM token saved successfully."
        );

        // =================================================
        // 10. FOREGROUND MESSAGE LISTENER
        // =================================================

        unsubscribeMessage =
          onMessage(
            messaging,
            (payload) => {
              console.log(
                "Foreground FCM message:",
                payload
              );

              const senderId =
                payload.data?.senderId;

              const receiverId =
                payload.data?.receiverId;

              const messageId =
                payload.data?.messageId;

              const messageText =
                payload.notification?.body ||
                payload.data?.message ||
                "New message";

              // -------------------------------------------
              // Ignore invalid messages
              // -------------------------------------------

              if (!senderId) {
                return;
              }

              // -------------------------------------------
              // Make sure notification belongs to user
              // -------------------------------------------

              if (
                receiverId &&
                receiverId.toString() !==
                  userId.toString()
              ) {
                return;
              }

              // -------------------------------------------
              // Increase unread count
              // -------------------------------------------

              increaseUnreadCount(
                senderId,
                1
              );

              console.log(
                "Foreground FCM message received:",
                {
                  senderId,
                  receiverId,
                  messageId,
                  messageText,
                }
              );
            }
          );

        console.log(
          "FCM initialization completed successfully."
        );
      } catch (error) {
        console.error(
          "FCM initialization failed:",
          error
        );
      }
    };

    initializeFCM();

    // =================================================
    // CLEANUP
    // =================================================

    return () => {
      isMounted = false;

      if (unsubscribeMessage) {
        unsubscribeMessage();

        unsubscribeMessage = null;
      }
    };
  }, [increaseUnreadCount]);

  return children;
}
