import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const containsId = (array, id) =>
  Array.isArray(array) && array.some((value) => String(value) === String(id));

const removeId = (array, id) =>
  (Array.isArray(array) ? array : []).filter(
    (value) => String(value) !== String(id)
  );

export async function POST(request) {
  try {
    await connectDB();

    const { userId, targetUserId } = await request.json();

    if (
      !userId ||
      !targetUserId ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(targetUserId)
    ) {
      return NextResponse.json(
        { success: false, message: "Valid user ID and target user ID are required." },
        { status: 400 }
      );
    }

    if (String(userId) === String(targetUserId)) {
      return NextResponse.json(
        { success: false, message: "You cannot like your own profile." },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);

    if (!user || !targetUser) {
      return NextResponse.json(
        { success: false, message: "User or target user not found." },
        { status: 404 }
      );
    }

    // Reset the free-view counter after 24 hours.
    const now = Date.now();
    const startTime = user.startTime ? new Date(user.startTime).getTime() : now;

    if (!Number.isFinite(startTime) || now - startTime >= TWENTY_FOUR_HOURS) {
      user.todayViewCount = 0;
      user.startTime = new Date(now);
    }

    user.todayViewCount = Number(user.todayViewCount || 0) + 1;

    // Record the current user's like and the recipient's incoming-like list.
    if (!containsId(user.LikedMe, targetUserId)) user.LikedMe.push(String(targetUserId));
    if (!containsId(targetUser.LikedBy, userId)) targetUser.LikedBy.push(String(userId));

    // A reciprocal like can be either a normal like or a pending Star Like.
    const targetAlreadyLiked = containsId(targetUser.LikedMe, userId);
    const targetAlreadyStarLiked = containsId(targetUser.starLike, userId);
    const matched = targetAlreadyLiked || targetAlreadyStarLiked;

    if (matched) {
      if (!containsId(user.LikedBoth, targetUserId)) user.LikedBoth.push(String(targetUserId));
      if (!containsId(targetUser.LikedBoth, userId)) targetUser.LikedBoth.push(String(userId));

      // A reciprocal action has dealt with the pending Star Like; remove it
      // from the sender's outgoing Star Like list.
      targetUser.starLike = removeId(targetUser.starLike, userId);
      user.starLike = removeId(user.starLike, targetUserId);
    }

    await Promise.all([user.save(), targetUser.save()]);

    return NextResponse.json({
      success: true,
      matched,
      todayViewCount: user.todayViewCount,
      message: matched ? "It's a match!" : "Like saved.",
    });
  } catch (error) {
    console.error("Like-match error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong while liking this profile." },
      { status: 500 }
    );
  }
}
