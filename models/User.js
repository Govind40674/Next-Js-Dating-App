import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ==================== BASIC ACCOUNT DETAILS ====================
    name: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    password: {
      type: String,
      default: null,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    authProvider: {
      type: String,
      enum: ["email", "phone", "google"],
      default: "email",
    },

    // ==================== PROFILE DETAILS ====================
    photo: {
      type: [String],
      default: [],
    },

    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },

    age: {
      type: Number,
      default: 0,
      min: 0,
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },

    // Who the user wants to discover
    genderLike: {
      type: String,
      enum: ["Male", "Female", "All"],
      default: "All",
      required: false,
    },

    // ==================== INTERESTS AND HOBBIES ====================
    interest: {
      type: [String],
      default: [],
    },

    hobbies: {
      type: [String],
      default: [],
    },

    favoriteMusic: {
      type: [String],
      default: [],
    },

    favoriteMovies: {
      type: [String],
      default: [],
    },

    favoriteBooks: {
      type: [String],
      default: [],
    },

    favoriteActivities: {
      type: [String],
      default: [],
    },

    // ==================== DATING PREFERENCES ====================
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

    minAgePreference: {
      type: Number,
      default: 18,
      min: 18,
    },

    maxAgePreference: {
      type: Number,
      default: 99,
      min: 18,
    },

    maxDistanceKm: {
      type: Number,
      default: 50,
      min: 1,
    },

    relationshipStatus: {
      type: String,
      enum: [
        "Single",
        "Divorced",
        "Widowed",
        "Prefer Not to Say",
      ],
      default: "Prefer Not to Say",
    },

    // ==================== PERSONALITY ====================
    personalityTraits: {
      type: [String],
      default: [],
    },

    communicationStyle: {
      type: String,
      enum: [
        "Texting",
        "Calling",
        "Video Calling",
        "In Person",
        "All",
      ],
      default: "All",
    },

    loveLanguage: {
      type: [String],
      default: [],
    },

    // ==================== EDUCATION AND CAREER ====================
    city: {
      type: String,
      default: "",
      trim: true,
    },

    education: {
      type: String,
      default: "",
    },

    profession: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    languages: {
      type: [String],
      default: [],
    },

    // ==================== LIFESTYLE ====================
    height: {
      type: Number,
      default: null,
      min: 0,
    },

    exercise: {
      type: String,
      enum: [
        "Frequently",
        "Sometimes",
        "Rarely",
        "Never",
        "Prefer Not to Say",
      ],
      default: "Prefer Not to Say",
    },

    smoking: {
      type: String,
      enum: [
        "Yes",
        "No",
        "Sometimes",
        "Prefer Not to Say",
      ],
      default: "Prefer Not to Say",
    },

    drinking: {
      type: String,
      enum: [
        "Yes",
        "No",
        "Sometimes",
        "Prefer Not to Say",
      ],
      default: "Prefer Not to Say",
    },

    pets: {
      type: [String],
      default: [],
    },

    religion: {
      type: String,
      default: "",
    },

    // ==================== LIKES AND MATCHES ====================
    LikedBy: {
      type: [String],
      default: [],
    },

    LikedMe: {
      type: [String],
      default: [],
    },

    dislikedMe: {
      type: [String],
      default: [],
    },

    LikedBoth: {
      type: [String],
      default: [],
    },

    // Extra relationship tracking
    passedUsers: {
      type: [String],
      default: [],
    },

    blockedUsers: {
      type: [String],
      default: [],
    },

    // ==================== PROFILE COMPLETION ====================
    isProfileComplete: {
      type: Boolean,
      default: false,
    },

    profileCompletionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // ==================== APP ACTIVITY ====================
    todayViewCount: {
      type: Number,
      default: 0,
    },

    startTime: {
      type: Date,
      default: Date.now,
    },

    isVIP: {
      type: Boolean,
      default: false,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: null,
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },

    // ==================== NOTIFICATIONS ====================
    fcmToken: {
      type: String,
      default: null,
    },

    notificationsEnabled: {
      type: Boolean,
      default: true,
    },

    // ==================== PRIVACY SETTINGS ====================
    showAge: {
      type: Boolean,
      default: true,
    },

    showDistance: {
      type: Boolean,
      default: true,
    },

    showOnlineStatus: {
      type: Boolean,
      default: true,
    },

    // ==================== LOCATION ====================
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================
userSchema.index({ location: "2dsphere" });
userSchema.index({ gender: 1 });

// Reuse the existing model during Next.js hot reload
const User =
  mongoose.models.User || mongoose.model("User", userSchema);

export default User;