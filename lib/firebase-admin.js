import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let messagingInstance = null;

function normalizePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY is missing or invalid."
    );
  }

  let key = rawKey.trim();

  // Remove wrapping quotes if they were accidentally included
  // in the environment variable value.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Support both escaped newlines (\n) and actual newlines.
  key = key
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  if (
    !key.includes("-----BEGIN PRIVATE KEY-----") ||
    !key.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY is not a valid service-account PEM key. " +
      "Use the private_key value from your Firebase service-account JSON."
    );
  }

  return key;
}

export function getAdminMessaging() {
  // Do not parse credentials until Firebase Messaging is actually needed.
  if (messagingInstance) {
    return messagingInstance;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );

  if (!projectId || !clientEmail) {
    throw new Error(
      "FIREBASE_ADMIN_PROJECT_ID and FIREBASE_ADMIN_CLIENT_EMAIL are required."
    );
  }

  if (!clientEmail.endsWith(".iam.gserviceaccount.com")) {
    throw new Error(
      "FIREBASE_ADMIN_CLIENT_EMAIL does not look like a service-account email."
    );
  }

  const app =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        });

  messagingInstance = getMessaging(app);

  return messagingInstance;
}

export default getAdminMessaging;