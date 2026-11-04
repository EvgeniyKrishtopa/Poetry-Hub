import "server-only";

import { createHash } from "node:crypto";

import type { PoemFormValues } from "../../model/poem-form-values";

/**
 * A short key that changes whenever the stored values do. The save's re-render brings new stored values, so
 * the form remounts fresh instead of comparing an old draft against them (edit-poem design D6).
 */
export function storedValuesKey(values: PoemFormValues): string {
  const illustrationUrl = values.illustration.kind === "stored" ? values.illustration.url : null;
  return createHash("sha256")
    .update(JSON.stringify([values.title, values.text, values.genreId, illustrationUrl]))
    .digest("hex");
}
