"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import LoadingAnimation from "../../components/load/LoadingAnimation";

export default function PublicRoute({ children }) {
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    // if (userId) {
    //   // Already logged in: redirect to the matching page.
    //   router.replace("/match");
    // } else {
    //   // Not logged in: allow access to login/signup.
    //   setIsChecking(false);
    // }
    const check=async()=>{
      if(userId){
        await router.push("/match");
      }else{
        setIsChecking(false);
      }
    }
    check();


  }, [router]);

  // Display the animated loading screen while checking.
  if (isChecking) {
    return <LoadingAnimation />;
    // return <LoadingAnimation/>
   
  }

  return children;
}