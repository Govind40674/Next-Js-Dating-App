import { NextResponse } from "next/server";

import {
  sendOTPwithEmail,
  sendOTPwithSMS,
} from "@/lib/sendOTP";

import OTP from "@/models/OTP";
import connectDB from "@/lib/connectDB";

export async function POST(request) {
  try {
    await connectDB();

    const { method, contact } = await request.json();

    // ===============================
    // VALIDATION
    // ===============================

    if (!method || !contact) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!["email", "phone"].includes(method)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid verification method",
        },
        {
          status: 400,
        }
      );
    }

    // ===============================
    // NORMALIZE CONTACT
    // ===============================

    const normalizedContact =
      method === "email"
        ? contact.toLowerCase().trim()
        : contact.trim();

    // ===============================
    // DELETE OLD OTP
    // ===============================

    await OTP.deleteMany({
      method,
      contact: normalizedContact,
      verified: false,
    });

    // ===============================
    // SEND OTP
    // ===============================

    let otp;

    if (method === "email") {
      otp = await sendOTPwithEmail(
        normalizedContact
      );
    }

    if (method === "phone") {
      otp = await sendOTPwithSMS(
        normalizedContact
      );
    }

    // ===============================
    // OTP EXPIRATION
    // ===============================

    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    // ===============================
    // SAVE OTP
    // ===============================

    await OTP.create({
      method,
      contact: normalizedContact,
      otp,
      expiresAt,
      verified: false,
    });
    console.log(otp);

    return NextResponse.json({
      success: true,
      message:
        method === "email"
          ? "OTP sent to your email"
          : "OTP sent to your phone",
    });
  } catch (error) {
    console.error(
      "SEND OTP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to send OTP",
      },
      {
        status: 500,
      }
    );
  }
}