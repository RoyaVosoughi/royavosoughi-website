import { EmptyState } from "@/components/admin/EmptyState";
import { SpatialOverview, type SpatialChannel } from "@/components/admin/spatial/SpatialOverview";
import { getAdminLocale, getAdminTranslator } from "@/lib/admin/i18n/server";
import { getAnalytics } from "@/lib/admin/analytics";
import { getActivitiesWithContact, getConversationMessages, getConversations, getDashboardStats } from "@/lib/admin/queries";
import { getModelCatalogEntry } from "@/lib/ai/model-catalog";
import { getAllModelConfigs } from "@/lib/ai/model-config";
import type { Channel } from "@/lib/ai/types";
import { isSupabaseServiceConfigured } from "@/lib/supabase-admin";

export const metadata = { title: "Overview · Admin" };

const RANGE_OPTIONS = [7, 30, 90];
const CHANNELS: Channel[] = ["web", "telegram", "widget"];

/** Latest conversation on a channel plus its last few user/assistant turns, for the live tile. */
async function getLatest(channel: Channel): Promise<SpatialChannel["latest"]> {
  const [convo] = await getConversations({ channel }, 1);
  if (!convo) return null;
  const messages = await getConversationMessages(convo.id);
  return {
    id: convo.id,
    lastActiveAt: convo.lastActiveAt,
    who: convo.leadEmail ?? convo.externalUserId.slice(-4),
    isEmail: Boolean(convo.leadEmail),
    messages: messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-8)
      .map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content.length > 280 ? `${m.content.slice(0, 277)}…` : m.content,
      })),
  };
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const t = await getAdminTranslator("dashboard");

  if (!isSupabaseServiceConfigured()) {
    return (
      <div className="px-5 py-10 lg:px-10">
        <EmptyState title={t("notConfiguredTitle")} body={t("notConfiguredBody")} />
      </div>
    );
  }

  const { days: daysParam } = await searchParams;
  const days = RANGE_OPTIONS.includes(Number(daysParam)) ? Number(daysParam) : 30;

  const [stats, analytics, overdue, locale, modelConfigs, latest] = await Promise.all([
    getDashboardStats(),
    getAnalytics(days),
    getActivitiesWithContact({ overdueOnly: true }, 6).catch(() => []),
    getAdminLocale(),
    getAllModelConfigs(),
    Promise.all(CHANNELS.map((c) => getLatest(c).catch(() => null))),
  ]);

  const channels: SpatialChannel[] = CHANNELS.map((channel, i) => {
    const config = modelConfigs.find((c) => c.channel === channel) ?? modelConfigs[0];
    return {
      channel,
      conversations: analytics.sessionsByChannel[channel] ?? 0,
      model: {
        activeModel: config.activeModel,
        label: getModelCatalogEntry(config.activeModel)?.label ?? config.activeModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        fallbackModel: config.fallbackModel,
        schedule: config.schedule,
      },
      latest: latest[i],
    };
  });

  return (
    <SpatialOverview
      days={days}
      locale={locale}
      channels={channels}
      stats={stats}
      analytics={analytics}
      overdue={overdue.map((a) => ({ id: a.id, subject: a.subject, contactId: a.contactId, contactName: a.contactName, dueAt: a.dueAt }))}
    />
  );
}
