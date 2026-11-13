import "server-only";

/**
 * Removes a deleted poem's illustration file with the admin's own session (design D11). A failure is only logged by
 * kind and never undoes the delete, so this never throws.
 */
export async function removeIllustration(illustrationPath: string): Promise<void> {
  void illustrationPath;
  throw new Error("not implemented");
}
