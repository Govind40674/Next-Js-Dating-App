import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import cloudinary from "@/lib/cloudinary";

const MAX_PHOTOS = 6;
const MIN_PHOTOS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_GENDERS = ["Male", "Female", "Other"];
const ALLOWED_GENDER_PREFERENCES = ["Male", "Female", "All"];
const ALLOWED_DATING_INTENTS = [
  "Serious Relationship",
  "Casual Dating",
  "Friendship",
  "Marriage",
  "Not Sure Yet",
];
const ALLOWED_RELATIONSHIP_STATUSES = [
  "Single",
  "Divorced",
  "Widowed",
  "Prefer Not to Say",
];
const ALLOWED_COMMUNICATION_STYLES = [
  "Texting",
  "Calling",
  "Video Calling",
  "In Person",
  "All",
];
const ALLOWED_EXERCISE = [
  "Frequently",
  "Sometimes",
  "Rarely",
  "Never",
  "Prefer Not to Say",
];
const ALLOWED_LIFESTYLE = ["Yes", "No", "Sometimes", "Prefer Not to Say"];

const arrayFieldMappings = [
  { field: "interest", formKey: "interests" },
  { field: "hobbies", formKey: "hobbies" },
  { field: "favoriteMusic", formKey: "favoriteMusic" },
  { field: "favoriteMovies", formKey: "favoriteMovies" },
  { field: "favoriteBooks", formKey: "favoriteBooks" },
  { field: "favoriteActivities", formKey: "favoriteActivities" },
  { field: "personalityTraits", formKey: "personalityTraits" },
  { field: "loveLanguage", formKey: "loveLanguage" },
  { field: "languages", formKey: "languages" },
  { field: "pets", formKey: "pets" },
];

function readText(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData, key, fallback = null) {
  const rawValue = readText(formData, key);
  if (rawValue === "") return fallback;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : fallback;
}

function readStringArray(formData, key) {
  return formData
    .getAll(key)
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isValidSlot(value) {
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 && index < MAX_PHOTOS;
}

function calculateAge(dateOfBirth, now = new Date()) {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDifference = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())
  )
    age -= 1;
  return age;
}

function parseDateOfBirth(rawValue) {
  if (!rawValue) return null;
  // The date input sends YYYY-MM-DD. Parse at UTC midnight to avoid timezone date shifts.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawValue)
    ? new Date(`${rawValue}T00:00:00.000Z`)
    : new Date(rawValue);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function uploadImageToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "dating-app/profile-images", resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url)
          return reject(new Error("Cloudinary upload failed."));
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

function calculateProfileProgress(user) {
  const hasWorkAndLocation = Boolean(
    user.profession ||
    user.education ||
    user.city ||
    user.state ||
    user.country,
  );
  const hasInterests = [
    user.interest,
    user.hobbies,
    user.favoriteMusic,
    user.favoriteMovies,
    user.favoriteBooks,
    user.favoriteActivities,
  ].some((items) => items?.length);
  const hasDatingPreferences =
    user.datingIntent !== "Not Sure Yet" ||
    user.relationshipStatus !== "Prefer Not to Say" ||
    user.minAgePreference !== 18 ||
    user.maxAgePreference !== 99 ||
    user.maxDistanceKm !== 50;
  const hasPersonality = Boolean(
    user.personalityTraits?.length ||
    user.loveLanguage?.length ||
    user.languages?.length ||
    (user.communicationStyle && user.communicationStyle !== "All"),
  );
  const hasLifestyle = Boolean(
    user.height != null ||
    user.pets?.length ||
    user.religion ||
    user.exercise !== "Prefer Not to Say" ||
    user.smoking !== "Prefer Not to Say" ||
    user.drinking !== "Prefer Not to Say",
  );
  const checks = [
    Boolean(
      user.name &&
      user.dateOfBirth &&
      user.age >= 18 &&
      user.gender &&
      user.genderLike &&
      user.bio,
    ),
    hasWorkAndLocation,
    hasInterests,
    hasDatingPreferences,
    hasPersonality,
    hasLifestyle,
    (user.photo?.filter(Boolean).length ?? 0) >= MIN_PHOTOS,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export async function POST(request) {
  try {
    await connectDB();
    const formData = await request.formData();
    const userId = readText(formData, "userId");

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "A valid user ID is required." },
        { status: 400 },
      );
    }

    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );

    // Only Basic Info is required to save/complete onboarding. Every other field is optional.
    const name = readText(formData, "name");
    const bio = readText(formData, "bio");
    const gender = readText(formData, "gender");
    const genderLike = readText(formData, "genderLike");
    const dateOfBirthRaw = readText(formData, "dateOfBirth");
    const dateOfBirth = parseDateOfBirth(dateOfBirthRaw);

    if (!name || !bio || !gender || !genderLike || !dateOfBirth) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please complete all required Basic Info fields, including date of birth.",
        },
        { status: 400 },
      );
    }
    if (bio.length > 500)
      return NextResponse.json(
        { success: false, message: "Bio cannot exceed 500 characters." },
        { status: 400 },
      );
    if (dateOfBirth > new Date())
      return NextResponse.json(
        { success: false, message: "Date of birth cannot be in the future." },
        { status: 400 },
      );
    const age = calculateAge(dateOfBirth);
    if (age < 18 || age > 120)
      return NextResponse.json(
        { success: false, message: "You must be at least 18 years old." },
        { status: 400 },
      );
    if (!ALLOWED_GENDERS.includes(gender))
      return NextResponse.json(
        { success: false, message: "Invalid gender selected." },
        { status: 400 },
      );
    if (!ALLOWED_GENDER_PREFERENCES.includes(genderLike))
      return NextResponse.json(
        { success: false, message: "Invalid interested-in preference." },
        { status: 400 },
      );

    user.name = name;
    user.bio = bio;
    user.gender = gender;
    user.genderLike = genderLike;
    user.dateOfBirth = dateOfBirth;
    user.age = age; // Keep the existing age field in sync with dateOfBirth.

    // Optional text fields: empty values are allowed and clear previous values.
    for (const field of [
      "profession",
      "education",
      "city",
      "state",
      "country",
      "religion",
    ]) {
      if (formData.has(field)) user[field] = readText(formData, field);
    }

    // Optional arrays can be explicitly cleared using the Included marker.
    for (const { field, formKey } of arrayFieldMappings) {
      if (formData.has(`${field}Included`) || formData.has(formKey)) {
        user[field] = readStringArray(formData, formKey);
      }
    }

    if (formData.has("datingIntent")) {
      const value = readText(formData, "datingIntent") || "Not Sure Yet";
      if (!ALLOWED_DATING_INTENTS.includes(value))
        return NextResponse.json(
          { success: false, message: "Invalid dating preference." },
          { status: 400 },
        );
      user.datingIntent = value;
    }
    if (formData.has("relationshipStatus")) {
      const value =
        readText(formData, "relationshipStatus") || "Prefer Not to Say";
      if (!ALLOWED_RELATIONSHIP_STATUSES.includes(value))
        return NextResponse.json(
          { success: false, message: "Invalid relationship status." },
          { status: 400 },
        );
      user.relationshipStatus = value;
    }
    if (formData.has("communicationStyle")) {
      const value = readText(formData, "communicationStyle") || "All";
      if (!ALLOWED_COMMUNICATION_STYLES.includes(value))
        return NextResponse.json(
          { success: false, message: "Invalid communication preference." },
          { status: 400 },
        );
      user.communicationStyle = value;
    }

    const minAgePreference = readNumber(
      formData,
      "minAgePreference",
      user.minAgePreference ?? 18,
    );
    const maxAgePreference = readNumber(
      formData,
      "maxAgePreference",
      user.maxAgePreference ?? 99,
    );
    const maxDistanceKm = readNumber(
      formData,
      "maxDistanceKm",
      user.maxDistanceKm ?? 50,
    );
    if (
      !Number.isInteger(minAgePreference) ||
      !Number.isInteger(maxAgePreference) ||
      minAgePreference < 18 ||
      maxAgePreference > 99 ||
      maxAgePreference < minAgePreference
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid preferred age range.",
        },
        { status: 400 },
      );
    }
    if (
      !Number.isFinite(maxDistanceKm) ||
      maxDistanceKm < 1 ||
      maxDistanceKm > 500
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid maximum distance between 1 and 500 km.",
        },
        { status: 400 },
      );
    }
    user.minAgePreference = minAgePreference;
    user.maxAgePreference = maxAgePreference;
    user.maxDistanceKm = maxDistanceKm;

    const exercise = readText(formData, "exercise") || "Prefer Not to Say";
    const smoking = readText(formData, "smoking") || "Prefer Not to Say";
    const drinking = readText(formData, "drinking") || "Prefer Not to Say";
    if (
      !ALLOWED_EXERCISE.includes(exercise) ||
      !ALLOWED_LIFESTYLE.includes(smoking) ||
      !ALLOWED_LIFESTYLE.includes(drinking)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid lifestyle selection." },
        { status: 400 },
      );
    }
    user.exercise = exercise;
    user.smoking = smoking;
    user.drinking = drinking;

    const height = readNumber(formData, "height", null);
    if (height !== null && (height < 0 || height > 300))
      return NextResponse.json(
        { success: false, message: "Please enter a valid height." },
        { status: 400 },
      );
    user.height = height;

    // At least three profile photos are required. If a photo payload is sent, rebuild the six slots in submitted order.
    // Only URLs already attached to this account are accepted as existing photos.
    const hasPhotoPayload =
      formData.has("photosIncluded") ||
      formData.has("images") ||
      formData.has("existingImages");
    if (hasPhotoPayload) {
      const pictures = Array(MAX_PHOTOS).fill(null);
      const existingImages = formData.getAll("existingImages");
      const existingIndexes = formData.getAll("existingImageIndexes");
      for (let index = 0; index < existingImages.length; index += 1) {
        const url = existingImages[index];
        const slot = existingIndexes[index];
        if (typeof url !== "string" || !isValidSlot(slot)) continue;
        const safeUrl = url.trim();
        if (user.photo?.includes(safeUrl)) pictures[Number(slot)] = safeUrl;
      }

      const images = formData.getAll("images");
      const imageIndexes = formData.getAll("imageIndexes");
      for (let index = 0; index < images.length; index += 1) {
        const file = images[index];
        if (
          !file ||
          typeof file === "string" ||
          typeof file.arrayBuffer !== "function"
        )
          continue;
        if (!file.type?.startsWith("image/"))
          return NextResponse.json(
            { success: false, message: "Only image files are allowed." },
            { status: 400 },
          );
        if (file.size > MAX_FILE_SIZE)
          return NextResponse.json(
            {
              success: false,
              message: "Each image must be smaller than 5 MB.",
            },
            { status: 400 },
          );

        const slotRaw = imageIndexes[index];
        const slot = isValidSlot(slotRaw)
          ? Number(slotRaw)
          : pictures.findIndex((item) => !item);
        if (slot < 0 || slot >= MAX_PHOTOS)
          return NextResponse.json(
            {
              success: false,
              message: "Maximum six profile photos are allowed.",
            },
            { status: 400 },
          );
        const bytes = await file.arrayBuffer();
        const uploaded = await uploadImageToCloudinary(Buffer.from(bytes));
        pictures[slot] = uploaded.secure_url;
      }
      user.photo = pictures.filter(Boolean);
    }

    const finalPhotoCount = user.photo?.filter(Boolean).length ?? 0;
    if (finalPhotoCount < MIN_PHOTOS) {
      return NextResponse.json(
        {
          success: false,
          message: `Please upload at least ${MIN_PHOTOS} profile photos.`,
        },
        { status: 400 },
      );
    }

    // Only Basic Info and the minimum photo count are required; every other section is optional.
    user.isProfileComplete = Boolean(
      user.name &&
      user.dateOfBirth &&
      user.age >= 18 &&
      user.gender &&
      user.genderLike &&
      user.bio &&
      finalPhotoCount >= MIN_PHOTOS,
    );
    user.profileCompletionPercentage = calculateProfileProgress(user);
    user.lastActive = new Date();

    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.fcmToken;
    delete safeUser.googleId;

    return NextResponse.json({
      success: true,
      message: "Profile saved successfully.",
      user: safeUser,
    });
  } catch (error) {
    console.error("PROFILE UPDATE API ERROR:", error);
    if (error?.name === "ValidationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update profile.",
      },
      { status: 500 },
    );
  }
}
