"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const GoogleCallback = () => {
  const router = useRouter();

  const [message, setMessage] = useState("Signing you in with Google...");

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        const session = await getSession();

        console.log("Google session:", session);

        if (!session?.user?.id) {
          setMessage("Unable to find your account.");

          setTimeout(() => {
            router.push("/signup");
          }, 1500);

          return;
        }

        // -----------------------------------------
        // MongoDB User ID
        // -----------------------------------------

        const userId = session.user.id;
        const isVIP=session.user.isVIP;
        const todayViewCount=session.user.todayViewCount;


        // -----------------------------------------
        // Store user ID
        // -----------------------------------------

        localStorage.setItem("userId", userId);
        localStorage.setItem("isVIP", isVIP);
        localStorage.setItem("todayViewCount",todayViewCount);
        localStorage.setItem("profile_photo", session.user.image || "");
        localStorage.setItem("name", session.user.name || "");
        console.log("todayViewCount",localStorage.getItem("todayViewCount"));
        console.log( "isVIP",localStorage.getItem("isVIP"));


        // -----------------------------------------
        // Store email
        // -----------------------------------------

        if (session.user.email) {
          localStorage.setItem("userEmail", session.user.email);
        }

        // -----------------------------------------
        // Store name
        // -----------------------------------------

        if (session.user.name) {
          localStorage.setItem("userName", session.user.name);
        }

        console.log("Google user ID stored:", userId);

        setMessage("Login successful!");

        // -----------------------------------------
        // Go to match page
        // -----------------------------------------

        router.replace("/match");
      } catch (error) {
        console.error("Google callback error:", error);

        setMessage("Google login failed.");

        setTimeout(() => {
          router.push("/signup");
        }, 1500);
      }
    };

    handleGoogleCallback();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h2>{message}</h2>
    </div>
  );
};

export default GoogleCallback;
