
import connectDB from "@/lib/connectDB";
import Message from "@/models/Message";
import User from "@/models/User";
import { adminMessaging } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    await connectDB();

    const { senderId, receiverId, message } = await request.json();

    if (
      !mongoose.Types.ObjectId.isValid(senderId || "") ||
      !mongoose.Types.ObjectId.isValid(receiverId || "") ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Valid senderId, receiverId and message are required." },
        { status: 400 }
      );
    }

    const [sender, receiver] = await Promise.all([
      User.findById(senderId).select("name"),
      User.findById(receiverId).select("name isOnline fcmToken"),
    ]);

    if (!sender || !receiver) {
      return NextResponse.json(
        { success: false, message: "Sender or receiver not found." },
        { status: 404 }
      );
    }

    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message: message.trim(),
      status: "unread",
    });

    // Push notification is attempted only for an offline recipient.
    if (!receiver.isOnline && receiver.fcmToken) {
      try {
        await adminMessaging.send({
          token: receiver.fcmToken,
          data: {
            type: "message",
            title: sender.name
              ? `${sender.name} sent you a message`
              : "New message",
            body: message.trim().slice(0, 180),
            senderId: String(senderId),
            receiverId: String(receiverId),
            messageId: String(newMessage._id),
            url: `/match?messageUserId=${encodeURIComponent(String(senderId))}`,
          },
          webpush: {
            headers: { Urgency: "high" },
          },
        });
      } catch (pushError) {
        console.error("FCM message notification failed:", pushError);

        if (
          [
            "messaging/registration-token-not-registered",
            "messaging/invalid-registration-token",
          ].includes(pushError?.code)
        ) {
          await User.findByIdAndUpdate(receiverId, {
            $unset: { fcmToken: 1 },
          });
        }
      }
    }

    return NextResponse.json(
      { success: true, message: newMessage },
      { status: 201 }
    );
  } catch (error) {
    console.error("Message send failed:", error);

    return NextResponse.json(
      { success: false, message: "Failed to send message." },
      { status: 500 }
    );
  }
}
