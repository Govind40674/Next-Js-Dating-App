"use client";

import { getZIM } from "@/lib/zim";

export const createCallRoomId = (userId1, userId2) => {
  if (!userId1 || !userId2) {
    throw new Error("Both user IDs are required");
  }

  const ids = [String(userId1), String(userId2)].sort();

  return `call_${ids[0]}_${ids[1]}`;
};

const sendCallInvitation = async ({
  receiverId,
  callType = "audio",
  callerName,
  otherPhoto,
  ownPhoto,

  // NEW: Called before the ZIM invitation is sent.
  onInvitationStarted,
}) => {
  if (!receiverId) {
    throw new Error("Receiver ID is required");
  }

  const currentUserId = localStorage.getItem("userId");

  if (!currentUserId) {
    throw new Error("Current user ID is missing");
  }

  if (String(currentUserId) === String(receiverId)) {
    throw new Error("You cannot call yourself");
  }

  const zim = await getZIM();

  if (!zim || typeof zim.callInvite !== "function") {
    throw new Error("ZIM call invitation is unavailable");
  }

  const normalizedCallerId = String(currentUserId);
  const normalizedReceiverId = String(receiverId);

  const normalizedCallType =
    callType === "video" ? "video" : "audio";

  const roomId = createCallRoomId(
    normalizedCallerId,
    normalizedReceiverId
  );

  const normalizedCallerName = callerName || "User";
  const normalizedOtherPhoto = otherPhoto || "/default.png";
  const normalizedOwnPhoto = ownPhoto || "/default.png";

  const extendedData = JSON.stringify({
    type: normalizedCallType,
    callerId: normalizedCallerId,
    receiverId: normalizedReceiverId,
    roomId,
    callerName: localStorage.getItem("name") || "Bot",
    otherPhoto: normalizedOtherPhoto,
    ownPhoto: normalizedOwnPhoto,
  });

  // Prepare the full call information before sending the invitation.
  const callInfo = {
    userId: normalizedReceiverId,
    callerId: normalizedCallerId,
    receiverId: normalizedReceiverId,
    roomId,
    callType: normalizedCallType,
    userName: normalizedCallerName,
    otherPhoto: normalizedOtherPhoto,
    ownPhoto: normalizedOwnPhoto,
  };

  console.log("[CALL] Preparing outgoing call:", {
    callerId: normalizedCallerId,
    receiverId: normalizedReceiverId,
    callType: normalizedCallType,
    roomId,
  });

  // IMPORTANT:
  // Open ActiveCall before sending the invitation.
  // ActiveCall can now start joining ZEGO and publishing local media
  // while the invitation request is in progress.
  if (typeof onInvitationStarted === "function") {
    onInvitationStarted(callInfo);
  }

  console.log("[CALL] Sending ZIM invitation:", {
    callerId: normalizedCallerId,
    receiverId: normalizedReceiverId,
    callType: normalizedCallType,
    roomId,
  });

  // The invitation is sent after ActiveCall has been requested to start.
  const response = await zim.callInvite(
    [normalizedReceiverId],
    {
      extendedData,
      timeout: 30,
    }
  );

  console.log("[CALL] ZIM invitation response:", response);

  return {
    ...callInfo,
    callInvitationResponse: response,
  };
};

export default sendCallInvitation;