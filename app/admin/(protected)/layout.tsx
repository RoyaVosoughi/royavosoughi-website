import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminFrame } from "@/components/admin/AdminFrame";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin/auth";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifySessionToken(token)) {
    redirect("/admin/login");
  }

  return <AdminFrame>{children}</AdminFrame>;
}
