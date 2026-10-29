import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";

const SKELETON_BLOCK = "bg-surface animate-pulse motion-reduce:animate-none";

/** Each field's control block, under its label line, in form order. */
const FIELD_CONTROLS = [
  { field: "title", controlClass: "h-9 w-full rounded-md" },
  { field: "text", controlClass: "h-80 w-full rounded-md" },
  { field: "genre", controlClass: "h-9 w-full rounded-md" },
  { field: "illustration", controlClass: "h-9 w-48 rounded-full" },
] as const;

/** `NewPoemContent` while it loads: four field blocks (input, tall textarea, select, picker) and a button (design D11). */
export function NewPoemSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Absolutely positioned (`sr-only`), so it adds no flex gap. */}
      <span role="status" className="sr-only">
        {POEM_MANAGEMENT_COPY.loading}
      </span>
      {FIELD_CONTROLS.map(({ field, controlClass }) => (
        <div key={field} aria-hidden="true" className="flex flex-col gap-1.5">
          <div data-skeleton className={`${SKELETON_BLOCK} h-5 w-40 rounded`} />
          <div data-skeleton className={`${SKELETON_BLOCK} ${controlClass}`} />
        </div>
      ))}
      <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-10 w-56 rounded-full`} />
    </div>
  );
}
