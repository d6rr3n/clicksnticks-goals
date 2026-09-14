/**
 * Where to send someone after they've been sent away to do something first —
 * creating a goal from the challenge setup, for instance.
 *
 * Only an in-app path is ever followed. An absolute URL, or a
 * protocol-relative one, is somebody else's site, and a redirect the customer
 * didn't ask for is a redirect they can't check.
 */
export function returnPath(
  next: string | undefined | null,
  goalId: string,
): string | null {
  // A backslash is normalised to a slash by browsers, so "/\evil.com" would
  // leave the app exactly as "//evil.com" does.
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("\\")) return null;
  const [path, query] = next.split("?");
  if (path === "") return null;
  const params = new URLSearchParams(query);
  params.set("goal", goalId);
  return `${path}?${params}`;
}
