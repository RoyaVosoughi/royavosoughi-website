import { getLocale, getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { visibleProjects } from "@/content/projects";
import { site } from "@/lib/site";

export async function Projects() {
  const t = await getTranslations("projects");
  const locale = await getLocale();
  const items = visibleProjects();
  const copyFor = (p: (typeof items)[number]) =>
    locale === "fa" ? p.fa : p.en;

  return (
    <Section id="projects" tone="light">
      <Reveal>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          intro={t("intro")}
        />
      </Reveal>

      {items.length === 0 ? (
        /* Honest empty state. Better than inventing work that does not exist. */
        <Reveal
          delayMs={80}
          className="mt-12 rounded-2xl border border-dashed border-ink/20 bg-paper p-10 text-center"
        >
          <p className="mx-auto max-w-md text-lg text-ink/75">
            {t("emptyState")}
          </p>
          <a
            href={site.social.github}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-block font-semibold text-cobalt underline underline-offset-4 hover:text-ink"
          >
            {t("followGithub")}
          </a>
        </Reveal>
      ) : (
        <ul className="mt-14 grid gap-6 md:grid-cols-2">
          {items.map((project, i) => {
            const copy = copyFor(project);
            return (
              <li key={project.slug}>
                <Reveal
                  delayMs={80 + i * 80}
                  className="flex h-full flex-col rounded-2xl border border-ink/10 bg-paper p-8 transition-colors duration-200 hover:border-ink/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-ink/70">
                      {project.year}
                    </span>
                    {project.draft ? (
                      <span className="rounded-full bg-amber/20 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-deep">
                        DRAFT — dev only
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-3 text-2xl text-ink">{copy.title}</h3>
                  <p className="mt-3 text-ink/75">{copy.problem}</p>

                  <ul className="mt-5 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full border border-ink/10 px-3 py-1 font-mono text-xs text-ink/75"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 rounded-xl bg-mist/60 p-4 text-[0.9375rem] text-ink/80">
                    <span className="font-semibold text-cobalt">
                      {t("learnedLabel")}{" "}
                    </span>
                    {copy.learned}
                  </p>

                  <div className="mt-auto flex flex-wrap gap-5 pt-6">
                    {project.links.demo ? (
                      <a
                        href={project.links.demo}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-semibold text-cobalt underline underline-offset-4 hover:text-ink"
                      >
                        {t("liveDemo")} →
                      </a>
                    ) : null}
                    {project.links.github ? (
                      <a
                        href={project.links.github}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-semibold text-cobalt underline underline-offset-4 hover:text-ink"
                      >
                        {t("sourceCode")} →
                      </a>
                    ) : null}
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
