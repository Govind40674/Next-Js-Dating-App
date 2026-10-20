
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";

export async function POST(request) {
  try {
    // =====================================================
    // CONNECT DATABASE
    // =====================================================
    await connectDB();

    // =====================================================
    // GET REQUEST DATA
    // =====================================================
    let body;

    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request data.",
        },
        { status: 400 }
      );
    }

    const { method, contact, password } = body;

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (!method) {
      return NextResponse.json(
        {
          success: false,
          message: "Login method is required.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // VALIDATE LOGIN METHOD
    // =====================================================

    if (!["email", "phone"].includes(method)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid login method. Use email or phone.",
        },
        { status: 400 }
      );
    }

    if (!contact || typeof contact !== "string") {
      return NextResponse.json(
        {
          success: false,
          message:
            method === "email"
              ? "Email is required."
              : "Phone number is required.",
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Password is required.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // NORMALIZE CONTACT
    // =====================================================

    let normalizedContact;

    if (method === "email") {
      // Example:
      // "  Govind@Gmail.com "
      // becomes:
      // "govind@gmail.com"

      normalizedContact = contact.toLowerCase().trim();

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(normalizedContact)) {
        return NextResponse.json(
          {
            success: false,
            message: "Please enter a valid email address.",
          },
          { status: 400 }
        );
      }
    } else {
      // Example:
      // "+91 98765-43210"
      // becomes:
      // "+919876543210"

      normalizedContact = contact
        .trim()
        .replace(/[^\d+]/g, "");

      // Make sure + only appears at the beginning
      if (
        normalizedContact.includes("+") &&
        !normalizedContact.startsWith("+")
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid phone number.",
          },
          { status: 400 }
        );
      }

      // Basic phone validation
      const phoneRegex = /^\+?\d{10,15}$/;

      if (!phoneRegex.test(normalizedContact)) {
        return NextResponse.json(
          {
            success: false,
            message: "Please enter a valid phone number.",
          },
          { status: 400 }
        );
      }
    }

    console.log("Login request:", {
      method,
      contact: normalizedContact,
    });

    // =====================================================
    // FIND USER
    // =====================================================

    let user;

    if (method === "email") {
      user = await User.findOne({
        email: normalizedContact,
      });
    } else {
      user = await User.findOne({
        phone: normalizedContact,
      });
    }

    // =====================================================
    // USER NOT FOUND
    // =====================================================

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            method === "email"
              ? "No account found with this email."
              : "No account found with this phone number.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // CHECK PASSWORD EXISTS
    // =====================================================

    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This account does not have a password. Please use Google login.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // CHECK PASSWORD
    // =====================================================

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    // =====================================================
    // INVALID PASSWORD
    // =====================================================

    if (!isPasswordCorrect) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid password.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // USER RESPONSE
    // =====================================================

    const userResponse = {
      _id: user._id.toString(),
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      photo: user.photo || "",
      bio: user.bio || "",
      interest: user.interest || [],
      location: user.location || "",
      authProvider: user.authProvider || "credentials",
      isVIP: user.isVIP || false,
      todayViewCount: user.todayViewCount || 0,
    };

    console.log("User logged in:", userResponse._id);

    // =====================================================
    // SUCCESS RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,
        message: "Login successful.",
        user: userResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong during login.",
      },
      { status: 500 }
    );
  }
}

