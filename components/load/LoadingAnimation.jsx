"use client";

import styles from "./LoadingAnimation.module.css";

export default function LoadingAnimation({
  title = "Finding your perfect match...",
  subtitle = "Just a moment, we're getting things ready for you.",
}) {
  return (
    <div className={styles.loadingScreen}>
      {/* Animated background effects */}
      <div className={styles.backgroundGlow} />
      <div className={styles.backgroundGlowTwo} />

      {/* Main content */}
      <div className={styles.content}>
        {/* Central logo */}
        <div className={styles.logoContainer}>
          {/* Outer rotating ring */}
          <div className={styles.outerRing}>
            <span className={styles.ringDot} />
          </div>

          {/* Middle rotating ring */}
          <div className={styles.middleRing} />

          {/* Inner rotating ring */}
          <div className={styles.innerRing} />

          {/* Logo glow */}
          <div className={styles.logoGlow} />

          {/* Dating app heart logo */}
          <div className={styles.logo}>
            <svg
              viewBox="0 0 120 120"
              className={styles.logoSvg}
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Dating app heart logo"
            >
              <defs>
                <linearGradient
                  id="heartGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#ffe1e8" />
                </linearGradient>
              </defs>

              <path
                d="M60 104
                   L18 63
                   C-1 43 12 17 34 17
                   C46 17 55 24 60 34
                   C65 24 74 17 86 17
                   C108 17 121 43 102 63
                   Z"
                fill="url(#heartGradient)"
              />

              <path
                d="M60 85
                   L39 64
                   C29 54 35 40 47 40
                   C53 40 58 44 60 49
                   C62 44 67 40 73 40
                   C85 40 91 54 81 64
                   Z"
                fill="#e60035"
              />

              <path
                d="M60 69
                   C53 60 44 65 48 73
                   C51 78 60 84 60 84
                   C60 84 69 78 72 73
                   C76 65 67 60 60 69Z"
                fill="#ffffff"
              />
            </svg>
          </div>
        </div>

        {/* Loading messages */}
        <div className={styles.textContainer}>
          <h1 className={styles.title}>{title}</h1>

          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        {/* Animated loading dots */}
        <div
          className={styles.loadingDots}
          role="status"
          aria-label="Loading"
        >
          <span />
          <span />
          <span />
        </div>

        {/* Progress line */}
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} />
        </div>
      </div>

      {/* Bottom branding */}
      <div className={styles.bottomText}>
        Made for meaningful connections
        <span className={styles.bottomHeart}> ♥</span>
      </div>
    </div>
  );
}