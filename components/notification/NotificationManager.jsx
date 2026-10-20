
"use client";

import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";

import { getFirebaseMessaging } from "@/lib/firebase";

export default function NotificationManager() {
  useEffect(() => {
    let unsubscribe = null;

    const initializeFCM = async () => {
      try {
        const userId = localStorage.getItem("userId");

        if (!userId) {
          console.log(
            "No userId found. FCM initialization skipped."
          );
          return;
        }

        /*
         * ==========================================
         * 1. Check browser notification support
         * ==========================================
         */

        if (
          typeof window === "undefined" ||
          !("Notification" in window)
        ) {
          console.log(
            "Browser notifications are not supported."
          );
          return;
        }

        /*
         * ==========================================
         * 2. Ask for notification permission
         * ==========================================
         */

        let permission = Notification.permission;

        if (permission === "default") {
          permission =
            await Notification.requestPermission();
        }

        if (permission !== "granted") {
          console.log(
            "Notification permission not granted."
          );
          return;
        }

        /*
         * ==========================================
         * 3. Get Firebase Messaging
         * ==========================================
         */

        const messaging =
          await getFirebaseMessaging();

        if (!messaging) {
          console.log(
            "Firebase Messaging is not available."
          );
          return;
        }

        /*
         * ==========================================
         * 4. Register Firebase service worker
         * ==========================================
         */

        const registration =
          await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js"
          );

        console.log(
          "Firebase service worker registered:",
          registration
        );

        /*
         * ==========================================
         * 5. Get FCM token
         * ==========================================
         */

        const token = await getToken(
          messaging,
          {
            vapidKey:
              process.env
                .NEXT_PUBLIC_FIREBASE_VAPID_KEY,

            serviceWorkerRegistration:
              registration,
          }
        );

        if (!token) {
          console.log(
            "FCM token was not generated."
          );
          return;
        }

        console.log(
          "FCM token generated successfully."
        );

        /*
         * ==========================================
         * 6. Save token in MongoDB
         * ==========================================
         */

        const response = await fetch(
          "/api/fcm-token",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              userId,
              fcmToken: token,
            }),
          }
        );

        const data = await response.json();

        if (!data.success) {
          console.error(
            "Failed to save FCM token:",
            data
          );

          return;
        }

        console.log(
          "FCM token saved successfully."
        );

        /*
         * ==========================================
         * 7. Listen for foreground messages
         * ==========================================
         */

        unsubscribe = onMessage(
          messaging,
          (payload) => {
            console.log(
              "Foreground FCM message:",
              payload
            );

            /*
             * We do NOT show another browser
             * notification here automatically.
             *
             * CommunicationManager handles
             * real-time ZIM messages.
             *
             * FCM is mainly for the offline/
             * background case.
             */

            const title =
              payload.notification?.title ||
              "New message";

            const body =
              payload.notification?.body ||
              "You received a new message.";

            console.log(
              "FCM notification:",
              title,
              body
            );
          }
        );
      } catch (error) {
        console.error(
          "FCM initialization failed:",
          error
        );
      }
    };

    initializeFCM();

    /*
     * ==========================================
     * CLEANUP
     * ==========================================
     */

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return null;
}
