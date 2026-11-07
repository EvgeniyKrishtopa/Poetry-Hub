import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CollectionPoemList } from "../../components/CollectionPoemList/CollectionPoemList";
import type { CollectionPoemChoice } from "../../model/collection-management.types";

const NEWER: CollectionPoemChoice = { id: "50000000-0000-4000-8000-000000000002", title: "Ночной вокзал", selected: true };
const OLDER: CollectionPoemChoice = { id: "50000000-0000-4000-8000-000000000001", title: "Осенний сад", selected: true };

describe("CollectionPoemList", () => {
  // implements FR-2 of add-poems-to-collections
  it("shows the «Произведения» heading and the titles in the given order, each linking to the owner's poem page", () => {
    render(<CollectionPoemList poems={[NEWER, OLDER]} />);

    expect(screen.getByRole("region", { name: "Произведения" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Ночной вокзал", "Осенний сад"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/account/poems/${NEWER.id}`,
      `/account/poems/${OLDER.id}`,
    ]);
  });

  // implements FR-2 of add-poems-to-collections
  it("renders nothing for a collection with no poems", () => {
    const { container } = render(<CollectionPoemList poems={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
