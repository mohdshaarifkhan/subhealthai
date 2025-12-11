"use client";

import { useSearchParams } from "next/navigation";

export function useActiveUser() {
  const params = useSearchParams();
  return params.get("user") || null;
}
