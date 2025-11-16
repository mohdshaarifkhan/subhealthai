"use client";

import { useSearchParams } from "next/navigation";

export function useReviewerMode() {
  const sp = useSearchParams();
  return sp?.get("reviewer") === "1";
}


