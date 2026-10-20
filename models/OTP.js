import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },

    contact: {
      type: String,
      required: true,
      index: true,
    },

    otp: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
      default: null,
    },

    verificationExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const OTP =
  mongoose.models.OTP ||
  mongoose.model("OTP", otpSchema);

export default OTP;