import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  CollectionListNotice,
  CreateCollectionLink,
  listCollectedPoems,
  NewCollectionPage,
  OwnCollectionsSection,
} from "@/features/collection-management";
import { MyPoemsPage } from "@/features/poem-management";

import NewCollectionRoutePage from "../(authorized)/account/poems/collections/new/page";
import MyPoemsRoutePage from "../(authorized)/account/poems/page";

vi.mock("@/features/poem-management", () => ({ MyPoemsPage: () => null }));
vi.mock("@/features/collection-management", () => ({
  CollectionListNotice: () => null,
  CreateCollectionLink: () => null,
  listCollectedPoems: vi.fn(),
  OwnCollectionsSection: () => null,
  NewCollectionPage: () => null,
}));

type MyPoemsPageElement = ReactElement<{
  readonly notices: ReactElement;
  readonly actions: ReactElement;
  readonly beforeList: ReactElement;
  readonly readCollectedPoems: unknown;
}>;

describe("/account/poems page", () => {
  // implements FR-1, FR-2, FR-4, NFR-3 of add-poem-collections
  it("fills MyPoemsPage's three slots with the collection components", () => {
    const element = MyPoemsRoutePage() as ReactElement<{ children: MyPoemsPageElement }>;
    const page = element.props.children;

    expect(element.type).toBe("main");
    expect(page.type).toBe(MyPoemsPage);
    expect(page.props.notices.type).toBe(CollectionListNotice);
    expect(page.props.actions.type).toBe(CreateCollectionLink);
    expect(page.props.beforeList.type).toBe(OwnCollectionsSection);
  });

  // implements FR-1, NFR-1 of show-only-free-poems
  it("hands the poem list collection-management's membership read, so it shows free poems only", () => {
    const element = MyPoemsRoutePage() as ReactElement<{ children: MyPoemsPageElement }>;

    expect(element.props.children.props.readCollectedPoems).toBe(listCollectedPoems);
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
