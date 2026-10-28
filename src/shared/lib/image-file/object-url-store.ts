/** The live object URL of each subscribed file. */
const objectUrls = new Map<File, string>();

/**
 * Creates the file's object URL for as long as a component subscribes to it, then releases it. React
 * unsubscribes when the component unmounts or its page is hidden (Next keeps a left route mounted
 * but hidden), and subscribes again when it is shown, so a kept file always has a live URL.
 */
export function subscribeObjectUrl(file: File): () => void {
  const url = URL.createObjectURL(file);
  objectUrls.set(file, url);
  return () => {
    URL.revokeObjectURL(url);
    if (objectUrls.get(file) === url) objectUrls.delete(file);
  };
}

export function getObjectUrl(file: File): string | null {
  return objectUrls.get(file) ?? null;
}
