import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await connectDB();

    const { userId, isOnline } = await request.json();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isOnline: Boolean(isOnline),
        ...(isOnline
          ? {}
          : {
              lastSeen: new Date(),
            }),
      },
      {
        new: true,
      }
    ).select("isOnline lastSeen");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    });
  } catch (error) {
    console.error("Presence error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update presence",
      },
      { status: 500 }
    );
  }
}