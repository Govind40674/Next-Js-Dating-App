"use client";

import React from "react";

import Matching_profile from "./Matching_profile";
import {useContext} from "react";

import {MyContext} from "../myContext/MyContext";
import PrivateMessage from "../message/PrivateMessage";
import OtherProfile from "../otherProfile/OtherProfile";

// import PrivateMessage from "../private-message/PrivateMessage";


const Matching = () => {
  const {isMessageBox, messageUserId,isMatchBox, matchUserId} = useContext(MyContext);
  if(isMessageBox) {
    
     return <PrivateMessage messageUserId={messageUserId}/>
  }

  if(isMatchBox) {
    return <OtherProfile matchUserId={matchUserId}/>;
  }

  return <Matching_profile />;
};

export default React.memo(Matching); // Use React.memo to optimize Matching;