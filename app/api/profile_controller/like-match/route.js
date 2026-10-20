import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await connectDB();

    const { userId, targetUserId } = await request.json();

    // Correct validation
    if (!userId || !targetUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID and Target User ID are required",
        },
        { status: 400 },
      );
    }

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);

    if (!user || !targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User or target user not found",
        },
        { status: 404 },
      );
    }

    // --------------------------------
    // Check 24-hour period
    // --------------------------------

    const now = Date.now();
    const start = user.startTime.getTime();

    const difference = now - start;
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (difference >= twentyFourHours) {
      console.log("24 hours completed");

      user.todayViewCount = 0;
      user.startTime = now;
    }

    // --------------------------------
    // Increase today's view count
    // --------------------------------

    user.todayViewCount += 1;

    // --------------------------------
    // Save like information
    // --------------------------------

    // A likes B

    if (!user.LikedMe.includes(targetUserId)) {
      user.LikedMe.push(targetUserId);
    }

    if (!targetUser.LikedBy.includes(userId)) {
      targetUser.LikedBy.push(userId);
    }

    // Check if B had already liked A
    if (targetUser.LikedMe.includes(userId)) {
      if (!user.LikedBoth.includes(targetUserId)) {
        user.LikedBoth.push(targetUserId);
      }

      if (!targetUser.LikedBoth.includes(userId)) {
        targetUser.LikedBoth.push(userId);
      }
    }

    await user.save();
    await targetUser.save();

    return NextResponse.json({
      success: true,
      todayViewCount: user.todayViewCount,
    });
  } catch (error) {
    console.error("Like-match error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
