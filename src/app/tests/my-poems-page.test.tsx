import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { CollectionListNotice, CreateCollectionLink, NewCollectionPage } from "@/features/collection-management";
import { MyPoemsPage } from "@/features/poem-management";
import { WorkBoard } from "@/features/work-ordering";

import NewCollectionRoutePage from "../(authorized)/account/poems/collections/new/page";
import MyPoemsRoutePage from "../(authorized)/account/poems/page";

vi.mock("@/features/poem-management", () => ({ MyPoemsPage: () => null }));
vi.mock("@/features/collection-management", () => ({
  CollectionListNotice: () => null,
  CreateCollectionLink: () => null,
  NewCollectionPage: () => null,
}));
vi.mock("@/features/work-ordering", () => ({ WorkBoard: () => null }));

type MyPoemsPageElement = ReactElement<{
  readonly notices: ReactElement;
  readonly actions: ReactElement;
  readonly board: ReactElement;
}>;

describe("/account/poems page", () => {
  // implements FR-1, FR-2, FR-4, NFR-3 of add-poem-collections
  it("fills MyPoemsPage's notices and actions slots with the collection components", () => {
    const element = MyPoemsRoutePage() as ReactElement<{ children: MyPoemsPageElement }>;
    const page = element.props.children;

    expect(element.type).toBe("main");
    expect(page.type).toBe(MyPoemsPage);
    expect(page.props.notices.type).toBe(CollectionListNotice);
    expect(page.props.actions.type).toBe(CreateCollectionLink);
  });

  // implements FR-9, NFR-3 of drag-and-drop-ordering
  it("fills MyPoemsPage's board slot with the work board, and passes no other slot", () => {
    const element = MyPoemsRoutePage() as ReactElement<{ children: MyPoemsPageElement }>;
    const { props } = element.props.children;

    expect(props.board.type).toBe(WorkBoard);
    expect(Object.keys(props).toSorted()).toEqual(["actions", "board", "notices"]);
  });
});

describe("/account/poems/collections/new page", () => {
  // implements FR-3 of add-poem-collections
  it("renders the create page inside the page's main column", () => {
    const element = NewCollectionRoutePage() as ReactElement<{ children: ReactElement }>;

    expect(element.type).toBe("main");
    expect(element.props.children.type).toBe(NewCollectionPage);
  });
});
