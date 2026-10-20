import connectDB from "@/lib/connectDB";
import Message from "@/models/Message";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");
    const messageUserId = searchParams.get("messageUserId");

    // Validate IDs
    if (!userId || !messageUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "userId and messageUserId are required",
          messages: [],
        },
        { status: 400 }
      );
    }

    // Find messages between both users
    const messages = await Message.find({
      $or: [
        {
          sender: userId,
          receiver: messageUserId,
        },
        {
          sender: messageUserId,
          receiver: userId,
        },
      ],
    }).sort({ timestamp: 1 });

    return NextResponse.json(
      {
        success: true,
        messages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching messages:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch messages",
        messages: [],
      },
      { status: 500 }
    );
  }
}