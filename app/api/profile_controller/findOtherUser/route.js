import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";

const DEFAULT_DISTANCE_KM = 50;
const MAX_DISTANCE_KM = 500;
const DEFAULT_RESULT_COUNT = 10;

const getArray = (value) => (Array.isArray(value) ? Array.from(value) : []);

const getValidObjectIds = (values) => {
  const ids = values
    .map((value) => (value === null || value === undefined ? "" : String(value)))
    .filter((value) => mongoose.Types.ObjectId.isValid(value));

  return [...new Set(ids.map((value) => value.toLowerCase()))].map(
    (value) => new mongoose.Types.ObjectId(value)
  );
};

const getCleanStringArray = (value) =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];

const PROFILE_PROJECTION = {
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
};

async function findNearbyUsers({
  query,
  coordinates,
  maxDistanceMeters,
  limit,
  randomize,
  currentUserId,
}) {
  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates },
        key: "location",
        distanceField: "distanceInMeters",
        maxDistance: maxDistanceMeters,
        spherical: true,
        query,
      },
    },
    ...(randomize ? [{ $sample: { size: limit } }] : [{ $limit: limit }]),
    {
      $addFields: {
        hasStarLikedYou: {
          $in: [String(currentUserId), { $ifNull: ["$starLike", []] }],
        },
      },
    },
    { $project: { ...PROFILE_PROJECTION, hasStarLikedYou: 1 } },
  ];

  return User.aggregate(pipeline);
}

function formatProfiles(users) {
  return users.map((user) => {
    const distanceInKm = Number.isFinite(user.distanceInMeters)
      ? Number((user.distanceInMeters / 1000).toFixed(2))
      : null;

    return {
      _id: String(user._id),
      name: user.name || "",
      age: user.showAge === false ? null : user.age ?? null,
      gender: user.gender || "",
      genderLike: user.genderLike || "All",
      photo: getCleanStringArray(user.photo),
      bio: user.bio || "",
      interest: getCleanStringArray(user.interest),
      hobbies: getCleanStringArray(user.hobbies),
      favoriteActivities: getCleanStringArray(user.favoriteActivities),
      favoriteMusic: getCleanStringArray(user.favoriteMusic),
      favoriteMovies: getCleanStringArray(user.favoriteMovies),
      favoriteBooks: getCleanStringArray(user.favoriteBooks),
      city: user.city || "",
      state: user.state || "",
      country: user.country || "",
      profession: user.profession || "",
      education: user.education || "",
      datingIntent: user.datingIntent || "Not Sure Yet",
      relationshipStatus: user.relationshipStatus || "Prefer Not to Say",
      languages: getCleanStringArray(user.languages),
      personalityTraits: getCleanStringArray(user.personalityTraits),
      communicationStyle: user.communicationStyle || "All",
      loveLanguage: getCleanStringArray(user.loveLanguage),
      distance: user.showDistance === false ? null : distanceInKm,
      hasStarLikedYou: Boolean(user.hasStarLikedYou),
    };
  });
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required.", users: [] },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID.", users: [] },
        { status: 400 }
      );
    }

    const currentUserObjectId = new mongoose.Types.ObjectId(userId);
    const currentUser = await User.findById(userId)
      .select(
        "gender genderLike location maxDistanceKm LikedMe dislikedMe LikedBoth passedUsers blockedUsers"
      )
      .lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "User not found.", users: [] },
        { status: 404 }
      );
    }

    const coordinates = currentUser.location?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return NextResponse.json(
        { success: false, message: "User location is not available.", users: [] },
        { status: 400 }
      );
    }

    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      (longitude === 0 && latitude === 0) ||
      longitude < -180 || longitude > 180 ||
      latitude < -90 || latitude > 90
    ) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid user location.", users: [] },
        { status: 400 }
      );
    }

    const storedDistance = Number(currentUser.maxDistanceKm);
    const maxDistanceKm =
      Number.isFinite(storedDistance) && storedDistance > 0
        ? Math.min(storedDistance, MAX_DISTANCE_KM)
        : DEFAULT_DISTANCE_KM;
    const maxDistanceMeters = maxDistanceKm * 1000;

    const excludedObjectIds = getValidObjectIds([
      ...getArray(currentUser.LikedMe),
      ...getArray(currentUser.dislikedMe),
      ...getArray(currentUser.LikedBoth),
      ...getArray(currentUser.passedUsers),
      ...getArray(currentUser.blockedUsers),
    ]);

    const baseQuery = {
      _id: { $ne: currentUserObjectId, $nin: excludedObjectIds },
      blockedUsers: { $nin: [String(currentUserObjectId), currentUserObjectId] },
    };

    const genderLike = currentUser.genderLike || "All";
    const currentGender = currentUser.gender || "Other";

    if (genderLike !== "All") baseQuery.gender = genderLike;

    // Respect each candidate's own gender preference as well.
    baseQuery.$or = [
      { genderLike: currentGender },
      { genderLike: "All" },
      { genderLike: { $exists: false } },
      { genderLike: "" },
      { genderLike: null },
    ];

    // Priority list: users whose outgoing starLike contains the current user's ID.
    // starLike is a string array in the User schema.
    const priorityQuery = {
      ...baseQuery,
      starLike: { $in: [String(currentUserObjectId), currentUserObjectId] },
    };

    const priorityUsers = await findNearbyUsers({
      query: priorityQuery,
      coordinates: [longitude, latitude],
      maxDistanceMeters,
      limit: DEFAULT_RESULT_COUNT,
      randomize: false,
      currentUserId: currentUserObjectId,
    });

    const remainingCount = DEFAULT_RESULT_COUNT - priorityUsers.length;
    let remainingUsers = [];

    if (remainingCount > 0) {
      // Exclude priority senders from the normal pool to avoid duplicates.
      const remainingQuery = {
        ...baseQuery,
        starLike: { $nin: [String(currentUserObjectId), currentUserObjectId] },
      };

      remainingUsers = await findNearbyUsers({
        query: remainingQuery,
        coordinates: [longitude, latitude],
        maxDistanceMeters,
        limit: remainingCount,
        randomize: true,
        currentUserId: currentUserObjectId,
      });
    }

    const formattedUsers = formatProfiles([...priorityUsers, ...remainingUsers]);

    return NextResponse.json(
      { success: true, count: formattedUsers.length, users: formattedUsers },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching nearby users:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users.", users: [] },
      { status: 500 }
    );
  }
}
