/** Joins class names, skipping falsy values (shadcn-style `cn`, without tailwind-merge). */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
