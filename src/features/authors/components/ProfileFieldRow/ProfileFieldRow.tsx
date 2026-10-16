import type { ProfileFieldRowProps } from "./ProfileFieldRow.types";

/**
 * One editor field: a 10rem caption column and a value column, 24 px apart, with a rule above;
 * below 600 px wide the caption stacks above the value (the mockup's field row).
 */
export function ProfileFieldRow({ caption, control, children }: ProfileFieldRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-y-3 border-t border-border py-6 min-[600px]:grid-cols-[10rem_minmax(0,1fr)] min-[600px]:gap-x-6">
      {caption !== undefined && <div className="text-sm font-medium min-[600px]:pt-2">{caption}</div>}
      {control}
      <div className="flex min-w-0 flex-col items-start gap-3 min-[600px]:col-start-2">{children}</div>
    </div>
  );
}
