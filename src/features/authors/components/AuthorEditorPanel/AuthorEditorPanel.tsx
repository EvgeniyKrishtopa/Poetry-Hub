import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { PAGE_TITLES } from "../../model/author-messages";
import { AuthorEditorLoader } from "../AuthorEditorLoader/AuthorEditorLoader";
import { AuthorEditorSkeleton } from "../AuthorEditorSkeleton/AuthorEditorSkeleton";

/**
 * The editor page: its heading in the static shell, then the editor, which reads the session and
 * the own profile per request inside this Suspense boundary (FR-2).
 */
export function AuthorEditorPanel() {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-2">
      <h1 className="text-4xl font-bold tracking-tight">{PAGE_TITLES.authorEditor}</h1>
      <Suspense fallback={<AuthorEditorSkeleton />}>
        <AuthorEditorLoader />
      </Suspense>
    </div>
  );
}
