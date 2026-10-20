import { NextResponse } from "next/server";
import crypto from "crypto";

import connectDB from "@/lib/connectDB";
import OTP from "@/models/OTP";

export async function POST(request) {
  try {
    const {
      method,
      contact,
      otp,
    } = await request.json();

    console.log("VERIFY OTP REQUEST:", {
      method,
      contact,
      otp,
    });

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!method || !contact || !otp) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Method, contact and OTP are required",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // NORMALIZE CONTACT
    // =====================================================

    const normalizedContact =
      method === "email"
        ? contact.toLowerCase().trim()
        : contact.trim();

    // =====================================================
    // CONNECT DATABASE
    // =====================================================

    await connectDB();

    // =====================================================
    // FIND OTP
    // =====================================================

    const otpRecord = await OTP.findOne({
      method,
      contact: normalizedContact,
      otp: otp.toString(),
      verified: false,
    });

    console.log(
      "OTP RECORD FOUND:",
      !!otpRecord
    );

    // =====================================================
    // INVALID OTP
    // =====================================================

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // CHECK OTP EXPIRATION
    // =====================================================

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({
        _id: otpRecord._id,
      });

      return NextResponse.json(
        {
          success: false,
          message: "OTP expired",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // GENERATE VERIFICATION TOKEN
    // =====================================================

    const verificationToken =
      crypto.randomBytes(32).toString("hex");

    // Token valid for 10 minutes
    const verificationExpiresAt =
      new Date(Date.now() + 10 * 60 * 1000);

    // =====================================================
    // UPDATE OTP RECORD
    // =====================================================

    otpRecord.verified = true;

    otpRecord.verificationToken =
      verificationToken;

    otpRecord.verificationExpiresAt =
      verificationExpiresAt;

    await otpRecord.save();

    // =====================================================
    // DEBUG
    // =====================================================

    console.log(
      "VERIFICATION TOKEN SAVED:",
      !!otpRecord.verificationToken
    );

    console.log(
      "TOKEN LENGTH:",
      otpRecord.verificationToken.length
    );

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      verificationToken,
    });
  } catch (error) {
    console.error(
      "VERIFY OTP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "OTP verification failed",
      },
      { status: 500 }
    );
  }
}