"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Select from "react-select";
import countries from "world-countries";

import { MyContext } from "../myContext/MyContext";
import { registerSchema } from "./schema";
import styles from "./ProfileCmpln.module.css";

const MAX_PHOTOS = 6;

const genderOptions = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];
const genderLikeOptions = [
  { value: "Male", label: "Men" },
  { value: "Female", label: "Women" },
  { value: "All", label: "Everyone" },
];
const interestOptions = [
  ["Fooding", "🍔 Food"],
  ["Dancing", "💃 Dancing"],
  ["Music", "🎵 Music"],
  ["Travel", "✈️ Travel"],
  ["Movies", "🎬 Movies"],
  ["Gaming", "🎮 Gaming"],
  ["Reading", "📚 Reading"],
  ["Photography", "📷 Photography"],
  ["Fitness", "🏋️ Fitness"],
  ["Cricket", "🏏 Cricket"],
  ["Football", "⚽ Football"],
  ["Coding", "💻 Coding"],
  ["Art", "🎨 Art"],
  ["Cooking", "👨‍🍳 Cooking"],
  ["Shopping", "🛍️ Shopping"],
  ["Nature", "🌳 Nature"],
  ["Hiking", "🥾 Hiking"],
  ["Coffee", "☕ Coffee"],
  ["Pets", "🐾 Pets"],
  ["Yoga", "🧘 Yoga"],
].map(([value, label]) => ({ value, label }));
const makeOptions = (values) =>
  values.map((value) => ({ value, label: value }));

const multiSelectFields = [
  { name: "interest", label: "Interests", options: interestOptions },
  {
    name: "hobbies",
    label: "Hobbies",
    options: makeOptions([
      "Reading",
      "Writing",
      "Photography",
      "Cooking",
      "Travel",
      "Hiking",
      "Gaming",
      "Gardening",
      "Dancing",
      "Painting",
      "Shopping",
      "Fitness",
      "Yoga",
      "Cycling",
      "Swimming",
      "Volunteering",
      "Watching Sports",
    ]),
  },
  {
    name: "favoriteMusic",
    label: "Favorite music",
    options: makeOptions([
      "Pop",
      "Rock",
      "Hip-Hop",
      "Classical",
      "Jazz",
      "EDM",
      "Bollywood",
      "Indie",
      "Punjabi",
      "Instrumental",
    ]),
  },
  {
    name: "favoriteMovies",
    label: "Favorite movies / genres",
    options: makeOptions([
      "Comedy",
      "Romance",
      "Action",
      "Thriller",
      "Horror",
      "Drama",
      "Sci-Fi",
      "Documentary",
      "Animation",
      "Fantasy",
    ]),
  },
  {
    name: "favoriteBooks",
    label: "Favorite books / genres",
    options: makeOptions([
      "Fiction",
      "Romance",
      "Mystery",
      "Self-Help",
      "Biography",
      "Fantasy",
      "Science Fiction",
      "History",
      "Poetry",
      "Comics",
    ]),
  },
  {
    name: "favoriteActivities",
    label: "Favorite activities",
    options: makeOptions([
      "Travel",
      "Hiking",
      "Cooking",
      "Movies",
      "Concerts",
      "Museums",
      "Road Trips",
      "Fitness",
      "Sports",
      "Board Games",
      "Beach Trips",
      "Photography",
    ]),
  },
  {
    name: "personalityTraits",
    label: "Personality traits",
    options: makeOptions([
      "Adventurous",
      "Funny",
      "Quiet",
      "Outgoing",
      "Creative",
      "Ambitious",
      "Caring",
      "Romantic",
      "Thoughtful",
      "Curious",
      "Easygoing",
      "Optimistic",
    ]),
  },
  {
    name: "loveLanguage",
    label: "Love languages",
    options: makeOptions([
      "Words of Affirmation",
      "Quality Time",
      "Acts of Service",
      "Receiving Gifts",
      "Physical Touch",
    ]),
  },
  {
    name: "languages",
    label: "Languages you speak",
    options: makeOptions([
      "English",
      "Hindi",
      "Punjabi",
      "Bengali",
      "Gujarati",
      "Marathi",
      "Tamil",
      "Telugu",
      "Kannada",
      "Malayalam",
      "Urdu",
      "French",
      "Spanish",
      "German",
      "Other",
    ]),
  },
  {
    name: "pets",
    label: "Pets",
    options: makeOptions(["Dogs", "Cats", "Birds", "Fish", "Other", "No Pets"]),
  },
];

const singleSelectFields = [
  {
    name: "datingIntent",
    label: "What are you looking for?",
    options: makeOptions([
      "Serious Relationship",
      "Casual Dating",
      "Friendship",
      "Marriage",
      "Not Sure Yet",
    ]),
  },
  {
    name: "relationshipStatus",
    label: "Relationship status",
    options: makeOptions([
      "Single",
      "Divorced",
      "Widowed",
      "Prefer Not to Say",
    ]),
  },
  {
    name: "communicationStyle",
    label: "Preferred communication",
    options: makeOptions([
      "Texting",
      "Calling",
      "Video Calling",
      "In Person",
      "All",
    ]),
  },
  {
    name: "exercise",
    label: "Exercise habits",
    options: makeOptions([
      "Frequently",
      "Sometimes",
      "Rarely",
      "Never",
      "Prefer Not to Say",
    ]),
  },
  {
    name: "smoking",
    label: "Smoking",
    options: makeOptions(["Yes", "No", "Sometimes", "Prefer Not to Say"]),
  },
  {
    name: "drinking",
    label: "Drinking",
    options: makeOptions(["Yes", "No", "Sometimes", "Prefer Not to Say"]),
  },
];

const defaultValues = {
  name: "",
  dateOfBirth: "",
  gender: "",
  genderLike: "",
  bio: "",
  profession: "",
  education: "",
  city: "",
  state: "",
  country: "",
  interest: [],
  hobbies: [],
  favoriteMusic: [],
  favoriteMovies: [],
  favoriteBooks: [],
  favoriteActivities: [],
  datingIntent: "Not Sure Yet",
  minAgePreference: 18,
  maxAgePreference: 99,
  maxDistanceKm: 50,
  relationshipStatus: "Prefer Not to Say",
  personalityTraits: [],
  communicationStyle: "All",
  loveLanguage: [],
  languages: [],
  height: "",
  exercise: "Prefer Not to Say",
  smoking: "Prefer Not to Say",
  drinking: "Prefer Not to Say",
  pets: [],
  religion: "",
};

const arrayFields = [
  "interest",
  "hobbies",
  "favoriteMusic",
  "favoriteMovies",
  "favoriteBooks",
  "favoriteActivities",
  "personalityTraits",
  "loveLanguage",
  "languages",
  "pets",
];
const scalarFields = [
  "name",
  "dateOfBirth",
  "gender",
  "genderLike",
  "bio",
  "profession",
  "education",
  "city",
  "state",
  "country",
  "datingIntent",
  "minAgePreference",
  "maxAgePreference",
  "maxDistanceKm",
  "relationshipStatus",
  "communicationStyle",
  "height",
  "exercise",
  "smoking",
  "drinking",
  "religion",
];

const steps = [
  {
    title: "Basic info",
    eyebrow: "The essentials",
    description: "A few details help people get to know you.",
    fields: ["name", "dateOfBirth", "gender", "genderLike", "bio"],
    required: true,
  },
  {
    title: "Work & location",
    eyebrow: "Your world",
    description:
      "These details are optional and help add context to your profile.",
    fields: ["profession", "education", "city", "state", "country"],
  },
  {
    title: "Interests",
    eyebrow: "Things you enjoy",
    description: "Choose a few things you enjoy—or skip this section for now.",
    fields: [
      "interest",
      "hobbies",
      "favoriteMusic",
      "favoriteMovies",
      "favoriteBooks",
      "favoriteActivities",
    ],
  },
  {
    title: "Dating preferences",
    eyebrow: "Your preferences",
    description: "Fine-tune who you would like to meet.",
    fields: [
      "datingIntent",
      "relationshipStatus",
      "minAgePreference",
      "maxAgePreference",
      "maxDistanceKm",
    ],
  },
  {
    title: "Personality & lifestyle",
    eyebrow: "A little more about you",
    description: "All answers here are optional.",
    fields: [
      "personalityTraits",
      "communicationStyle",
      "loveLanguage",
      "languages",
      "height",
      "exercise",
      "smoking",
      "drinking",
      "pets",
      "religion",
    ],
  },
  {
    title: "Profile photos",
    eyebrow: "Show your personality",
    description: "Add up to six photos. You can also do this later.",
    fields: [],
  },
];

const countryOptions = countries
  .map((country) => ({
    value: country.cca2,
    label: `${country.flag || ""} ${country.name.common}`,
    country,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

function findCountryValue(storedCountry) {
  if (!storedCountry) return "";
  const stored = String(storedCountry);
  const byCode = countryOptions.find(
    (option) => option.value.toLowerCase() === stored.toLowerCase(),
  );
  if (byCode) return byCode.value;
  const byName = countryOptions.find(
    (option) =>
      option.country.name.common.toLowerCase() === stored.toLowerCase(),
  );
  return byName?.value || stored;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function maximumDateOfBirthInputValue() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

const ProfileCmpln = () => {
  const context = useContext(MyContext);
  const setProfileUpdate = context?.setProfileUpdate;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [image, setImage] = useState(Array(MAX_PHOTOS).fill(null));
  const [submitError, setSubmitError] = useState("");
  const objectUrls = useRef(new Set());

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues,
    mode: "onTouched",
    shouldUnregister: false,
  });
  const values = useWatch({ control }) || {};

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const fetchProfileData = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          router.push("/login");
          return;
        }

        const response = await axios.get(
          `/api/profile_controller/profile?userId=${encodeURIComponent(userId)}`,
        );
        if (cancelled || !response.data?.success || !response.data?.user)
          return;
        const user = response.data.user;

        reset({
          ...defaultValues,
          name: user.name || "",
          dateOfBirth: dateInputValue(user.dateOfBirth),
          gender: user.gender || "",
          genderLike: user.genderLike || "",
          bio: user.bio || "",
          profession: user.profession || "",
          education: user.education || "",
          city: user.city || "",
          state: user.state || "",
          country: findCountryValue(user.country),
          interest: asArray(user.interest),
          hobbies: asArray(user.hobbies),
          favoriteMusic: asArray(user.favoriteMusic),
          favoriteMovies: asArray(user.favoriteMovies),
          favoriteBooks: asArray(user.favoriteBooks),
          favoriteActivities: asArray(user.favoriteActivities),
          datingIntent: user.datingIntent || "Not Sure Yet",
          minAgePreference: user.minAgePreference ?? 18,
          maxAgePreference: user.maxAgePreference ?? 99,
          maxDistanceKm: user.maxDistanceKm ?? 50,
          relationshipStatus: user.relationshipStatus || "Prefer Not to Say",
          personalityTraits: asArray(user.personalityTraits),
          communicationStyle: user.communicationStyle || "All",
          loveLanguage: asArray(user.loveLanguage),
          languages: asArray(user.languages),
          height: user.height ?? "",
          exercise: user.exercise || "Prefer Not to Say",
          smoking: user.smoking || "Prefer Not to Say",
          drinking: user.drinking || "Prefer Not to Say",
          pets: asArray(user.pets),
          religion: user.religion || "",
        });

        setImage(
          Array.from(
            { length: MAX_PHOTOS },
            (_, index) => user.photo?.[index] || null,
          ),
        );
      } catch (error) {
        console.error(
          "Error fetching profile data:",
          error.response?.data || error,
        );
        if (!cancelled)
          setSubmitError(
            "We couldn't load your profile. Please refresh and try again.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfileData();
    return () => {
      cancelled = true;
    };
  }, [reset, router]);

  const step = steps[currentStep];
  const photoCount = image.filter(Boolean).length;
  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  const setFormValue = (name, value) => {
    setValue(name, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleImageChange = (event, index) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSubmitError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Each image must be smaller than 5 MB.");
      return;
    }
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    setSubmitError("");
    setImage((previous) => {
      const updated = [...previous];
      updated[index] = { file, preview };
      return updated;
    });
  };

  const removeImage = (index) => {
    setImage((previous) => {
      const updated = [...previous];
      const current = updated[index];
      if (current?.preview) {
        URL.revokeObjectURL(current.preview);
        objectUrls.current.delete(current.preview);
      }
      updated[index] = null;
      return updated;
    });
  };

  const getImageSrc = (currentImage) => {
    if (typeof currentImage === "string") return currentImage;
    return currentImage?.preview || "";
  };

  const renderSingleSelect = ({ name, label, options }) => {
    const selected =
      options.find((option) => option.value === values[name]) || null;
    return (
      <div className={styles.formGroup} key={name}>
        <label htmlFor={name}>{label}</label>
        <Select
          inputId={name}
          options={options}
          value={selected}
          onChange={(option) => setFormValue(name, option?.value || "")}
          placeholder={`Select ${label.toLowerCase()}`}
          isSearchable={false}
          classNamePrefix="profile-select"
          className={styles.select}
        />
        {errors[name]?.message && (
          <p className={styles.error}>{errors[name].message}</p>
        )}
      </div>
    );
  };

  const renderMultiSelect = ({ name, label, options }) => {
    const currentValues = asArray(values[name]);
    const selected = options.filter((option) =>
      currentValues.includes(option.value),
    );
    return (
      <div className={styles.formGroup} key={name}>
        <label htmlFor={name}>
          {label} <span className={styles.optional}>Optional</span>
        </label>
        <Select
          inputId={name}
          options={options}
          value={selected}
          onChange={(selectedOptions) =>
            setFormValue(
              name,
              selectedOptions
                ? selectedOptions.map((option) => option.value)
                : [],
            )
          }
          placeholder={`Choose ${label.toLowerCase()}...`}
          isMulti
          isSearchable
          closeMenuOnSelect={false}
          classNamePrefix="profile-select"
          className={styles.select}
        />
        {errors[name]?.message && (
          <p className={styles.error}>{errors[name].message}</p>
        )}
      </div>
    );
  };

  const handleNext = async (skip = false) => {
    setSubmitError("");
    if (currentStep === 0 && !skip) {
      const valid = await trigger(steps[0].fields);
      if (!valid) return;
    } else if (!skip && step.fields.length) {
      const valid = await trigger(step.fields);
      if (!valid) return;
    }
    setCurrentStep((index) => Math.min(index + 1, steps.length - 1));
  };

  const handleInvalid = (formErrors) => {
    const firstInvalidName = Object.keys(formErrors)[0];
    if (!firstInvalidName) return;
    const invalidStep = steps.findIndex((item) =>
      item.fields.includes(firstInvalidName),
    );
    setCurrentStep(invalidStep < 0 ? 0 : invalidStep);
    setSubmitError("Please check the highlighted field before saving.");
  };

  const onSubmit = async (data) => {
    setSubmitError("");
    const userId = localStorage.getItem("userId");
    if (!userId) {
      router.push("/login");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("userId", userId);

      scalarFields.forEach((field) => {
        let value = data[field];
        if (field === "dateOfBirth" && value instanceof Date) {
          value = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
        }
        formData.append(
          field,
          value === undefined || value === null ? "" : String(value),
        );
      });

      arrayFields.forEach((field) => {
        formData.append(`${field}Included`, "true");
        const formKey = field === "interest" ? "interests" : field;
        asArray(data[field]).forEach((value) =>
          formData.append(formKey, String(value)),
        );
      });

      // Signal that the six photo slots are intentional. An empty slot removes a photo;
      // skipping the photo step leaves existing photos intact because they are loaded above.
      formData.append("photosIncluded", "true");
      image.forEach((item, index) => {
        if (!item) return;
        if (typeof item === "string") {
          formData.append("existingImages", item);
          formData.append("existingImageIndexes", String(index));
        } else if (item.file instanceof File) {
          formData.append("images", item.file);
          formData.append("imageIndexes", String(index));
        }
      });

      const response = await axios.post(
        "/api/profile_controller/profile_update",
        formData,
      );
      if (!response.data?.success)
        throw new Error(response.data?.message || "Failed to update profile.");

      const updatedUser = response.data.user;
      if (setProfileUpdate) setProfileUpdate(updatedUser);
      localStorage.setItem(
        "profile_photo",
        updatedUser?.photo?.find(Boolean) || "",
      );
      router.push("/match");
    } catch (error) {
      console.error("Error updating profile:", error.response?.data || error);
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Failed to update profile. Please try again.",
      );
    }
  };

  const countrySelect = useMemo(
    () =>
      countryOptions.find((option) => option.value === values.country) || null,
    [values.country],
  );

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          <div className={styles.loader} />
          <p>Loading your profile…</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-label="Profile completion wizard">
        <header className={styles.header}>
          <div className={styles.brandMark} aria-hidden="true">
            ♡
          </div>
          <div className={styles.headerText}>
            <p className={styles.kicker}>YOUR PROFILE</p>
            <h1>
              Let’s make it <span>you.</span>
            </h1>
            <p className={styles.subtitle}>
              Complete the essentials now. You can fill in the rest whenever you
              like.
            </p>
          </div>
          <div className={styles.stepCount}>
            STEP {currentStep + 1}
            <span> / {steps.length}</span>
          </div>
        </header>

        <div className={styles.progressArea}>
          <div className={styles.progressMeta}>
            <span>Profile setup</span>
            <strong>{progress}%</strong>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <nav className={styles.stepper} aria-label="Profile sections">
            {steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={`${styles.stepDot} ${index === currentStep ? styles.stepActive : ""} ${index < currentStep ? styles.stepDone : ""}`}
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                aria-current={index === currentStep ? "step" : undefined}
                title={item.title}
              >
                <span className={styles.dotNumber}>
                  {index < currentStep ? "✓" : index + 1}
                </span>
                <span className={styles.dotLabel}>{item.title}</span>
              </button>
            ))}
          </nav>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit(onSubmit, handleInvalid)}
          noValidate
        >
          <div className={styles.stepContent} key={currentStep}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>{step.eyebrow}</p>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
              {!step.required && (
                <span className={styles.optionalPill}>Optional section</span>
              )}
            </div>

            {currentStep === 0 && (
              <div className={styles.fieldsGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">
                    Name <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="What should we call you?"
                    {...register("name")}
                  />
                  {errors.name?.message && (
                    <p className={styles.error}>{errors.name.message}</p>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="dateOfBirth">
                    Date of birth <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    max={maximumDateOfBirthInputValue()}
                    {...register("dateOfBirth")}
                  />
                  <small className={styles.helpText}>
                    You must be at least 18. Your age is calculated from this
                    date.
                  </small>
                  {errors.dateOfBirth?.message && (
                    <p className={styles.error}>{errors.dateOfBirth.message}</p>
                  )}
                </div>
                {renderSingleSelect({
                  name: "gender",
                  label: "Gender *",
                  options: genderOptions,
                })}
                {renderSingleSelect({
                  name: "genderLike",
                  label: "Interested in *",
                  options: genderLikeOptions,
                })}
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label htmlFor="bio">
                    About you <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    maxLength={500}
                    placeholder="A little about your personality, interests, or what makes you smile…"
                    {...register("bio")}
                  />
                  <div className={styles.textareaMeta}>
                    <span>{(values.bio || "").length}/500</span>
                  </div>
                  {errors.bio?.message && (
                    <p className={styles.error}>{errors.bio.message}</p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className={styles.fieldsGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="profession">
                    Profession <span className={styles.optional}>Optional</span>
                  </label>
                  <input
                    id="profession"
                    type="text"
                    placeholder="e.g. Software developer"
                    {...register("profession")}
                  />
                  {errors.profession?.message && (
                    <p className={styles.error}>{errors.profession.message}</p>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="education">
                    Education <span className={styles.optional}>Optional</span>
                  </label>
                  <input
                    id="education"
                    type="text"
                    placeholder="e.g. Bachelor's degree"
                    {...register("education")}
                  />
                  {errors.education?.message && (
                    <p className={styles.error}>{errors.education.message}</p>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="city">
                    City <span className={styles.optional}>Optional</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    placeholder="Your city"
                    {...register("city")}
                  />
                  {errors.city?.message && (
                    <p className={styles.error}>{errors.city.message}</p>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="state">
                    State / region{" "}
                    <span className={styles.optional}>Optional</span>
                  </label>
                  <input
                    id="state"
                    type="text"
                    placeholder="Your state or region"
                    {...register("state")}
                  />
                  {errors.state?.message && (
                    <p className={styles.error}>{errors.state.message}</p>
                  )}
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label htmlFor="country">
                    Country <span className={styles.optional}>Optional</span>
                  </label>
                  <Select
                    inputId="country"
                    options={countryOptions}
                    value={countrySelect}
                    onChange={(option) =>
                      setFormValue("country", option?.value || "")
                    }
                    placeholder="Search for a country"
                    isSearchable
                    classNamePrefix="profile-select"
                    className={styles.select}
                  />
                  {errors.country?.message && (
                    <p className={styles.error}>{errors.country.message}</p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className={styles.fieldsGrid}>
                {multiSelectFields
                  .filter((field) =>
                    [
                      "interest",
                      "hobbies",
                      "favoriteMusic",
                      "favoriteMovies",
                      "favoriteBooks",
                      "favoriteActivities",
                    ].includes(field.name),
                  )
                  .map(renderMultiSelect)}
              </div>
            )}

            {currentStep === 3 && (
              <div className={styles.fieldsGrid}>
                {singleSelectFields
                  .filter((field) =>
                    ["datingIntent", "relationshipStatus"].includes(field.name),
                  )
                  .map(renderSingleSelect)}
                <div className={styles.formGroup}>
                  <label htmlFor="minAgePreference">
                    Minimum preferred age{" "}
                    <span className={styles.optional}>Optional</span>
                  </label>
                  <input
                    id="minAgePreference"
                    type="number"
                    min="18"
                    max="99"
                    {...register("minAgePreference")}
                  />
                  {errors.minAgePreference?.message && (
                    <p className={styles.error}>
                      {errors.minAgePreference.message}
                    </p>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="maxAgePreference">
                    Maximum preferred age{" "}
                    <span className={styles.optional}>Optional</span>
                  </label>
                  <input
                    id="maxAgePreference"
                    type="number"
                    min="18"
                    max="99"
                    {...register("maxAgePreference")}
                  />
                  {errors.maxAgePreference?.message && (
                    <p className={styles.error}>
                      {errors.maxAgePreference.message}
                    </p>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="maxDistanceKm">
                    Maximum distance (km){" "}
                    <span className={styles.optional}>Optional</span>
                  </label>
                  <input
                    id="maxDistanceKm"
                    type="number"
                    min="1"
                    max="500"
                    {...register("maxDistanceKm")}
                  />
                  {errors.maxDistanceKm?.message && (
                    <p className={styles.error}>
                      {errors.maxDistanceKm.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className={styles.fieldsGrid}>
                {multiSelectFields
                  .filter((field) =>
                    [
                      "personalityTraits",
                      "loveLanguage",
                      "languages",
                      "pets",
                    ].includes(field.name),
                  )
                  .map(renderMultiSelect)}
                {singleSelectFields
                  .filter((field) =>
                    [
                      "communicationStyle",
                      "exercise",
                      "smoking",
                      "drinking",
                    ].includes(field.name),
                  )
                  .map(renderSingleSelect)}
                <div className={styles.formGroup}>
                  <label htmlFor="height">
                    Height in centimetres{" "}
                    <span className={styles.optional}>Optional</span>
                  </label>
                  <input
                    id="height"
                    type="number"
                    min="0"
                    max="300"
                    placeholder="e.g. 175"
                    {...register("height")}
                  />
                  {errors.height?.message && (
                    <p className={styles.error}>{errors.height.message}</p>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="religion">
                    Religion <span className={styles.optional}>Optional</span>
                  </label>
                  <input
                    id="religion"
                    type="text"
                    placeholder="Only if you'd like to share"
                    {...register("religion")}
                  />
                  {errors.religion?.message && (
                    <p className={styles.error}>{errors.religion.message}</p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className={styles.photoSection}>
                <div className={styles.photoIntro}>
                  <div className={styles.photoIcon}>▧</div>
                  <div>
                    <strong>
                      {photoCount} of {MAX_PHOTOS} photos added
                    </strong>
                    <p>Choose JPG, PNG, or WebP images up to 5 MB each.</p>
                  </div>
                </div>
                <div className={styles.imageGrid}>
                  {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
                    const currentImage = image[index];
                    const src = getImageSrc(currentImage);
                    return (
                      <div className={styles.imageSlot} key={index}>
                        <label
                          className={`${styles.imageBox} ${currentImage ? styles.imageBoxFilled : ""}`}
                        >
                          {src ? (
                            <Image
                              src={src}
                              alt={`Profile photo ${index + 1}`}
                              fill
                              sizes="(max-width: 600px) 42vw, 180px"
                              className={styles.image}
                              unoptimized
                            />
                          ) : (
                            <span className={styles.uploadText}>
                              <b>+</b>
                              <span>Add photo</span>
                            </span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              handleImageChange(event, index)
                            }
                            className={styles.fileInput}
                            aria-label={`Choose profile photo ${index + 1}`}
                          />
                        </label>
                        {currentImage && (
                          <button
                            type="button"
                            className={styles.removePhoto}
                            onClick={() => removeImage(index)}
                            aria-label={`Remove photo ${index + 1}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className={styles.photoNote}>
                  Photos are optional for saving your profile. You can add or
                  change them later.
                </p>
              </div>
            )}
          </div>

          {submitError && (
            <p className={styles.formAlert} role="alert">
              {submitError}
            </p>
          )}

          <footer className={styles.formFooter}>
            <div className={styles.footerLeft}>
              {currentStep > 0 ? (
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => {
                    setSubmitError("");
                    setCurrentStep((index) => Math.max(0, index - 1));
                  }}
                >
                  ← Back
                </button>
              ) : (
                <span className={styles.requiredNote}>
                  <span className={styles.required}>*</span> Required fields
                </span>
              )}
            </div>
            <div className={styles.footerActions}>
              {currentStep > 0 && currentStep < steps.length - 1 && (
                <button
                  type="button"
                  className={styles.skipButton}
                  onClick={() => handleNext(true)}
                >
                  Skip for now
                </button>
              )}
              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  className={styles.nextButton}
                  onClick={() => handleNext(false)}
                >
                  Continue <span>→</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.nextButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving…" : "Save profile"} <span>→</span>
                </button>
              )}
            </div>
          </footer>
        </form>
      </section>
      <p className={styles.privacyNote}>
        Your details stay under your control. Optional sections can be updated
        anytime.
      </p>
    </main>
  );
};

export default ProfileCmpln;
