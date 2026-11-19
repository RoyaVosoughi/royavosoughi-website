"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AdminNav } from "./AdminNav";

/**
 * The Overview page (/admin) draws its own spatial shell (sky, icon rail,
 * channel tabs), so it skips the classic sidebar. Every other admin page keeps
 * the sidebar until the glass shell is rolled out to them too.
 */
export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh lg:flex">
      <AdminNav />
      <main className="min-w-0 flex-1 px-5 py-8 lg:ms-64 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
