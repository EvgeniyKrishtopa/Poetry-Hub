"use client";

import type { WorkBoardIslandProps } from "./WorkBoardIsland.types";

/**
 * The interactive board: lists, handles, drop areas, the failure alert and the live region. The dropped place is an
 * optimistic arrangement that falls back to the stored one when the move is refused (design D4).
 */
export function WorkBoardIsland({ arrangement }: WorkBoardIslandProps) {
  void arrangement;
  return null;
}
