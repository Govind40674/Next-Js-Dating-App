"use client";

import React, { useContext } from "react";
import styles from "./ProfileBack.module.css";
import { Button } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { setOnlineStatus } from "@/lib/presence";
import { MyContext } from "../../myContext/MyContext";

const ProfileBack = () => {
  const router = useRouter();

  const {
    setIsMessageBox,
    setIsMatchBox,
    setIsMatching,
    setIsEditpage,
    setIsProfilepage,
  } = useContext(MyContext);

  const handleLogout = async () => {
    try {
      await setOnlineStatus(false);
    } catch (error) {
      console.error("Error updating online status:", error);
    } finally {
      localStorage.clear();
      router.push("/login");
    }
  };

  const handleEditProfile = () => {
    setIsMessageBox(false);
    setIsMatchBox(false);
    setIsMatching(false);
    setIsEditpage(true);
    setIsProfilepage(false);
  };

  const handleOwnProfile = () => {
    setIsMessageBox(false);
    setIsMatchBox(false);
    setIsMatching(false);
    setIsEditpage(false);
    setIsProfilepage(true);
  };

  return (
    <section className={styles.profileSection}>
  

      <div className={styles.buttonGroup}>
        <Button
          className={`${styles.button} ${styles.editButton}`}
          onPress={handleEditProfile}
          aria-label="Edit profile"
        >
          <span className={styles.buttonIcon}>✎</span>
          <span>Edit Profile</span>
        </Button>

        <Button
          className={`${styles.button} ${styles.ownProfileButton}`}
          onPress={handleOwnProfile}
          aria-label="View own profile"
        >
          <span className={styles.buttonIcon}>♙</span>
          <span>Own Profile</span>
        </Button>

        <Button
          className={`${styles.button} ${styles.logoutButton}`}
          onPress={handleLogout}
          aria-label="Log out"
        >
          <span className={styles.buttonIcon}>↪</span>
          <span>Log Out</span>
        </Button>
      </div>
    </section>
  );
};

export default ProfileBack;