"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import LoadingAnimation from "../../components/load/LoadingAnimation";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkUser = async () => {
      try {
        const userId = localStorage.getItem("userId");

        // Redirect users who are not logged in.
        if (!userId) {
          router.replace("/login");
          return;
        }

        // POST matches the API route's exported method.
        const response = await axios.post(
          "/api/auth/update-timeViewCount",
          { userId }
        );

        if (cancelled) return;

        if (response.data.success) {
          localStorage.setItem(
            "todayViewCount",
            String(response.data.todayViewCount)
          );
        }
      } catch (error) {
        if (cancelled) return;

        console.log(
          "Failed to update today's view count:",
          error.response?.data || error.message
        );
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    checkUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (isChecking) {
    return <LoadingAnimation />;
  }

  return children;
}