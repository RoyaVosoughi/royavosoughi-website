/**
 * Sets a new password for an existing admin account — for when the password
 * is forgotten and nobody can log in to /admin/team to change it.
 *
 *   npm run admin:reset-password -- you@example.com "your new password"
 *
 * Writes only admin_users.password_hash (bcrypt, same as /admin/team).
 */
import bcrypt from "bcryptjs";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) throw new Error('Usage: npm run admin:reset-password -- you@example.com "new password"');
  if (password.length < 10) throw new Error("Use at least 10 characters.");

  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase isn't configured in .env.local.");

  const { data, error } = await supabase
    .from("admin_users")
    .update({ password_hash: await bcrypt.hash(password, 12) })
    .ilike("email", email.trim())
    .select("email");
  if (error) throw error;
  if (!data?.length) throw new Error(`No admin account with the email ${email}.`);
  console.log(`Password updated for ${data[0].email}. Log in at /admin/login.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
