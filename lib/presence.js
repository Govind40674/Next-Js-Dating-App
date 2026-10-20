import axios from "axios";

export async function setOnlineStatus(isOnline) {
  try {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      return;
    }

    await axios.post("/api/user_controller/presence", {
      userId,
      isOnline,
    });
  } catch (error) {
    console.error(
      "Presence update failed:",
      error.response?.data || error.message
    );
  }
}