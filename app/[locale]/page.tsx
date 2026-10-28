import { setRequestLocale } from "next-intl/server";

import { AboutTeaser } from "@/components/sections/AboutTeaser";
import { ChecklistTeaser } from "@/components/sections/ChecklistTeaser";
import { CtaBand } from "@/components/sections/CtaBand";
import { Hero } from "@/components/sections/Hero";
import { Process } from "@/components/sections/Process";
import { Projects } from "@/components/sections/Projects";
import { Proof } from "@/components/sections/Proof";
import { Story } from "@/components/sections/Story";
import { Services } from "@/components/sections/Services";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <Story />
      <Proof />
      <ChecklistTeaser />
      <Services />
      <Process />
      <Projects />
      <AboutTeaser />
      <CtaBand />
    </>
  );
}
