import { AdminLocaleSwitcher } from "@/components/admin/AdminLocaleSwitcher";
import { LoginForm } from "@/components/admin/LoginForm";
import { AdminLoginShell } from "@/components/admin/shell/AdminShell";
import { isAdminConfigured } from "@/lib/admin/auth";
import { getAdminTranslator } from "@/lib/admin/i18n/server";

export default async function AdminLoginPage() {
  const t = await getAdminTranslator("login");

  if (!isAdminConfigured()) {
    return (
      <AdminLoginShell>
        <div className="text-center">
          <p className="font-display text-lg font-bold text-ink">{t("notConfiguredTitle")}</p>
          <p className="mt-2 text-ink/70">{t("notConfiguredBody")}</p>
        </div>
      </AdminLoginShell>
    );
  }

  return (
    <AdminLoginShell>
      <div className="w-full">
        <div className="flex items-center justify-between gap-3">
          <p className="label-eyebrow text-cobalt">{t("eyebrow")}</p>
          <AdminLocaleSwitcher className="rounded-full border-2 border-ink/15 px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-cobalt hover:text-cobalt" />
        </div>
        <h1 className="text-section mt-3 text-ink">{t("title")}</h1>
        <p className="mt-3 text-ink/70">{t("subtitle")}</p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </AdminLoginShell>
  );
}
