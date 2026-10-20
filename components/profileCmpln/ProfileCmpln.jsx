"use client";

import React, {
  useEffect,
  useState,
  useContext,
} from "react";

import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";

import {
  useForm,
  useWatch,
} from "react-hook-form";

import { yupResolver } from "@hookform/resolvers/yup";
import Select from "react-select";
import countries from "world-countries";

import { MyContext } from "../myContext/MyContext";
import { registerSchema } from "./schema";
import styles from "./ProfileCmpln.module.css";

const MAX_PHOTOS = 6;
const MIN_PHOTOS = 3;

const genderOptions = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const genderLikeOptions = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "All", label: "Everyone" },
];

const interestOptions = [
  { value: "Fooding", label: "🍔 Fooding" },
  { value: "Dancing", label: "💃 Dancing" },
  { value: "Music", label: "🎵 Music" },
  { value: "Travel", label: "✈️ Travel" },
  { value: "Movies", label: "🎬 Movies" },
  { value: "Gaming", label: "🎮 Gaming" },
  { value: "Reading", label: "📚 Reading" },
  { value: "Photography", label: "📷 Photography" },
  { value: "Fitness", label: "🏋️ Fitness" },
  { value: "Cricket", label: "🏏 Cricket" },
  { value: "Football", label: "⚽ Football" },
  { value: "Coding", label: "💻 Coding" },
  { value: "Art", label: "🎨 Art" },
  { value: "Cooking", label: "👨‍🍳 Cooking" },
  { value: "Shopping", label: "🛍️ Shopping" },
  { value: "Nature", label: "🌳 Nature" },
  { value: "Hiking", label: "🥾 Hiking" },
  { value: "Coffee", label: "☕ Coffee" },
  { value: "Pets", label: "🐾 Pets" },
  { value: "Yoga", label: "🧘 Yoga" },
];

const datingIntentOptions = [
  {
    value: "Serious Relationship",
    label: "Serious relationship",
  },
  {
    value: "Casual Dating",
    label: "Casual dating",
  },
  {
    value: "Friendship",
    label: "Friendship",
  },
  {
    value: "Marriage",
    label: "Marriage",
  },
  {
    value: "Not Sure Yet",
    label: "Not sure yet",
  },
];

const relationshipStatusOptions = [
  { value: "Single", label: "Single" },
  { value: "Divorced", label: "Divorced" },
  { value: "Widowed", label: "Widowed" },
  {
    value: "Prefer Not to Say",
    label: "Prefer not to say",
  },
];

const communicationOptions = [
  { value: "Texting", label: "Texting" },
  { value: "Calling", label: "Calling" },
  {
    value: "Video Calling",
    label: "Video calling",
  },
  { value: "In Person", label: "In person" },
  { value: "All", label: "All" },
];

const exerciseOptions = [
  { value: "Frequently", label: "Frequently" },
  { value: "Sometimes", label: "Sometimes" },
  { value: "Rarely", label: "Rarely" },
  { value: "Never", label: "Never" },
  {
    value: "Prefer Not to Say",
    label: "Prefer not to say",
  },
];

const yesNoSometimesOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "Sometimes", label: "Sometimes" },
  {
    value: "Prefer Not to Say",
    label: "Prefer not to say",
  },
];

const hobbyOptions = [
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
].map((value) => ({ value, label: value }));

const musicOptions = [
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
].map((value) => ({ value, label: value }));

const movieOptions = [
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
].map((value) => ({ value, label: value }));

const bookOptions = [
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
].map((value) => ({ value, label: value }));

const activityOptions = [
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
].map((value) => ({ value, label: value }));

const personalityOptions = [
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
].map((value) => ({ value, label: value }));

const loveLanguageOptions = [
  "Words of Affirmation",
  "Quality Time",
  "Acts of Service",
  "Receiving Gifts",
  "Physical Touch",
].map((value) => ({ value, label: value }));

const languageOptions = [
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
].map((value) => ({ value, label: value }));

const petOptions = [
  "Dogs",
  "Cats",
  "Birds",
  "Fish",
  "Other",
  "No Pets",
].map((value) => ({ value, label: value }));

const multiSelectFields = [
  {
    name: "interest",
    label: "Your Interests",
    options: interestOptions,
    required: true,
  },
  {
    name: "hobbies",
    label: "Hobbies",
    options: hobbyOptions,
  },
  {
    name: "favoriteMusic",
    label: "Favorite Music",
    options: musicOptions,
  },
  {
    name: "favoriteMovies",
    label: "Favorite Movies / Genres",
    options: movieOptions,
  },
  {
    name: "favoriteBooks",
    label: "Favorite Books / Genres",
    options: bookOptions,
  },
  {
    name: "favoriteActivities",
    label: "Favorite Activities",
    options: activityOptions,
  },
  {
    name: "personalityTraits",
    label: "Personality Traits",
    options: personalityOptions,
  },
  {
    name: "loveLanguage",
    label: "Love Languages",
    options: loveLanguageOptions,
  },
  {
    name: "languages",
    label: "Languages You Speak",
    options: languageOptions,
  },
  {
    name: "pets",
    label: "Pets",
    options: petOptions,
  },
];

const singleSelectFields = [
  {
    name: "datingIntent",
    label: "What Are You Looking For?",
    options: datingIntentOptions,
  },
  {
    name: "relationshipStatus",
    label: "Relationship Status",
    options: relationshipStatusOptions,
  },
  {
    name: "communicationStyle",
    label: "Preferred Communication",
    options: communicationOptions,
  },
  {
    name: "exercise",
    label: "Exercise Habits",
    options: exerciseOptions,
  },
  {
    name: "smoking",
    label: "Smoking",
    options: yesNoSometimesOptions,
  },
  {
    name: "drinking",
    label: "Drinking",
    options: yesNoSometimesOptions,
  },
];

const defaultValues = {
  name: "",
  age: "",
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
  "age",
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

const ProfileCmpln = () => {
  const { setProfileUpdate } = useContext(MyContext);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState(
    Array(MAX_PHOTOS).fill(null)
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues,
  });

  const values = useWatch({ control }) || {};

  const countryOptions = countries
    .map((country) => ({
      value: country.cca2,
      label: `${country.flag || ""} ${country.name.common}`,
      country,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const findCountryValue = (storedCountry) => {
    if (!storedCountry) return "";

    const directMatch = countryOptions.find(
      (option) => option.value === storedCountry
    );

    if (directMatch) {
      return directMatch.value;
    }

    const nameMatch = countryOptions.find(
      (option) =>
        option.country.name.common.toLowerCase() ===
        String(storedCountry).toLowerCase()
    );

    return nameMatch?.value || storedCountry;
  };

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
          `/api/profile_controller/profile?userId=${encodeURIComponent(
            userId
          )}`
        );

        if (
          cancelled ||
          !response.data.success ||
          !response.data.user
        ) {
          return;
        }

        const user = response.data.user;

        reset({
          ...defaultValues,
          name: user.name || "",
          age: user.age || "",
          gender: user.gender || "",
          genderLike: user.genderLike || "",
          bio: user.bio || "",
          profession: user.profession || "",
          education: user.education || "",
          city: user.city || "",
          state: user.state || "",
          country: findCountryValue(user.country),

          interest: Array.isArray(user.interest)
            ? user.interest
            : [],

          hobbies: Array.isArray(user.hobbies)
            ? user.hobbies
            : [],

          favoriteMusic: Array.isArray(user.favoriteMusic)
            ? user.favoriteMusic
            : [],

          favoriteMovies: Array.isArray(user.favoriteMovies)
            ? user.favoriteMovies
            : [],

          favoriteBooks: Array.isArray(user.favoriteBooks)
            ? user.favoriteBooks
            : [],

          favoriteActivities: Array.isArray(
            user.favoriteActivities
          )
            ? user.favoriteActivities
            : [],

          datingIntent:
            user.datingIntent || "Not Sure Yet",

          minAgePreference:
            user.minAgePreference ?? 18,

          maxAgePreference:
            user.maxAgePreference ?? 99,

          maxDistanceKm: user.maxDistanceKm ?? 50,

          relationshipStatus:
            user.relationshipStatus ||
            "Prefer Not to Say",

          personalityTraits: Array.isArray(
            user.personalityTraits
          )
            ? user.personalityTraits
            : [],

          communicationStyle:
            user.communicationStyle || "All",

          loveLanguage: Array.isArray(user.loveLanguage)
            ? user.loveLanguage
            : [],

          languages: Array.isArray(user.languages)
            ? user.languages
            : [],

          height: user.height ?? "",

          exercise:
            user.exercise || "Prefer Not to Say",

          smoking:
            user.smoking || "Prefer Not to Say",

          drinking:
            user.drinking || "Prefer Not to Say",

          pets: Array.isArray(user.pets)
            ? user.pets
            : [],

          religion: user.religion || "",
        });

        const existingImages = Array.from(
          { length: MAX_PHOTOS },
          (_, index) => user.photo?.[index] || null
        );

        setImage(existingImages);
      } catch (error) {
        console.error(
          "Error fetching profile data:",
          error.response?.data || error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProfileData();

    return () => {
      cancelled = true;
    };
  }, [reset, router]);

  const handleImageChange = (event, index) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB.");
      event.target.value = "";
      return;
    }

    setImage((previous) => {
      const updatedImages = [...previous];
      updatedImages[index] = file;
      return updatedImages;
    });

    event.target.value = "";
  };

  const getImageSrc = (currentImage) => {
    if (!currentImage) return "";

    if (currentImage instanceof File) {
      return URL.createObjectURL(currentImage);
    }

    return currentImage;
  };

  const setFormValue = (name, value) => {
    setValue(name, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const renderSingleSelect = ({
    name,
    label,
    options,
  }) => {
    const selected =
      options.find(
        (option) => option.value === values[name]
      ) || null;

    return (
      <div className={styles.formGroup} key={name}>
        <label>{label}</label>

        <Select
          options={options}
          value={selected}
          onChange={(option) =>
            setFormValue(name, option?.value || "")
          }
          placeholder={`Select ${label.toLowerCase()}`}
          isSearchable={false}
          classNamePrefix="profile-select"
        />

        <p className={styles.error}>
          {errors[name]?.message}
        </p>
      </div>
    );
  };

  const renderMultiSelect = ({
    name,
    label,
    options,
  }) => {
    const currentValues = Array.isArray(values[name])
      ? values[name]
      : [];

    const selected = options.filter((option) =>
      currentValues.includes(option.value)
    );

    return (
      <div className={styles.formGroup} key={name}>
        <label>{label}</label>

        <Select
          options={options}
          value={selected}
          onChange={(selectedOptions) => {
            const selectedValues = selectedOptions
              ? selectedOptions.map((option) => option.value)
              : [];

            setFormValue(name, selectedValues);
          }}
          placeholder={`Select ${label.toLowerCase()}...`}
          isMulti
          isSearchable
          closeMenuOnSelect={false}
          classNamePrefix="profile-select"
        />

        {name === "interest" && (
          <p className={styles.interestHint}>
            Choose at least one interest.
          </p>
        )}

        <p className={styles.error}>
          {errors[name]?.message}
        </p>
      </div>
    );
  };

  const onSubmit = async (data) => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      router.push("/login");
      return;
    }

    const imageCount = image.filter(Boolean).length;

    if (imageCount < MIN_PHOTOS) {
      alert(
        `Please select at least ${MIN_PHOTOS} profile photos.`
      );
      return;
    }

    try {
      const formData = new FormData();

      formData.append("userId", userId);

      // Scalar fields
      scalarFields.forEach((field) => {
        const value = data[field];

        formData.append(
          field,
          value === undefined || value === null
            ? ""
            : String(value)
        );
      });

      // Array fields: explicitly mark each array as provided.
      // This also allows users to clear optional arrays.
      arrayFields.forEach((field) => {
        formData.append(`${field}Included`, "true");

        const valuesForField = Array.isArray(data[field])
          ? data[field]
          : [];

        const formKey =
          field === "interest" ? "interests" : field;

        valuesForField.forEach((value) => {
          formData.append(formKey, String(value));
        });
      });

      // Images and their slot indexes
      image.forEach((item, index) => {
        if (!item) return;

        if (item instanceof File) {
          formData.append("images", item);
          formData.append("imageIndexes", String(index));
        } else if (typeof item === "string") {
          formData.append("existingImages", item);
          formData.append(
            "existingImageIndexes",
            String(index)
          );
        }
      });

      const response = await axios.post(
        "/api/profile_controller/profile_update",
        formData
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Failed to update profile."
        );
      }

      const updatedUser = response.data.user;

      if (setProfileUpdate) {
        setProfileUpdate(updatedUser);
      }

      localStorage.setItem(
        "profile_photo",
        updatedUser.photo[0]?.find(Boolean) || ""
      );

      router.push("/match");
    } catch (error) {
      console.error(
        "Error updating profile:",
        error.response?.data || error
      );

      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to update profile."
      );
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader} />

        <p className={styles.loadingText}>
          Loading your profile...
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={styles.form}
      >
        <h2>Basic Profile</h2>

        <div className={styles.formGroup}>
          <label>Name</label>
          <input
            type="text"
            {...register("name")}
            placeholder="Enter your name"
          />
          <p className={styles.error}>
            {errors.name?.message}
          </p>
        </div>

        <div className={styles.formGroup}>
          <label>Age</label>
          <input
            type="number"
            min="18"
            {...register("age")}
            placeholder="Enter your age"
          />
          <p className={styles.error}>
            {errors.age?.message}
          </p>
        </div>

        {renderSingleSelect({
          name: "gender",
          label: "Gender",
          options: genderOptions,
        })}

        {renderSingleSelect({
          name: "genderLike",
          label: "Interested In",
          options: genderLikeOptions,
        })}

        <div className={styles.formGroup}>
          <label>Bio</label>
          <textarea
            {...register("bio")}
            placeholder="Tell people about yourself..."
            rows={4}
            maxLength={500}
          />
          <p className={styles.error}>
            {errors.bio?.message}
          </p>
        </div>

        <h2>Education and Work</h2>

        <div className={styles.formGroup}>
          <label>Profession</label>
          <input
            type="text"
            {...register("profession")}
            placeholder="e.g. Software Developer"
          />
          <p className={styles.error}>
            {errors.profession?.message}
          </p>
        </div>

        <div className={styles.formGroup}>
          <label>Education</label>
          <input
            type="text"
            {...register("education")}
            placeholder="e.g. Bachelor's degree"
          />
          <p className={styles.error}>
            {errors.education?.message}
          </p>
        </div>

        <h2>Location</h2>

        <div className={styles.formGroup}>
          <label>City</label>
          <input
            type="text"
            {...register("city")}
            placeholder="Enter your city"
          />
          <p className={styles.error}>
            {errors.city?.message}
          </p>
        </div>

        <div className={styles.formGroup}>
          <label>State</label>
          <input
            type="text"
            {...register("state")}
            placeholder="Enter your state"
          />
          <p className={styles.error}>
            {errors.state?.message}
          </p>
        </div>

        <div className={styles.formGroup}>
          <label>Country</label>

          <Select
            options={countryOptions}
            value={
              countryOptions.find(
                (option) =>
                  option.value === values.country
              ) || null
            }
            onChange={(option) =>
              setFormValue("country", option?.value || "")
            }
            placeholder="Select country"
            isSearchable
            classNamePrefix="profile-select"
          />

          <p className={styles.error}>
            {errors.country?.message}
          </p>
        </div>

        <h2>Interests and Hobbies</h2>

        {multiSelectFields
          .filter((field) =>
            [
              "interest",
              "hobbies",
              "favoriteMusic",
              "favoriteMovies",
              "favoriteBooks",
              "favoriteActivities",
            ].includes(field.name)
          )
          .map(renderMultiSelect)}

        <h2>Dating Preferences</h2>

        {singleSelectFields
          .filter((field) =>
            [
              "datingIntent",
              "relationshipStatus",
            ].includes(field.name)
          )
          .map(renderSingleSelect)}

        <div className={styles.formGroup}>
          <label>Minimum Preferred Age</label>
          <input
            type="number"
            min="18"
            max="99"
            {...register("minAgePreference")}
          />
          <p className={styles.error}>
            {errors.minAgePreference?.message}
          </p>
        </div>

        <div className={styles.formGroup}>
          <label>Maximum Preferred Age</label>
          <input
            type="number"
            min="18"
            max="99"
            {...register("maxAgePreference")}
          />
          <p className={styles.error}>
            {errors.maxAgePreference?.message}
          </p>
        </div>

        <div className={styles.formGroup}>
          <label>Maximum Distance (km)</label>
          <input
            type="number"
            min="1"
            max="500"
            {...register("maxDistanceKm")}
          />
          <p className={styles.error}>
            {errors.maxDistanceKm?.message}
          </p>
        </div>

        <h2>Personality and Communication</h2>

        {multiSelectFields
          .filter((field) =>
            [
              "personalityTraits",
              "loveLanguage",
            ].includes(field.name)
          )
          .map(renderMultiSelect)}

        {singleSelectFields
          .filter(
            (field) =>
              field.name === "communicationStyle"
          )
          .map(renderSingleSelect)}

        <h2>Lifestyle</h2>

        <div className={styles.formGroup}>
          <label>Height (cm)</label>
          <input
            type="number"
            min="0"
            max="300"
            {...register("height")}
            placeholder="e.g. 175"
          />
          <p className={styles.error}>
            {errors.height?.message}
          </p>
        </div>

        {singleSelectFields
          .filter((field) =>
            [
              "exercise",
              "smoking",
              "drinking",
            ].includes(field.name)
          )
          .map(renderSingleSelect)}

        {multiSelectFields
          .filter((field) => field.name === "pets")
          .map(renderMultiSelect)}

        <div className={styles.formGroup}>
          <label>Religion (optional)</label>
          <input
            type="text"
            {...register("religion")}
            placeholder="Enter religion, if you'd like"
          />
          <p className={styles.error}>
            {errors.religion?.message}
          </p>
        </div>

        <h2>Languages</h2>

        {multiSelectFields
          .filter((field) => field.name === "languages")
          .map(renderMultiSelect)}

        <h2>Profile Photos</h2>

        <div className={styles.imageGrid}>
          {Array.from({ length: MAX_PHOTOS }).map(
            (_, index) => {
              const currentImage = image[index];

              return (
                <label
                  className={styles.imageBox}
                  key={index}
                >
                  {currentImage ? (
                    <Image
                      src={getImageSrc(currentImage)}
                      alt={`Profile ${index + 1}`}
                      fill
                      sizes="(max-width: 600px) 45vw, 180px"
                      className={styles.image}
                      unoptimized={
                        currentImage instanceof File
                      }
                    />
                  ) : (
                    <div className={styles.uploadText}>
                      <span>+</span>
                      <p>Add Image</p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      handleImageChange(event, index)
                    }
                    className={styles.fileInput}
                  />
                </label>
              );
            }
          )}
        </div>

        <p className={styles.imageCount}>
          {image.filter(Boolean).length} / {MAX_PHOTOS}{" "}
          images selected
        </p>

        {image.filter(Boolean).length < MIN_PHOTOS && (
          <p className={styles.error}>
            Please select at least {MIN_PHOTOS} photos.
          </p>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={
            isSubmitting ||
            image.filter(Boolean).length < MIN_PHOTOS
          }
        >
          {isSubmitting
            ? "Updating Profile..."
            : "Update Profile"}
        </button>
      </form>
    </div>
  );
};

export default ProfileCmpln;