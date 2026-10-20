import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import { NextResponse } from "next/server";
// import mongoose from "mongoose";

export async function POST(request) {
  try {
    await connectDB();

    const { userId, targetUserId } = await request.json();

    if ((!userId, !targetUserId)) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 },
      );
    }
    const user = await User.findById(userId);
    user.todayViewCount = user.todayViewCount + 1;
    user.dislikedMe.push(targetUserId);
    const now = Date.now();

    const start = user.startTime.getTime();

    const difference = now - start;

    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (difference >= twentyFourHours) {
      console.log("24 hours completed");

      // Reset daily count
      user.todayViewCount =0;
      user.startTime = new Date();

      
    }
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Match canceled successfully",
      todayViewCount: user.todayViewCount,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
