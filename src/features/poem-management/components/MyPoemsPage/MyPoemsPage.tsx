import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { DeletedPoemNotice } from "../DeletedPoemNotice/DeletedPoemNotice";
import { MyPoemsContent } from "../MyPoemsContent/MyPoemsContent";
import { MyPoemsSkeleton } from "../MyPoemsSkeleton/MyPoemsSkeleton";

import type { MyPoemsPageProps } from "./MyPoemsPage.types";

/** `/account/poems`: heading in the static shell, the list in a Suspense boundary (FR-2, design D11). */
export function MyPoemsPage({ notices, actions, beforeList }: MyPoemsPageProps = {}) {
  // Slots are rendered by task 2.1; no caller passes them yet.
  void notices;
  void actions;
  void beforeList;
  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{POEM_MANAGEMENT_COPY.listHeading}</h1>
      {/* Outside the boundary, so it shows at once and stays above a failed list read (design D5). */}
      <DeletedPoemNotice />
      <Suspense fallback={<MyPoemsSkeleton />}>
        <MyPoemsContent />
      </Suspense>
    </div>
  );
}
