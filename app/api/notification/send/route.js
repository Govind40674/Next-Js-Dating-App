
import { NextResponse } from "next/server";

import { firebaseMessaging } from "@/lib/firebaseAdmin";

export async function POST(request) {
  try {
    const {
      fcmToken,
      title,
      body,
      data,
    } = await request.json();

    /*
     * =====================================================
     * VALIDATION
     * =====================================================
     */

    if (!fcmToken) {
      return NextResponse.json(
        {
          success: false,
          message: "FCM token is required",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * FCM MESSAGE
     * =====================================================
     */

    const message = {
      token: fcmToken,

      notification: {
        title:
          title || "New Message",

        body:
          body || "You received a new message",
      },

      data: {
        ...(data || {}),
      },
    };

    /*
     * =====================================================
     * SEND NOTIFICATION
     * =====================================================
     */

    const response =
      await firebaseMessaging.send(
        message
      );

    console.log(
      "FCM notification sent:",
      response
    );

    return NextResponse.json({
      success: true,
      messageId: response,
    });
  } catch (error) {
    console.error(
      "FCM notification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to send notification",
      },
      { status: 500 }
    );
  }
}

