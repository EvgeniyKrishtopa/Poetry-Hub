import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { PAGE_HEADING_CLASS } from "../../model/poem-management.constants";
import { MyPoemsContent } from "../MyPoemsContent/MyPoemsContent";
import { MyPoemsSkeleton } from "../MyPoemsSkeleton/MyPoemsSkeleton";

/** `/account/poems`: heading in the static shell, the list in a Suspense boundary (FR-2, design D11). */
export function MyPoemsPage() {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className={PAGE_HEADING_CLASS}>{POEM_MANAGEMENT_COPY.listHeading}</h1>
      <Suspense fallback={<MyPoemsSkeleton />}>
        <MyPoemsContent />
      </Suspense>
    </div>
  );
}
