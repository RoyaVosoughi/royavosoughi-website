import type { ReactNode } from "react";

/** Centred column shared by the sign-up / sign-in pages. */
export function AuthShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-canvas px-gutter pt-14 pb-24 text-ink md:pt-20 md:pb-32">
      <div className="mx-auto w-full max-w-[30rem]">
        <header className="mb-10 text-center">
          <p className="label-eyebrow text-cobalt">{eyebrow}</p>
          <h1 className="text-section mt-4 text-ink">{title}</h1>
          {intro ? <p className="mt-4 text-lg text-ink/75">{intro}</p> : null}
        </header>
        {children}
      </div>
    </section>
  );
}
