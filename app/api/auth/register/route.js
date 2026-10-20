import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/connectDB";
import OTP from "@/models/OTP";
import User from "@/models/User";

export async function POST(request) {
  try {
    const {
      method,
      contact,
      password,
      verificationToken,
    } = await request.json();

    console.log("REGISTER REQUEST:", {
      method,
      contact,
      hasPassword: !!password,
      hasVerificationToken:
        !!verificationToken,
    });

    // =====================================================
    // VALIDATION
    // =====================================================

    if (
      !method ||
      !contact ||
      !password ||
      !verificationToken
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Method, contact, password and verification token are required",
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
    // FIND VERIFIED OTP
    // =====================================================

    const otpRecord = await OTP.findOne({
      method,
      contact: normalizedContact,
      verified: true,
      verificationToken,
    });

    console.log(
      "OTP RECORD FOUND:",
      !!otpRecord
    );

    // =====================================================
    // INVALID TOKEN
    // =====================================================

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid verification token. Please verify OTP again.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // CHECK TOKEN EXPIRATION
    // =====================================================

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
          message:
            "Verification expired. Please verify OTP again.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // CHECK EXISTING USER
    // =====================================================

    let existingUser;

    if (method === "email") {
      existingUser = await User.findOne({
        email: normalizedContact,
      });
    } else {
      existingUser = await User.findOne({
        phone: normalizedContact,
      });
    }

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            method === "email"
              ? "An account with this email already exists."
              : "An account with this phone number already exists.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // HASH PASSWORD
    // =====================================================

    const hashedPassword =
      await bcrypt.hash(password, 12);

    // =====================================================
    // CREATE USER
    // =====================================================

    const userData = {
      password: hashedPassword,
    };

    if (method === "email") {
      userData.email = normalizedContact;
    }

    if (method === "phone") {
      userData.phone = normalizedContact;
    }

    const user = await User.create(
      userData
    );

    // =====================================================
    // DELETE OTP
    // =====================================================

    await OTP.deleteOne({
      _id: otpRecord._id,
    });

    // =====================================================
    // SUCCESS
    // =====================================================

    console.log(
      "USER CREATED:",
      user._id.toString()
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Account created successfully",

        user: {
          _id: user._id,
          name: user.name,
          email: user.email || null,
          phone: user.phone || null,
          isVIP: user.isVIP,
          todayViewCount: user.todayViewCount,
          photo: user.photo || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Registration failed",
      },
      { status: 500 }
    );
  }
}