"use client";

import React from "react";
import styles from "./LoadProfileMessage.module.css";

const LoadProfileMessage = () => {
  return (
    <div className={styles.container}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div className={styles.messageCard} key={item}>
          {/* Profile image */}
          <div className={styles.avatar}></div>

          {/* User information */}
          <div className={styles.userInfo}>
            <div className={styles.name}></div>
            <div className={styles.message}></div>
          </div>

          {/* Unread count */}
          <div className={styles.count}></div>
        </div>
      ))}
    </div>
  );
};

export default LoadProfileMessage;