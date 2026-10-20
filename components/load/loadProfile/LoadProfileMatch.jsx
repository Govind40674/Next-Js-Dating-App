"use client";

import React from "react";
import styles from "./LoadProfileMatch.module.css";

const LoadProfileMatch = () => {
  return (
    <div className={styles.container}>
      {/* Loading match cards */}
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div className={styles.matchCard} key={item}>
          <div className={styles.image}></div>

          <div className={styles.name}></div>
        </div>
      ))}
    </div>
  );
};

export default LoadProfileMatch;