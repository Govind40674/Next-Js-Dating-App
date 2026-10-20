import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Account details
    name: { type: String, default: "", trim: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, unique: true, sparse: true, trim: true },
    password: { type: String, default: null },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: {
      type: String,
      enum: ["email", "phone", "google"],
      default: "email",
    },

    // Profile details
    photo: { type: [String], default: [] },
    bio: { type: String, default: "", maxlength: 500 },
    // Keep age for existing discovery/UI code; it is recalculated from dateOfBirth when saving.
    age: { type: Number, default: 0, min: 0 },
    dateOfBirth: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },
    genderLike: {
      type: String,
      enum: ["Male", "Female", "All"],
      default: "All",
      required: false,
    },

    // Interests and hobbies
    interest: { type: [String], default: [] },
    hobbies: { type: [String], default: [] },
    favoriteMusic: { type: [String], default: [] },
    favoriteMovies: { type: [String], default: [] },
    favoriteBooks: { type: [String], default: [] },
    favoriteActivities: { type: [String], default: [] },

    // Dating preferences
    datingIntent: {
      type: String,
      enum: [
        "Serious Relationship",
        "Casual Dating",
        "Friendship",
        "Marriage",
        "Not Sure Yet",
      ],
      default: "Not Sure Yet",
    },
    minAgePreference: { type: Number, default: 18, min: 18, max: 99 },
    maxAgePreference: { type: Number, default: 99, min: 18, max: 99 },
    maxDistanceKm: { type: Number, default: 50, min: 1, max: 500 },
    relationshipStatus: {
      type: String,
      enum: ["Single", "Divorced", "Widowed", "Prefer Not to Say"],
      default: "Prefer Not to Say",
    },

    // Personality and communication
    personalityTraits: { type: [String], default: [] },
    communicationStyle: {
      type: String,
      enum: ["Texting", "Calling", "Video Calling", "In Person", "All"],
      default: "All",
    },
    loveLanguage: { type: [String], default: [] },

    // Education, career and location
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    education: { type: String, default: "", trim: true },
    profession: { type: String, default: "", trim: true },
    languages: { type: [String], default: [] },

    // Lifestyle
    height: { type: Number, default: null, min: 0, max: 300 },
    exercise: {
      type: String,
      enum: ["Frequently", "Sometimes", "Rarely", "Never", "Prefer Not to Say"],
      default: "Prefer Not to Say",
    },
    smoking: {
      type: String,
      enum: ["Yes", "No", "Sometimes", "Prefer Not to Say"],
      default: "Prefer Not to Say",
    },
    drinking: {
      type: String,
      enum: ["Yes", "No", "Sometimes", "Prefer Not to Say"],
      default: "Prefer Not to Say",
    },
    pets: { type: [String], default: [] },
    religion: { type: String, default: "", trim: true },

    // Likes and matches
    LikedBy: { type: [String], default: [] },
    LikedMe: { type: [String], default: [] },
    dislikedMe: { type: [String], default: [] },
    LikedBoth: { type: [String], default: [] },
    passedUsers: { type: [String], default: [] },
    blockedUsers: { type: [String], default: [] },

    // Profile completion: isProfileComplete means required Basic Info is complete.
    isProfileComplete: { type: Boolean, default: false },
    profileCompletionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    isVerified: { type: Boolean, default: false },

    // App activity
    todayViewCount: { type: Number, default: 0 },
    startTime: { type: Date, default: Date.now },
    isVIP: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
    lastActive: { type: Date, default: Date.now },

    // Notifications
    fcmToken: { type: String, default: null },
    notificationsEnabled: { type: Boolean, default: true },

    // Privacy
    showAge: { type: Boolean, default: true },
    showDistance: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: true },

    // GeoJSON point; coordinates are [longitude, latitude].
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true },
);

userSchema.index({ location: "2dsphere" });
userSchema.index({ gender: 1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
