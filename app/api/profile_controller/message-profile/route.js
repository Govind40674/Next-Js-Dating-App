import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import Message from "@/models/Message";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    await connectDB();

    // Get my userId
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID",
        },
        { status: 400 }
      );
    }

    // ============================================
    // FIND MY USER
    // ============================================

    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // ============================================
    // GET USERS FROM LIKEDBOTH
    // ============================================

    const likedBothIds = currentUser.LikedBoth || [];

    if (likedBothIds.length === 0) {
      return NextResponse.json({
        success: true,
        matchedUsers: [],
      });
    }

    // ============================================
    // FIND THEIR USER PROFILES
    // ============================================

    const users = await User.find({
      _id: {
        $in: likedBothIds,
      },
    }).select("-password");

    // ============================================
    // BUILD MESSAGE LIST
    // ============================================

    const matchedUsers = await Promise.all(
      likedBothIds.map(async (likedUserId) => {
        // Find profile
        const matchedUser = users.find(
          (user) =>
            user._id.toString() === likedUserId.toString()
        );

        if (!matchedUser) {
          return null;
        }

        // ========================================
        // COUNT UNREAD MESSAGES SENT BY THIS USER
        // ========================================

        const unreadCount = await Message.countDocuments({
          sender: likedUserId.toString(),
          receiver: userId.toString(),
          status: "unread",
        });

        return {
          _id: matchedUser._id,
          name: matchedUser.name,
          photo: matchedUser.photo,
          unreadCount,
        };
      })
    );

    // Remove users which no longer exist
    const filteredUsers = matchedUsers.filter(Boolean);

    return NextResponse.json({
      success: true,
      matchedUsers: filteredUsers,
    });
  } catch (error) {
    console.error("MATCH PROFILE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch matches",
      },
      { status: 500 }
    );
  }
}