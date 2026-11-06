import { COLLECTION_FORM_COPY } from "../../model/collection-management-messages";

const SKELETON_BLOCK = "bg-surface animate-pulse motion-reduce:animate-none";

/** Each field's label line and control block, in form order (artboard 31: 136 and 184 px labels). */
const FIELD_BLOCKS = [
  { field: "title", labelClass: "w-34", controlClass: "h-9" },
  { field: "description", labelClass: "w-46", controlClass: "h-40" },
] as const;

/** Both forms' loading state: two field bars and a button bar (ui-plan). */
export function CollectionFormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Absolutely positioned (`sr-only`), so it adds no flex gap. */}
      <span role="status" className="sr-only">
        {COLLECTION_FORM_COPY.loading}
      </span>
      {FIELD_BLOCKS.map(({ field, labelClass, controlClass }) => (
        <div key={field} aria-hidden="true" className="flex flex-col gap-1.5">
          <div data-skeleton className={`${SKELETON_BLOCK} h-5 rounded ${labelClass}`} />
          <div data-skeleton className={`${SKELETON_BLOCK} w-full rounded-md ${controlClass}`} />
        </div>
      ))}
      <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-9 w-37 rounded-full`} />
    </div>
  );
}
