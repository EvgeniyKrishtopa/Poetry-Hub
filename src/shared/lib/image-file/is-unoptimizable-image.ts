/** Hosts of a local Supabase stack; Next 16 refuses to optimize images from local IPs. */
const LOCAL_IMAGE_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1"]);

/**
 * Whether `next/image` must serve the image as is: a local-stack host, which it refuses to optimize,
 * or an editor's `blob:` preview of a chosen file, which only the browser can read. Used by author
 * photos and poem illustrations.
 */
export function isUnoptimizableImage(imageUrl: string): boolean {
  if (!URL.canParse(imageUrl)) return false;
  const url = new URL(imageUrl);
  return url.protocol === "blob:" || LOCAL_IMAGE_HOSTS.has(url.hostname);
}
