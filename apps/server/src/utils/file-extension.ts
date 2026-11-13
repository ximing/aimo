/**
 * Last segment after the final dot, or the whole name when there is no dot.
 * Only a 1–10 character alphanumeric token is kept; case is preserved.
 */
export function safeFileExtension(filename: string, fallback = 'bin'): string {
  const dot = filename.lastIndexOf('.');
  const raw = dot >= 0 ? filename.slice(dot + 1) : filename;
  if (/^[A-Za-z0-9]{1,10}$/.test(raw)) return raw;
  return fallback;
}
