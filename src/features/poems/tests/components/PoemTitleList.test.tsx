import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PoemTitleList } from "../../components/PoemTitleList/PoemTitleList";
import { AUTUMN_GARDEN, NIGHT_STATION } from "../poem-fixtures";

const TWO_POEMS = [NIGHT_STATION, AUTUMN_GARDEN];

function ownPoemHref(poemId: string): string {
  return `/account/poems/${poemId}`;
}

describe("PoemTitleList", () => {
  // implements FR-11 of add-poem-creation
  it("shows one title link per poem, in the given order, with the href built for each poem", () => {
    render(<PoemTitleList poems={TWO_POEMS} poemHref={ownPoemHref} />);

    for (const item of screen.getAllByRole("listitem")) expect(within(item).getAllByRole("link")).toHaveLength(1);
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Ночной вокзал", "Осенний сад"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/account/poems/${NIGHT_STATION.id}`,
      `/account/poems/${AUTUMN_GARDEN.id}`,
    ]);
  });

  // implements FR-5 of refine-author-page-and-contact
  it("shows only the titles: no heading, text, date, genre, or illustration", () => {
    const { container } = render(<PoemTitleList poems={TWO_POEMS} poemHref={ownPoemHref} />);

    expect(screen.queryByRole("heading")).toBeNull();
    expect(container).not.toHaveTextContent("Табло");
    expect(container).not.toHaveTextContent("Жанр");
    expect(container.querySelector("time")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
