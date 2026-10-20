import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await connectDB();

    const {
      userId,
      fcmToken,
    } = await request.json();

    if (!userId || !fcmToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User ID and FCM token are required",
        },
        { status: 400 }
      );
    }

    await User.findByIdAndUpdate(
      userId,
      {
        fcmToken,
      }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "FCM token error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 }
    );
  }
}