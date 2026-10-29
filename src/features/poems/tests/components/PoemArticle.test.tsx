import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PoemArticle } from "../../components/PoemArticle/PoemArticle";
import { PoemView } from "../../components/PoemView/PoemView";
import type { PoemViewProps } from "../../components/PoemView/PoemView.types";
import { getPoemGenreName } from "../../dal/poem-genres";
import { AUTUMN_GARDEN } from "../poem-fixtures";

vi.mock("../../dal/poem-genres", () => ({ getPoemGenreName: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

// An async Server Component can't render in jsdom, so these check the tree it returns.
describe("PoemArticle", () => {
  // implements FR-10 of add-poem-creation
  it("renders the poem with the genre name read from the current list", async () => {
    vi.mocked(getPoemGenreName).mockResolvedValue({ kind: "named", name: "Лирика" });

    const element = (await PoemArticle({ poem: AUTUMN_GARDEN })) as ReactElement<PoemViewProps>;

    expect(getPoemGenreName).toHaveBeenCalledWith(AUTUMN_GARDEN.genreId);
    expect(element.type).toBe(PoemView);
    expect(element.props.poem).toBe(AUTUMN_GARDEN);
    expect(element.props.genre).toEqual({ kind: "named", name: "Лирика" });
  });

  // implements FR-10 of add-poem-creation
  it("passes a none genre on, so the article shows no genre line", async () => {
    vi.mocked(getPoemGenreName).mockResolvedValue({ kind: "none" });

    const element = (await PoemArticle({ poem: { ...AUTUMN_GARDEN, genreId: null } })) as ReactElement<PoemViewProps>;

    expect(getPoemGenreName).toHaveBeenCalledWith(null);
    expect(element.props.genre).toEqual({ kind: "none" });
  });
});
