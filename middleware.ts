import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "./i18n/routing";
import { refreshAuthSession } from "./lib/auth/middleware";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  return refreshAuthSession(request, response);
}

export const config = {
  // Run on everything except API routes, the internal admin panel (its own
  // English-only tree outside [locale] — see app/admin/layout.tsx), the
  // client-facing proposal/contract pages (their language comes from the
  // document itself, not the URL — see app/(documents)/layout.tsx), Next
  // internals, and files with an extension (images, svg, robots.txt, …).
  matcher: ["/((?!api|admin|proposal/|contract/|_next|_vercel|.*\\..*).*)"],
};
