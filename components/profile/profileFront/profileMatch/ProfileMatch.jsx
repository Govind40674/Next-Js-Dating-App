"use client";

import React, { useEffect, useState, useContext } from "react";
import styles from "./ProfileMatch.module.css";
import axios from "axios";
import Image from "next/image";

import LoadProfileMatch from "../../../load/loadProfile/LoadProfileMatch";
import { MyContext } from "../../../myContext/MyContext";

const ProfileMatch = ({ user }) => {
const [matchedUsers, setMatchedUsers] = useState([]);
const [loading, setLoading] = useState(true);

const {
setMatchUserId,
setIsMessageBox,
setIsMatchBox,
setIsMatching,
setIsEditpage,
setIsProfilepage,
setIsPayment

} = useContext(MyContext);

useEffect(() => {
if (!user?._id) {
return;
}


let isActive = true;

const fetchData = async () => {
  try {
    const response = await axios.get(
      "/api/profile_controller/match-profile",
      {
        params: {
          userId: user._id,
        },
      }
    );

    if (!isActive) return;

    console.log("Matched users:", response.data);

    if (response.data.success) {
      setMatchedUsers(response.data.users || []);
    } else {
      setMatchedUsers([]);
    }
  } catch (error) {
    if (!isActive) return;

    console.error(
      "Error fetching matched users:",
      error.response?.data || error.message
    );

    setMatchedUsers([]);
  } finally {
    if (isActive) {
      setLoading(false);
    }
  }
};

fetchData();

return () => {
  isActive = false;
};


}, [user?._id]);

const handleMatchClick = (userId) => {
setIsMatching(false);
setIsMessageBox(false);
setMatchUserId(userId);
setIsMatchBox(true);
setIsEditpage(false);
setIsProfilepage(false);
setIsPayment(false);
};

// Wait until the user is available.
if (!user?._id) {
return <LoadProfileMatch />;
}

// Loading
if (loading) {
return <LoadProfileMatch />;
}

// No matches
if (!matchedUsers.length) {
return ( <div className={styles.empty}> <div className={styles.emptyIcon}>💙</div>


    <h2>No Matches Yet</h2>

    <p>
      When you and someone like each other, your matches will appear here.
    </p>
  </div>
);


}

return ( <div className={styles.container}> <h2 className={styles.title}>Your Matches</h2>


  <div className={styles.matchGrid}>
    {matchedUsers.map((matchedUser) => (
      <div
        key={matchedUser._id}
        className={styles.matchCard}
        onClick={() => handleMatchClick(matchedUser._id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleMatchClick(matchedUser._id);
          }
        }}
      >
        <div className={styles.imageWrapper}>
          <Image
            src={matchedUser?.photo?.[0] || "/default.png"}
            alt={matchedUser?.name || "User"}
            fill
            sizes="100px"
            className={styles.profileImage}
          />
        </div>

        <p className={styles.name}>
          {matchedUser?.name || "Unknown User"}
        </p>
      </div>
    ))}
  </div>
</div>


);
};

export default React.memo(ProfileMatch);
