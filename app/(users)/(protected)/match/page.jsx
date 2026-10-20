"use client";

import {
  useContext,
  useEffect,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import Profile from "@/components/profile/Profile";
import Matching from "@/components/matching/Matching";

import { MyContext } from "@/components/myContext/MyContext";

import styles from "./Match.module.css";

const Match = () => {
  const searchParams = useSearchParams();

  const {
    setMessageUserId,
    setIsMessageBox,
  } = useContext(MyContext);

  useEffect(() => {
    const userId =
      searchParams.get("messageUserId");

    if (!userId) {
      return;
    }

    console.log(
      "Opening chat from notification:",
      userId
    );

    setMessageUserId(userId);
    setIsMessageBox(true);
  }, [
    searchParams,
    setMessageUserId,
    setIsMessageBox,
  ]);

  return (
    <main className={styles.matchPage}>

      {/* Left 20% */}

      <section
        className={styles.profileSection}
      >
        <Profile />
      </section>

      {/* Right 80% */}

      <section
        className={styles.matchingSection}
      >
        <Matching />
      </section>

    </main>
  );
};

export default Match;