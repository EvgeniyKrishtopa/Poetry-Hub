import type { PhotoFileCheck } from "./author.types";

/** Size, then type by content. Runs in the browser before submit and again in the action (design D4). */
export async function validatePhotoFile(file: File): Promise<PhotoFileCheck> {
  void file;
  throw new Error("not implemented");
}
