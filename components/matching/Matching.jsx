"use client";

import React from "react";

import Matching_profile from "./Matching_profile";
import {useContext} from "react";

import {MyContext} from "../myContext/MyContext";
import PrivateMessage from "../message/PrivateMessage";
import OtherProfile from "../otherProfile/OtherProfile";
import ProfileCmpln from "../profileCmpln/ProfileCmpln";
import OwnProfile from "../ownProfile/OwnProfile";


// import PrivateMessage from "../private-message/PrivateMessage";


const Matching = () => {
  const {isMessageBox, messageUserId,isMatchBox, matchUserId, isEditpage,isProfilepage} = useContext(MyContext);
  if(isMessageBox) {
    
     return <PrivateMessage messageUserId={messageUserId}/>
  }

  if(isMatchBox) {
    return <OtherProfile matchUserId={matchUserId}/>;
  }
  if(isEditpage){
    return <ProfileCmpln/>
  }
  if(isProfilepage){
    return <OwnProfile/>
  }

  return <Matching_profile />;
};

export default React.memo(Matching); // Use React.memo to optimize Matching;