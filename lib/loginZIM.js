"use client";

import { getZIM } from "@/lib/zim";

// =====================================================
// LOGIN STATE
// =====================================================

let loggedInUserId = null;
let loginPromise = null;

// =====================================================
// LOGIN ZIM
// =====================================================

export async function loginZIM(
  userId,
  userName = "User"
) {
  if (!userId) {
    throw new Error(
      "ZIM userId is required"
    );
  }

  const normalizedUserId =
    userId.toString();

  // ===================================================
  // GET SINGLE ZIM INSTANCE
  // ===================================================

  const zim = await getZIM();

  if (!zim) {
    throw new Error(
      "ZIM instance is not available"
    );
  }

  if (typeof zim.login !== "function") {
    console.error(
      "Invalid ZIM instance:",
      zim
    );

    throw new Error(
      "ZIM login function is not available"
    );
  }

  // ===================================================
  // ALREADY LOGGED IN WITH SAME USER
  // ===================================================

  if (
    loggedInUserId === normalizedUserId
  ) {
    console.log(
      "ZIM already logged in:",
      normalizedUserId
    );

    return zim;
  }

  // ===================================================
  // LOGIN ALREADY IN PROGRESS
  // ===================================================

  if (loginPromise) {
    console.log(
      "ZIM login already in progress..."
    );

    return loginPromise;
  }

  // ===================================================
  // LOGIN
  // ===================================================

  loginPromise = (async () => {
    try {
      console.log(
        "Starting ZIM login:",
        normalizedUserId
      );

      // ===============================================
      // GET TOKEN
      // ===============================================

      const response = await fetch(
        "/api/zim/token",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            userId: normalizedUserId,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.token
      ) {
        throw new Error(
          data.message ||
            "Failed to get ZIM token"
        );
      }

      // ===============================================
      // LOGIN TO ZIM
      // ===============================================

      await zim.login(
        normalizedUserId,
        {
          userName:
            userName || "User",

          token: data.token,

          isOfflineLogin: false,
        }
      );

      loggedInUserId =
        normalizedUserId;

      console.log(
        "ZIM login successful:",
        {
          userId:
            normalizedUserId,

          userName:
            userName || "User",
        }
      );

      return zim;
    } catch (error) {
      loggedInUserId = null;

      console.log(
        "ZIM login failed:",
        error
      );

      throw error;
    } finally {
      loginPromise = null;
    }
  })();

  return loginPromise;
}

// =====================================================
// CLEAR LOGIN STATE
// =====================================================

export function clearZIMLoginState() {
  loggedInUserId = null;
  loginPromise = null;
}