import { getOwnPublicAuthor } from "@/features/authors";
import { Alert } from "@/shared/ui";

import { listOwnBoard } from "../../dal/own-board";
import { WORK_BOARD_COPY } from "../../model/work-ordering-messages";
import { WorkBoardIsland } from "../WorkBoardIsland/WorkBoardIsland";

/**
 * Reads the author's board and renders it: the island when both reads succeed, one alert in the board's place
 * otherwise (design D4's failure matrix).
 */
export async function WorkBoardContent() {
  // Memoized per request: the page's own read already answered this.
  const own = await getOwnPublicAuthor();
  // The page renders this slot only for a public own profile, and shows its own notice otherwise.
  if (!own.ok || own.status === "not-public") return null;

  const board = await listOwnBoard(own.authorId);
  if (!board.ok) {
    return (
      <Alert tone="danger" className="self-stretch">
        {board.reason === "collections-unavailable"
          ? WORK_BOARD_COPY.collectionsUnavailable
          : WORK_BOARD_COPY.poemsUnavailable}
      </Alert>
    );
  }

  const { collections, freePoems } = board.arrangement;
  // Nothing to move: the page keeps its own buttons and shows no board.
  if (collections.length === 0 && freePoems.length === 0) return null;

  return <WorkBoardIsland arrangement={board.arrangement} />;
}
