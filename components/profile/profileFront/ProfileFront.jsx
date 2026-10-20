"use client";

import React, { useState } from "react";
import styles from "./ProfileFront.module.css";
import { Button } from "@nextui-org/react";
import ProfileMatch from "./profileMatch/ProfileMatch";
import Profile_message from "./profileMessage/Profile_message";

const ProfileFront = ({ user }) => {
  const [matchBox, setMatchBox] = useState(true);

  return (
    <div className={styles.frontContainer}>
      {/* Fixed Matches / Message tabs */}
      <div className={styles.tabContainer}>
        <Button
          className={`${styles.button} ${
            matchBox ? styles.activeButton : ""
          }`}
          onPress={() => {
            if (!matchBox) {
              setMatchBox(true);
            }
          }}
        >
          Matches
        </Button>

        <Button
          className={`${styles.button} ${
            !matchBox ? styles.activeButton : ""
          }`}
          onPress={() => {
            if (matchBox) {
              setMatchBox(false);
            }
          }}
        >
          Message
        </Button>
      </div>

      {/* Only this area scrolls */}
      <div className={styles.content}>
        {matchBox ? (
          <ProfileMatch user={user} />
        ) : (
          <Profile_message user={user} />
        )}
      </div>
    </div>
  );
};

export default ProfileFront;