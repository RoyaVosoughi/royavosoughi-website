/**
 * Registers this site's /api/telegram/webhook with Telegram's Bot API.
 * Run once (and again any time the deployed URL changes):
 *
 *   npm run telegram:set-webhook -- https://your-deployed-site.example
 */
import { setTelegramCommands } from "../lib/telegram-commands";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const baseUrl = process.argv[2];

async function main() {
  if (!token || !secret) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET in .env.local.");
    process.exit(1);
  }
  if (!baseUrl) {
    console.error("Usage: npm run telegram:set-webhook -- <https://your-deployed-site>");
    process.exit(1);
  }

  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Same as registerTelegramWebhook in lib/telegram.ts — callback_query is
    // what quick-reply button taps arrive as.
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
    }),
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));

  if (!data.ok) {
    process.exit(1);
  }
  console.log(`Webhook registered: ${webhookUrl}`);

  const commandsOk = await setTelegramCommands(`https://api.telegram.org/bot${token}`);
  console.log(commandsOk ? "Command menu updated." : "Command menu update failed.");
}

main();
