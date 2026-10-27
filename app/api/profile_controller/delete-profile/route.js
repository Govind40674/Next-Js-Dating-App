import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import Message from "@/models/Message";
import Payment from "@/models/Payment";

// These fields are String arrays in the supplied User schema.
const USER_REFERENCE_ARRAYS = [
  "LikedBoth",
  "LikedBy",
  "LikedMe",
  "dislikedMe",
  "passedUsers",
  "blockedUsers",
  "starLike",
];

export async function DELETE(request) {
  try {
    await connectDB();

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "A valid JSON request body is required.",
        },
        { status: 400 }
      );
    }

    const { userId, confirmation } = body || {};

    // Require explicit confirmation from the frontend.
    if (confirmation !== "DELETE") {
      return NextResponse.json(
        {
          success: false,
          message:
            'Confirm account deletion by sending confirmation: "DELETE".',
        },
        { status: 400 }
      );
    }

    // Validate the supplied MongoDB ObjectId.
    if (
      typeof userId !== "string" ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid user ID is required.",
        },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const userIdString = String(userObjectId);

    // Check that the account exists before cleaning up related records.
    const existingUser = await User.findById(userObjectId)
      .select("_id")
      .lean();

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Account not found or already deleted.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 1. Remove this user's ID from other users' profiles
    // --------------------------------------------------

    // Relationship arrays store String IDs, not ObjectIds.
    const pullUpdate = Object.fromEntries(
      USER_REFERENCE_ARRAYS.map((field) => [
        field,
        userIdString,
      ])
    );

    // starMessage.userId is an ObjectId in the User schema.
    // Remove messages written by this user from other profiles.
    pullUpdate.starMessage = {
      userId: userObjectId,
    };

    const relationshipResult = await User.updateMany(
      {
        _id: { $ne: userObjectId },
      },
      {
        $pull: pullUpdate,
      }
    );

    // --------------------------------------------------
    // 2. Delete direct messages involving this user
    // --------------------------------------------------

    // Message.js defines sender and receiver as ObjectId fields.
    const messageResult = await Message.deleteMany({
      $or: [
        { sender: userObjectId },
        { receiver: userObjectId },
      ],
    });

    // --------------------------------------------------
    // 3. Delete payment records belonging to this user
    // --------------------------------------------------

    // Payment.js defines userId as an ObjectId field.
    const paymentResult = await Payment.deleteMany({
      userId: userObjectId,
    });

    // --------------------------------------------------
    // 4. Delete the user's own account document
    // --------------------------------------------------

    const deletedUser = await User.findByIdAndDelete(
      userObjectId
    );

    if (!deletedUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Related data was cleaned, but the account could not be deleted. Please retry or contact support.",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 5. Return deletion results
    // --------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message:
          "Your account and associated records have been deleted.",
        deleted: {
          users: 1,
          messages: messageResult.deletedCount ?? 0,
          payments: paymentResult.deletedCount ?? 0,
          relationshipProfilesUpdated:
            relationshipResult.modifiedCount ?? 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete profile error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to delete the account and related records.",
      },
      { status: 500 }
    );
  }
}