export const ADMIN_EMAILS = (
  import.meta.env.VITE_ADMIN_EMAILS ?? 'admin@gmail.com'
)
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
