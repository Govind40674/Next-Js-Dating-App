
/* global importScripts, firebase */

// =====================================================
// FIREBASE COMPAT SDK
// =====================================================

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
);

// =====================================================
// FIREBASE INITIALIZATION
// =====================================================

firebase.initializeApp({
  apiKey: "AIzaSyB8Dk5p04ZFE252IFm-aQ1wal5AnbRJ6KM",
  authDomain: "datingapp-8f56f.firebaseapp.com",
  projectId: "datingapp-8f56f",
  storageBucket: "datingapp-8f56f.firebasestorage.app",
  messagingSenderId: "981511900281",
  appId: "1:981511900281:web:2a7cc4d0b5b372fdcc98a8",
});

// =====================================================
// FIREBASE MESSAGING
// =====================================================

const messaging = firebase.messaging();

// =====================================================
// BACKGROUND MESSAGE
// =====================================================

messaging.onBackgroundMessage((payload) => {
  console.log("Background FCM message:", payload);

  const notificationTitle =
    payload.notification?.title || "New message";

  const notificationBody =
    payload.notification?.body ||
    payload.data?.message ||
    "You received a new message.";

  const senderId =
    payload.data?.senderId || "";

  const receiverId =
    payload.data?.receiverId || "";

  const messageId =
    payload.data?.messageId || "";

  const notificationData = {
    type:
      payload.data?.type ||
      "message",

    senderId,
    receiverId,
    messageId,
  };

  self.registration.showNotification(
    notificationTitle,
    {
      body: notificationBody,

      icon: "/icon.png",

      data: notificationData,
    }
  );
});

// =====================================================
// NOTIFICATION CLICK
// =====================================================

self.addEventListener(
  "notificationclick",
  (event) => {
    console.log(
      "Notification clicked:",
      event.notification
    );

    event.notification.close();

    const data =
      event.notification.data || {};

    const senderId =
      data.senderId;

    // =================================================
    // NO SENDER ID
    // =================================================

    if (!senderId) {
      event.waitUntil(
        clients.openWindow("/match")
      );

      return;
    }

    // =================================================
    // OPEN CHAT
    // =================================================

    const url =
      `/match?messageUserId=${encodeURIComponent(
        senderId
      )}`;

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // -------------------------------------------
          // WEBSITE ALREADY OPEN
          // -------------------------------------------

          for (const client of clientList) {
            if (
              "navigate" in client &&
              "focus" in client
            ) {
              return client
                .navigate(url)
                .then(() => client.focus());
            }
          }

          // -------------------------------------------
          // WEBSITE NOT OPEN
          // -------------------------------------------

          if (clients.openWindow) {
            return clients.openWindow(url);
          }

          return undefined;
        })
    );
  }
);
