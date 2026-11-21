import type { HomeEntryListProps } from "./HomeEntryList.types";

/**
 * One draggable list of chosen entries (poems or authors): a handle, the label with its link, a «Убрать» button.
 * A drop calls the move action; the new order shows at once and returns to the stored one on `stale`,
 * `not-found` or a failure (FR-9).
 */
export function HomeEntryList(props: HomeEntryListProps): null {
  void props;
  return null;
}
