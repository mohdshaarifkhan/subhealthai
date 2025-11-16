"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function UserSwitcher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("user") || "");

  function apply() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set("user", value);
    } else {
      url.searchParams.delete("user");
    }
    router.push(url.toString());
  }

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value.trim())}
        placeholder="Paste user UUID…"
        className="w-[280px] rounded border px-2 py-1 text-sm"
      />
      <button
        type="button"
        onClick={apply}
        className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
      >
        Load
      </button>
    </div>
  );
}
