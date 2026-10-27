import crypto from "node:crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import Payment from "@/models/Payment";

export const runtime = "nodejs";

const ALLOWED_MONTHS = [1, 3, 6, 12];

const MONTHLY_AMOUNTS = {
  Classic: 9900, // ₹99 in paise
  Prestige: 49900, // ₹499 in paise
};

// Add calendar months and clamp dates such as January 31
// to the last valid day of the destination month.
function addCalendarMonths(date, months) {
  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfDestinationMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDayOfDestinationMonth));

  return result;
}

function verifySignature(orderId, paymentId, signature, secret) {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();

  const receivedSignature = Buffer.from(signature, "hex");

  return (
    receivedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(receivedSignature, expectedSignature)
  );
}

function getPlanExpiry(user, kind) {
  const plan = user?.VIP_PLAN?.find((item) => item.name === kind);

  return plan?.expireDate || null;
}

async function reconcileAlreadyProcessedOrder(
  paymentRecord,
  user,
  razorpayPaymentId,
) {
  if (!user?.processedPaymentOrders?.includes(paymentRecord.razorpayOrderId)) {
    return null;
  }

  // User profile was already saved. Repair the payment record
  // if the server previously failed before marking it captured.
  await Payment.updateOne(
    { _id: paymentRecord._id },
    {
      $set: {
        status: "captured",
        razorpayPaymentId,
      },
    },
  );

  return NextResponse.json({
    success: true,
    message: "Payment was already applied to this subscription.",
    expiresAt: getPlanExpiry(user, paymentRecord.kind),
  });
}

export async function POST(request) {
  let claimedRecordId = null;
  let userSaved = false;

  try {
    const {
      kind,
      months,
      userId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = await request.json();

    if (
      !userId ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !MONTHLY_AMOUNTS[kind] ||
      !ALLOWED_MONTHS.includes(months) ||
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        { message: "Invalid payment details." },
        { status: 400 },
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { message: "Payment service is not configured." },
        { status: 500 },
      );
    }

    await connectDB();

    // Find the original order created by our server.
    // Never calculate the subscription duration from an
    // unverified browser request alone.
    let paymentRecord = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId,
      kind,
      months,
    });

    if (!paymentRecord) {
      return NextResponse.json(
        { message: "Payment order not found for this user and plan." },
        { status: 404 },
      );
    }

    const expectedAmount = MONTHLY_AMOUNTS[kind] * months;

    if (paymentRecord.amount !== expectedAmount) {
      return NextResponse.json(
        { message: "Stored order amount does not match the plan." },
        { status: 400 },
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Fetch the trusted order from Razorpay.
    const order = await razorpay.orders.fetch(paymentRecord.razorpayOrderId);

    if (
      order.id !== paymentRecord.razorpayOrderId ||
      Number(order.amount) !== expectedAmount ||
      order.currency !== "INR" ||
      order.notes?.kind !== kind ||
      Number(order.notes?.months) !== months ||
      String(order.notes?.userId) !== String(userId)
    ) {
      return NextResponse.json(
        { message: "Razorpay order details do not match." },
        { status: 400 },
      );
    }

    // Verify using the order ID saved in our database.
    const isSignatureValid = verifySignature(
      paymentRecord.razorpayOrderId,
      razorpay_payment_id,
      razorpay_signature,
      keySecret,
    );

    if (!isSignatureValid) {
      return NextResponse.json(
        { message: "Payment signature verification failed." },
        { status: 400 },
      );
    }

    // Verify directly with Razorpay; the Checkout callback
    // alone is not sufficient to activate the subscription.
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (
      payment.id !== razorpay_payment_id ||
      payment.order_id !== paymentRecord.razorpayOrderId ||
      Number(payment.amount) !== expectedAmount ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    ) {
      return NextResponse.json(
        {
          message:
            "Payment has not been confirmed as captured. Please check the payment status.",
        },
        { status: 400 },
      );
    }

    // Idempotency: a repeated successful callback must not
    // extend the subscription for the same payment twice.
    if (paymentRecord.status === "captured") {
      const user = await User.findById(paymentRecord.userId);

      return NextResponse.json({
        success: true,
        message: "Payment has already been processed.",
        expiresAt: getPlanExpiry(user, kind),
      });
    }

    // If a previous request saved the User but failed before
    // saving the final Payment status, recover without adding
    // the subscription months again.
    if (paymentRecord.status === "processing") {
      const user = await User.findById(paymentRecord.userId);

      const recovered = await reconcileAlreadyProcessedOrder(
        paymentRecord,
        user,
        razorpay_payment_id,
      );

      if (recovered) {
        return recovered;
      }

      return NextResponse.json(
        {
          message:
            "This payment is already being processed. Check its status before retrying.",
        },
        { status: 409 },
      );
    }

    // Claim the order so simultaneous callback requests cannot
    // both extend the plan.
    const claimedRecord = await Payment.findOneAndUpdate(
      {
        _id: paymentRecord._id,
        status: "created",
      },
      {
        $set: {
          status: "processing",
          razorpayPaymentId: razorpay_payment_id,
        },
      },
      { new: true },
    );

    if (!claimedRecord) {
      const latestRecord = await Payment.findById(paymentRecord._id);
      const user = await User.findById(paymentRecord.userId);

      if (
        latestRecord?.status === "captured" ||
        user?.processedPaymentOrders?.includes(paymentRecord.razorpayOrderId)
      ) {
        const recovered = await reconcileAlreadyProcessedOrder(
          paymentRecord,
          user,
          razorpay_payment_id,
        );

        if (recovered) {
          return recovered;
        }
      }

      return NextResponse.json(
        { message: "Payment is already being processed." },
        { status: 409 },
      );
    }

    claimedRecordId = claimedRecord._id;
    paymentRecord = claimedRecord;

    const user = await User.findById(paymentRecord.userId);

    if (!user) {
      throw new Error("The user associated with this payment was not found.");
    }

    // Additional protection if the profile was updated by
    // an earlier attempt for this same order.
    if (user.processedPaymentOrders?.includes(paymentRecord.razorpayOrderId)) {
      await Payment.updateOne(
        { _id: paymentRecord._id },
        {
          $set: {
            status: "captured",
            razorpayPaymentId: razorpay_payment_id,
          },
        },
      );

      return NextResponse.json({
        success: true,
        message: "Payment has already been applied.",
        expiresAt: getPlanExpiry(user, kind),
      });
    }

    const now = new Date();

    // Deactivate expired entries.
    for (const plan of user.VIP_PLAN) {
      if (new Date(plan.expireDate).getTime() <= now.getTime()) {
        plan.isActive = false;
      }
    }

    // Renew from the existing expiry when this same plan is
    // still active; otherwise start the new subscription now.
    let userPlan = user.VIP_PLAN.find((plan) => plan.name === kind);

    const previousExpiry = userPlan?.expireDate
      ? new Date(userPlan.expireDate)
      : null;

    const canExtend =
      userPlan?.isActive &&
      previousExpiry &&
      previousExpiry.getTime() > now.getTime();

    const renewalStart = canExtend ? previousExpiry : now;

    const expiresAt = addCalendarMonths(renewalStart, months);

    if (!userPlan) {
      user.VIP_PLAN.push({
        name: kind,
        expireDate: expiresAt,
        isActive: true,
        months,
        amount: paymentRecord.amount,
        lastPaymentId: razorpay_payment_id,
        lastOrderId: paymentRecord.razorpayOrderId,
      });
    } else {
      userPlan.expireDate = expiresAt;
      userPlan.isActive = true;
      userPlan.months = months;
      userPlan.amount = paymentRecord.amount;
      userPlan.lastPaymentId = razorpay_payment_id;
      userPlan.lastOrderId = paymentRecord.razorpayOrderId;
    }

    // Only a currently active Normal plan enables isVIP.
    user.isVIP = user.VIP_PLAN.some(
      (plan) =>
        plan.name === "Classic" &&
        plan.isActive &&
        new Date(plan.expireDate).getTime() > now.getTime(),
    );
    // Only a currently active Premium plan enables isPremium.
    user.isPremium = user.VIP_PLAN.some(
      (plan) =>
        plan.name === "Prestige" &&
        plan.isActive &&
        new Date(plan.expireDate).getTime() > now.getTime(),
    );

    user.processedPaymentOrders.push(paymentRecord.razorpayOrderId);

    user.markModified("VIP_PLAN");

    // Save subscription and processed-order marker together
    // in one MongoDB user-document write.
    await user.save();
    userSaved = true;

    // Mark the verified payment as captured in our database.
    await Payment.updateOne(
      { _id: paymentRecord._id },
      {
        $set: {
          status: "captured",
          razorpayPaymentId: razorpay_payment_id,
        },
      },
    );

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscription updated.",
      kind,
      months,
      expiresAt: expiresAt.toISOString(),
      isVIP: user.isVIP,
      isPremium: user.isPremium,
    });
  } catch (error) {
    console.error("Update payment API failed:", error);

    // If the claim was acquired but User was not saved,
    // allow a safe retry. If User was saved, leave the record
    // processing so a retry can recover without double renewal.
    if (claimedRecordId && !userSaved) {
      try {
        await Payment.updateOne(
          {
            _id: claimedRecordId,
            status: "processing",
          },
          {
            $set: { status: "created" },
            $unset: { razorpayPaymentId: "" },
          },
        );
      } catch (resetError) {
        console.error("Unable to reset payment processing state:", resetError);
      }
    }

    return NextResponse.json(
      { message: "Unable to verify payment and update subscription." },
      { status: 500 },
    );
  }
}
