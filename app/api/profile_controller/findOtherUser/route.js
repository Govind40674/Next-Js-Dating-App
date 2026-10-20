import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";

const DEFAULT_DISTANCE_KM = 50;
const MAX_DISTANCE_KM = 500;
const DEFAULT_RESULT_COUNT = 10;

const getArray = (value) =>
  Array.isArray(value) ? Array.from(value) : [];

const getValidObjectIds = (values) => {
  const ids = values
    .map((value) => {
      if (value === null || value === undefined) return "";

      return String(value);
    })
    .filter((value) => mongoose.Types.ObjectId.isValid(value));

  return [
    ...new Set(ids.map((value) => value.toLowerCase())),
  ].map((value) => new mongoose.Types.ObjectId(value));
};

const getCleanStringArray = (value) =>
  Array.isArray(value)
    ? value.filter(
        (item) =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];

export async function GET(request) {
  try {
    await connectDB();

    // =====================================================
    // 1. GET CURRENT USER ID
    // =====================================================

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
          users: [],
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID.",
          users: [],
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 2. FETCH CURRENT USER
    // =====================================================

    // This fetch is required to obtain the search origin,
    // gender preference, distance preference and exclusions.
    const currentUser = await User.findById(userId)
      .select(
        "gender genderLike location maxDistanceKm LikedMe dislikedMe LikedBoth passedUsers blockedUsers"
      )
      .lean();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
          users: [],
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 3. VALIDATE USER LOCATION
    // =====================================================

    const coordinates = currentUser.location?.coordinates;

    if (
      !Array.isArray(coordinates) ||
      coordinates.length !== 2
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "User location is not available.",
          users: [],
        },
        { status: 400 }
      );
    }

    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      (longitude === 0 && latitude === 0) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid user location.",
          users: [],
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 4. GET SEARCH DISTANCE FROM USER MODEL
    // =====================================================

    const storedDistance = Number(currentUser.maxDistanceKm);

    const maxDistanceKm =
      Number.isFinite(storedDistance) && storedDistance > 0
        ? Math.min(storedDistance, MAX_DISTANCE_KM)
        : DEFAULT_DISTANCE_KM;

    const maxDistanceMeters = maxDistanceKm * 1000;

    // =====================================================
    // 5. EXCLUDE PROFILES ALREADY PROCESSED
    // =====================================================

    // Preserve the exclusions used in your existing route.
    // Also exclude matched, passed and blocked users.
    const excludedValues = [
      ...getArray(currentUser.LikedMe),
      ...getArray(currentUser.dislikedMe),
      ...getArray(currentUser.LikedBoth),
      ...getArray(currentUser.passedUsers),
      ...getArray(currentUser.blockedUsers),
    ];

    const excludedObjectIds =
      getValidObjectIds(excludedValues);

    const currentUserObjectId =
      new mongoose.Types.ObjectId(userId);

    const geoQuery = {
      _id: {
        $ne: currentUserObjectId,
        $nin: excludedObjectIds,
      },

      // Do not return candidates who have blocked this user.
      blockedUsers: {
        $nin: [String(currentUserObjectId), currentUserObjectId],
      },
    };

    // =====================================================
    // 6. APPLY GENDER COMPATIBILITY
    // =====================================================

    const genderLike = currentUser.genderLike || "All";
    const currentGender = currentUser.gender || "Other";

    // Filter candidates by the current user's preference.
    if (genderLike !== "All") {
      geoQuery.gender = genderLike;
    }

    // Also respect each candidate's preference for the
    // current user's gender. Older profiles without this
    // field remain eligible for discovery.
    geoQuery.$or = [
      { genderLike: currentGender },
      { genderLike: "All" },
      { genderLike: { $exists: false } },
      { genderLike: "" },
      { genderLike: null },
    ];

    // =====================================================
    // 7. SEARCH NEARBY PROFILES
    // =====================================================

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },

          key: "location",
          distanceField: "distanceInMeters",
          maxDistance: maxDistanceMeters,
          spherical: true,
          query: geoQuery,
        },
      },

      // All profiles are shuffled.
      // A specific gender preference gets the nearest profiles.
      ...(genderLike === "All"
        ? [{ $sample: { size: DEFAULT_RESULT_COUNT } }]
        : [{ $limit: DEFAULT_RESULT_COUNT }]),

      // ===================================================
      // 8. RETURN ONLY PROFILE DISPLAY DATA
      // ===================================================

      {
        $project: {
          _id: 1,
          name: 1,
          age: 1,
          showAge: 1,

          gender: 1,
          genderLike: 1,

          photo: 1,
          bio: 1,

          interest: 1,
          hobbies: 1,
          favoriteActivities: 1,
          favoriteMusic: 1,
          favoriteMovies: 1,
          favoriteBooks: 1,

          city: 1,
          state: 1,
          country: 1,

          profession: 1,
          education: 1,

          datingIntent: 1,
          relationshipStatus: 1,

          languages: 1,
          personalityTraits: 1,
          communicationStyle: 1,
          loveLanguage: 1,

          showDistance: 1,
          distanceInMeters: 1,
        },
      },
    ];

    const users = await User.aggregate(pipeline);

    // =====================================================
    // 9. FORMAT SAFE PROFILE RESULTS
    // =====================================================

    const formattedUsers = users.map((user) => {
      const distanceInKm =
        Number.isFinite(user.distanceInMeters)
          ? Number(
              (user.distanceInMeters / 1000).toFixed(2)
            )
          : null;

      return {
        _id: String(user._id),

        name: user.name || "",

        // Respect profile visibility preferences.
        age: user.showAge === false
          ? null
          : user.age ?? null,

        gender: user.gender || "",
        genderLike: user.genderLike || "All",

        photo: getCleanStringArray(user.photo),
        bio: user.bio || "",

        interest: getCleanStringArray(user.interest),
        hobbies: getCleanStringArray(user.hobbies),

        favoriteActivities: getCleanStringArray(
          user.favoriteActivities
        ),

        favoriteMusic: getCleanStringArray(
          user.favoriteMusic
        ),

        favoriteMovies: getCleanStringArray(
          user.favoriteMovies
        ),

        favoriteBooks: getCleanStringArray(
          user.favoriteBooks
        ),

        city: user.city || "",
        state: user.state || "",
        country: user.country || "",

        profession: user.profession || "",
        education: user.education || "",

        datingIntent: user.datingIntent || "Not Sure Yet",

        relationshipStatus:
          user.relationshipStatus || "Prefer Not to Say",

        languages: getCleanStringArray(user.languages),

        personalityTraits: getCleanStringArray(
          user.personalityTraits
        ),

        communicationStyle:
          user.communicationStyle || "All",

        loveLanguage: getCleanStringArray(
          user.loveLanguage
        ),

        distance:
          user.showDistance === false ? null : distanceInKm,
      };
    });

    // =====================================================
    // 10. SEND RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,
        count: formattedUsers.length,
        users: formattedUsers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching nearby users:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch users.",
        users: [],
      },
      { status: 500 }
    );
  }
}