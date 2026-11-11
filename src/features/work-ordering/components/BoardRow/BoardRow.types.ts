import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import type { Ref } from "react";

export interface BoardRowProps {
  /** A collection's title is 18 px, a poem's 16 px (artboard 40). */
  readonly variant: "collection" | "poem";
  /** The item's id; the handle carries it so focus can be put back on the handle after a drop. */
  readonly itemId: string;
  readonly title: string;
  readonly href: string;
  /** The handle's accessible name (FR-7). */
  readonly handleLabel: string;
  /** True while this item is the one held: it is drawn lifted. */
  readonly isLifted: boolean;
  /** Natively disabled: a disabled handle can't start a drag, and a drag already running goes on (FR-6). */
  readonly handleDisabled: boolean;
  readonly activatorRef: Ref<HTMLButtonElement>;
  readonly attributes: DraggableAttributes;
  readonly listeners: DraggableSyntheticListeners;
}
