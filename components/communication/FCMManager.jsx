"use client";

import { useContext, useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { useRouter } from "next/navigation";
import { getFirebaseMessaging } from "@/lib/firebase";
import { MyContext } from "@/components/myContext/MyContext";

export default function FCMManager({ children }) {
  const { increaseUnreadCount } = useContext(MyContext);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let unsubscribeMessage = null;

    async function initializeFCM() {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
          console.info("Browser push notifications are not supported.");
          return;
        }

        // Request permission only when it has not already been decided.
        let permission = Notification.permission;

        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted" || cancelled) return;

        const messaging = await getFirebaseMessaging();
        if (!messaging || cancelled) return;

        // await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        // const registration = await navigator.serviceWorker.ready;

        // const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        // if (!vapidKey) {
        //   console.error("NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing.");
        //   return;
        // }

        // const token = await getToken(messaging, {
        //   vapidKey,
        //   serviceWorkerRegistration: registration,
        // });

        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { updateViaCache: "none" },
        );

        await navigator.serviceWorker.ready;

        if (cancelled) return;

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

        if (!vapidKey) {
          throw new Error("NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing.");
        }

        if (!registration.active) {
          throw new Error("Firebase messaging service worker is not active.");
        }

        console.info("[FCM] Service worker:", registration.active.scriptURL);

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (!token || cancelled) {
          console.error("[FCM] No valid token was obtained.");
          return;
        }

        console.info("[FCM] Token obtained:", Boolean(token));

        if (!token || cancelled) return;

        const response = await fetch("/api/fcm-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, fcmToken: token }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not save FCM token.");
        }

        unsubscribeMessage = onMessage(messaging, (payload) => {
          if (cancelled) return;

          const data = payload.data || {};
          const type = data.type || "message";
          const senderId = data.senderId;
          const receiverId = data.receiverId;

          if (receiverId && String(receiverId) !== String(userId)) return;

          // Update unread count for incoming chat messages.
          if (type === "message" && senderId) {
            increaseUnreadCount(String(senderId), 1);
          }

          // Foreground messages do not automatically show a system notification.
          // The page is already open, so show one explicitly.
          const title =
            data.title ||
            payload.notification?.title ||
            (type === "call" ? "Incoming call" : "New message");

          const body =
            data.body ||
            payload.notification?.body ||
            (type === "call"
              ? "Someone is calling you."
              : "You received a message.");

          if (Notification.permission === "granted") {
            const notification = new Notification(title, {
              body,
              icon: "/default.png",
              tag: data.callID || data.messageId || `fcm-${Date.now()}`,
            });

            notification.onclick = () => {
              window.focus();

              if (type === "message" && senderId) {
                router.push(
                  `/match?messageUserId=${encodeURIComponent(senderId)}`,
                );
              } else if (type === "call") {
                const params = new URLSearchParams({
                  incomingCall: "1",
                  ...(data.callerId ? { callerId: data.callerId } : {}),
                  ...(data.callType ? { callType: data.callType } : {}),
                  ...(data.roomId ? { roomId: data.roomId } : {}),
                  ...(data.callID ? { callID: data.callID } : {}),
                });

                router.push(`/match?${params.toString()}`);
              }
            };
          }
        });

        console.info("FCM initialization completed.");
      } catch (error) {
        if (!cancelled) {
          console.error("FCM initialization failed:", error);
        }
      }
    }

    initializeFCM();

    return () => {
      cancelled = true;
      if (unsubscribeMessage) unsubscribeMessage();
    };
  }, [increaseUnreadCount, router]);

  return children;
}
