import { NextResponse } from "next/server";

import generateToken04 from "@/lib/zegoToken";

export async function POST(request) {
try {
const { userId } =
await request.json();


if (!userId) {
  return NextResponse.json(
    {
      success: false,
      message:
        "User ID is required",
    },
    { status: 400 }
  );
}

const appId = Number(
  process.env.ZEGOCLOUD_APP_ID
);

const serverSecret =
  process.env.ZEGOCLOUD_SERVER_SECRET;

if (!appId) {
  return NextResponse.json(
    {
      success: false,
      message:
        "ZEGOCLOUD_APP_ID is missing",
    },
    { status: 500 }
  );
}

if (!serverSecret) {
  return NextResponse.json(
    {
      success: false,
      message:
        "ZEGOCLOUD_SERVER_SECRET is missing",
    },
    { status: 500 }
  );
}

/*
 * ZIM uses Token04 with
 * an empty payload.
 */

const token =
  generateToken04(
    appId,
    userId.toString(),
    serverSecret,
    3600,
    ""
  );

return NextResponse.json({
  success: true,
  token,
});


} catch (error) {
console.error(
"ZIM token error:",
error
);


return NextResponse.json(
  {
    success: false,
    message:
      "Failed to generate ZIM token",
  },
  { status: 500 }
);


}
}
