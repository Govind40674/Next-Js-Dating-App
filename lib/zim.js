"use client";

let zimInstance = null;
let zimCreatingPromise = null;

/**
 * Get or create the single ZIM instance.
 *
 * ZIM is created only in the browser.
 */
export async function getZIM() {
  // =====================================================
  // SERVER CHECK
  // =====================================================

  if (typeof window === "undefined") {
    throw new Error(
      "ZIM can only be initialized in the browser"
    );
  }

  // =====================================================
  // RETURN EXISTING INSTANCE
  // =====================================================

  if (zimInstance) {
    return zimInstance;
  }

  // =====================================================
  // WAIT FOR EXISTING CREATION
  // =====================================================

  if (zimCreatingPromise) {
    return zimCreatingPromise;
  }

  // =====================================================
  // CREATE ZIM
  // =====================================================

  zimCreatingPromise = (async () => {
    try {
      console.log("Creating ZIM instance...");

      // IMPORTANT:
      // Do not move this import to the top.
      const { ZIM } = await import("zego-zim-web");

      if (!ZIM) {
        throw new Error(
          "ZIM SDK was not loaded correctly"
        );
      }

      // =================================================
      // APP ID
      // =================================================

      const appID = Number(
        process.env.NEXT_PUBLIC_ZEGO_APP_ID
      );

      if (!appID || Number.isNaN(appID)) {
        throw new Error(
          "NEXT_PUBLIC_ZEGO_APP_ID is missing or invalid"
        );
      }

      console.log(
        "Creating ZIM instance with App ID:",
        appID
      );

      // =================================================
      // CREATE SINGLE INSTANCE
      // =================================================

      const instance = ZIM.create({
        appID,
      });

      if (!instance) {
        throw new Error(
          "ZIM.create() returned no instance"
        );
      }

      zimInstance = instance;

      console.log(
        "ZIM instance created successfully"
      );

      return zimInstance;
    } catch (error) {
      console.error(
        "Failed to create ZIM instance:",
        error
      );

      zimInstance = null;

      throw error;
    } finally {
      zimCreatingPromise = null;
    }
  })();

  return zimCreatingPromise;
}

/**
 * Return the existing ZIM instance.
 *
 * This does NOT create a new instance.
 */
export function getExistingZIM() {
  return zimInstance;
}

/**
 * Logout and completely destroy ZIM.
 *
 * Use this only when the user actually logs out.
 */
export async function destroyZIM() {
  if (!zimInstance) {
    return;
  }

  try {
    if (typeof zimInstance.logout === "function") {
      await zimInstance.logout();
    }
  } catch (error) {
    console.warn(
      "ZIM logout warning:",
      error
    );
  }

  zimInstance = null;
}

/**
 * Clear only the local reference.
 *
 * Normally you should prefer destroyZIM()
 * when actually logging out.
 */
export function clearZIM() {
  zimInstance = null;
}