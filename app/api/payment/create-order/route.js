import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Razorpay from "razorpay";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import Payment from "@/models/Payment";

export const runtime = "nodejs";

const ALLOWED_MONTHS = [1, 3, 6, 12];

const PAYMENT_PLANS = {
  Classic: {
    monthlyAmount: 9900, // ₹99 in paise
    description: "Normal Payment",
  },

  Prestige: {
    monthlyAmount: 49900, // ₹499 in paise
    description: "Premium Payment",
  },
};

export async function POST(request) {
  try {
    const { kind, months, userId } = await request.json();

    const plan = PAYMENT_PLANS[kind];

    if (!plan) {
      return NextResponse.json(
        { message: "Invalid payment plan." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MONTHS.includes(months)) {
      return NextResponse.json(
        { message: "Select 1, 3, 6, or 12 months." },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "A valid user is required." },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay credentials are missing.");

      return NextResponse.json(
        { message: "Payment service is not configured." },
        { status: 500 }
      );
    }

    await connectDB();

    const user = await User.findById(userId).select("_id");

    if (!user) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404 }
      );
    }

    const amount = plan.monthlyAmount * months;

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `datingapp_${Date.now()}`,
      notes: {
        kind,
        months: String(months),
        userId: String(user._id),
      },
    });

    // Save the trusted order mapping in MongoDB.
    await Payment.create({
      userId: user._id,
      kind,
      months,
      amount,
      currency: "INR",
      razorpayOrderId: order.id,
      status: "created",
    });

    return NextResponse.json({
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "DatingApp",
      description: `${plan.description} - ${months} month(s)`,
    });
  } catch (error) {
    console.log("Razorpay order creation failed:", error);

    return NextResponse.json(
      { message: "Unable to create a payment order." },
      { status: 500 }
    );
  }
}