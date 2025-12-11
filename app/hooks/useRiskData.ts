"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useRiskData(userId: string, version: string) {
  const shouldFetch = Boolean(userId);

  const { data: dash, error: dashError } = useSWR(
    shouldFetch ? `/api/dashboard?user=${encodeURIComponent(userId)}&version=${encodeURIComponent(version)}` : null,
    fetcher
  );

  const { data: exp, error: expError } = useSWR(
    shouldFetch ? `/api/explain?user=${encodeURIComponent(userId)}&version=${encodeURIComponent(version)}` : null,
    fetcher
  );

  return {
    dash,
    exp,
    loading: shouldFetch ? !dash || !exp : false,
    error: dashError ?? expError ?? null,
  };
}
