import * as yup from "yup";

const optionalNumber = (fallback) =>
  yup
    .number()
    .transform((value, originalValue) => {
      if (
        originalValue === "" ||
        Number.isNaN(value)
      ) {
        return fallback;
      }

      return value;
    });

const optionalNullableNumber = yup
  .number()
  .transform((value, originalValue) => {
    if (
      originalValue === "" ||
      Number.isNaN(value)
    ) {
      return null;
    }

    return value;
  })
  .nullable();

const stringArray = yup
  .array()
  .of(yup.string().trim())
  .default([]);

export const registerSchema = yup.object({
  // Basic profile
  name: yup
    .string()
    .trim()
    .required("Name is required"),

  age: yup
    .number()
    .transform((value, originalValue) => {
      if (
        originalValue === "" ||
        Number.isNaN(value)
      ) {
        return undefined;
      }

      return value;
    })
    .typeError("Please enter a valid age")
    .integer("Age must be a whole number")
    .min(18, "Age must be at least 18")
    .max(120, "Please enter a valid age")
    .required("Age is required"),

  gender: yup
    .string()
    .oneOf(
      ["Male", "Female", "Other"],
      "Please select a valid gender"
    )
    .required("Gender is required"),

  genderLike: yup
    .string()
    .oneOf(
      ["Male", "Female", "All"],
      "Please select a valid preference"
    )
    .required("Gender preference is required"),

  bio: yup
    .string()
    .trim()
    .max(500, "Bio cannot exceed 500 characters")
    .required("Bio is required"),

  profession: yup
    .string()
    .trim()
    .required("Profession is required"),

  education: yup
    .string()
    .trim()
    .required("Education is required"),

  city: yup
    .string()
    .trim()
    .required("City is required"),

  state: yup
    .string()
    .trim()
    .default(""),

  country: yup
    .string()
    .required("Country is required"),

  interest: yup
    .array()
    .of(yup.string().trim())
    .min(1, "Please select at least one interest")
    .required("Interest is required"),

  // Additional interests
  hobbies: stringArray,

  favoriteMusic: stringArray,

  favoriteMovies: stringArray,

  favoriteBooks: stringArray,

  favoriteActivities: stringArray,

  // Dating preferences
  datingIntent: yup
    .string()
    .oneOf([
      "Serious Relationship",
      "Casual Dating",
      "Friendship",
      "Marriage",
      "Not Sure Yet",
    ])
    .default("Not Sure Yet"),

  minAgePreference: optionalNumber(18)
    .integer()
    .min(18, "Minimum age must be at least 18")
    .max(99)
    .default(18),

  maxAgePreference: optionalNumber(99)
    .integer()
    .min(18)
    .max(99)
    .test(
      "max-age",
      "Maximum age must be greater than or equal to minimum age",
      function (value) {
        if (value == null) return true;

        const minAge =
          this.parent.minAgePreference ?? 18;

        return value >= minAge;
      }
    )
    .default(99),

  maxDistanceKm: optionalNumber(50)
    .min(1, "Distance must be at least 1 km")
    .max(500)
    .default(50),

  relationshipStatus: yup
    .string()
    .oneOf([
      "Single",
      "Divorced",
      "Widowed",
      "Prefer Not to Say",
    ])
    .default("Prefer Not to Say"),

  // Personality and communication
  personalityTraits: stringArray,

  communicationStyle: yup
    .string()
    .oneOf([
      "Texting",
      "Calling",
      "Video Calling",
      "In Person",
      "All",
    ])
    .default("All"),

  loveLanguage: stringArray,

  // Languages
  languages: stringArray,

  // Lifestyle
  height: optionalNullableNumber
    .min(0, "Height cannot be negative")
    .max(300, "Please enter a valid height")
    .default(null),

  exercise: yup
    .string()
    .oneOf([
      "Frequently",
      "Sometimes",
      "Rarely",
      "Never",
      "Prefer Not to Say",
    ])
    .default("Prefer Not to Say"),

  smoking: yup
    .string()
    .oneOf([
      "Yes",
      "No",
      "Sometimes",
      "Prefer Not to Say",
    ])
    .default("Prefer Not to Say"),

  drinking: yup
    .string()
    .oneOf([
      "Yes",
      "No",
      "Sometimes",
      "Prefer Not to Say",
    ])
    .default("Prefer Not to Say"),

  pets: stringArray,

  religion: yup
    .string()
    .trim()
    .default(""),
});