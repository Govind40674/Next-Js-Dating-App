import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    await connectDB();

    // Get userId from query parameter
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Check userId
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 },
      );
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID",
        },
        { status: 400 },
      );
    }

    // Find current user
    const currentUser = await User.findById(userId).select("LikedBoth");

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    // IDs stored inside LikedBoth
    // IDs stored inside LikedBoth
    const likedBothIds = currentUser.LikedBoth || [];

    // No matches
    if (likedBothIds.length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
      });
    }

    // Find all users whose _id is inside LikedBoth
    const matchedUserIds = [...likedBothIds].reverse();

    const users = await User.find({
      _id: {
        $in: matchedUserIds,
      },
    }).select("-password");

    const matchedUsers = matchedUserIds
      .map((id) => users.find((user) => user._id.toString() === id.toString()))
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      users: matchedUsers,
    });
  } catch (error) {
    console.error("Error fetching matched users:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch matched users",
      },
      { status: 500 },
    );
  }
}
