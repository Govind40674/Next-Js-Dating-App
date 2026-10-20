"use client";

import {
  useContext,
} from "react";

import {
  MyContext,
} from "@/components/myContext/MyContext";

import IncomingCall from "@/components/communication/IncomingCall";

import ActiveCall from "@/components/communication/ActiveCall";

// import ZegoCall from "@/components/communication/ZegoCall";

function GlobalCommunicationUI({
  children,
}) {
  const {
    activeCall,
    // startActiveCall,
  } = useContext(MyContext);

  return (
    <>
      {children}

      <IncomingCall />




      {/* <ActiveCall /> */}
      {activeCall && (
        <ActiveCall/>
      )}
      

    </>
  );
}

export default GlobalCommunicationUI;