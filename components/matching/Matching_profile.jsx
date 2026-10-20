"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

import { fetchOtherUser } from "../../lib/fetchOtherUser";
import Image from "next/image";
import styles from "./Matching_profile.module.css";
import { Button } from "@nextui-org/react";
// import { Card, CardContent } from "@/components/ui/card";
import { updateUserLocation } from "@/lib/location";
// import { Button } from "@nextui-org/react";
import { Heart, X, MapPin, Star, Send } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LoadMatch from "../load/loadMatch/LoadMatch";

// import { useRouter } from "next/navigation";

const Matching_profile = () => {
  const [result, setResult] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fetch, setFetch] = useState(10);
  const [freeLimitReached, setFreeLimitReached] = useState(false);

  useEffect(() => {
    if (
      localStorage.getItem("todayViewCount") >= 10 &&
      !localStorage.getItem("isVIP")
    ) {
      return;
    }

    const FetchOtherUser = async () => {
      try {
        const userId = localStorage.getItem("userId");

        if (!userId) {
          throw new Error("User ID not found");
        }

        // Keep loading visible while location + users are fetched
        setLoading(true);

        // ============================================
        // UPDATE CURRENT USER LOCATION
        // ============================================

        const locationResponse = await updateUserLocation({
          userId,
        });

        console.log("Location updated:", locationResponse);

        // ============================================
        // FETCH MATCHING USERS
        // ============================================

        const data = await fetchOtherUser(userId);

        console.log("Other users:", data);

        // ============================================
        // SAVE USERS
        // ============================================

        setResult(Array.isArray(data) ? data : []);
        console.log("result", result);

        console.log("Matching users:", data);
      } catch (error) {
        console.log(
          "Error fetching users:",
          error.response?.data || error.message,
        );

        setResult([]);
      } finally {
        setLoading(false);
      }
    };

    FetchOtherUser();
  }, [fetch]);

  const handleLike = async (targeteduser) => {
    setIndex((prev) => prev + 1);
    setPhotoIndex(0);
    const response = await axios.post(`/api/profile_controller/like-match`, {
      userId: localStorage.getItem("userId"),
      targetUserId: targeteduser,
    });
    if (response.data.success) {
      // console.log("cancelled");
      localStorage.setItem("todayViewCount", response.data.todayViewCount);
    }
  };

  const handleCancel = async (targeteduser) => {
    setIndex((prev) => prev + 1);
    setPhotoIndex(0);

    const response = await axios.post(`/api/profile_controller/cancel-match`, {
      userId: localStorage.getItem("userId"),
      targetUserId: targeteduser,
    });
    if (response.data.success) {
      console.log("cancelled");
      localStorage.setItem("todayViewCount", response.data.todayViewCount);
    }
  };

  useEffect(() => {
    const freeLimit = async () => {
      const todayViewCount = Number(
        localStorage.getItem("todayViewCount") || 0,
      );

      const isVIP = localStorage.getItem("isVIP") === "true";

      if (todayViewCount >= 10 && !isVIP) {
        setFreeLimitReached(true);
        return;
      }

      if (result.length > 0 && index >= result.length) {
        setFetch((prev) => prev + 10);
        setLoading(true);
        setIndex(0);
        setPhotoIndex(0);
      }
    };

    freeLimit();
  }, [result.length, index]);
  /*
   * FREE LIMIT REACHED
  
   */
  if (freeLimitReached) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2>You are all caught up! 🎉</h2>

          <p>There are no more profiles to show.</p>
        </div>
      </div>
    );
  }
  /*
   * MATCHING LOADER
   */
  if (loading) {
    return <LoadMatch />;
  }

  /*
   * NO MATCHES
   */
  if (!result.length) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2>No matches found</h2>

          <p>We could not find anyone to show you right now.</p>
        </div>
      </div>
    );
  }

  /*
  //  * ALL PROFILES COMPLETED
   */

  const currentUser = result[index];
  if (!currentUser) {
    return <LoadMatch />;
  }

  const photos = Array.isArray(currentUser?.photo) ? currentUser.photo : [];

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        {/* PHOTO */}
        <div className={styles.imageWrapper}>
          {photos.length > 0 ? (
            <Image
              key={photos[photoIndex]}
              src={photos[photoIndex]}
              alt={`${currentUser.name || "User"} photo`}
              fill
              sizes="(max-width: 600px) 92vw, 420px"
              className={styles.profileImage}
              priority
            />
          ) : (
            <div className={styles.noPhoto}>No photo available</div>
          )}

          {/* PREVIOUS PHOTO */}
          {photos.length > 1 && (
            <button
              type="button"
              className={`${styles.photoNavigation} ${styles.previous}`}
              onClick={() =>
                setPhotoIndex((prev) =>
                  prev === 0 ? photos.length - 1 : prev - 1,
                )
              }
              aria-label="Previous photo"
            >
              <ChevronLeft />
            </button>
          )}

          {/* NEXT PHOTO */}
          {photos.length > 1 && (
            <button
              type="button"
              className={`${styles.photoNavigation} ${styles.next}`}
              onClick={() =>
                setPhotoIndex((prev) =>
                  prev === photos.length - 1 ? 0 : prev + 1,
                )
              }
              aria-label="Next photo"
            >
              <ChevronRight />
            </button>
          )}

          {/* PHOTO INDICATORS */}
          {photos.length > 1 && (
            <div className={styles.photoIndicators}>
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`${styles.indicator} ${
                    i === photoIndex ? styles.activeIndicator : ""
                  }`}
                />
              ))}
            </div>
          )}

          {/* PROFILE INFORMATION */}
          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <h2>{currentUser.name || "User"}</h2>
            </div>

            <div className={styles.locationRow}>
              <MapPin size={16} />
              <span>{currentUser.country || "Unknown"}</span>
              <span>•</span>
              <span>{currentUser.distance ?? "Unknown"} km</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <Button
          className={styles.cancel}
          onPress={() => handleCancel(currentUser._id)}
        >
          <X />
        </Button>
        <Button className={styles.starLike}>
          <Star onClick={handleLike} />
        </Button>
        <Button
          className={styles.like}
          onPress={() => handleLike(currentUser._id)}
        >
          <Heart />
        </Button>
        <Button className={styles.send}>
          <Send />
        </Button>
      </div>
    </div>
  );
};

export default React.memo(Matching_profile); // Use React.memo to optimize Matching_profile;
