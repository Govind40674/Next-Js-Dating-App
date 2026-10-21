
import connectDB from "@/lib/connectDB";
import Message from "@/models/Message";
import User from "@/models/User";
// import { adminMessaging } from "@/lib/firebase-admin";
import { getAdminMessaging } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    await connectDB();

    const { senderId, receiverId, message } = await request.json();

    // Validate request
    if (
      !mongoose.Types.ObjectId.isValid(senderId || "") ||
      !mongoose.Types.ObjectId.isValid(receiverId || "") ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid senderId, receiverId and message are required.",
        },
        { status: 400 }
      );
    }

    if (String(senderId) === String(receiverId)) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot send a message to yourself.",
        },
        { status: 400 }
      );
    }

    // Fetch sender and recipient
    const [sender, receiver] = await Promise.all([
      User.findById(senderId).select("name"),
      User.findById(receiverId).select(
        "name isOnline fcmToken notificationsEnabled"
      ),
    ]);

    if (!sender || !receiver) {
      return NextResponse.json(
        {
          success: false,
          message: "Sender or receiver not found.",
        },
        { status: 404 }
      );
    }

    // Save the message first
    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message: message.trim(),
      status: "unread",
    });

    // Do not log the FCM token itself.
    console.log("[FCM] Recipient check:", {
      receiverId: String(receiverId),
      isOnline: Boolean(receiver.isOnline),
      hasFcmToken: Boolean(receiver.fcmToken),
      notificationsEnabled: receiver.notificationsEnabled !== false,
    });

    let notificationStatus = "skipped";
    let notificationReason = "";

    // Send push notifications only to offline recipients.
    if (receiver.notificationsEnabled === false) {
      notificationReason = "Notifications are disabled for this user.";
      console.log("[FCM] Skipped:", notificationReason);
    } else if (receiver.isOnline) {
      notificationReason = "Recipient is marked online.";
      console.log("[FCM] Skipped:", notificationReason);
    } else if (!receiver.fcmToken) {
      notificationReason = "Recipient has no saved FCM token.";
      console.warn("[FCM] Skipped:", notificationReason);
    } else {
      try {
        const fcmMessageId = await getAdminMessaging().send({
          token: receiver.fcmToken,

          // All FCM data values must be strings.
          data: {
            type: "message",
            title: sender.name
              ? `${sender.name} sent you a message`
              : "New message",
            body: message.trim().slice(0, 180),
            senderId: String(senderId),
            receiverId: String(receiverId),
            messageId: String(newMessage._id),
            url: `/match?messageUserId=${encodeURIComponent(
              String(senderId)
            )}`,
          },

          webpush: {
            headers: {
              Urgency: "high",
            },
          },
        });

        notificationStatus = "sent";
        notificationReason = "Firebase accepted the push request.";

        console.log(
          "[FCM] Firebase accepted push:",
          fcmMessageId
        );
      } catch (pushError) {
        notificationStatus = "failed";
        notificationReason =
          "Firebase failed to accept the push request.";

        console.error("[FCM] Push failed:", {
          code: pushError?.code,
          message: pushError?.message,
          receiverId: String(receiverId),
        });

        const invalidTokenCodes = [
          "messaging/registration-token-not-registered",
          "messaging/invalid-registration-token",
        ];

        if (invalidTokenCodes.includes(pushError?.code)) {
          try {
            // Delete only the token that actually failed.
            // A newer token, if saved meanwhile, is preserved.
            const cleanup = await User.updateOne(
              {
                _id: receiverId,
                fcmToken: receiver.fcmToken,
              },
              {
                $unset: { fcmToken: "" },
              }
            );

            console.warn("[FCM] Stale token cleanup:", {
              receiverId: String(receiverId),
              removed: cleanup.modifiedCount === 1,
            });
          } catch (cleanupError) {
            console.error(
              "[FCM] Could not clean up stale token:",
              cleanupError.message
            );
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: newMessage,
        notification: {
          status: notificationStatus,
          reason: notificationReason,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Message API] Failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to send message.",
      },
      { status: 500 }
    );
  }
}
