import nodemailer from "nodemailer";
import twilio from "twilio";

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// ===============================
// EMAIL OTP
// ===============================
// export const sendOTPwithEmail = async (email) => {
//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.NODEMAILER_EMAIL,
//       pass: process.env.NODEMAILER_PASSWORD,
//     },
//   });

//   const otp = generateOTP();

//   const mailOptions = {
//     from: process.env.NODEMAILER_EMAIL,
//     to: email,
//     subject: "OTP Verification",
//     text: `Your OTP is ${otp}. This OTP is valid for 5 minutes.`,
//   };

//   await transporter.sendMail(mailOptions);

//   return otp;
// };
export const sendOTPwithEmail = async (email) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,

    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },

    // connectionTimeout: 20000,
    // greetingTimeout: 20000,
    // socketTimeout: 30000,
  });

  const otp = generateOTP();

  const mailOptions = {
    from: process.env.NODEMAILER_EMAIL,
    to: email,
    subject: "OTP Verification",
    text: `Your OTP is ${otp}. This OTP is valid for 5 minutes.`,
  };

  await transporter.sendMail(mailOptions);

  return otp;
};

// ===============================
// SMS OTP
// ===============================
export const sendOTPwithSMS = async (phone) => {
  const otp = generateOTP();

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are missing");
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error("Twilio phone number is missing");
  }

  const client = twilio(accountSid, authToken);

  await client.messages.create({
    body: `Your OTP is ${otp}. This OTP is valid for 5 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });

  return otp;
};