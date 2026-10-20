import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    await connectDB();

    const { latitude, longitude, userId } = await request.json();

    console.log("Received location:", {
      userId,
      latitude,
      longitude,
    });

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

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid latitude or longitude",
        },
        { status: 400 }
      );
    }

    if (latitude === 0 && longitude === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid location",
        },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    console.log("Updated location:", user.location);

    return NextResponse.json(
      {
        success: true,
        location: user.location,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Location update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update location",
      },
      { status: 500 }
    );
  }
}