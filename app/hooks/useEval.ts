import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useEval(version = "phase3-v1", segment = "all") {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/eval/${version}/metrics?segment=${segment}`,
    fetcher,
    { refreshInterval: 15000 } // 15s polling
  );
  return { data, error, isLoading, refresh: mutate };
}

