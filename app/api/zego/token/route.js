import { NextResponse } from "next/server";

import generateToken04 from "@/lib/zegoToken";

export async function POST(request) {
try {
const {
userId,
roomId,
} = await request.json();


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

if (!roomId) {
  return NextResponse.json(
    {
      success: false,
      message:
        "Room ID is required",
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
 * RTC room privilege payload.
 *
 * 1 = login room
 * 2 = publish stream
 */

const payload = JSON.stringify({
  room_id: roomId.toString(),

  privilege: {
    1: 1,
    2: 1,
  },

  stream_id_list: [],
});

const token =
  generateToken04(
    appId,
    userId.toString(),
    serverSecret,
    3600,
    payload
  );

return NextResponse.json({
  success: true,
  token,
  appId,
  roomId: roomId.toString(),
  userId: userId.toString(),
});


} catch (error) {
console.error(
"Zego RTC token error:",
error
);


return NextResponse.json(
  {
    success: false,
    message:
      "Failed to generate Zego RTC token",
  },
  { status: 500 }
);


}
}
