import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Centred split card for auth pages: artwork on one half, form on the other.
 * The artwork is hidden below `lg` so the form keeps the full card on phones.
 * Uses logical sides, so in Farsi (RTL) the artwork moves to the right automatically.
 */
export function AuthSplitShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-canvas px-gutter py-12 text-ink md:py-20">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-ink/10 bg-paper lg:grid-cols-2">
        <div className="relative hidden min-h-[40rem] bg-night lg:block">
          <Image
            src="/auth/sign-in-art.png"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 32rem, 0px"
            className="object-cover"
          />
        </div>

        <div className="flex items-center justify-center px-6 py-10 sm:px-12 sm:py-14">
          <div className="w-full max-w-md">
            <header className="mb-8">
              <h1 className="text-section text-ink">{title}</h1>
              {intro ? <p className="mt-3 text-lg text-ink/70">{intro}</p> : null}
            </header>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
