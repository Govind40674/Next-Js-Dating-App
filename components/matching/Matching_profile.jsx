"use client";

import React, { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { fetchOtherUser } from "../../lib/fetchOtherUser";
import { updateUserLocation } from "@/lib/location";
import { MyContext } from "../myContext/MyContext";
import styles from "./Matching_profile.module.css";
import { Button } from "@nextui-org/react";
import {
  Heart,
  X,
  MapPin,
  Star,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import LoadMatch from "../load/loadMatch/LoadMatch";

// Keep the existing VIP-or-Premium check for the free profile-view limit.
const getLocalVipFlag = () => {
  if (typeof window === "undefined") return false;

  return (
    window.localStorage.getItem("isVIP") === "true" ||
    window.localStorage.getItem("isPremium") === "true"
  );
};

// Star Like and Star Message require Premium specifically; VIP alone is not enough.
const getLocalPremiumFlag = () => {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem("isPremium") === "true";
};

const getStoredTodayViewCount = () => {
  if (typeof window === "undefined") return 0;

  const count = Number(window.localStorage.getItem("todayViewCount") || 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
};

const Matching_profile = () => {
  const [result, setResult] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fetchCount, setFetchCount] = useState(10);
  const [todayViewCount, setTodayViewCount] = useState(getStoredTodayViewCount);

  const [showVipModal, setShowVipModal] = useState(false);
  const [showStarMessageModal, setShowStarMessageModal] = useState(false);
  const [starMessageTargetId, setStarMessageTargetId] = useState(null);
  const [starMessageText, setStarMessageText] = useState("");
  const [sendingStarMessage, setSendingStarMessage] = useState(false);
  const [notice, setNotice] = useState("");

  // Read individual context setters so callback dependencies stay stable.
  const context = useContext(MyContext);
  const setIsMessageBox = context?.setIsMessageBox;
  const setIsMatchBox = context?.setIsMatchBox;
  const setIsMatching = context?.setIsMatching;
  const setIsEditpage = context?.setIsEditpage;
  const setIsProfilepage = context?.setIsProfilepage;
  const setPaymentKind = context?.setPaymentKind;
  const setIsPayment = context?.setIsPayment;

  // Preserve the existing profile-view limit behavior.
  const freeLimitReached = todayViewCount >= 10 && !getLocalVipFlag();
  const canFetchProfiles = !freeLimitReached;

  const showPremiumPlan = useCallback(() => {
    setShowVipModal(true);
  }, []);

  const openPremiumPlan = useCallback(() => {
    setIsMessageBox?.(false);
    setIsMatchBox?.(false);
    setIsMatching?.(false);
    setIsEditpage?.(false);
    setIsProfilepage?.(false);
    setPaymentKind?.("Prestige");
    setIsPayment?.(true);
    setShowVipModal(false);
  }, [
    setIsMessageBox,
    setIsMatchBox,
    setIsMatching,
    setIsEditpage,
    setIsProfilepage,
    setPaymentKind,
    setIsPayment,
  ]);

  // Profile advancement is driven by user actions, not a state-setting effect.
  const advanceProfile = useCallback(() => {
    setPhotoIndex(0);

    const nextIndex = index + 1;

    if (nextIndex >= result.length) {
      setIndex(0);
      setLoading(true);
      setFetchCount((previous) => previous + 10);
      return;
    }

    setIndex(nextIndex);
  }, [index, result.length]);

  useEffect(() => {
    let cancelled = false;

    const fetchMatchingUsers = async () => {
      const userId = window.localStorage.getItem("userId");

      if (!userId || !canFetchProfiles) {
        await Promise.resolve();

        if (cancelled) return;

        if (!userId) setResult([]);
        setLoading(false);
        return;
      }

      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);

      try {
        await updateUserLocation({ userId });
        const data = await fetchOtherUser(userId);

        const users = Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
            ? data.users
            : [];

        if (!cancelled) {
          setResult(users);
          setIndex(0);
          setPhotoIndex(0);
        }
      } catch (error) {
        console.error(
          "Error fetching matching users:",
          error?.response?.data || error?.message || error
        );

        if (!cancelled) setResult([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchMatchingUsers();

    return () => {
      cancelled = true;
    };
  }, [fetchCount, canFetchProfiles]);

  const updateStoredViewCount = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    window.localStorage.setItem("todayViewCount", String(parsed));
    setTodayViewCount(parsed);
  };

  // Normal Like
  const handleLike = async (targetUserId) => {
    try {
      const userId = window.localStorage.getItem("userId");

      if (!userId) {
        throw new Error("Please log in before liking a profile.");
      }

      const { data } = await axios.post(
        "/api/profile_controller/like-match",
        { userId, targetUserId }
      );

      if (!data?.success) {
        throw new Error(data?.message || "Unable to like this profile.");
      }

      if (data.todayViewCount !== undefined) {
        updateStoredViewCount(data.todayViewCount);
      }

      if (data.matched) {
        setNotice("It's a match! You both liked each other.");
      } else {
        setNotice("");
      }

      advanceProfile();
    } catch (error) {
      console.error("Like profile failed:", error);

      setNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to like this profile."
      );
    }
  };

  // Skip Profile
  const handleCancel = async (targetUserId) => {
    try {
      const userId = window.localStorage.getItem("userId");

      if (!userId) {
        throw new Error("Please log in before skipping a profile.");
      }

      const { data } = await axios.post(
        "/api/profile_controller/cancel-match",
        { userId, targetUserId }
      );

      if (data?.success && data.todayViewCount !== undefined) {
        updateStoredViewCount(data.todayViewCount);
      }

      setNotice("");
      advanceProfile();
    } catch (error) {
      console.error("Skip profile failed:", error);

      setNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to skip this profile."
      );
    }
  };

  // Star Like: Premium only
  const handleStarLike = async (targetUserId) => {
    // A VIP-only or free account must not send the Star Like request.
    if (!getLocalPremiumFlag()) {
      showPremiumPlan();
      return;
    }

    try {
      const userId = window.localStorage.getItem("userId");

      if (!userId) {
        throw new Error("Please log in before sending a Star Like.");
      }

      const { data } = await axios.post(
        "/api/profile_controller/star-like",
        { userId, targetUserId }
      );

      if (data?.code === "VIP_REQUIRED") {
        showPremiumPlan();
        return;
      }

      if (!data?.success) {
        throw new Error(data?.message || "Unable to send Star Like.");
      }

      setNotice(
        data.matched
          ? "It's a match! You both showed interest."
          : "Star Like sent successfully."
      );

      advanceProfile();
    } catch (error) {
      if (
        error?.response?.status === 403 ||
        error?.response?.data?.code === "VIP_REQUIRED"
      ) {
        showPremiumPlan();
        return;
      }

      console.error("Star Like failed:", error);

      setNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to send Star Like."
      );
    }
  };

  // Open Star Message composer: Premium only
  const handleSendMessage_star = (targetUserId) => {
    if (!getLocalPremiumFlag()) {
      showPremiumPlan();
      return;
    }

    setStarMessageTargetId(targetUserId);
    setStarMessageText("");
    setShowStarMessageModal(true);
  };

  // Send Star Message
  const submitStarMessage = async (event) => {
    event.preventDefault();

    const message = starMessageText.trim();

    if (!message) {
      setNotice("Please enter a message before sending.");
      return;
    }

    if (message.length > 500) {
      setNotice("Star Messages must be 500 characters or fewer.");
      return;
    }

    // Re-check before sending in case the local flag changed while the modal was open.
    if (!getLocalPremiumFlag()) {
      setShowStarMessageModal(false);
      showPremiumPlan();
      return;
    }

    try {
      setSendingStarMessage(true);
      setNotice("");

      const userId = window.localStorage.getItem("userId");

      if (!userId) {
        throw new Error("Please log in before sending a message.");
      }

      const { data } = await axios.post(
        "/api/profile_controller/star-message",
        {
          userId,
          targetUserId: starMessageTargetId,
          message,
        }
      );

      if (data?.code === "VIP_REQUIRED") {
        setShowStarMessageModal(false);
        showPremiumPlan();
        return;
      }

      if (!data?.success) {
        throw new Error(data?.message || "Unable to send Star Message.");
      }

      setShowStarMessageModal(false);
      setStarMessageTargetId(null);
      setStarMessageText("");
      setNotice("Star Message sent successfully.");

      advanceProfile();
    } catch (error) {
      if (
        error?.response?.status === 403 ||
        error?.response?.data?.code === "VIP_REQUIRED"
      ) {
        setShowStarMessageModal(false);
        showPremiumPlan();
        return;
      }

      console.error("Star Message failed:", error);

      setNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to send Star Message."
      );
    } finally {
      setSendingStarMessage(false);
    }
  };

  // VIP and Star Message Dialogs
  function renderDialogs() {
    return (
      <>
        {showVipModal && (
          <div
            className={styles.modalOverlay}
            role="presentation"
            onClick={() => setShowVipModal(false)}
          >
            <section
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="vip-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Close"
                onClick={() => setShowVipModal(false)}
              >
                ×
              </button>

              <div className={styles.modalIcon}>
                <Star size={27} />
              </div>

              <h2 id="vip-modal-title">Unlock Star Features</h2>

              <p>
                Star Like and Star Message are Premium features. Upgrade to
                Premium to show extra interest in someone and send a message
                directly to their inbox.
              </p>

              <ul className={styles.planFeatureList}>
                <li>Send Star Likes to stand out.</li>
                <li>Send a Star Message with your introduction.</li>
                <li>
                  Choose a subscription duration and see the total price before
                  paying.
                </li>
              </ul>

              <button
                type="button"
                className={styles.primaryModalButton}
                onClick={openPremiumPlan}
              >
                View Premium Plan
              </button>

              <button
                type="button"
                className={styles.secondaryModalButton}
                onClick={() => setShowVipModal(false)}
              >
                Maybe later
              </button>
            </section>
          </div>
        )}

        {showStarMessageModal && (
          <div
            className={styles.modalOverlay}
            role="presentation"
            onClick={() => {
              if (!sendingStarMessage) setShowStarMessageModal(false);
            }}
          >
            <section
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="star-message-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Close"
                disabled={sendingStarMessage}
                onClick={() => setShowStarMessageModal(false)}
              >
                ×
              </button>

              <div className={styles.modalIcon}>
                <Send size={25} />
              </div>

              <h2 id="star-message-title">Send a Star Message</h2>

              <p>
                Your message will be saved to the recipient Star Messages.
              </p>

              <form onSubmit={submitStarMessage}>
                <label
                  className={styles.messageLabel}
                  htmlFor="starMessageText"
                >
                  Your message
                </label>

                <textarea
                  id="starMessageText"
                  className={styles.messageTextarea}
                  value={starMessageText}
                  onChange={(event) => setStarMessageText(event.target.value)}
                  placeholder="Write a friendly introduction..."
                  maxLength={500}
                  rows={5}
                  required
                  disabled={sendingStarMessage}
                />

                <div className={styles.characterCount}>
                  {starMessageText.length}/500
                </div>

                <button
                  type="submit"
                  className={styles.primaryModalButton}
                  disabled={sendingStarMessage}
                >
                  {sendingStarMessage ? "Sending..." : "Send Star Message"}
                </button>

                <button
                  type="button"
                  className={styles.secondaryModalButton}
                  disabled={sendingStarMessage}
                  onClick={() => setShowStarMessageModal(false)}
                >
                  Cancel
                </button>
              </form>
            </section>
          </div>
        )}
      </>
    );
  }

  if (loading) return <LoadMatch />;

  if (freeLimitReached) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2>You are all caught up! 🎉</h2>

          <p>
            You have reached your free profile-view limit. Upgrade to Premium
            to continue discovering profiles.
          </p>

          <button
            type="button"
            className={styles.planLinkButton}
            onClick={openPremiumPlan}
          >
            View Premium Plan
          </button>
        </div>

        {renderDialogs()}
      </div>
    );
  }

  if (!result.length) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2>No matches found</h2>
          <p>We could not find anyone to show you right now.</p>
        </div>

        {renderDialogs()}
      </div>
    );
  }

  const currentUser = result[index];

  if (!currentUser) return <LoadMatch />;

  const photos = Array.isArray(currentUser?.photo) ? currentUser.photo : [];
  const safePhotoIndex = photos.length > 0 ? photoIndex % photos.length : 0;

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.imageWrapper}>
          {photos.length > 0 ? (
            <Image
              key={photos[safePhotoIndex]}
              src={photos[safePhotoIndex]}
              alt={`${currentUser.name || "User"} photo`}
              fill
              sizes="(max-width: 600px) 92vw, 420px"
              className={styles.profileImage}
              priority
            />
          ) : (
            <div className={styles.noPhoto}>No photo available</div>
          )}

          {photos.length > 1 && (
            <button
              type="button"
              className={`${styles.photoNavigation} ${styles.previous}`}
              onClick={() =>
                setPhotoIndex((previous) =>
                  previous === 0 ? photos.length - 1 : previous - 1
                )
              }
              aria-label="Previous photo"
            >
              <ChevronLeft />
            </button>
          )}

          {photos.length > 1 && (
            <button
              type="button"
              className={`${styles.photoNavigation} ${styles.next}`}
              onClick={() =>
                setPhotoIndex((previous) =>
                  previous === photos.length - 1 ? 0 : previous + 1
                )
              }
              aria-label="Next photo"
            >
              <ChevronRight />
            </button>
          )}

          {photos.length > 1 && (
            <div className={styles.photoIndicators}>
              {photos.map((_, photoNumber) => (
                <span
                  key={photoNumber}
                  className={`${styles.indicator} ${
                    photoNumber === safePhotoIndex ? styles.activeIndicator : ""
                  }`}
                />
              ))}
            </div>
          )}

          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <h2>{currentUser.name || "User"}</h2>

              {currentUser.hasStarLikedYou && (
                <span className={styles.starReceivedBadge}>
                  ★ Star liked you
                </span>
              )}
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

      {notice && (
        <p className={styles.actionNotice} role="status">
          {notice}
        </p>
      )}

      <div className={styles.actions}>
        <Button
          className={styles.cancel}
          onPress={() => handleCancel(currentUser._id)}
          aria-label="Skip profile"
        >
          <X />
        </Button>

        <Button
          className={styles.starLike}
          onPress={() => handleStarLike(currentUser._id)}
          aria-label="Send Star Like"
        >
          <Star />
        </Button>

        <Button
          className={styles.like}
          onPress={() => handleLike(currentUser._id)}
          aria-label="Like profile"
        >
          <Heart />
        </Button>

        <Button
          className={styles.send}
          onPress={() => handleSendMessage_star(currentUser._id)}
          aria-label="Send Star Message"
        >
          <Send />
        </Button>
      </div>

      {renderDialogs()}
    </div>
  );
};

export default React.memo(Matching_profile);