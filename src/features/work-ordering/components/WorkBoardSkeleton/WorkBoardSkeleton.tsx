import { WORK_BOARD_COPY } from "../../model/work-ordering-messages";
import { BoardSectionHeading } from "../BoardSectionHeading/BoardSectionHeading";

const SKELETON_BLOCK = "bg-surface animate-pulse motion-reduce:animate-none";

// The artboard's rows: a collection with two nested rows, a collection with none, then two free rows.
const COLLECTION_ROWS = [{ title: "w-48", nested: ["w-40", "w-52"] }, { title: "w-32", nested: [] }] as const;
const FREE_ROW_WIDTHS = ["w-44", "w-36"] as const;

function RowPlaceholder({ width }: { readonly width: string }) {
  return (
    <div className="flex items-center gap-1">
      <div data-skeleton className={`${SKELETON_BLOCK} size-8 rounded-md`} />
      <div data-skeleton className={`${SKELETON_BLOCK} h-6 rounded ${width}`} />
    </div>
  );
}

/** The board's loading state: the section heading and placeholder rows with handle placeholders (artboard 40, state 11). */
export function WorkBoardSkeleton() {
  return (
    <div className="flex flex-col gap-4 self-stretch">
      {/* Absolutely positioned (`sr-only`), so it adds no flex gap. */}
      <span role="status" className="sr-only">
        {WORK_BOARD_COPY.loading}
      </span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <BoardSectionHeading />
        <div className="flex flex-col gap-3">
          {COLLECTION_ROWS.map(({ title, nested }) => (
            <div key={title} className="flex flex-col gap-1">
              <RowPlaceholder width={title} />
              {nested.length > 0 && (
                <div className="ml-4 flex flex-col gap-2 border-l border-border pl-4">
                  {nested.map((width) => (
                    <RowPlaceholder key={width} width={width} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {FREE_ROW_WIDTHS.map((width) => (
            <RowPlaceholder key={width} width={width} />
          ))}
        </div>
      </div>
    </div>
  );
}
