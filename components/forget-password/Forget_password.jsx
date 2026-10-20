"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
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

import styles from "./Forget_password.module.css";

const Forget_password = () => {
  const router = useRouter();

  const [step, setStep] = useState("contact");
  const [method, setMethod] = useState("email");

  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const [selectedCountry, setSelectedCountry] = useState(
    countries.find((country) => country.cca2 === "IN")
  );

  const [phoneNumber, setPhoneNumber] = useState("");

  const countryOptions = countries
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
    .sort((a, b) => a.label.localeCompare(b.label));

  const selectedCountryOption =
    countryOptions.find(
      (option) => option.value === selectedCountry?.cca2
    ) || null;

  // OTP resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;

    const timer = setInterval(() => {
      setResendTimer((previous) =>
        previous <= 1 ? 0 : previous - 1
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTimer]);

  const startResendTimer = () => setResendTimer(60);

  // Country selection
  const handleCountryChange = (option) => {
    if (!option) return;

    setSelectedCountry(option.country);
    setPhoneNumber("");
    setContact("");
    setOtp("");
    setMessage("");
  };

  // Switch between Email and Phone
  const handleMethodChange = (value) => {
    if (value !== "email" && value !== "phone") return;

    setMethod(value);
    setContact("");
    setPhoneNumber("");
    setOtp("");
    setVerifiedToken("");
    setMessage("");
    setResendTimer(0);

    if (value === "phone") {
      setSelectedCountry(
        countries.find((country) => country.cca2 === "IN")
      );
    }
  };

  // Send OTP
  const handleSendOTP = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      if (method === "email") {
        const email = contact.toLowerCase().trim();

        if (!email) {
          setMessage("Please enter your email.");
          return;
        }

        const response = await axios.post("/api/auth/send-otp", {
          method: "email",
          contact: email,
        });

        if (!response.data.success) {
          throw new Error(
            response.data.message || "Failed to send OTP."
          );
        }

        setContact(email);
        setOtp("");
        setStep("otp");
        startResendTimer();
        setMessage(`OTP sent to ${email}`);

        return;
      }

      if (method === "phone") {
        if (!selectedCountryOption) {
          setMessage("Please select a country.");
          return;
        }

        const localPhone = phoneNumber.replace(/\D/g, "");

        if (!localPhone) {
          setMessage("Please enter your phone number.");
          return;
        }

        const fullPhoneNumber =
          `${selectedCountryOption.dialCode}${localPhone}`;

        const response = await axios.post("/api/auth/send-otp", {
          method: "phone",
          contact: fullPhoneNumber,
        });

        if (!response.data.success) {
          throw new Error(
            response.data.message || "Failed to send OTP."
          );
        }

        setContact(fullPhoneNumber);
        setOtp("");
        setStep("otp");
        startResendTimer();
        setMessage(`OTP sent to ${fullPhoneNumber}`);
      }
    } catch (error) {
      console.error("Forgot password OTP error:", error);

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

      const response = await axios.post("/api/auth/verify-otp", {
        method,
        contact,
        otp,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Invalid OTP."
        );
      }

      setVerifiedToken(response.data.verificationToken);
      setStep("password");
      setMessage("OTP verified successfully.");
    } catch (error) {
      console.error("Verify reset OTP error:", error);

      setMessage(
        error.response?.data?.message ||
          error.message ||
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

      const response = await axios.post("/api/auth/send-otp", {
        method,
        contact,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to resend OTP."
        );
      }

      setOtp("");
      startResendTimer();
      setMessage(`New OTP sent to ${contact}`);
    } catch (error) {
      console.error("Resend reset OTP error:", error);

      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to resend OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!password) {
      setMessage("Please enter a new password.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await axios.post(
        "/api/auth/forgot_password",
        {
          method,
          contact,
          otp,
          password,
          verificationToken: verifiedToken,
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to reset password."
        );
      }

      setMessage("Password reset successfully!");

      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (error) {
      console.error("Reset password error:", error);

      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  // Back navigation
  const handleBack = () => {
    if (step === "otp") {
      setStep("contact");
      setOtp("");
      setMessage("");
      setResendTimer(0);
      return;
    }

    if (step === "password") {
      setStep("otp");
      setPassword("");
      setConfirmPassword("");
      setMessage("");
    }
  };

  const handleLogin = () => router.push("/login");

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <CardHeader className={styles.cardHeader}>
          <CardTitle className={styles.title}>
            Forgot Password?
          </CardTitle>

          <CardDescription className={styles.description}>
            {step === "contact" &&
              "Enter your email or phone number to reset your password."}
            {step === "otp" &&
              "Enter the OTP sent to your email or phone."}
            {step === "password" &&
              "Create a new password for your account."}
          </CardDescription>
        </CardHeader>

        <CardContent className={styles.cardContent}>
          {step === "contact" && (
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
                  Email
                </TabsTrigger>

                <TabsTrigger
                  value="phone"
                  className={`${styles.tab} ${
                    method === "phone" ? styles.activeTab : ""
                  }`}
                >
                  Phone
                </TabsTrigger>
              </TabsList>

              {/* Email form */}
              <TabsContent
                value="email"
                className={styles.tabsContent}
              >
                <form
                  onSubmit={handleSendOTP}
                  className={styles.form}
                >
                  <div className={styles.formGroup}>
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="Enter your email"
                      value={contact}
                      onChange={(event) =>
                        setContact(event.target.value)
                      }
                      required
                    />
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

              {/* Phone form */}
              <TabsContent
                value="phone"
                className={styles.tabsContent}
              >
                <form
                  onSubmit={handleSendOTP}
                  className={styles.form}
                >
                  <div className={styles.formGroup}>
                    <Label htmlFor="country-select">Country</Label>
                    <Select
                      inputId="country-select"
                      options={countryOptions}
                      value={selectedCountryOption}
                      onChange={handleCountryChange}
                      isSearchable
                      placeholder="Select country"
                      classNamePrefix="country-select"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <Label htmlFor="phone-number">
                      Phone Number
                    </Label>

                    <div className={styles.phoneInputRow}>
                      <div className={styles.countryCode}>
                        {selectedCountryOption?.dialCode || "+91"}
                      </div>

                      <Input
                        id="phone-number"
                        type="tel"
                        inputMode="numeric"
                        placeholder="9876543210"
                        value={phoneNumber}
                        onChange={(event) => {
                          const value =
                            event.target.value.replace(/\D/g, "");

                          setPhoneNumber(value);
                          setContact(
                            value && selectedCountryOption
                              ? `${selectedCountryOption.dialCode}${value}`
                              : ""
                          );
                        }}
                        required
                      />
                    </div>

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
                    disabled={
                      loading ||
                      !phoneNumber ||
                      !selectedCountryOption
                    }
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {/* OTP verification */}
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
                <Label htmlFor="otp-input">Enter OTP</Label>
                <Input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Enter 4-digit OTP"
                  value={otp}
                  className={styles.otpInput}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, ""))
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
                onClick={handleBack}
              >
                Change {method === "email" ? "Email" : "Phone"}
              </Button>
            </div>
          )}

          {/* New password */}
          {step === "password" && (
            <form
              onSubmit={handleResetPassword}
              className={styles.form}
            >
              <div className={styles.verifiedBox}>
                ✓ {method === "email" ? "Email" : "Phone"} verified
              </div>

              <div className={styles.formGroup}>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <Label htmlFor="confirm-password">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  required
                />
              </div>

              <Button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className={styles.secondaryButton}
                onClick={handleBack}
              >
                Back
              </Button>
            </form>
          )}

          {message && (
            <p
              role="status"
              aria-live="polite"
              className={styles.message}
            >
              {message}
            </p>
          )}

          <div className={styles.loginSection}>
            <span>Remember your password?</span>
            <button
              type="button"
              className={styles.loginButton}
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

export default Forget_password;
