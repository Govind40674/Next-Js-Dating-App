// lib/fetchOtherUser.js

import axios from "axios";

export const fetchOtherUser = async (userId) => {
  try {
    const response = await axios.get(
      `/api/profile_controller/findOtherUser?userId=${userId}`
    );

    console.log("findOtherUser response:", response.data);
    // const data = await response.json();

    return response.data.users || [];
  } catch (error) {
    console.log(
      "Error fetching other users:",
      error.response?.data || error.message
    );

    throw error;
  }
};