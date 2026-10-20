"use client";

import { useContext, useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";

import styles from "./OtherProfile.module.css";
import { MyContext } from "@/components/myContext/MyContext";

const getArray = (value) =>
  Array.isArray(value)
    ? value.filter(
        (item) =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];

const OtherProfile = () => {
  const { matchUserId } = useContext(MyContext);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchMatchedProfile = async () => {
      setLoading(true);
      setUser(null);
      setError("");

      if (!matchUserId) {
        setError("No matched profile selected.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          "/api/profile_controller/profile",
          {
            params: { userId: matchUserId },
            signal: controller.signal,
          }
        );

        if (controller.signal.aborted) return;

        if (
          response.data?.success &&
          response.data?.user
        ) {
          setUser(response.data.user);
        } else {
          setError("This matched profile could not be found.");
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Error fetching matched profile:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load this profile. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchMatchedProfile();

    return () => controller.abort();
  }, [matchUserId]);

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <div className={styles.spinner} />
          <p>Loading matched profile...</p>
        </section>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <div className={styles.stateIcon} aria-hidden="true">
            ♡
          </div>

          <h1 className={styles.stateTitle}>
            Profile unavailable
          </h1>

          <p className={styles.stateMessage}>
            {error || "This profile could not be found."}
          </p>
        </section>
      </main>
    );
  }

  const displayName = user.name?.trim() || "Unknown User";

  const photos = getArray(user.photo);
  const interests = getArray(user.interest);
  const hobbies = getArray(user.hobbies);
  const activities = getArray(user.favoriteActivities);
  const languages = getArray(user.languages);

  const place = [
    user.city,
    user.state,
    user.country,
  ]
    .filter(
      (item) =>
        typeof item === "string" && item.trim().length > 0
    )
    .filter(
      (item, index, array) => array.indexOf(item) === index
    )
    .join(", ");

  const details = [
    { label: "Gender", value: user.gender },
    { label: "Profession", value: user.profession },
    { label: "Education", value: user.education },
    { label: "Looking for", value: user.datingIntent },
  ].filter(
    (item) =>
      typeof item.value === "string" && item.value.trim()
  );

  const allHobbies = [
    ...hobbies,
    ...activities,
  ].filter(
    (item, index, array) => array.indexOf(item) === index
  );

  return (
    <main className={styles.page}>
      <article className={styles.profileCard}>
        {/* Main photo */}
        <div className={styles.photoPanel}>
          {photos[0] ? (
            <Image
              src={photos[0]}
              alt={`${displayName}'s profile`}
              fill
              priority
              sizes="(max-width: 650px) 100vw, 35vw"
              className={styles.profilePhoto}
              unoptimized
            />
          ) : (
            <div className={styles.photoFallback}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className={styles.photoOverlay} />

          <div className={styles.matchBadge}>
            <span aria-hidden="true">♥</span>
            You matched
          </div>

          {photos.length > 1 && (
            <span className={styles.photoCount}>
              {photos.length} photos
            </span>
          )}
        </div>

        {/* Profile information */}
        <div className={styles.profileContent}>
          <header className={styles.profileHeader}>
            <p className={styles.eyebrow}>
              YOUR MATCH
            </p>

            <h1 className={styles.name}>
              {displayName}

              {Number(user.age) > 0 && (
                <span className={styles.age}>
                  , {user.age}
                </span>
              )}
            </h1>

            <p className={styles.location}>
              <span aria-hidden="true">⌖</span>
              {place || "Location not specified"}
            </p>

            {user.bio?.trim() && (
              <p className={styles.bio}>
                {user.bio.trim()}
              </p>
            )}
          </header>

          {/* Interests */}
          <section className={styles.infoSection}>
            <h2 className={styles.sectionTitle}>
              Interests
            </h2>

            {interests.length > 0 ? (
              <div className={styles.chipList}>
                {interests.map((item, index) => (
                  <span
                    className={styles.chip}
                    key={`${item}-${index}`}
                    title={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>
                No interests added yet.
              </p>
            )}
          </section>

          {/* Hobbies and activities */}
          {allHobbies.length > 0 && (
            <section className={styles.infoSection}>
              <h2 className={styles.sectionTitle}>
                Hobbies & activities
              </h2>

              <div className={styles.chipList}>
                {allHobbies.map((item, index) => (
                  <span
                    className={styles.chip}
                    key={`${item}-${index}`}
                    title={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Optional public details */}
          {details.length > 0 && (
            <section className={styles.infoSection}>
              <h2 className={styles.sectionTitle}>
                A little more
              </h2>

              <div className={styles.detailsGrid}>
                {details.map((detail) => (
                  <div
                    className={styles.detail}
                    key={detail.label}
                  >
                    <span className={styles.detailLabel}>
                      {detail.label}
                    </span>

                    <span
                      className={styles.detailValue}
                      title={detail.value}
                    >
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <div className={styles.languagesRow}>
              <span className={styles.detailLabel}>
                Languages
              </span>

              <span className={styles.languageText}>
                {languages.join(", ")}
              </span>
            </div>
          )}

          <p className={styles.privacyNote}>
            <span aria-hidden="true">♥</span>
            Discover what you have in common.
          </p>
        </div>
      </article>
    </main>
  );
};

export default OtherProfile;