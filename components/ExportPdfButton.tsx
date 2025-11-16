"use client";

import { useAppContext } from "@/utils/useAppContext";

export default function ExportPdfButton() {
  const { user, version, range } = useAppContext();
  const disabled = !user;

  const onClick = () => {
    if (disabled) return;
    const params = new URLSearchParams({ user, version, range });
    window.open(`/api/report?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded px-4 py-2 text-sm font-medium transition-colors ${
        disabled
          ? "cursor-not-allowed bg-gray-200 text-gray-500"
          : "bg-black text-white hover:bg-gray-900"
      }`}
      title={disabled ? "Select a user to export PDF" : "Export PDF"}
    >
      Export PDF
    </button>
  );
}
