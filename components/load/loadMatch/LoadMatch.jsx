"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./LoadMatch.module.css";

const LoadMatch = () => {
const [profile_photo, setProfilePhoto] = useState("/default.png");

useEffect(() => {
const handle=async()=>{
  const photo = localStorage.getItem("profile_photo");


if (photo) {
  setProfilePhoto(photo);
}
}
handle();


}, []);

return ( <div className={styles.container}> <div className={styles.imageWrapper}> <Image
       src={profile_photo}
       alt="Loading match"
       fill
       priority
       sizes="100vw"
       className={styles.image}
     />


    <span className={styles.ripple}></span>
  </div>
</div>


);
};

export default LoadMatch;
