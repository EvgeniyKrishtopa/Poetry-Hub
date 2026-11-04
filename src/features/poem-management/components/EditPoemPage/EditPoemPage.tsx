import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { EDIT_POEM_COPY } from "../../model/poem-management-messages";
import { EditPoemContent } from "../EditPoemContent/EditPoemContent";
import { PoemFormSkeleton } from "../PoemFormSkeleton/PoemFormSkeleton";

import type { EditPoemPageProps } from "./EditPoemPage.types";

/** `/account/poems/<poemId>/edit`: the heading in the static shell, the form in a Suspense boundary (edit-poem design D6). */
export function EditPoemPage({ poemId }: EditPoemPageProps) {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{EDIT_POEM_COPY.heading}</h1>
      <Suspense fallback={<PoemFormSkeleton />}>
        <EditPoemContent poemId={poemId} />
      </Suspense>
    </div>
  );
}
