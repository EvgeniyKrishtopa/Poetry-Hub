import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { DeletedPoemNotice } from "../DeletedPoemNotice/DeletedPoemNotice";
import { MyPoemsContent } from "../MyPoemsContent/MyPoemsContent";
import { MyPoemsSkeleton } from "../MyPoemsSkeleton/MyPoemsSkeleton";

import type { MyPoemsPageProps } from "./MyPoemsPage.types";

/** `/account/poems`: heading in the static shell, the list in a Suspense boundary (FR-2, design D11). */
export function MyPoemsPage({ notices, actions, beforeList }: MyPoemsPageProps = {}) {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{POEM_MANAGEMENT_COPY.listHeading}</h1>
      {/* Outside the boundary, so they show at once and stay above a failed list read (design D5). */}
      <DeletedPoemNotice />
      {notices}
      <Suspense fallback={<MyPoemsSkeleton />}>
        <MyPoemsContent actions={actions} beforeList={beforeList} />
      </Suspense>
    </div>
  );
}
