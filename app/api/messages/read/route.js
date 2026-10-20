import connectDB from "@/lib/connectDB";
import Message from "@/models/Message";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await connectDB();

    const { userId, senderId } = await request.json();

    await Message.updateMany(
      {
        sender: senderId,
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
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 }
    );
  }
}