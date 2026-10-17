import { AlignControl } from "../AlignControl/AlignControl";
import { MarkdownToolbar } from "../MarkdownToolbar/MarkdownToolbar";

import type { AboutToolbarRowProps } from "./AboutToolbarRow.types";

/** The editor tab's controls: format buttons and alignment on one wrapping row (FR-11). */
export function AboutToolbarRow({ align, onAlignChange, onFormat }: AboutToolbarRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <MarkdownToolbar onFormat={onFormat} />
      <AlignControl value={align} onChange={onAlignChange} />
    </div>
  );
}
