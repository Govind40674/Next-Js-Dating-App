
import { firebaseMessaging } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log(
      "Firebase Messaging initialized:",
      !!firebaseMessaging
    );

    return NextResponse.json({
      success: true,
      message:
        "Firebase Admin initialized successfully",
    });
  } catch (error) {
    console.error(
      "Firebase Admin initialization error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Firebase Admin initialization failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

