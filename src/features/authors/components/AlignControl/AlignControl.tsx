import { Button } from "@/shared/ui";

import { ALIGN_LABELS } from "../../model/author-messages";
import type { AboutAlign } from "../../model/author.types";

import type { AlignControlProps } from "./AlignControl.types";

const ALIGNS: readonly AboutAlign[] = ["left", "center", "right"];

/** About's three alignment buttons; the chosen one is pressed (`Button` fills it with `surface`) (FR-11). */
export function AlignControl({ value, onChange }: AlignControlProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {ALIGNS.map((align) => (
        <Button
          key={align}
          variant="ghost"
          aria-pressed={align === value}
          onClick={() => onChange(align)}
        >
          {ALIGN_LABELS[align]}
        </Button>
      ))}
    </div>
  );
}
