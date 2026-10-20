import * as yup from "yup";

const email_schema = yup.object({
  email: yup
    .string()
    .email("Please enter a valid email address")
    .required("Email is required"),
});

export default email_schema;