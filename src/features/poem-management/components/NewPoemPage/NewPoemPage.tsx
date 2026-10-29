import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { PAGE_HEADING_CLASS } from "../../model/poem-management.constants";
import { NewPoemContent } from "../NewPoemContent/NewPoemContent";
import { NewPoemSkeleton } from "../NewPoemSkeleton/NewPoemSkeleton";

/** `/account/poems/new`: heading in the static shell, the form in a Suspense boundary (FR-3, design D11). */
export function NewPoemPage() {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className={PAGE_HEADING_CLASS}>{POEM_MANAGEMENT_COPY.addHeading}</h1>
      <Suspense fallback={<NewPoemSkeleton />}>
        <NewPoemContent />
      </Suspense>
    </div>
  );
}
