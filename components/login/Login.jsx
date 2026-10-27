"use client";

import React, { useMemo, useState } from "react";
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import styles from "./Login.module.css";

import email_schema from "../validation/schema_email";
import phone_schema from "../validation/schema_phone";

const Login = () => {
  const router = useRouter();

  // State
  const [method, setMethod] = useState("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Phone country state
  const [selectedCountry, setSelectedCountry] = useState(
    countries.find((country) => country.cca2 === "IN"),
  );

  const [phoneNumber, setPhoneNumber] = useState("");

  // Country dropdown options
  const countryOptions = useMemo(() => {
    return countries
      .filter((country) => country.idd?.root && country.idd?.suffixes?.length)
      .map((country) => ({
        value: country.cca2,
        label: `${country.flag || ""} ${country.name.common}`,
        dialCode: country.idd.root + country.idd.suffixes[0],
        country,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Currently selected country
  const selectedCountryOption =
    countryOptions.find((option) => option.value === selectedCountry?.cca2) ||
    null;

  // Email login form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm({
    resolver: yupResolver(email_schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Phone login form
  const {
    register: registerPhone,
    setValue: setPhoneFormValue,
    handleSubmit: handleSubmitPhone,
    formState: { errors: phoneErrors },
  } = useForm({
    resolver: yupResolver(phone_schema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  // Switch between tabs
  const handleMethodChange = (value) => {
    if (value !== "email" && value !== "phone") return;

    setMethod(value);
    setMessage("");
  };

  // Store user information
  const storeUserData = (user) => {
    if (!user) {
      throw new Error("User information was not returned.");
    }

    if (user._id) {
      localStorage.setItem("userId", String(user._id));
    }

    localStorage.setItem("isVIP", String(user.isVIP ?? false));

    localStorage.setItem("todayViewCount", String(user.todayViewCount ?? 0));

    const profilePhoto = Array.isArray(user.photo)
      ? user.photo[0] || ""
      : user.photo || "";

    localStorage.setItem("profile_photo", profilePhoto);
    localStorage.setItem("name", user.name || "");
    localStorage.setItem("isPremium", String(user.isPremium ?? false));
    

  };

  // Email login
  const onEmailLogin = async (data) => {
    try {
      setLoading(true);
      setMessage("");

      const email = String(data.email || "")
        .trim()
        .toLowerCase();

      const response = await axios.post("/api/auth/login", {
        method: "email",
        contact: email,
        password: data.password,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Login failed.");
      }

   

      storeUserData(user);

      setMessage("Login successful!");

      router.push("/match");
    } catch (error) {
      console.error("Email login error:", error);

      setMessage(
        error.response?.data?.message || error.message || "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Change selected country
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

  // Phone login
  const onPhoneLogin = async (data) => {
    try {
      setLoading(true);
      setMessage("");

      if (!selectedCountryOption) {
        setMessage("Please select a country.");
        return;
      }

      const localPhone = String(data.phone || "").replace(/\D/g, "");

      if (!localPhone) {
        setMessage("Please enter your phone number.");
        return;
      }

      const fullPhoneNumber = `${selectedCountryOption.dialCode}${localPhone}`;

      const response = await axios.post("/api/auth/login", {
        method: "phone",
        contact: fullPhoneNumber,
        password: data.password,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Login failed.");
      }
   

      const user = response.data.user;

      storeUserData(user);

      setMessage("Login successful!");

      router.push("/match");
    } catch (error) {
      console.error("Phone login error:", error);

      setMessage(
        error.response?.data?.message || error.message || "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Google login
  const handleGoogleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setMessage("");

      await signIn("google", {
        callbackUrl: "/google-callback",
      });
    } catch (error) {
      console.error("Google login error:", error);

      setMessage("Google login failed.");
      setLoading(false);
    }
  };

  // Forgot password
  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  // Navigate to signup
  const handleSignup = () => {
    router.push("/signup");
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        {/* Header */}
        <CardHeader className={styles.cardHeader}>
          <CardTitle className={styles.title}>Welcome Back</CardTitle>

          <CardDescription>
            Login to your account using email or phone.
          </CardDescription>
        </CardHeader>

        <CardContent className={styles.cardContent}>
          {/* Email and Phone Tabs */}
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

            {/* EMAIL LOGIN */}
            <TabsContent value="email" className={styles.tabsContent}>
              <form
                onSubmit={handleSubmitEmail(onEmailLogin)}
                className={styles.form}
              >
                {/* Email */}
                <div className={styles.formGroup}>
                  <Label htmlFor="login-email">Email</Label>

                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    {...registerEmail("email")}
                  />

                  {emailErrors.email && (
                    <p className={styles.error}>{emailErrors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className={styles.formGroup}>
                  <div className={styles.passwordHeader}>
                    <Label htmlFor="login-email-password">Password</Label>

                    <button
                      type="button"
                      className={styles.forgotButton}
                      onClick={handleForgotPassword}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <Input
                    id="login-email-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...registerEmail("password")}
                  />

                  {emailErrors.password && (
                    <p className={styles.error}>
                      {emailErrors.password.message}
                    </p>
                  )}
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            {/* PHONE LOGIN */}
            <TabsContent value="phone" className={styles.tabsContent}>
              <form
                onSubmit={handleSubmitPhone(onPhoneLogin)}
                className={styles.form}
              >
                {/* Country */}
                <div className={styles.formGroup}>
                  <Label htmlFor="login-country">Country</Label>

                  <Select
                    inputId="login-country"
                    options={countryOptions}
                    value={selectedCountryOption}
                    onChange={handleCountryChange}
                    isSearchable
                    placeholder="Select country"
                    classNamePrefix="country-select"
                  />
                </div>

                {/* Phone Number */}
                <div className={styles.formGroup}>
                  <Label htmlFor="login-phone">Phone Number</Label>

                  <div className={styles.phoneInputRow}>
                    <div className={styles.countryCode}>
                      {selectedCountryOption?.dialCode || "+91"}
                    </div>

                    <Input
                      id="login-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="9876543210"
                      value={phoneNumber}
                      {...registerPhone("phone")}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, "");

                        setPhoneNumber(value);

                        setPhoneFormValue("phone", value, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }}
                    />
                  </div>

                  {phoneErrors.phone && (
                    <p className={styles.error}>{phoneErrors.phone.message}</p>
                  )}

                  {phoneNumber && (
                    <p className={styles.phonePreview}>
                      Login using{" "}
                      <strong>
                        {selectedCountryOption?.dialCode}
                        {phoneNumber}
                      </strong>
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className={styles.formGroup}>
                  <div className={styles.passwordHeader}>
                    <Label htmlFor="login-phone-password">Password</Label>

                    <button
                      type="button"
                      className={styles.forgotButton}
                      onClick={handleForgotPassword}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <Input
                    id="login-phone-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...registerPhone("password")}
                  />

                  {phoneErrors.password && (
                    <p className={styles.error}>
                      {phoneErrors.password.message}
                    </p>
                  )}
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Google Login */}
          <div className={styles.googleSection}>
            <div className={styles.divider}>
              <div className={styles.dividerLine} />

              <span>OR</span>

              <div className={styles.dividerLine} />
            </div>

            <Button
              type="button"
              variant="outline"
              className={styles.googleButton}
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <span className={styles.googleIcon} aria-hidden="true">
                G
              </span>

              {loading ? "Please wait..." : "Continue with Google"}
            </Button>
          </div>

          {/* Status Message */}
          {message && (
            <p
              className={`${styles.message} ${
                /failed|error|invalid|please|required|incorrect|wrong/i.test(
                  message,
                )
                  ? styles.messageError
                  : styles.messageSuccess
              }`}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          )}

          {/* Signup Link */}
          <div className={styles.signupSection}>
            <span>Do not have an account?</span>

            <button
              type="button"
              className={styles.signupButton}
              onClick={handleSignup}
            >
              Create Account
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
