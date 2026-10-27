"use client";

import React, { useContext } from "react";
import styles from "./ProfileBack.module.css";
import { Button } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { setOnlineStatus } from "@/lib/presence";
import { MyContext } from "../../myContext/MyContext";
import { HandCoins } from "lucide-react";

const ProfileBack = () => {
  const router = useRouter();

  const {
    setIsMessageBox,
    setIsMatchBox,
    setIsMatching,
    setIsEditpage,
    setIsProfilepage,
    setPaymentKind,
    setIsPayment,
  } = useContext(MyContext);

  const handleLogout = async () => {
    try {
      await setOnlineStatus(false);
    } catch (error) {
      console.log("Error updating online status:", error);
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
    setIsPayment(false);
  };

  const handleOwnProfile = () => {
    setIsMessageBox(false);
    setIsMatchBox(false);
    setIsMatching(false);
    setIsEditpage(false);
    setIsProfilepage(true);
    setIsPayment(false);
  };

  const handlePayment = (kind) => {
    setIsMessageBox(false);
    setIsMatchBox(false);
    setIsMatching(false);
    setIsEditpage(false);
    setIsProfilepage(false);
    setPaymentKind(kind);
    setIsPayment(true);
  };

  return (
    <section className={styles.profileSection}>
      {/* Only these buttons scroll */}
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
          <span>Profile</span>
        </Button>

        <Button
          className={`${styles.button} ${styles.normalpayment}`}
          onPress={() => handlePayment("Classic")}
          aria-label="Select Classic plan"
        >
          <span className={styles.buttonIcon}>Classic Plan</span>
          <span>
            <HandCoins />
          </span>
        </Button>

        <Button
          className={`${styles.button} ${styles.premiumpayment}`}
          onPress={() => handlePayment("Prestige")}
          aria-label="Select Prestige plan"
        >
          <span className={styles.buttonIcon}>Prestige Plan</span>
          <span>
            <HandCoins />
          </span>
        </Button>
      </div>

      {/* This stays at the bottom while the buttons above scroll */}
      <div className={styles.logoutFooter}>
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