"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function useAppContext() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const user = searchParams.get("user") || null;

  const version = searchParams.get("version") || "phase3-v1-wes";
  const range = searchParams.get("range") || "7d";

  const dataset = version.includes("wes")
    ? "WESAD"
    : version.includes("self")
    ? "Samsung (Personal)"
    : version.includes("naive")
    ? "Synthetic"
    : "—";

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    const url = new URL(window.location.origin + pathname);
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    if (user) url.searchParams.set("user", user);
    url.searchParams.set("version", version);
    url.searchParams.set("range", range);
    return url.toString();
  }, [searchParams, pathname, user, version, range]);

  return { user, version, range, dataset, baseUrl };
}
