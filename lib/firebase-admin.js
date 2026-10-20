import {
  initializeApp,
  getApps,
  getApp,
  cert,
} from "firebase-admin/app";

import { getMessaging } from "firebase-admin/messaging";

let firebaseAdminApp;

// =====================================================
// FIREBASE ADMIN INITIALIZATION
// =====================================================

if (getApps().length > 0) {
  firebaseAdminApp = getApp();
} else {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID;

  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  const privateKey =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

  if (
    !projectId ||
    !clientEmail ||
    !privateKey
  ) {
    throw new Error(
      "Firebase Admin environment variables are missing."
    );
  }

  firebaseAdminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

// =====================================================
// FIREBASE ADMIN MESSAGING
// =====================================================

export const adminMessaging =
  getMessaging(firebaseAdminApp);

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default firebaseAdminApp;