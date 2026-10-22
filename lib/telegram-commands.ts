/**
 * The bot's command menu (the "/" button in Telegram), in display order.
 * Plain module, no "server-only", so scripts/telegram-set-webhook.ts can
 * import it too. Telegram picks the list matching the user's app language
 * and falls back to the default (English) one.
 */
export const TELEGRAM_COMMANDS = {
  en: [
    { command: "start", description: "Start the bot" },
    { command: "help", description: "How to use the bot" },
    { command: "reset", description: "Clear the conversation and start fresh" },
    { command: "language", description: "Change language (English / فارسی)" },
    { command: "website", description: "Open Roya's website" },
  ],
  fa: [
    { command: "start", description: "شروع ربات" },
    { command: "help", description: "راهنمای استفاده" },
    { command: "reset", description: "پاک‌کردن گفتگو و شروع تازه" },
    { command: "language", description: "تغییر زبان (English / فارسی)" },
    { command: "website", description: "رفتن به وب‌سایت رویا" },
  ],
};

/** Sets the default (English) menu plus the Persian one for users whose Telegram is in Persian. */
export async function setTelegramCommands(apiBase: string): Promise<boolean> {
  const calls = [
    { commands: TELEGRAM_COMMANDS.en },
    { commands: TELEGRAM_COMMANDS.fa, language_code: "fa" },
  ].map(async (body) => {
    const response = await fetch(`${apiBase}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { ok: boolean };
    return data.ok;
  });
  return (await Promise.all(calls)).every(Boolean);
}
