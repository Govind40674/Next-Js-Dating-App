
import * as yup from "yup";

const phone_schema = yup.object({
  phone: yup
    .string()
    .transform((value) =>
      typeof value === "string"
        ? value.replace(/\D/g, "")
        : value
    )
    .required("Phone number is required")
    .min(6, "Phone number is too short")
    .max(15, "Phone number is too long"),
});

export default phone_schema;
