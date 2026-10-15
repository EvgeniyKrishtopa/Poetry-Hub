/** Whether the photo is served from a local host, which `next/image` refuses to optimize (design D8). */
export function isLocalImageHost(photoUrl: string): boolean {
  void photoUrl;
  throw new Error("not implemented");
}
