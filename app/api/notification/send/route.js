import { NextResponse } from "next/server";
import { adminMessaging } from "@/lib/firebase-admin";

export async function POST(request) {
try {
const { fcmToken, title, body, data } = await request.json();


// Validate FCM token
if (!fcmToken) {
  return NextResponse.json(
    {
      success: false,
      message: "FCM token is required",
    },
    { status: 400 }
  );
}

// Firebase Cloud Messaging requires data values to be strings.
const notificationData = {};

if (data && typeof data === "object") {
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      notificationData[key] = String(value);
    }
  }
}

// Build FCM message
const message = {
  token: fcmToken,
  notification: {
    title: title || "New Message",
    body: body || "You received a new message",
  },
  data: notificationData,
};

// Send notification
const response = await adminMessaging.send(message);

console.log("FCM notification sent:", response);

return NextResponse.json({
  success: true,
  messageId: response,
});

} catch (error) {
console.error("FCM notification error:", error);


return NextResponse.json(
  {
    success: false,
    message: error.message || "Failed to send notification",
  },
  { status: 500 }
);


}
}
