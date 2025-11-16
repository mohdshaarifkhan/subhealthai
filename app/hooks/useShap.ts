import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useShap(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/shap/${userId}/series`,
    fetcher,
    { refreshInterval: 15000 } // 15s polling
  );
  return { data, error, isLoading, refresh: mutate };
}

