import connectDB from "@/lib/connectDB";
import Message from "@/models/Message";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");
    const otherUserId = searchParams.get("otherUserId");

    if (!userId || !otherUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "User IDs are required",
        },
        { status: 400 }
      );
    }

    const messages = await Message.find({
      $or: [
        {
          sender: userId,
          receiver: otherUserId,
        },
        {
          sender: otherUserId,
          receiver: userId,
        },
      ],
    }).sort({ timestamp: 1 });

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Fetch messages error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch messages",
      },
      { status: 500 }
    );
  }
}
