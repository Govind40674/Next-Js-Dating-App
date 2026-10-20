import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import cloudinary from "@/lib/cloudinary";

const MAX_PHOTOS = 6;
const MIN_PHOTOS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedGenders = [
  "Male",
  "Female",
  "Other",
];

const allowedGenderPreferences = [
  "Male",
  "Female",
  "All",
];

const allowedDatingIntents = [
  "Serious Relationship",
  "Casual Dating",
  "Friendship",
  "Marriage",
  "Not Sure Yet",
];

const allowedRelationshipStatuses = [
  "Single",
  "Divorced",
  "Widowed",
  "Prefer Not to Say",
];

const allowedCommunicationStyles = [
  "Texting",
  "Calling",
  "Video Calling",
  "In Person",
  "All",
];

const allowedExerciseValues = [
  "Frequently",
  "Sometimes",
  "Rarely",
  "Never",
  "Prefer Not to Say",
];

const allowedLifestyleValues = [
  "Yes",
  "No",
  "Sometimes",
  "Prefer Not to Say",
];

function readText(formData, key) {
  const value = formData.get(key);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function readNumber(formData, key, fallback = null) {
  const rawValue = readText(formData, key);

  if (rawValue === "") {
    return fallback;
  }

  const value = Number(rawValue);

  return Number.isFinite(value)
    ? value
    : fallback;
}

function readStringArray(formData, key) {
  return formData
    .getAll(key)
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isValidIndex(value) {
  const index = Number(value);

  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < MAX_PHOTOS
  );
}

function findEmptySlot(pictures) {
  return pictures.findIndex((picture) => !picture);
}

function uploadImageToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "dating-app/profile-images",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(new Error("Cloudinary upload failed."));
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

const arrayFieldMappings = [
  { field: "interest", formKey: "interests" },
  { field: "hobbies", formKey: "hobbies" },
  { field: "favoriteMusic", formKey: "favoriteMusic" },
  { field: "favoriteMovies", formKey: "favoriteMovies" },
  { field: "favoriteBooks", formKey: "favoriteBooks" },
  {
    field: "favoriteActivities",
    formKey: "favoriteActivities",
  },
  {
    field: "personalityTraits",
    formKey: "personalityTraits",
  },
  { field: "loveLanguage", formKey: "loveLanguage" },
  { field: "languages", formKey: "languages" },
  { field: "pets", formKey: "pets" },
];

export async function POST(request) {
  try {
    await connectDB();

    const formData = await request.formData();
    const userId = readText(formData, "userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID.",
        },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    // ==================== REQUIRED PROFILE FIELDS ====================

    const name = readText(formData, "name");
    const bio = readText(formData, "bio");
    const profession = readText(formData, "profession");
    const education = readText(formData, "education");
    const city = readText(formData, "city");
    const country = readText(formData, "country");
    const gender = readText(formData, "gender");
    const genderLike = readText(formData, "genderLike");
    const age = readNumber(formData, "age");

    if (
      !name ||
      !bio ||
      !profession ||
      !education ||
      !city ||
      !country ||
      !gender ||
      !genderLike
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please complete all required profile fields.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(age) ||
      age < 18 ||
      age > 120
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Age must be a valid number of at least 18.",
        },
        { status: 400 }
      );
    }

    if (!allowedGenders.includes(gender)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid gender selected.",
        },
        { status: 400 }
      );
    }

    if (!allowedGenderPreferences.includes(genderLike)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid gender preference selected.",
        },
        { status: 400 }
      );
    }

    // ==================== SAVE BASIC PROFILE ====================

    user.name = name;
    user.age = age;
    user.gender = gender;
    user.genderLike = genderLike;
    user.bio = bio;
    user.profession = profession;
    user.education = education;
    user.city = city;
    user.state = readText(formData, "state");
    user.country = country;

    // ==================== INTEREST AND OTHER ARRAYS ====================

    for (const { field, formKey } of arrayFieldMappings) {
      const wasProvided =
        formData.has(`${field}Included`) ||
        formData.has(formKey);

      if (wasProvided) {
        user[field] = readStringArray(formData, formKey);
      }
    }

    if (!user.interest?.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select at least one interest.",
        },
        { status: 400 }
      );
    }

    // ==================== DATING PREFERENCES ====================

    const datingIntent =
      readText(formData, "datingIntent") ||
      "Not Sure Yet";

    if (!allowedDatingIntents.includes(datingIntent)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid dating preference.",
        },
        { status: 400 }
      );
    }

    const relationshipStatus =
      readText(formData, "relationshipStatus") ||
      "Prefer Not to Say";

    if (
      !allowedRelationshipStatuses.includes(
        relationshipStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid relationship status.",
        },
        { status: 400 }
      );
    }

    const minAgePreference = readNumber(
      formData,
      "minAgePreference",
      18
    );

    const maxAgePreference = readNumber(
      formData,
      "maxAgePreference",
      99
    );

    const maxDistanceKm = readNumber(
      formData,
      "maxDistanceKm",
      50
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
          message:
            "Please enter a valid preferred age range.",
        },
        { status: 400 }
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
          message: "Please enter a valid maximum distance.",
        },
        { status: 400 }
      );
    }

    user.datingIntent = datingIntent;
    user.relationshipStatus = relationshipStatus;
    user.minAgePreference = minAgePreference;
    user.maxAgePreference = maxAgePreference;
    user.maxDistanceKm = maxDistanceKm;

    // ==================== COMMUNICATION ====================

    const communicationStyle =
      readText(formData, "communicationStyle") || "All";

    if (
      !allowedCommunicationStyles.includes(
        communicationStyle
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid communication preference.",
        },
        { status: 400 }
      );
    }

    user.communicationStyle = communicationStyle;

    // ==================== LIFESTYLE ====================

    const exercise =
      readText(formData, "exercise") ||
      "Prefer Not to Say";

    const smoking =
      readText(formData, "smoking") ||
      "Prefer Not to Say";

    const drinking =
      readText(formData, "drinking") ||
      "Prefer Not to Say";

    if (!allowedExerciseValues.includes(exercise)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid exercise preference.",
        },
        { status: 400 }
      );
    }

    if (
      !allowedLifestyleValues.includes(smoking) ||
      !allowedLifestyleValues.includes(drinking)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid lifestyle selection.",
        },
        { status: 400 }
      );
    }

    user.exercise = exercise;
    user.smoking = smoking;
    user.drinking = drinking;

    const height = readNumber(formData, "height", null);

    if (
      height !== null &&
      (height < 0 || height > 300)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid height.",
        },
        { status: 400 }
      );
    }

    user.height = height;
    user.religion = readText(formData, "religion");

    // ==================== PHOTO SLOT PREPARATION ====================

    const hasPhotoPayload = [
      "images",
      "imageIndexes",
      "existingImages",
      "existingImageIndexes",
    ].some((key) => formData.has(key));

    let pictures = hasPhotoPayload
      ? Array(MAX_PHOTOS).fill(null)
      : Array.from(
          { length: MAX_PHOTOS },
          (_, index) => user.photo?.[index] || null
        );

    // Retain existing Cloudinary URLs at their submitted indexes.
    const existingImages =
      formData.getAll("existingImages");

    const existingImageIndexes =
      formData.getAll("existingImageIndexes");

    for (
      let i = 0;
      i < existingImages.length;
      i++
    ) {
      const url = existingImages[i];
      const submittedIndex =
        existingImageIndexes[i];

      if (typeof url !== "string" || !url.trim()) {
        continue;
      }

      if (isValidIndex(submittedIndex)) {
        pictures[Number(submittedIndex)] = url.trim();
      } else {
        const emptySlot = findEmptySlot(pictures);

        if (emptySlot !== -1) {
          pictures[emptySlot] = url.trim();
        }
      }
    }

    // ==================== NEW IMAGE UPLOADS ====================

    const images = formData.getAll("images");
    const imageIndexes = formData.getAll("imageIndexes");

    for (let i = 0; i < images.length; i++) {
      const file = images[i];

      if (
        !file ||
        typeof file === "string" ||
        typeof file.arrayBuffer !== "function"
      ) {
        continue;
      }

      if (!file.type?.startsWith("image/")) {
        return NextResponse.json(
          {
            success: false,
            message: "Only image files are allowed.",
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            message: "Each image must be smaller than 5MB.",
          },
          { status: 400 }
        );
      }

      const submittedIndex = imageIndexes[i];

      let uploadIndex;

      if (isValidIndex(submittedIndex)) {
        uploadIndex = Number(submittedIndex);
      } else {
        uploadIndex = findEmptySlot(pictures);
      }

      if (
        uploadIndex === -1 ||
        uploadIndex === undefined
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Maximum 6 profile photos are allowed.",
          },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadResult =
        await uploadImageToCloudinary(buffer);

      // Replacing this index also handles replacing an existing photo.
      pictures[uploadIndex] = uploadResult.secure_url;
    }

    pictures = pictures.slice(0, MAX_PHOTOS);

    const finalPhotoCount = pictures.filter(Boolean).length;

    if (finalPhotoCount < MIN_PHOTOS) {
      return NextResponse.json(
        {
          success: false,
          message: "At least 3 profile photos are required.",
        },
        { status: 400 }
      );
    }

    // ==================== PROFILE COMPLETION ====================

    user.photo = pictures;

    const completionChecks = [
      Boolean(user.name),
      Number(user.age) >= 18,
      Boolean(user.gender),
      Boolean(user.genderLike),
      Boolean(user.bio),
      Boolean(user.profession),
      Boolean(user.education),
      Boolean(user.city),
      Boolean(user.country),
      Boolean(user.interest?.length),
      finalPhotoCount >= MIN_PHOTOS,
    ];

    const completedFields =
      completionChecks.filter(Boolean).length;

    user.profileCompletionPercentage = Math.round(
      (completedFields / completionChecks.length) * 100
    );

    user.isProfileComplete = completionChecks.every(Boolean);
    user.lastActive = new Date();

    // ==================== SAVE USER ====================

    await user.save();

    // Never send password or push-token values in this response.
    const safeUser = user.toObject();

    delete safeUser.password;
    delete safeUser.fcmToken;
    delete safeUser.googleId;

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: safeUser,
    });
  } catch (error) {
    console.error("PROFILE UPDATE API ERROR:", error);

    if (error?.name === "ValidationError") {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to update profile.",
      },
      { status: 500 }
    );
  }
}