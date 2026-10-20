"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";
import styles from "./OwnProfile.module.css";

const sections = [
  {
    id: "overview",
    label: "Overview",
    icon: "⌂",
    description: "Your profile at a glance",
  },
  {
    id: "basic",
    label: "Basic Info",
    icon: "♙",
    description: "Your personal information",
  },
  {
    id: "photos",
    label: "Profile Photos",
    icon: "▧",
    description: "Your profile pictures",
  },
  {
    id: "work",
    label: "Work & Location",
    icon: "⌖",
    description: "Your education and location",
  },
  {
    id: "interests",
    label: "Interests",
    icon: "♡",
    description: "Things you enjoy",
  },
  {
    id: "dating",
    label: "Dating Preferences",
    icon: "♥",
    description: "What you are looking for",
  },
  {
    id: "personality",
    label: "Personality",
    icon: "✧",
    description: "Your personality and communication",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    icon: "☼",
    description: "Your everyday lifestyle",
  },
  {
    id: "account",
    label: "Account & Privacy",
    icon: "⚙",
    description: "Your account and privacy settings",
  },
];

const formatValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return "Not added";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not added";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
};

const formatDate = (value) => {
  if (!value) return "Not added";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not added";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Not added";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not added";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name) => {
  if (!name) return "U";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const getPhotos = (user) => {
  if (!Array.isArray(user?.photo)) return [];

  return user.photo.filter(
    (photo) => typeof photo === "string" && photo.trim()
  );
};

const getLocation = (user) => {
  return [user?.city, user?.state, user?.country]
    .filter(
      (value) => typeof value === "string" && value.trim()
    )
    .join(", ");
};

function ProfileField({ label, value, wide = false }) {
  const displayValue = formatValue(value);
  const isEmpty = displayValue === "Not added";

  return (
    <div
      className={`${styles.field} ${
        wide ? styles.fieldWide : ""
      }`}
    >
      <span className={styles.fieldLabel}>{label}</span>

      <span
        className={`${styles.fieldValue} ${
          isEmpty ? styles.emptyValue : ""
        }`}
      >
        {displayValue}
      </span>
    </div>
  );
}

function SectionPanel({
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <section className={styles.sectionPanel}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{eyebrow}</p>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionDescription}>
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function FieldGrid({ fields }) {
  return (
    <div className={styles.fieldsGrid}>
      {fields.map((field) => (
        <ProfileField
          key={field.label}
          label={field.label}
          value={field.value}
          wide={field.wide}
        />
      ))}
    </div>
  );
}

const OwnProfile = () => {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchOwnProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const userId = localStorage.getItem("userId");

        if (!userId) {
          router.replace("/login");
          return;
        }

        const response = await axios.get(
          `/api/profile_controller/profile?userId=${encodeURIComponent(
            userId
          )}`
        );

        if (
          !response.data?.success ||
          !response.data?.user
        ) {
          throw new Error(
            response.data?.message ||
              "Could not load your profile."
          );
        }

        if (!cancelled) {
          setUser(response.data.user);
        }
      } catch (err) {
        console.error("Error fetching own profile:", err);

        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Something went wrong while loading your profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchOwnProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const openSection = (sectionId) => {
    setActiveSection(sectionId);
  };

  const photos = getPhotos(user);
  const location = getLocation(user);

  const interests = Array.isArray(user?.interest)
    ? user.interest
    : [];

  const completionPercentage = Math.min(
    100,
    Math.max(
      0,
      Number(user?.profileCompletionPercentage) || 0
    )
  );

  const activeSectionDetails = sections.find(
    (section) => section.id === activeSection
  );

  const renderOverview = () => (
    <div className={styles.contentStack}>
      <section className={styles.overviewCard}>
        <div className={styles.profileCover} />

        <div className={styles.profileIdentity}>
          <div className={styles.profileAvatar}>
            {photos[0] ? (
              <Image
                src={photos[0]}
                alt={`${user?.name || "Your"} profile`}
                width={200}
                height={200}
                sizes="98px"
                unoptimized
                className={styles.profileAvatarImage}
              />
            ) : (
              <span>{getInitials(user?.name)}</span>
            )}
          </div>

          <div className={styles.profileIdentityText}>
            <p className={styles.sectionEyebrow}>
              YOUR PROFILE
            </p>

            <h2 className={styles.profileName}>
              {user?.name || "Your Name"}
            </h2>

            <p className={styles.profileLocation}>
              <span aria-hidden="true">⌖</span>{" "}
              {location || "Location not added"}
            </p>
          </div>

          <span
            className={`${styles.statusPill} ${
              user?.isProfileComplete
                ? styles.completed
                : ""
            }`}
          >
            {user?.isProfileComplete
              ? "Profile complete"
              : "In progress"}
          </span>
        </div>

        <div className={styles.profileBio}>
          {user?.bio || (
            <span className={styles.emptyValue}>
              You have not added a bio yet.
            </span>
          )}
        </div>

        {interests.length > 0 && (
          <div className={styles.profileTags}>
            {interests.slice(0, 8).map((interest) => (
              <span
                className={styles.profileTag}
                key={interest}
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={styles.progressCard}>
        <div className={styles.progressMeta}>
          <div>
            <h3 className={styles.panelTitle}>
              Profile completion
            </h3>

            <p className={styles.panelDescription}>
              Keep your profile up to date.
            </p>
          </div>

          <strong className={styles.progressPercent}>
            {completionPercentage}%
          </strong>
        </div>

        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Profile completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completionPercentage}
        >
          <div
            className={styles.progressFill}
            style={{
              width: `${completionPercentage}%`,
            }}
          />
        </div>

        <button
          type="button"
          className={styles.textButton}
          onClick={() => openSection("basic")}
        >
          View your information <span>→</span>
        </button>
      </section>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>▧</span>
          <span className={styles.statLabel}>
            Profile photos
          </span>
          <strong className={styles.statValue}>
            {photos.length}
          </strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statIcon}>♡</span>
          <span className={styles.statLabel}>
            Interests
          </span>
          <strong className={styles.statValue}>
            {interests.length}
          </strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statIcon}>♙</span>
          <span className={styles.statLabel}>Age</span>
          <strong className={styles.statValue}>
            {user?.age || "—"}
          </strong>
        </div>
      </div>

      <SectionPanel
        eyebrow="QUICK VIEW"
        title="Basic information"
        description="A quick look at your personal details."
      >
        <FieldGrid
          fields={[
            { label: "Full name", value: user?.name },
            { label: "Age", value: user?.age },
            {
              label: "Date of birth",
              value: formatDate(user?.dateOfBirth),
            },
            { label: "Gender", value: user?.gender },
            {
              label: "Interested in",
              value: user?.genderLike,
            },
            {
              label: "Dating intention",
              value: user?.datingIntent,
            },
          ]}
        />

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => openSection("basic")}
        >
          View basic info <span>→</span>
        </button>
      </SectionPanel>
    </div>
  );

  const renderBasicInfo = () => (
    <SectionPanel
      eyebrow="PERSONAL DETAILS"
      title="Basic Info"
      description="Your personal details and profile introduction."
    >
      <FieldGrid
        fields={[
          { label: "Full name", value: user?.name },
          { label: "Age", value: user?.age },
          {
            label: "Date of birth",
            value: formatDate(user?.dateOfBirth),
          },
          { label: "Gender", value: user?.gender },
          {
            label: "Interested in",
            value: user?.genderLike,
          },
          {
            label: "Relationship status",
            value: user?.relationshipStatus,
          },
          {
            label: "About me",
            value: user?.bio,
            wide: true,
          },
        ]}
      />
    </SectionPanel>
  );

  const renderPhotos = () => (
    <SectionPanel
      eyebrow="YOUR GALLERY"
      title="Profile Photos"
      description="All the photos currently saved on your profile."
    >
      {photos.length > 0 ? (
        <div className={styles.photoGrid}>
          {photos.map((photo, index) => (
            <div
              className={styles.photoTile}
              key={`${photo}-${index}`}
            >
              <Image
                src={photo}
                alt={`Profile photo ${index + 1}`}
                width={400}
                height={460}
                sizes="(max-width: 740px) 45vw, (max-width: 1050px) 30vw, 220px"
                unoptimized
                className={styles.photoImage}
                loading="lazy"
              />

              <div className={styles.photoCaption}>
                <span>Photo {index + 1}</span>

                {index === 0 && (
                  <span className={styles.primaryPhotoBadge}>
                    Main photo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyPhotos}>
          <span className={styles.emptyPhotosIcon}>▧</span>
          <h3>No profile photos yet</h3>
          <p>
            Your uploaded profile photos will appear here.
          </p>
        </div>
      )}

      <p className={styles.photoCount}>
        {photos.length} photo{photos.length !== 1 ? "s" : ""}{" "}
        saved
      </p>
    </SectionPanel>
  );

  const renderWorkLocation = () => (
    <SectionPanel
      eyebrow="YOUR BACKGROUND"
      title="Work & Location"
      description="Your education, profession, and location details."
    >
      <FieldGrid
        fields={[
          {
            label: "Profession",
            value: user?.profession,
          },
          {
            label: "Education",
            value: user?.education,
          },
          { label: "City", value: user?.city },
          { label: "State", value: user?.state },
          { label: "Country", value: user?.country },
          {
            label: "Languages",
            value: user?.languages,
            wide: true,
          },
        ]}
      />
    </SectionPanel>
  );

  const renderInterests = () => (
    <SectionPanel
      eyebrow="WHAT YOU ENJOY"
      title="Interests & Hobbies"
      description="The activities, subjects, and entertainment you enjoy."
    >
      <FieldGrid
        fields={[
          {
            label: "Interests",
            value: user?.interest,
            wide: true,
          },
          {
            label: "Hobbies",
            value: user?.hobbies,
            wide: true,
          },
          {
            label: "Favorite music",
            value: user?.favoriteMusic,
            wide: true,
          },
          {
            label: "Favorite movies / genres",
            value: user?.favoriteMovies,
            wide: true,
          },
          {
            label: "Favorite books / genres",
            value: user?.favoriteBooks,
            wide: true,
          },
          {
            label: "Favorite activities",
            value: user?.favoriteActivities,
            wide: true,
          },
        ]}
      />
    </SectionPanel>
  );

  const renderDatingPreferences = () => (
    <SectionPanel
      eyebrow="YOUR PREFERENCES"
      title="Dating Preferences"
      description="Your dating intentions and discovery preferences."
    >
      <FieldGrid
        fields={[
          {
            label: "What you're looking for",
            value: user?.datingIntent,
          },
          {
            label: "Relationship status",
            value: user?.relationshipStatus,
          },
          {
            label: "Minimum preferred age",
            value: user?.minAgePreference,
          },
          {
            label: "Maximum preferred age",
            value: user?.maxAgePreference,
          },
          {
            label: "Maximum distance",
            value:
              user?.maxDistanceKm != null
                ? `${user.maxDistanceKm} km`
                : null,
          },
          {
            label: "Interested in",
            value: user?.genderLike,
          },
        ]}
      />
    </SectionPanel>
  );

  const renderPersonality = () => (
    <SectionPanel
      eyebrow="GETTING TO KNOW YOU"
      title="Personality & Communication"
      description="Your personality traits and communication preferences."
    >
      <FieldGrid
        fields={[
          {
            label: "Personality traits",
            value: user?.personalityTraits,
            wide: true,
          },
          {
            label: "Communication style",
            value: user?.communicationStyle,
          },
          {
            label: "Love languages",
            value: user?.loveLanguage,
            wide: true,
          },
        ]}
      />
    </SectionPanel>
  );

  const renderLifestyle = () => (
    <SectionPanel
      eyebrow="EVERYDAY LIFE"
      title="Lifestyle"
      description="Your lifestyle choices and personal preferences."
    >
      <FieldGrid
        fields={[
          {
            label: "Height",
            value:
              user?.height != null
                ? `${user.height} cm`
                : null,
          },
          {
            label: "Exercise",
            value: user?.exercise,
          },
          {
            label: "Smoking",
            value: user?.smoking,
          },
          {
            label: "Drinking",
            value: user?.drinking,
          },
          {
            label: "Pets",
            value: user?.pets,
            wide: true,
          },
          {
            label: "Religion",
            value: user?.religion,
          },
        ]}
      />
    </SectionPanel>
  );

  const renderAccount = () => (
    <div className={styles.contentStack}>
      <SectionPanel
        eyebrow="ACCOUNT DETAILS"
        title="Account Information"
        description="Information connected to your account."
      >
        <FieldGrid
          fields={[
            {
              label: "Email address",
              value: user?.email,
            },
            {
              label: "Phone number",
              value: user?.phone,
            },
            {
              label: "Sign-in provider",
              value: user?.authProvider,
            },
            {
              label: "Account verified",
              value:
                typeof user?.isVerified === "boolean"
                  ? user.isVerified
                    ? "Verified"
                    : "Not verified"
                  : null,
            },
            {
              label: "Member since",
              value: formatDate(user?.createdAt),
            },
            {
              label: "Last active",
              value: formatDateTime(user?.lastActive),
            },
          ]}
        />
      </SectionPanel>

      <SectionPanel
        eyebrow="VISIBILITY"
        title="Privacy Settings"
        description="Your saved profile visibility preferences."
      >
        <FieldGrid
          fields={[
            {
              label: "Show age",
              value: user?.showAge,
            },
            {
              label: "Show distance",
              value: user?.showDistance,
            },
            {
              label: "Show online status",
              value: user?.showOnlineStatus,
            },
            {
              label: "Online status",
              value: user?.isOnline,
            },
          ]}
        />
      </SectionPanel>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return renderOverview();

      case "basic":
        return renderBasicInfo();

      case "photos":
        return renderPhotos();

      case "work":
        return renderWorkLocation();

      case "interests":
        return renderInterests();

      case "dating":
        return renderDatingPreferences();

      case "personality":
        return renderPersonality();

      case "lifestyle":
        return renderLifestyle();

      case "account":
        return renderAccount();

      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />

        <h2 className={styles.loadingTitle}>
          Loading your profile
        </h2>

        <p className={styles.loadingText}>
          Please wait a moment...
        </p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}>!</span>

          <h2 className={styles.loadingTitle}>
            Unable to load profile
          </h2>

          <p className={styles.loadingText}>
            {error || "Your profile could not be found."}
          </p>

          <button
            type="button"
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>♡</div>

            <div>
              <span className={styles.brandName}>
                My Space
              </span>

              <span className={styles.brandCaption}>
                Personal profile
              </span>
            </div>
          </div>

          <div className={styles.sidebarProfile}>
            <div className={styles.sidebarAvatar}>
              {photos[0] ? (
                <Image
                  src={photos[0]}
                  alt=""
                  width={100}
                  height={100}
                  sizes="43px"
                  unoptimized
                  className={styles.sidebarAvatarImage}
                />
              ) : (
                <span>{getInitials(user.name)}</span>
              )}
            </div>

            <div className={styles.sidebarIdentity}>
              <strong>{user.name || "Your Name"}</strong>
              <span>My account</span>
            </div>

            <span className={styles.onlineDot} />
          </div>

          <div className={styles.navHeading}>
            PROFILE MENU
          </div>

          <nav className={styles.nav}>
            {sections.map((section) => {
              const isActive =
                activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  className={`${styles.navItem} ${
                    isActive ? styles.navItemActive : ""
                  }`}
                  onClick={() => openSection(section.id)}
                  aria-current={isActive ? "page" : undefined}
                  title={section.description}
                >
                  <span className={styles.navIcon}>
                    {section.icon}
                  </span>

                  <span className={styles.navText}>
                    {section.label}
                  </span>

                  {isActive && (
                    <span className={styles.navArrow}>
                      ›
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <div className={styles.footerIcon}>i</div>

            <div>
              <strong>Your space, your story</strong>
              <p>
                View your information one section at a time.
              </p>
            </div>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.mainHeader}>
            <div>
              <p className={styles.eyebrow}>
                YOUR PERSONAL SPACE
              </p>

              <h1 className={styles.pageTitle}>
                My Profile
              </h1>

              <p className={styles.pageSubtitle}>
                Manage and explore your profile information.
              </p>
            </div>

            <span
              className={`${styles.statusPill} ${
                user.isProfileComplete
                  ? styles.completed
                  : ""
              }`}
            >
              {user.isProfileComplete
                ? "✓ Profile complete"
                : "Profile in progress"}
            </span>
          </header>

          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.sectionIntroIcon}>
                {activeSectionDetails?.icon || "♡"}
              </span>
            </div>

            <div>
              <h2>
                {activeSectionDetails?.label || "Overview"}
              </h2>

              <p>
                {activeSectionDetails?.description ||
                  "Your profile at a glance"}
              </p>
            </div>
          </div>

          <div className={styles.sectionContent}>
            {renderActiveSection()}
          </div>

          <footer className={styles.mainFooter}>
            <span>
              Your information, all in one place.
            </span>

            <button
              type="button"
              onClick={() => openSection("overview")}
              className={styles.footerLink}
            >
              Back to overview ↑
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default OwnProfile;