"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./ProfileHeader.module.css";
import { Camera, Pencil } from "lucide-react";
import {useContext} from "react";
import { MyContext } from "@/components/myContext/MyContext";

const ProfileHeader = ({ user, setIsFront,isFront}) => {

  const {isMatching, setIsMatching,setIsMatchBox,setIsMessageBox,setIsEditpage,setIsProfilepage} = useContext(MyContext);

  const handleClick = () => {
    if(!isMatching){
      setIsMatching(true);
      setIsMatchBox(false);
      setIsMessageBox(false);
      setIsEditpage(false);
      setIsProfilepage(false);
      // setIsFront(!isFront);
    }else{
      setIsFront(!isFront);
    }

  }



  return (
    <div className={styles.container}>
      <Image
        src={user?.photo?.[0] || "/default.png"}
        alt={user?.name || "User"}
        width={100}
        height={100}
        className={styles.avatar}
        onClick={handleClick}
      />

      <div className={styles.link}>
        <Link href="/profile">
          <Camera />
        </Link>

        <Link href="/profile/edit">
          <Pencil />
        </Link>
      </div>
    </div>
  );
};

export default ProfileHeader;