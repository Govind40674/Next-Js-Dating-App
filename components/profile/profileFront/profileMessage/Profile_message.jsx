"use client";

import React, { useContext, useEffect, useState } from "react";
import styles from "./Profile_message.module.css";
import Image from "next/image";
import axios from "axios";
import { MyContext } from "../../../myContext/MyContext";
import LoadProfileMessage from "../../../load/loadProfile/LoadProfileMessage";

const Profile_message = () => {
  const {
    setIsMessageBox,
    setMessageUserId,
    unreadCounts,
    clearUnreadCount,
    increaseUnreadCount,
    setIsMatching,
    setIsMatchBox,
    setIsEditpage,
    setIsProfilepage
    
  } = useContext(MyContext);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // FETCH MESSAGE USERS
  // =====================================================

  useEffect(() => {
    const fetchMessageProfiles = async () => {
      try {
        const userId = localStorage.getItem("userId");

        if (!userId) {
          return;
        }

        const response = await axios.get(
          "/api/profile_controller/message-profile",
          {
            params: {
              userId,
            },
          },
        );

        if (response.data.success) {
          setUsers(response.data.matchedUsers || []);
        }
      } catch (error) {
        console.error(
          "Error fetching message profiles:",
          error.response?.data || error.message,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMessageProfiles();
  }, []);

  // =====================================================
  // INITIALIZE / CLEAR UNREAD COUNTS
  // =====================================================

  useEffect(() => {
    const addcounts = () => {
      users.forEach((user) => {
        const unreadCount = user.unreadCount || 0;

        if (unreadCount > 0) {
          increaseUnreadCount(user._id, unreadCount);
        }
      });
    };

    const clearcounts = () => {
      users.forEach((user) => {
        clearUnreadCount(user._id);
      });
    };
    clearcounts();
    addcounts();
  }, [users]);

  // =====================================================
  // OPEN CHAT
  // =====================================================

  const handleUserClick = (userId) => {
    // Store selected user
    setMessageUserId(userId);

    // Open PrivateMessage
    setIsMessageBox(true);

    // Set matching to false
    setIsMatching(false);
    setIsMatchBox(false);
    setIsEditpage(false);
    setIsProfilepage(false);

    // Unread count will be cleared by your context / chat logic
    // clearUnreadCount(userId);
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return <LoadProfileMessage />;
  }

  // =====================================================
  // EMPTY
  // =====================================================

  if (users.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        {" "}
        <div className={styles.emptyIcon}>💬</div>
        <h2 className={styles.emptyTitle}>No Matches Yet</h2>
        <p className={styles.emptyText}>
          You do not have any matched users to message yet.
        </p>
      </div>
    );
  }

  // =====================================================
  // MESSAGE USER LIST
  // =====================================================

  return (
    <div className={styles.container}>
      {" "}
      <h2 className={styles.title}>Messages </h2>
      <div className={styles.userList}>
        {users.map((user) => {
          // ZIM realtime unread count
          const unreadCount = unreadCounts[user._id] || 0;

          return (
            <div
              key={user._id}
              className={styles.userCard}
              onClick={() => handleUserClick(user._id)}
            >
              {/* PROFILE IMAGE */}

              <div className={styles.imageContainer}>
                <Image
                  src={user.photo?.[0] || "/default.png"}
                  alt={user.name || "User"}
                  fill
                  sizes="60px"
                  className={styles.profileImage}
                />
              </div>

              {/* USER INFORMATION */}

              <div className={styles.userInfo}>
                <h3 className={styles.userName}>
                  {user.name || "Unknown User"}
                </h3>

                {/* REALTIME UNREAD COUNT */}

                {unreadCount > 0 && (
                  <span className={styles.unread}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(Profile_message);
