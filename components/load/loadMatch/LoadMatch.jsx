"use client";

import React from "react";
import Image from "next/image";
import styles from "./LoadMatch.module.css";

const LoadMatch = () => {
  return (
    <div className={styles.container}>
      <div className={styles.imageWrapper}>
        <Image
          src="/default.png"
          alt="Loading match"
          fill
          priority
          className={styles.image}
        />

        <span className={styles.ripple}></span>
      </div>
    </div>
  );
};

export default LoadMatch;