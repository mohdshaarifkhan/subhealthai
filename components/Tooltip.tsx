"use client";

import { ReactNode } from "react";

type TooltipProps = {
  content: string;
  children: ReactNode;
  className?: string;
};

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={`group relative inline-flex ${className ?? ""}`} tabIndex={0}>
      {children}
      <span className="pointer-events-none absolute -top-9 left-1/2 z-20 hidden -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-sm group-hover:flex group-focus-visible:flex">
        {content}
      </span>
    </span>
  );
}


