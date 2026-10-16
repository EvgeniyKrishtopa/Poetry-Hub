/** Hosts of a local Supabase stack; Next 16 refuses to optimize images from local IPs. */
const LOCAL_IMAGE_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1"]);

/** Whether the photo is served from a local host, which `next/image` refuses to optimize (design D8). */
export function isLocalImageHost(photoUrl: string): boolean {
  if (!URL.canParse(photoUrl)) return false;
  return LOCAL_IMAGE_HOSTS.has(new URL(photoUrl).hostname);
}
