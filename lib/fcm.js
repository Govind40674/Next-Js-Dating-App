
"use client";

import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";

export async function registerFCMToken() {
  try {
    // =====================================================
    // CHECK BROWSER
    // =====================================================

    if (typeof window === "undefined") {
      return null;
    }

    // =====================================================
    // CHECK NOTIFICATION SUPPORT
    // =====================================================

    if (!("Notification" in window)) {
      console.log(
        "This browser does not support notifications."
      );

      return null;
    }

    // =====================================================
    // GET FIREBASE MESSAGING
    // =====================================================

    const messaging =
      await getFirebaseMessaging();

    if (!messaging) {
      return null;
    }

    // =====================================================
    // REQUEST NOTIFICATION PERMISSION
    // =====================================================

    const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {
      console.log(
        "Notification permission was not granted."
      );

      return null;
    }

    // =====================================================
    // GET FCM TOKEN
    // =====================================================

    const token = await getToken(
      messaging,
      {
        vapidKey:
          process.env
            .NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      }
    );

    if (!token) {
      console.log(
        "FCM token was not generated."
      );

      return null;
    }

    console.log(
      "FCM token generated:",
      token
    );

    // =====================================================
    // GET CURRENT USER
    // =====================================================

    const userId =
      localStorage.getItem("userId");

    if (!userId) {
      console.log(
        "No userId found. FCM token not saved."
      );

      return token;
    }

    // =====================================================
    // SAVE TOKEN TO OUR DATABASE
    // =====================================================

    const response = await fetch(
      "/api/fcm-token",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          userId,
          fcmToken: token,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          "Failed to save FCM token"
      );
    }

    console.log(
      "FCM token saved successfully."
    );

    return token;
  } catch (error) {
    console.error(
      "FCM registration failed:",
      error
    );

    return null;
  }
}

