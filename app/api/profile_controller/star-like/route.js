import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";

const containsId = (array, id) =>
  Array.isArray(array) && array.some((value) => String(value) === String(id));

const removeId = (array, id) =>
  (Array.isArray(array) ? array : []).filter(
    (value) => String(value) !== String(id)
  );

// A real, active, unexpired Premium plan is required.
// isVIP/isPremium flags alone do not grant permission to use Star Like.
function hasActivePremium(user) {
  const now = Date.now();
  const plans = Array.isArray(user?.VIP_PLAN) ? user.VIP_PLAN : [];

  return plans.some((plan) => {
    if (
      plan?.name !== "Prestige" ||
      plan?.isActive !== true ||
      !plan?.expireDate
    ) {
      return false;
    }

    const expiryTime = new Date(plan.expireDate).getTime();
    return Number.isFinite(expiryTime) && expiryTime > now;
  });
}

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
        {
          success: false,
          message: "Valid user ID and target user ID are required.",
        },
        { status: 400 }
      );
    }

    if (String(userId) === String(targetUserId)) {
      return NextResponse.json(
        { success: false, message: "You cannot Star Like your own profile." },
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

    // Server-side enforcement is authoritative; localStorage is only a UI gate.
    if (!hasActivePremium(user)) {
      return NextResponse.json(
        {
          success: false,
          code: "VIP_REQUIRED",
          message: "An active Premium plan is required to send Star Likes.",
        },
        { status: 403 }
      );
    }

    // If the recipient has already liked or Star Liked the sender,
    // this Star Like completes the mutual action and creates a match.
    const targetAlreadyLiked = containsId(targetUser.LikedMe, userId);
    const targetAlreadyStarLiked = containsId(targetUser.starLike, userId);
    const matched = targetAlreadyLiked || targetAlreadyStarLiked;

    if (matched) {
      if (!containsId(user.LikedMe, targetUserId)) {
        user.LikedMe.push(String(targetUserId));
      }

      if (!containsId(targetUser.LikedBy, userId)) {
        targetUser.LikedBy.push(String(userId));
      }

      if (!containsId(user.LikedBoth, targetUserId)) {
        user.LikedBoth.push(String(targetUserId));
      }

      if (!containsId(targetUser.LikedBoth, userId)) {
        targetUser.LikedBoth.push(String(userId));
      }

      user.starLike = removeId(user.starLike, targetUserId);
      targetUser.starLike = removeId(targetUser.starLike, userId);
    } else if (!containsId(user.starLike, targetUserId)) {
      // The sender's starLike array stores the target user ID.
      user.starLike.push(String(targetUserId));
    }

    await Promise.all([user.save(), targetUser.save()]);

    return NextResponse.json({
      success: true,
      matched,
      message: matched ? "It's a match!" : "Star Like sent successfully.",
    });
  } catch (error) {
    console.error("Star Like error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to send Star Like." },
      { status: 500 }
    );
  }
}