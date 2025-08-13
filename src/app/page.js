"use client"

import React from "react";
import AgeVerificationGuard from "../components/AgeVerificationGuard";
import WhiskeyCigarsStore from "../components/WhiskeyCigarsStore";

export default function Home() {
  return (
    <AgeVerificationGuard>
      <WhiskeyCigarsStore />
    </AgeVerificationGuard>
  );
}
