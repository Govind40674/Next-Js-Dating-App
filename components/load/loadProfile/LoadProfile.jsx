"use client";

import React from "react";
import styles from "./LoadProfile.module.css";

const LoadProfile = () => {
  return (
    <div className={styles.container}>
      {/* Profile image */}
      <div className={styles.avatarSkeleton}></div>

      {/* Name */}
      <div className={styles.nameSkeleton}></div>

      {/* Bio */}
      <div className={styles.bioSkeleton}></div>
      <div className={`${styles.bioSkeleton} ${styles.short}`}></div>

      {/* Profile information */}
      <div className={styles.infoSection}>
        <div className={styles.infoRow}>
          <div className={styles.iconSkeleton}></div>
          <div className={styles.textSkeleton}></div>
        </div>

        <div className={styles.infoRow}>
          <div className={styles.iconSkeleton}></div>
          <div className={styles.textSkeleton}></div>
        </div>

        <div className={styles.infoRow}>
          <div className={styles.iconSkeleton}></div>
          <div className={styles.textSkeleton}></div>
        </div>

        <div className={styles.infoRow}>
          <div className={styles.iconSkeleton}></div>
          <div className={styles.textSkeleton}></div>
        </div>
      </div>

      {/* Bottom button */}
      <div className={styles.buttonSkeleton}></div>
    </div>
  );
};

export default LoadProfile;