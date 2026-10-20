
import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import { adminMessaging } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    await connectDB();

    const {
      callerId,
      receiverId,
      callerName,
      callType,
      roomId,
      callID,
    } = await request.json();

    if (
      !mongoose.Types.ObjectId.isValid(callerId || "") ||
      !mongoose.Types.ObjectId.isValid(receiverId || "") ||
      !["audio", "video"].includes(callType) ||
      typeof roomId !== "string" ||
      !roomId.trim() ||
      typeof callID !== "string" ||
      !callID.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid call notification data." },
        { status: 400 }
      );
    }

    const [caller, receiver] = await Promise.all([
      User.findById(callerId).select("name"),
      User.findById(receiverId).select("name isOnline fcmToken"),
    ]);

    if (!caller || !receiver) {
      return NextResponse.json(
        { success: false, message: "Caller or receiver not found." },
        { status: 404 }
      );
    }

    // Do not send a push if the recipient is currently online.
    if (receiver.isOnline || !receiver.fcmToken) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: receiver.isOnline ? "receiver-online" : "no-fcm-token",
      });
    }

    const safeCallerName = callerName || caller.name || "Someone";
    const title = `${safeCallerName} is calling you`;
    const body = `Incoming ${callType} call`;

    const messageId = await adminMessaging.send({
      token: receiver.fcmToken,
      data: {
        type: "call",
        title,
        body,
        callerId: String(callerId),
        receiverId: String(receiverId),
        callerName: safeCallerName,
        callType,
        roomId: roomId.trim(),
        callID: callID.trim(),
        url: "/match",
      },
      webpush: {
        headers: { Urgency: "high", TTL: "60" },
      },
    });

    return NextResponse.json({
      success: true,
      sent: true,
      messageId,
    });
  } catch (error) {
    console.error("Call notification failed:", error);

    return NextResponse.json(
      { success: false, message: "Failed to send call notification." },
      { status: 500 }
    );
  }
}
