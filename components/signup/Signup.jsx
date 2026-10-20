"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Select from "react-select";
import countries from "world-countries";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import styles from "./Signup.module.css";

import email_schema from "../validation/schema_email";
import phone_schema from "../validation/schema_phone";

const Signup = () => {
  const router = useRouter();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState("contact");
  const [method, setMethod] = useState("email");

  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const [message, setMessage] = useState("");

  const [selectedCountry, setSelectedCountry] = useState(
    countries.find((country) => country.cca2 === "IN")
  );

  const [phoneNumber, setPhoneNumber] = useState("");

  // Country options
  const countryOptions = useMemo(
    () =>
      countries
        .filter(
          (country) =>
            country.idd?.root && country.idd?.suffixes?.length
        )
        .map((country) => ({
          value: country.cca2,
          label: `${country.flag || ""} ${country.name.common}`,
          dialCode: country.idd.root + country.idd.suffixes[0],
          country,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  const selectedCountryOption =
    countryOptions.find(
      (option) => option.value === selectedCountry?.cca2
    ) || null;

  // Email form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm({
    resolver: yupResolver(email_schema),
  });

  // Phone form
  const {
    register: registerPhone,
    setValue: setPhoneFormValue,
    handleSubmit: handleSubmitPhone,
    formState: { errors: phoneErrors },
  } = useForm({
    resolver: yupResolver(phone_schema),
    defaultValues: {
      phone: "",
    },
  });

  // OTP countdown
  useEffect(() => {
    if (resendTimer <= 0) return undefined;

    const timer = setInterval(() => {
      setResendTimer((previous) =>
        previous <= 1 ? 0 : previous - 1
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTimer]);

  const startResendTimer = () => setResendTimer(60);

  // Switch between email and phone
  const handleMethodChange = (value) => {
    if (value !== "email" && value !== "phone") return;

    setMethod(value);
    setMessage("");
  };

  // Send OTP request
  const sendOTP = async (selectedMethod, selectedContact) => {
    const response = await axios.post("/api/auth/send-otp", {
      method: selectedMethod,
      contact: selectedContact,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || "Failed to send OTP."
      );
    }

    return response.data;
  };

  // Email submission
  const onEmailSubmit = async (data) => {
    try {
      setLoading(true);
      setMessage("");

      const email = String(data.email || "")
        .trim()
        .toLowerCase();

      await sendOTP("email", email);

      setMethod("email");
      setContact(email);
      setOtp("");
      setVerifiedToken("");
      setStep("otp");
      startResendTimer();
      setMessage(`OTP sent to ${email}`);
    } catch (error) {
      console.error("Send email OTP error:", error);

      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  // Country selection
  const handleCountryChange = (option) => {
    if (!option) return;

    setSelectedCountry(option.country);
    setPhoneNumber("");

    setPhoneFormValue("phone", "", {
      shouldValidate: false,
      shouldDirty: false,
    });

    setMessage("");
  };

  // Phone submission
  const onPhoneSubmit = async (data) => {
    try {
      setLoading(true);
      setMessage("");

      if (!selectedCountryOption) {
        setMessage("Please select a country.");
        return;
      }

      const localPhone = String(data.phone || "").replace(
        /\D/g,
        ""
      );

      if (!localPhone) {
        setMessage("Please enter your phone number.");
        return;
      }

      const fullPhoneNumber =
        `${selectedCountryOption.dialCode}${localPhone}`;

      await sendOTP("phone", fullPhoneNumber);

      setMethod("phone");
      setContact(fullPhoneNumber);
      setOtp("");
      setVerifiedToken("");
      setStep("otp");
      startResendTimer();
      setMessage(`OTP sent to ${fullPhoneNumber}`);
    } catch (error) {
      console.error("Send phone OTP error:", error);

      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      setMessage("Please enter a valid 4-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await axios.post(
        "/api/auth/verify-otp",
        {
          method,
          contact,
          otp,
        }
      );

      if (response.data.success) {
        setVerifiedToken(response.data.verificationToken);
        setStep("password");
        setMessage("OTP verified successfully.");
      } else {
        setMessage(
          response.data.message || "Invalid or expired OTP."
        );
      }
    } catch (error) {
      console.error("OTP verification error:", error);

      setMessage(
        error.response?.data?.message ||
          "Invalid or expired OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0 || loading) return;

    try {
      setLoading(true);
      setMessage("");

      await sendOTP(method, contact);

      setOtp("");
      setVerifiedToken("");
      startResendTimer();

      setMessage(`New OTP sent to ${contact}`);
    } catch (error) {
      console.error("Resend OTP error:", error);

      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to resend OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const handleRegister = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (!password || !confirmPassword) {
      setMessage("Please enter your password.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!verifiedToken) {
      setMessage("Please verify your OTP first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await axios.post("/api/auth/register", {
        method,
        contact,
        password,
        verificationToken: verifiedToken,
      });

      if (response.data.success) {
        const user = response.data.user || {};

        if (user._id) {
          localStorage.setItem("userId", String(user._id));
        }

        localStorage.setItem(
          "isVIP",
          String(user.isVIP ?? false)
        );

        localStorage.setItem(
          "todayViewCount",
          String(user.todayViewCount ?? 0)
        );

        const profilePhoto = Array.isArray(user.photo)
          ? user.photo[0] || ""
          : user.photo || "";

        localStorage.setItem("profile_photo", profilePhoto);
        localStorage.setItem("name", user.name || "");

        setMessage("Account created successfully!");
        router.push("/match");
      } else {
        setMessage(
          response.data.message || "Registration failed."
        );
      }
    } catch (error) {
      console.error("Registration error:", error);

      setMessage(
        error.response?.data?.message ||
          "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // Google signup
  const handleGoogleSignup = async () => {
    if (googleLoading || loading) return;

    setGoogleLoading(true);
    setMessage("");

    try {
      await signIn("google", {
        callbackUrl: "/google-callback",
      });
    } catch (error) {
      console.error("Google signup error:", error);

      setMessage("Google signup failed.");
      setGoogleLoading(false);
    }
  };

  // Back to previous signup step
  const handleBack = () => {
    if (step === "otp") {
      setStep("contact");
      setOtp("");
      setVerifiedToken("");
      setMessage("");
      return;
    }

    if (step === "password") {
      setStep("otp");
      setMessage("");
    }
  };

  // Change email or phone number
  const handleChangeContact = () => {
    setStep("contact");
    setOtp("");
    setVerifiedToken("");
    setMessage("");
    setResendTimer(0);
  };

  // NEW: Navigate to login
  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <CardHeader className={styles.cardHeader}>
          <CardTitle className={styles.title}>
            Create Account
          </CardTitle>

          <CardDescription className={styles.description}>
            {step === "contact" &&
              "Choose email or phone to create your account."}

            {step === "otp" &&
              "Verify your email or phone number."}

            {step === "password" &&
              "Create a password for your account."}
          </CardDescription>
        </CardHeader>

        <CardContent className={styles.cardContent}>
          {/* STEP 1: EMAIL OR PHONE */}
          {step === "contact" && (
            <>
              <Tabs
                value={method}
                onValueChange={handleMethodChange}
                className={styles.tabs}
              >
                <TabsList className={styles.tabsList}>
                  <TabsTrigger
                    value="email"
                    className={`${styles.tab} ${
                      method === "email" ? styles.activeTab : ""
                    }`}
                  >
                    With Email
                  </TabsTrigger>

                  <TabsTrigger
                    value="phone"
                    className={`${styles.tab} ${
                      method === "phone" ? styles.activeTab : ""
                    }`}
                  >
                    With Phone
                  </TabsTrigger>
                </TabsList>

                {/* EMAIL FORM */}
                <TabsContent
                  value="email"
                  className={styles.tabsContent}
                >
                  <form
                    onSubmit={handleSubmitEmail(onEmailSubmit)}
                    className={styles.form}
                  >
                    <div className={styles.formGroup}>
                      <Label htmlFor="signup-email">
                        Email
                      </Label>

                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email"
                        {...registerEmail("email")}
                      />

                      {emailErrors.email && (
                        <p className={styles.error}>
                          {emailErrors.email.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className={styles.submitButton}
                      disabled={loading}
                    >
                      {loading ? "Sending OTP..." : "Send OTP"}
                    </Button>
                  </form>
                </TabsContent>

                {/* PHONE FORM */}
                <TabsContent
                  value="phone"
                  className={styles.tabsContent}
                >
                  <form
                    onSubmit={handleSubmitPhone(onPhoneSubmit)}
                    className={styles.form}
                  >
                    <div className={styles.formGroup}>
                      <Label htmlFor="signup-country">
                        Country
                      </Label>

                      <Select
                        inputId="signup-country"
                        options={countryOptions}
                        value={selectedCountryOption}
                        onChange={handleCountryChange}
                        isSearchable
                        placeholder="Select country"
                        classNamePrefix="country-select"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <Label htmlFor="signup-phone">
                        Phone Number
                      </Label>

                      <div className={styles.phoneInputRow}>
                        <div className={styles.countryCode}>
                          {selectedCountryOption?.dialCode || "+91"}
                        </div>

                        <Input
                          id="signup-phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="9876543210"
                          value={phoneNumber}
                          {...registerPhone("phone")}
                          onChange={(event) => {
                            const value =
                              event.target.value.replace(/\D/g, "");

                            setPhoneNumber(value);

                            setPhoneFormValue("phone", value, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
                        />
                      </div>

                      {phoneErrors.phone && (
                        <p className={styles.error}>
                          {phoneErrors.phone.message}
                        </p>
                      )}

                      {phoneNumber && (
                        <p className={styles.phonePreview}>
                          OTP will be sent to{" "}
                          <strong>
                            {selectedCountryOption?.dialCode}
                            {phoneNumber}
                          </strong>
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className={styles.submitButton}
                      disabled={loading || !phoneNumber}
                    >
                      {loading ? "Sending OTP..." : "Send OTP"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* GOOGLE SIGNUP */}
              <div className={styles.googleSection}>
                <div className={styles.divider}>
                  <span className={styles.dividerLine} />
                  <span>OR</span>
                  <span className={styles.dividerLine} />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className={styles.googleButton}
                  onClick={handleGoogleSignup}
                  disabled={googleLoading || loading}
                >
                  {googleLoading
                    ? "Signing up with Google..."
                    : "Sign up with Google"}
                </Button>
              </div>
            </>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === "otp" && (
            <div className={styles.stepContainer}>
              <div className={styles.otpHeader}>
                <h3>
                  Verify {method === "email" ? "Email" : "Phone"}
                </h3>

                <p>We sent a 4-digit OTP to</p>
                <strong>{contact}</strong>
              </div>

              <div className={styles.formGroup}>
                <Label htmlFor="signup-otp">Enter OTP</Label>

                <Input
                  id="signup-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={otp}
                  placeholder="Enter 4-digit OTP"
                  className={styles.otpInput}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4)
                    )
                  }
                />
              </div>

              <Button
                type="button"
                className={styles.submitButton}
                disabled={loading || otp.length !== 4}
                onClick={handleVerifyOTP}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className={styles.secondaryButton}
                disabled={loading || resendTimer > 0}
                onClick={handleResendOTP}
              >
                {resendTimer > 0
                  ? `Resend OTP in ${resendTimer}s`
                  : "Resend OTP"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className={styles.secondaryButton}
                onClick={handleChangeContact}
                disabled={loading}
              >
                Change {method === "email" ? "Email" : "Phone"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className={styles.backButton}
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
            </div>
          )}

          {/* STEP 3: PASSWORD */}
          {step === "password" && (
            <form
              onSubmit={handleRegister}
              className={styles.form}
            >
              <div className={styles.verifiedBox}>
                ✓ {method === "email" ? "Email" : "Phone"} verified
                <div>{contact}</div>
              </div>

              <div className={styles.formGroup}>
                <Label htmlFor="signup-password">Password</Label>

                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create password"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <Label htmlFor="signup-confirm-password">
                  Confirm Password
                </Label>

                <Input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  required
                />
              </div>

              <Button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className={styles.backButton}
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
            </form>
          )}

          {/* STATUS MESSAGE */}
          {message && (
            <p
              className={`${styles.message} ${
                /failed|error|invalid|please|not match/i.test(message)
                  ? styles.messageError
                  : styles.messageSuccess
              }`}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          )}

          {/* NEW: LOGIN LINK */}
          <div className={styles.loginSection}>
            <span>Already have an account?</span>

            <button
              type="button"
              className={styles.loginLink}
              onClick={handleLogin}
            >
              Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
