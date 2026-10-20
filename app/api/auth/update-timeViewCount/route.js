import connectDB from "@/lib/connectDB";
import { NextResponse } from "next/server";
import User from "@/models/User";

export async function POST(request) {
  try {
    await connectDB();

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    // Handle a missing or invalid startTime safely.
    const startTime = user.startTime
      ? new Date(user.startTime).getTime()
      : NaN;

    const shouldReset =
      !Number.isFinite(startTime) ||
      now - startTime >= twentyFourHours;

    if (shouldReset) {
      user.todayViewCount = 0;
      user.startTime = new Date(now);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      todayViewCount: user.todayViewCount,
    });
  } catch (error) {
    console.error("Update time view count error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}