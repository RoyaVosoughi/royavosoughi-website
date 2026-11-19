"use client";

import type { ReactNode } from "react";

import { AdminShell } from "./shell/AdminShell";

/** Every protected admin page lives inside the spatial shell (sky, rail, glass window). */
export function AdminFrame({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
