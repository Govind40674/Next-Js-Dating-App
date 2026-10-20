
import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    await connectDB();

    const { userId, fcmToken } = await request.json();

    if (
      !userId ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      typeof fcmToken !== "string" ||
      !fcmToken.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Valid userId and FCM token are required." },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { fcmToken: fcmToken.trim() } },
      { new: true, projection: { _id: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("FCM token save failed:", error);

    return NextResponse.json(
      { success: false, message: "Could not save FCM token." },
      { status: 500 }
    );
  }
}
