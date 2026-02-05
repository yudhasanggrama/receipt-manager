"use client";

import { Suspense } from "react"; // 1. Import Suspense
import LoginClient from "./LoginClient";

export default function Page() {
  return (
    // 2. Bungkus LoginClient dengan Suspense
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="animate-pulse text-emerald-600 font-medium">
          Loading...
        </div>
      </div>
    }>
      <LoginClient />
    </Suspense>
  );
}