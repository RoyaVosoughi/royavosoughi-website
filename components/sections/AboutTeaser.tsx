import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Personal intro in the style of a founder's "I'm …" section: an oversized
 * display name, a short note and one pill button on one side, with the photo
 * as a contained rounded card on the other (grid order is logical, so it
 * flips in Persian). On phones the card stacks on top of the text.
 * Imagery rules: natural light, a real scene — never stock photography.
 */
export async function AboutTeaser() {
  const t = await getTranslations("about");

  return (
    <section id="about" className="bg-mist text-ink">
      <div className="container-page grid items-center gap-10 py-14 md:py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
        {/* Photo card: first on phones, second (end side) from lg up */}
        <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2rem] lg:order-2 lg:max-w-none">
          <Image
            src="/photos/roya-about-gate.jpg"
            alt={t("photoAlt")}
            fill
            sizes="(min-width: 1024px) 45vw, (min-width: 448px) 448px, 100vw"
            className="object-cover"
            style={{ objectPosition: "62% 35%" }}
            priority
          />
        </div>

        <Reveal className="lg:order-1">
          <p className="label-eyebrow text-cobalt">{t("eyebrow")}</p>
          <h2 className="about-title mt-5 text-ink">{t("title")}</h2>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/80">{t("p1")}</p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/80">{t("p2")}</p>

          <Link
            href="/about"
            className="mt-10 inline-flex items-center justify-center rounded-full bg-ink px-8 py-4 text-base font-medium text-canvas transition-colors duration-200 hover:bg-cobalt hover:text-on-cobalt"
          >
            {t("readMore")}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
