import { NextResponse } from "next/server";
// import { adminMessaging } from "@/lib/firebase-admin";
import { getAdminMessaging } from "@/lib/firebase-admin";

export async function GET() {
try {
console.log(
"Firebase Messaging initialized:",
Boolean(getAdminMessaging())
);


return NextResponse.json({
  success: true,
  message: "Firebase Admin initialized successfully",
});


} catch (error) {
console.error("Firebase Admin initialization error:", error);


return NextResponse.json(
  {
    success: false,
    message: "Firebase Admin initialization failed",
    error: error.message,
  },
  { status: 500 }
);


}
}
