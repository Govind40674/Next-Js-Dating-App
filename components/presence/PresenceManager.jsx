"use client";

import { useEffect } from "react";
import { setOnlineStatus } from "@/lib/presence";

export default function PresenceManager({
children,
}) {
useEffect(() => {
/*
* =====================================================
* USER COMES ONLINE
* =====================================================
*/


setOnlineStatus(true);

/*
 * =====================================================
 * USER GOES OFFLINE
 * =====================================================
 *
 * beforeunload is useful when the browser/page
 * is being closed or refreshed.
 */

const handleBeforeUnload = () => {
  setOnlineStatus(false);
};

window.addEventListener(
  "beforeunload",
  handleBeforeUnload
);

/*
 * =====================================================
 * CLEANUP
 * =====================================================
 */

return () => {
  setOnlineStatus(false);

  window.removeEventListener(
    "beforeunload",
    handleBeforeUnload
  );
};


}, []);

return children;
}
