"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useActiveUser } from "@/utils/useActiveUser";

export function DownloadPdfLink({
  version = "phase3-v1-wes",
  label = "Download PDF",
  className = "",
}: {
  version?: string;
  label?: string;
  className?: string;
}) {
  const user = useActiveUser();
  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (user) params.set("user", user);
    if (version) params.set("version", version);
    const qs = params.toString();
    return `/api/report${qs ? `?${qs}` : ""}`;
  }, [user, version]);

  return (
    <Link href={href} className={className} prefetch={false}>
      {label}
    </Link>
  );
}
