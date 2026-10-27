import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";

// A real, active, unexpired Premium plan is required.
// isVIP/isPremium flags alone do not grant permission to use Star Message.
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

    const { userId, targetUserId, message } = await request.json();

    if (
      !userId ||
      !targetUserId ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(targetUserId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid sender and recipient IDs are required.",
        },
        { status: 400 }
      );
    }

    if (String(userId) === String(targetUserId)) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot send a Star Message to yourself.",
        },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Message text is required." },
        { status: 400 }
      );
    }

    const cleanMessage = message.trim();

    if (cleanMessage.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: "Star Messages must be 500 characters or fewer.",
        },
        { status: 400 }
      );
    }

    const sender = await User.findById(userId).select("VIP_PLAN");
    const recipient = await User.findById(targetUserId);

    if (!sender || !recipient) {
      return NextResponse.json(
        { success: false, message: "Sender or recipient not found." },
        { status: 404 }
      );
    }

    if (!hasActivePremium(sender)) {
      return NextResponse.json(
        {
          success: false,
          code: "VIP_REQUIRED",
          message: "An active Premium plan is required to send Star Messages.",
        },
        { status: 403 }
      );
    }

    // Store the message on the recipient's User document so the recipient
    // can identify the sender by the stored userId.
    recipient.starMessage.push({
      userId: sender._id,
      message: cleanMessage,
    });

    await recipient.save();

    return NextResponse.json({
      success: true,
      message: "Star Message delivered.",
      recipientId: String(recipient._id),
    });
  } catch (error) {
    console.error("Star Message error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to send Star Message." },
      { status: 500 }
    );
  }
}