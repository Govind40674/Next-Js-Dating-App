
"use client";

import { useContext, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import Profile from "@/components/profile/Profile";
import Matching from "@/components/matching/Matching";
import { MyContext } from "@/components/myContext/MyContext";
import styles from "./Match.module.css";

const Match = () => {
  const searchParams = useSearchParams();

  const { setMessageUserId, setIsMessageBox,setIsMatching} = useContext(MyContext);

  useEffect(() => {
    const messageUserId = searchParams.get("messageUserId");

    if (messageUserId) {
      setMessageUserId(messageUserId);
      setIsMessageBox(true);
      
      setIsMatching(false);
    }
  }, [searchParams, setMessageUserId, setIsMessageBox]);

  return (
    <main className={styles.matchPage}>
      <section className={styles.profileSection}>
        <Profile />
      </section>

      <section className={styles.matchingSection}>
        <Matching />
      </section>
    </main>
  );
};

export default Match;
