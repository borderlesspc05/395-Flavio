export function getUserInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return `${first}${second}`.toUpperCase() || '?';
  }
  return email[0]?.toUpperCase() ?? '?';
}
