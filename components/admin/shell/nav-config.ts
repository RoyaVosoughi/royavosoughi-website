/**
 * Admin navigation: seven sections (the icon rail), each with its pages
 * (the tab bar). Shared by the spatial shell and the Overview page.
 */

export type NavLabelKey =
  | "linkDashboard"
  | "linkKnowledgeBase"
  | "linkPersonaModels"
  | "linkPlayground"
  | "linkInbox"
  | "linkHandoffs"
  | "linkLeads"
  | "linkRegistrations"
  | "linkServiceRequests"
  | "linkFeedback"
  | "linkContacts"
  | "linkIdentities"
  | "linkCompanies"
  | "linkDeals"
  | "linkActivities"
  | "linkProposals"
  | "linkContracts"
  | "linkCampaigns"
  | "linkCrmReports"
  | "linkAssistant"
  | "linkBlog"
  | "linkBlogStudio"
  | "linkChannels"
  | "linkBroadcast"
  | "linkTeam"
  | "linkAuditLog"
  | "linkSecurity";

export type GroupKey = "groupOverview" | "groupContent" | "groupKnowledgeAi" | "groupInboxPeople" | "groupCrm" | "groupChannels" | "groupSystem";

export type GroupIcon = "home" | "pen" | "spark" | "inbox" | "people" | "broadcast" | "gear";

export interface NavGroup {
  key: GroupKey;
  icon: GroupIcon;
  links: Array<{ href: string; labelKey: NavLabelKey }>;
}

export const GROUPS: NavGroup[] = [
  { key: "groupOverview", icon: "home", links: [{ href: "/admin", labelKey: "linkDashboard" }] },
  {
    key: "groupContent",
    icon: "pen",
    links: [
      { href: "/admin/blog", labelKey: "linkBlog" },
      { href: "/admin/blog/studio", labelKey: "linkBlogStudio" },
    ],
  },
  {
    key: "groupKnowledgeAi",
    icon: "spark",
    links: [
      { href: "/admin/knowledge", labelKey: "linkKnowledgeBase" },
      { href: "/admin/settings", labelKey: "linkPersonaModels" },
      { href: "/admin/playground", labelKey: "linkPlayground" },
    ],
  },
  {
    key: "groupInboxPeople",
    icon: "inbox",
    links: [
      { href: "/admin/conversations", labelKey: "linkInbox" },
      { href: "/admin/handoffs", labelKey: "linkHandoffs" },
      { href: "/admin/requests", labelKey: "linkServiceRequests" },
      { href: "/admin/registrations", labelKey: "linkRegistrations" },
      { href: "/admin/feedback", labelKey: "linkFeedback" },
      { href: "/admin/identities", labelKey: "linkIdentities" },
    ],
  },
  {
    key: "groupCrm",
    icon: "people",
    links: [
      { href: "/admin/leads", labelKey: "linkLeads" },
      { href: "/admin/contacts", labelKey: "linkContacts" },
      { href: "/admin/companies", labelKey: "linkCompanies" },
      { href: "/admin/deals", labelKey: "linkDeals" },
      { href: "/admin/activities", labelKey: "linkActivities" },
      { href: "/admin/proposals", labelKey: "linkProposals" },
      { href: "/admin/contracts", labelKey: "linkContracts" },
      { href: "/admin/campaigns", labelKey: "linkCampaigns" },
      { href: "/admin/reports", labelKey: "linkCrmReports" },
      { href: "/admin/assistant", labelKey: "linkAssistant" },
    ],
  },
  {
    key: "groupChannels",
    icon: "broadcast",
    links: [
      { href: "/admin/channels", labelKey: "linkChannels" },
      { href: "/admin/broadcast", labelKey: "linkBroadcast" },
    ],
  },
  {
    key: "groupSystem",
    icon: "gear",
    links: [
      { href: "/admin/team", labelKey: "linkTeam" },
      { href: "/admin/audit-log", labelKey: "linkAuditLog" },
      { href: "/admin/security", labelKey: "linkSecurity" },
    ],
  },
];

const ALL_HREFS = GROUPS.flatMap((g) => g.links.map((l) => l.href));

function matches(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Most specific link wins: /admin/blog/studio lights up "Blog studio", not "Blog" as well. */
export function isActiveLink(pathname: string, href: string): boolean {
  return matches(pathname, href) && !ALL_HREFS.some((other) => other.length > href.length && other.startsWith(href) && matches(pathname, other));
}

/** The section a path belongs to — falls back to Overview for unknown admin paths. */
export function groupForPath(pathname: string): NavGroup {
  return GROUPS.find((g) => g.links.some((l) => isActiveLink(pathname, l.href))) ?? GROUPS[0];
}
