/** Hosts of a local Supabase stack; Next 16 refuses to optimize images from local IPs. */
const LOCAL_IMAGE_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1"]);

/**
 * Whether `next/image` must serve the photo as is (design D8): a local-stack host, which it refuses
 * to optimize, or the editor's `blob:` preview of a chosen file, which only the browser can read.
 */
export function isUnoptimizableImage(photoUrl: string): boolean {
  if (!URL.canParse(photoUrl)) return false;
  const url = new URL(photoUrl);
  return url.protocol === "blob:" || LOCAL_IMAGE_HOSTS.has(url.hostname);
}
