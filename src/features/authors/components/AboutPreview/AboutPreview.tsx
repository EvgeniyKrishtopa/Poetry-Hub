import { AuthorAbout } from "../AuthorAbout/AuthorAbout";

import type { AboutPreviewProps } from "./AboutPreview.types";

/** The preview tab: the draft rendered as the public page renders it (FR-11, NFR-1). */
export function AboutPreview({ markdown }: AboutPreviewProps) {
  return (
    <div className="min-h-64 rounded-md border border-border p-4">
      <AuthorAbout markdown={markdown} />
    </div>
  );
}
