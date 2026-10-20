"use client";

import {
  MyContextProvider,
} from "@/components/myContext/MyContext";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

import PresenceManager from "@/components/presence/PresenceManager";

import CommunicationManager from "@/components/communication/CommunicationManager";
// import DebugConsole from "@/components/DebugConsole";

import FCMManager from "@/components/communication/FCMManager";

import GlobalCommunicationUI from "@/components/communication/GlobalCommunicationUI";

export default function ProtectedLayout({
  children,
}) {
  return (
    <ProtectedRoute>
      <MyContextProvider>
        <CommunicationManager>
          <FCMManager>
            <PresenceManager>
              <GlobalCommunicationUI>
                {children}
                {/* <DebugConsole /> */}
              </GlobalCommunicationUI>
            </PresenceManager>
          </FCMManager>
        </CommunicationManager>
      </MyContextProvider>
    </ProtectedRoute>
  );
}