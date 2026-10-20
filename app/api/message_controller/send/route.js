import connectDB from "@/lib/connectDB";
import Message from "@/models/Message";
import User from "@/models/User";
import admin from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(request) {
try {
await connectDB();


const {
  senderId,
  receiverId,
  message,
} = await request.json();

// =====================================================
// 1. VALIDATE INPUT
// =====================================================

if (
  !senderId ||
  !receiverId ||
  !message?.trim()
) {
  return NextResponse.json(
    {
      success: false,
      message:
        "senderId, receiverId and message are required",
    },
    { status: 400 }
  );
}

// =====================================================
// 2. SAVE MESSAGE IN MONGODB
// =====================================================

const newMessage = await Message.create({
  sender: senderId,
  receiver: receiverId,
  message: message.trim(),
  status: "unread",
});

console.log(
  "Message saved:",
  newMessage._id.toString()
);

// =====================================================
// 3. FIND RECEIVER
// =====================================================

const receiver = await User.findById(
  receiverId
).select(
  "name isOnline fcmToken"
);

if (!receiver) {
  return NextResponse.json(
    {
      success: true,
      message: newMessage,
    },
    { status: 201 }
  );
}

// =====================================================
// 4. SEND FCM ONLY IF RECEIVER IS OFFLINE
// =====================================================

if (
  !receiver.isOnline &&
  receiver.fcmToken
) {
  try {
    const notificationMessage =
      {
        token: receiver.fcmToken,

        notification: {
          title: receiver.name
            ? `${receiver.name} has a new message`
            : "New message",

          body: message.trim(),
        },

        data: {
          type: "message",

          senderId:
            senderId.toString(),

          receiverId:
            receiverId.toString(),

          messageId:
            newMessage._id.toString(),
        },
      };

    await admin
      .messaging()
      .send(notificationMessage);

    console.log(
      "FCM notification sent successfully."
    );
  } catch (fcmError) {
    console.error(
      "FCM notification failed:",
      fcmError
    );

    // -------------------------------------------------
    // Do NOT fail the message request if FCM fails.
    // The message is already saved in MongoDB.
    // -------------------------------------------------

    // Remove invalid FCM token if Firebase says
    // that the token is no longer registered.
    if (
      fcmError?.code ===
        "messaging/registration-token-not-registered" ||
      fcmError?.code ===
        "messaging/invalid-registration-token"
    ) {
      await User.findByIdAndUpdate(
        receiverId,
        {
          $unset: {
            fcmToken: 1,
          },
        }
      );

      console.log(
        "Invalid FCM token removed."
      );
    }
  }
} else {
  console.log(
    "FCM notification skipped:",
    receiver.isOnline
      ? "Receiver is online."
      : "Receiver has no FCM token."
  );
}

// =====================================================
// 5. RETURN SAVED MESSAGE
// =====================================================

return NextResponse.json(
  {
    success: true,
    message: newMessage,
  },
  { status: 201 }
);


} catch (error) {
console.error(
"Error sending message:",
error
);


return NextResponse.json(
  {
    success: false,
    message:
      "Failed to send message",
  },
  { status: 500 }
);


}
}
