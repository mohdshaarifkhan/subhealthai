"use client";

import { useSearchParams } from "next/navigation";

const DEMO_USER = process.env.NEXT_PUBLIC_DEMO_USER_ID || "c1454b12-cd49-4ae7-8f4d-f261dcda3136";

export function useActiveUser() {
  const params = useSearchParams();
  return params.get("user") || DEMO_USER;
}
