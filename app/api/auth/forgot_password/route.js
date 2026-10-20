import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import OTP from "@/models/OTP";

export async function POST(request) {
  try {
    const body = await request.json();

    const { method, contact, otp, password, verificationToken } = body;

    // =====================================================
    // VALIDATION
    // =====================================================

    if ((!method || !contact || !otp || !password, !verificationToken)) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required.",
        },
        { status: 400 },
      );
    }

    if (method !== "email" && method !== "phone") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid reset method.",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters.",
        },
        { status: 400 },
      );
    }

    if (!/^\d{4}$/.test(otp)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP format.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // NORMALIZE CONTACT
    // =====================================================

    const normalizedContact =
      method === "email" ? contact.trim().toLowerCase() : contact.trim();

    // =====================================================
    // CONNECT DATABASE
    // =====================================================

    await connectDB();

    // =====================================================
    // FIND USER
    // =====================================================

    const query =
      method === "email"
        ? { email: normalizedContact }
        : { phone: normalizedContact };

    console.log(query);
    const user = await User.findOne(query);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No account found with this information.",
        },
        { status: 404 },
      );
    }

    // =====================================================
    // CHECK OTP
    // =====================================================

    // const user=await OTP.findOne(query);
    const otpRecord = await OTP.findOne({
      method,
      contact: normalizedContact,
      verified: true,
      verificationToken,
    });
    console.log("OTP RECORD FOUND:", !!otpRecord);

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid verification token. Please verify OTP again.",
        },
        { status: 401 },
      );
    }

    if (
      !otpRecord.verificationExpiresAt ||
      otpRecord.verificationExpiresAt < new Date()
    ) {
      await OTP.deleteOne({
        _id: otpRecord._id,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Verification expired. Please verify OTP again.",
        },
        { status: 401 },
      );
    }

    await OTP.deleteOne({
      _id: otpRecord._id,
    });

    // =====================================================
    // HASH NEW PASSWORD
    // =====================================================

    const hashedPassword = await bcrypt.hash(password, 10);

    // =====================================================
    // UPDATE PASSWORD
    // =====================================================

    user.password = hashedPassword;

    await user.save();

 

    // =====================================================
    // SUCCESS
    // =====================================================

    return NextResponse.json(
      {
        success: true,
        message: "Password reset successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Reset password API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while resetting the password.",
      },
      { status: 500 },
    );
  }
}
