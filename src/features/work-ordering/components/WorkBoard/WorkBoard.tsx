import { Suspense } from "react";

import { WorkBoardContent } from "../WorkBoardContent/WorkBoardContent";
import { WorkBoardSkeleton } from "../WorkBoardSkeleton/WorkBoardSkeleton";

/** The board on `/account/poems`: the content in Suspense with the skeleton as its fallback (design D4). */
export function WorkBoard() {
  return (
    <Suspense fallback={<WorkBoardSkeleton />}>
      <WorkBoardContent />
    </Suspense>
  );
}
