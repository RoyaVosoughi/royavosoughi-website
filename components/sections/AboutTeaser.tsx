import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Personal intro in the style of a founder's "I'm …" section: an oversized
 * display name, a short note and one pill button on the left, with the photo
 * running edge to edge on the far side (start/end are logical, so it flips
 * in Persian). On phones the photo stacks on top as a full-width band.
 * Imagery rules: natural light, a real scene — never stock photography.
 * object-position is biased upward since the source is a full-body shot.
 */
export async function AboutTeaser() {
  const t = await getTranslations("about");

  return (
    <section id="about" className="relative overflow-hidden bg-mist text-ink">
      {/* Photo: full-bleed band on phones, edge-to-edge column from lg up */}
      <div className="relative h-[26rem] w-full sm:h-[32rem] lg:absolute lg:inset-y-0 lg:end-0 lg:h-auto lg:w-[44%]">
        <Image
          src="/photos/roya-about.jpg"
          alt={t("photoAlt")}
          fill
          sizes="(min-width: 1024px) 44vw, 100vw"
          className="object-cover"
          style={{ objectPosition: "50% 30%" }}
          priority
        />
      </div>

      <div className="container-page relative">
        <Reveal className="py-14 md:py-20 lg:w-[52%] lg:py-28">
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
