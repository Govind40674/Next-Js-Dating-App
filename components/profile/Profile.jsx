"use client";

import React, {
  useContext,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import { MyContext } from "../myContext/MyContext";


import styles from "./Profile.module.css";

import ProfileHeader from "./profileHeader/ProfileHeader";
import ProfileFront from "./profileFront/ProfileFront";
import ProfileBack from "./profileBack/ProfileBack";
import LoadProfile from "../load/loadProfile/LoadProfile";



const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { profileUpdate } = useContext(MyContext);
  const [isFront, setIsFront] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const initializeProfile = async () => {
      setLoading(true);

      try {
        const userId = localStorage.getItem("userId");

        if (!userId) {
          console.log("User ID not found in localStorage");

          if (!cancelled) {
            setUser(null);
            setLoading(false);
          }

          return;
        }

        const response = await axios.get(
          `/api/profile_controller/profile?userId=${userId}`
        );

        if (cancelled) {
          return;
        }

        if (
          response.data.success &&
          response.data.user
        ) {
          const fetchedUser = response.data.user;

          setUser(fetchedUser);


        } else {
          console.error("Failed to fetch profile");
          setUser(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Error initializing profile:",
            error
          );

          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeProfile();

    return () => {
      cancelled = true;
    };
  }, [profileUpdate]);

return (
  <div className={styles.profileContainer}>
    {loading ? (
      <LoadProfile/>
    ) : (
      <>
        <ProfileHeader
          user={user}
          setIsFront={setIsFront}
          isFront={isFront}
        />

        {isFront && <ProfileFront user={user} />}
        {!isFront && <ProfileBack  />}
      </>
    )}
  </div>
);
};

export default React.memo(Profile);