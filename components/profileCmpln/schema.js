import * as yup from "yup";

const optionalNumber = (fallback) =>
  yup.number().transform((value, originalValue) => {
    if (originalValue === "" || Number.isNaN(value)) return fallback;
    return value;
  });

const optionalNullableNumber = yup
  .number()
  .transform((value, originalValue) => {
    if (originalValue === "" || originalValue == null || Number.isNaN(value)) {
      return null;
    }
    return value;
  })
  .nullable();

const stringArray = yup.array().of(yup.string().trim()).default([]);

function isAtLeast18(dateValue) {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime()))
    return false;
  const today = new Date();
  let age = today.getFullYear() - dateValue.getFullYear();
  const monthDifference = today.getMonth() - dateValue.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < dateValue.getDate())
  )
    age -= 1;
  return age >= 18 && age <= 120;
}

export const registerSchema = yup.object({
  // Required Basic Info section
  name: yup
    .string()
    .trim()
    .required("Name is required")
    .max(100, "Name is too long"),
  dateOfBirth: yup
    .date()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value,
    )
    .nullable()
    .typeError("Please enter a valid date of birth")
    .required("Date of birth is required")
    .test(
      "adult",
      "You must be at least 18 years old and no older than 120",
      (value) => isAtLeast18(value),
    ),
  gender: yup
    .string()
    .oneOf(["Male", "Female", "Other"], "Please select a valid gender")
    .required("Gender is required"),
  genderLike: yup
    .string()
    .oneOf(["Male", "Female", "All"], "Please select who you want to discover")
    .required("Interested in is required"),
  bio: yup
    .string()
    .trim()
    .max(500, "Bio cannot exceed 500 characters")
    .required("Bio is required"),

  // Everything below is optional. Defaults keep selects/number fields stable.
  profession: yup.string().trim().max(120).default(""),
  education: yup.string().trim().max(120).default(""),
  city: yup.string().trim().max(120).default(""),
  state: yup.string().trim().max(120).default(""),
  country: yup.string().trim().default(""),

  interest: stringArray,
  hobbies: stringArray,
  favoriteMusic: stringArray,
  favoriteMovies: stringArray,
  favoriteBooks: stringArray,
  favoriteActivities: stringArray,

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
        return value >= (this.parent.minAgePreference ?? 18);
      },
    )
    .default(99),
  maxDistanceKm: optionalNumber(50)
    .min(1, "Distance must be at least 1 km")
    .max(500, "Distance cannot exceed 500 km")
    .default(50),
  relationshipStatus: yup
    .string()
    .oneOf(["Single", "Divorced", "Widowed", "Prefer Not to Say"])
    .default("Prefer Not to Say"),

  personalityTraits: stringArray,
  communicationStyle: yup
    .string()
    .oneOf(["Texting", "Calling", "Video Calling", "In Person", "All"])
    .default("All"),
  loveLanguage: stringArray,
  languages: stringArray,

  height: optionalNullableNumber
    .min(0, "Height cannot be negative")
    .max(300, "Please enter a valid height")
    .default(null),
  exercise: yup
    .string()
    .oneOf(["Frequently", "Sometimes", "Rarely", "Never", "Prefer Not to Say"])
    .default("Prefer Not to Say"),
  smoking: yup
    .string()
    .oneOf(["Yes", "No", "Sometimes", "Prefer Not to Say"])
    .default("Prefer Not to Say"),
  drinking: yup
    .string()
    .oneOf(["Yes", "No", "Sometimes", "Prefer Not to Say"])
    .default("Prefer Not to Say"),
  pets: stringArray,
  religion: yup.string().trim().max(120).default(""),
});
