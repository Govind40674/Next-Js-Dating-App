
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || payload.notification?.title || "New notification";
  const body = data.body || payload.notification?.body || "You have a new notification";

  const options = {
    body,
    icon: "/default.png",
    data: {
      url: data.url || "/match",
      type: data.type || "message",
      senderId: data.senderId || "",
      callerId: data.callerId || "",
      callType: data.callType || "",
      roomId: data.roomId || "",
      callID: data.callID || "",
    },
    tag: data.callID || data.messageId || `${data.type || "notification"}-${Date.now()}`,
    renotify: false,
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = new URL(data.url || "/match", self.location.origin);

  if (data.type === "message" && data.senderId) {
    url.pathname = "/match";
    url.searchParams.set("messageUserId", data.senderId);
  }

  if (data.type === "call") {
    url.pathname = "/match";
    url.searchParams.set("incomingCall", "1");

    if (data.callerId) url.searchParams.set("callerId", data.callerId);
    if (data.callType) url.searchParams.set("callType", data.callType);
    if (data.roomId) url.searchParams.set("roomId", data.roomId);
    if (data.callID) url.searchParams.set("callID", data.callID);
  }

  event.waitUntil((async () => {
    const targetUrl = url.href;
    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }

    return self.clients.openWindow(targetUrl);
  })());
});
