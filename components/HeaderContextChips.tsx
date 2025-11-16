"use client";

import { useAppContext } from "@/utils/useAppContext";

export default function HeaderContextChips() {
  const { user, dataset, version, range, baseUrl } = useAppContext();

  function copyLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(baseUrl).catch(() => {});
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-800">
        User: {user ? `${user.slice(0, 8)}…` : "none"}
      </span>
      <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
        Dataset: {dataset}
      </span>
      <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
        Version: {version}
      </span>
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
        Range: {range}
      </span>
      <button
        onClick={copyLink}
        className="ml-2 rounded border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-50"
        title="Copy a sharable link with current filters"
        type="button"
      >
        Copy link
      </button>
    </div>
  );
}
