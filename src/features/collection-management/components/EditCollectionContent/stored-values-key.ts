import "server-only";

import { createHash } from "node:crypto";

import type { CollectionFormValues } from "../../model/collection-form-values";

/**
 * A short key that changes whenever the stored values do. The save's re-render brings new stored values, so
 * the form remounts fresh instead of comparing an old draft against them (design D6, poem-management's copy).
 */
export function storedValuesKey(values: CollectionFormValues): string {
  return createHash("sha256").update(JSON.stringify([values.title, values.description])).digest("hex");
}
