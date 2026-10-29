import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";

const SKELETON_BLOCK = "bg-surface animate-pulse motion-reduce:animate-none";

/** The mockup's three title lines (168, 208, 144 px). */
const TITLE_LINE_WIDTHS = ["w-42", "w-52", "w-36"] as const;

/** `MyPoemsContent` while it loads: the add-link pill (252 × 36) and three title lines (design D11). */
export function MyPoemsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Absolutely positioned (`sr-only`), so it adds no flex gap. */}
      <span role="status" className="sr-only">
        {POEM_MANAGEMENT_COPY.loading}
      </span>
      <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-9 w-63 rounded-full`} />
      <div aria-hidden="true" className="flex flex-col gap-4">
        {TITLE_LINE_WIDTHS.map((width) => (
          <div key={width} data-skeleton className={`${SKELETON_BLOCK} h-6 rounded ${width}`} />
        ))}
      </div>
    </div>
  );
}
