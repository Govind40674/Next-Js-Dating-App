import connectDB from "@/lib/connectDB";
import Message from "@/models/Message";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await connectDB();

    const {
      userId,
      otherUserId,
    } = await request.json();

    if (!userId || !otherUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "User IDs are required",
        },
        { status: 400 }
      );
    }

    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: userId,
        status: "unread",
      },
      {
        $set: {
          status: "read",
        },
      }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Read message error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to mark messages as read",
      },
      { status: 500 }
    );
  }
}