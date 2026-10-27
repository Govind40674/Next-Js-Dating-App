"use client";

import React, { useRef, useState } from "react";
import axios from "axios";
import styles from "./Razorpayment.module.css";

const PAYMENT_PLANS = {
  Classic: {
    title: "Classic",
    description: "Standard plan",
    monthlyPrice: 99,
    features: [
      "Access to standard features",
      "Standard profile experience",
      "Subscription expiry tracked in your profile",
    ],
  },

  Prestige: {
    title: "Prestige",
    description: "Premium plan",
    monthlyPrice: 499,
    features: [
      "Includes standard plan features",
      "Access to premium-only features",
      "Subscription expiry tracked in your profile",
    ],
  },
};

const MONTH_OPTIONS = [1, 3, 6, 12];

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay is only available in the browser."));
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      if (window.Razorpay) {
        resolve(true);
      } else {
        reject(new Error("Razorpay Checkout failed to initialize."));
      }
    };

    script.onerror = () => {
      reject(new Error("Unable to load Razorpay Checkout."));
    };

    document.body.appendChild(script);
  });

const Razorpayment = ({ kind }) => {
  const [months, setMonths] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const paymentLockRef = useRef(false);
  const paymentCompletedRef = useRef(false);

  const plan = PAYMENT_PLANS[kind];

  const totalPrice = plan ? plan.monthlyPrice * months : 0;

  const handlePayment = async () => {
    if (!plan || paymentLockRef.current || !MONTH_OPTIONS.includes(months)) {
      return;
    }

    // This matches the userId key used in your existing code.
    const userId = localStorage.getItem("userId");

    if (!userId) {
      setErrorMessage("Please log in before making a payment.");
      return;
    }

    paymentLockRef.current = true;
    paymentCompletedRef.current = false;

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await loadRazorpayScript();

      // The server calculates the actual amount.
      const { data: orderData } = await axios.post(
        "/api/payment/create-order",
        {
          kind,
          months,
          userId,
        },
      );

      const { keyId, orderId, amount, currency, name, description } = orderData;

      if (!keyId || !orderId || !amount || !currency) {
        throw new Error("The server returned incomplete order details.");
      }

      const checkout = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: name || "DatingApp",
        description: description || `${plan.title} - ${months} month(s)`,

        theme: {
          color: "#7c3aed",
        },

        handler: async (paymentResponse) => {
          paymentCompletedRef.current = true;

          try {
            const { data: result } = await axios.post(
              "/api/profile_controller/update-payment",
              {
                kind,
                months,
                userId,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              },
            );

            const expiryText = result.expiresAt
              ? new Date(result.expiresAt).toLocaleDateString()
              : "";

            setSuccessMessage(
              `${plan.title} activated for ${months} month(s).` +
                (expiryText ? ` Valid until ${expiryText}.` : ""),
            );
            localStorage.setItem("isVIP", result.isVIP ?? false);
            localStorage.setItem("isPremium", result.isPremium ?? false);
            // } catch (error) {
            //   console.log(
            //     "Payment succeeded, but subscription confirmation failed:",
            //     error,
            //   );

            //   setErrorMessage(
            //     "Razorpay returned a successful payment, but your subscription could not be confirmed. Save payment ID " +
            //       paymentResponse.razorpay_payment_id +
            //       " and contact support. Do not pay again until the payment status is checked.",
            //   );
            // } finally {
            //   setIsLoading(false);
            //   paymentLockRef.current = false;
            // }
          } catch (error) {
            const serverMessage =
              error?.response?.data?.message ||
              error?.message ||
              "Unknown error";

            console.error("SUBSCRIPTION UPDATE FAILED:", {
              status: error?.response?.status,
              response: error?.response?.data,
              message: error?.message,
              paymentId: paymentResponse.razorpay_payment_id,
              orderId: paymentResponse.razorpay_order_id,
            });

            setErrorMessage(
              `Payment succeeded, but your subscription was not confirmed. ` +
                `${serverMessage} ` +
                `Payment ID: ${paymentResponse.razorpay_payment_id}. ` +
                `Do not pay again until the payment status is checked.`,
            );
          } finally {
            setIsLoading(false);
            paymentLockRef.current = false;
          }
        },

        modal: {
          ondismiss: () => {
            if (!paymentCompletedRef.current) {
              setIsLoading(false);
              paymentLockRef.current = false;
            }
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        const failure = response?.error || {};

        // Get the actual error returned by Razorpay.
        console.log("RAZORPAY PAYMENT FAILURE:", {
          code: failure.code,
          description: failure.description,
          source: failure.source,
          step: failure.step,
          reason: failure.reason,
          metadata: failure.metadata,
        });

        setErrorMessage(
          `${failure.description || "Payment failed."} ` +
            `Code: ${failure.code || "unknown"}. ` +
            `Reason: ${failure.reason || "unknown"}.`,
        );

        setIsLoading(false);
        paymentLockRef.current = false;
      });

      checkout.open();
    } catch (error) {
      console.error("Unable to start payment:", error);

      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to start payment. Please try again.",
      );

      setIsLoading(false);
      paymentLockRef.current = false;
    }
  };

  if (!plan) {
    return (
      <section className={styles.paymentPage}>
        <div className={styles.messageCard}>
          <h2>No payment plan selected</h2>
          <p>Please select Normal Payment or Premium Payment.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.paymentPage}>
      <div className={styles.paymentCard}>
        <div className={styles.planHeader}>
          <span className={styles.planLabel}>
            {kind === "Prestige" ? "PREMIUM PLAN" : "STANDARD PLAN"}
          </span>

          <h2 className={styles.planTitle}>{plan.title}</h2>

          <p className={styles.planDescription}>{plan.description}</p>
        </div>

        <div className={styles.monthSelector}>
          <label htmlFor="subscriptionMonths">
            Select subscription duration
          </label>

          <select
            id="subscriptionMonths"
            value={months}
            onChange={(event) => {
              setMonths(Number(event.target.value));
              setErrorMessage("");
              setSuccessMessage("");
            }}
            disabled={isLoading}
          >
            {MONTH_OPTIONS.map((month) => (
              <option key={month} value={month}>
                {month} {month === 1 ? "Month" : "Months"}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.priceSection}>
          <div className={styles.monthlyPrice}>
            ₹{plan.monthlyPrice.toLocaleString("en-IN")} per month
          </div>

          <div className={styles.totalPrice}>
            <span className={styles.currency}>₹</span>
            <span className={styles.price}>
              {totalPrice.toLocaleString("en-IN")}
            </span>
          </div>

          <p className={styles.priceNote}>
            Total for {months} {months === 1 ? "month" : "months"}
          </p>
        </div>

        <div className={styles.featureSection}>
          <h3>What&apos;s included?</h3>

          <ul className={styles.featureList}>
            {plan.features.map((feature, index) => (
              <li key={`${kind}-${index}`} className={styles.featureItem}>
                <span className={styles.checkmark}>✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className={styles.payButton}
          onClick={handlePayment}
          disabled={isLoading}
        >
          {isLoading
            ? "Processing..."
            : `Pay ₹${totalPrice.toLocaleString("en-IN")}`}
        </button>

        <p className={styles.secureText}>Secure payment powered by Razorpay</p>

        {errorMessage && (
          <div className={styles.errorMessage} role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className={styles.successMessage} role="status">
            {successMessage}
          </div>
        )}
      </div>
    </section>
  );
};

export default Razorpayment;
