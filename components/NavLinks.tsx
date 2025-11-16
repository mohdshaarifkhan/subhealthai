"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

function withParams(path: string, searchParams: URLSearchParams) {
  const url = new URL(path, "http://localhost");
  searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
}

export default function NavLinks() {
  const searchParams = useSearchParams();

  return (
    <nav className="space-y-2 text-sm">
      <Link href={withParams("/dashboard", searchParams)} className="block hover:underline">
        Overview
      </Link>
      <Link href={withParams("/weekly", searchParams)} className="block hover:underline">
        Weekly Note
      </Link>
    </nav>
  );
}
