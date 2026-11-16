import Link from "next/link";

import { BlogStudio } from "@/components/admin/BlogStudio";
import { EmptyState } from "@/components/admin/EmptyState";
import { getCurrentAdmin, roleAtLeast } from "@/lib/admin/auth";
import { isMissingTableError } from "@/lib/admin/crm-docs";
import { getAdminTranslator } from "@/lib/admin/i18n/server";
import { isWebResearchEnabled } from "@/lib/ai/blog-agents/agents/researcher";
import { listActiveLessons } from "@/lib/ai/blog-agents/lessons";
import { PIPELINE_MODEL, WRITER_MODEL } from "@/lib/ai/blog-agents/llm";
import { failStaleRuns, listRuns } from "@/lib/ai/blog-agents/store";
import type { AgentLesson, PipelineRun } from "@/lib/ai/blog-agents/types";
import { isSupabaseServiceConfigured } from "@/lib/supabase-admin";

export const metadata = { title: "Blog studio · Admin" };
export const dynamic = "force-dynamic";

export default async function BlogStudioPage() {
  const t = await getAdminTranslator("blogStudio");
  const tb = await getAdminTranslator("blogAdmin");
  const tc = await getAdminTranslator("crmDocs");

  if (!isSupabaseServiceConfigured()) {
    return <EmptyState title={tc("notConfiguredTitle")} body={tc("notConfiguredBody")} />;
  }

  let runs: PipelineRun[];
  let lessons: AgentLesson[];
  try {
    await failStaleRuns();
    [runs, lessons] = await Promise.all([listRuns(), listActiveLessons()]);
  } catch (err) {
    if (isMissingTableError(err)) return <EmptyState title={t("tableMissingTitle")} body={t("tableMissingBody")} />;
    throw err;
  }
  const admin = await getCurrentAdmin();

  return (
    <div>
      <Link href="/admin/blog" className="text-sm font-medium text-cobalt hover:underline">
        {tb("backLink")}
      </Link>
      <p className="label-eyebrow mt-6 text-cobalt">{t("eyebrow")}</p>
      <h1 className="text-section mt-3 text-ink">{t("title")}</h1>
      <p className="mt-3 max-w-3xl text-ink/70">{t("subtitle")}</p>
      <div className="mt-8">
        <BlogStudio
          initialRuns={runs}
          initialLessons={lessons}
          canEdit={Boolean(admin && roleAtLeast(admin.role, "editor"))}
          webResearch={isWebResearchEnabled()}
          models={{ pipeline: PIPELINE_MODEL, writer: WRITER_MODEL }}
        />
      </div>
    </div>
  );
}
