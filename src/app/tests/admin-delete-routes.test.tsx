import { Children, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AddToViolationsControl, AdminActionNotice, AdminDeleteControl } from "@/features/admin";

import AuthorRoutePage from "../(public)/authors/[id]/page";
import CollectionRoutePage from "../(public)/authors/[id]/collections/[collectionId]/page";
import PoemRoutePage from "../(public)/authors/[id]/poems/[poemId]/page";

// The real features load here (server-only is stubbed in Vitest); only auth's session part is replaced.
vi.mock("@/features/auth", () => ({
  HeaderAuthLinks: () => null,
  getSessionState: vi.fn(),
  getCurrentUserId: vi.fn(),
  requireSession: vi.fn(),
}));

const AUTHOR_ID = "11111111-2222-4333-8444-555555555555";
const AUTHOR_NAME = "Анна Ахматова";
const TARGET = {
  id: "30000000-0000-4000-8000-000000000051",
  title: "Осенний сад",
  authorId: AUTHOR_ID,
  authorName: AUTHOR_NAME,
};

type ModerationSlot = (target: typeof TARGET) => ReactNode;

/** The `renderModeration` function a route file hands to its page component. */
function moderationOf(route: ReactElement): ModerationSlot {
  const main = route as ReactElement<{ children: ReactElement<{ renderModeration: ModerationSlot }> }>;
  return main.props.children.props.renderModeration;
}

/** The elements a slot rendered inside its wrapper, in order. */
function controlsOf(slot: ReactNode): ReactElement[] {
  const wrapper = slot as ReactElement<{ children: ReactNode }>;
  return Children.toArray(wrapper.props.children) as ReactElement[];
}

const PARAMS = Promise.resolve({ id: AUTHOR_ID, poemId: TARGET.id, collectionId: TARGET.id });

describe("the public routes' admin controls", () => {
  // implements FR-10 of admin-moderation; FR-2 of admin-violations-feedback
  it("fills the poem page's slot with the add control for that poem, then a poem delete back to the author's page", () => {
    const [add, remove] = controlsOf(moderationOf(PoemRoutePage({ params: PARAMS } as never))(TARGET));

    expect(add?.type).toBe(AddToViolationsControl);
    expect((add as ReactElement<ComponentProps<typeof AddToViolationsControl>>).props).toEqual({
      authorId: AUTHOR_ID,
      authorName: AUTHOR_NAME,
      content: { kind: "poem", id: TARGET.id, title: TARGET.title },
    });
    expect(remove?.type).toBe(AdminDeleteControl);
    expect((remove as ReactElement<ComponentProps<typeof AdminDeleteControl>>).props).toEqual({
      kind: "poem",
      id: TARGET.id,
      title: TARGET.title,
      authorId: AUTHOR_ID,
      redirectHref: `/authors/${AUTHOR_ID}`,
    });
  });

  // implements FR-10 of admin-moderation; FR-2 of admin-violations-feedback
  it("fills the collection page's slot with the add control for that collection, then a collection delete", () => {
    const [add, remove] = controlsOf(moderationOf(CollectionRoutePage({ params: PARAMS } as never))(TARGET));

    expect(add?.type).toBe(AddToViolationsControl);
    expect((add as ReactElement<ComponentProps<typeof AddToViolationsControl>>).props).toEqual({
      authorId: AUTHOR_ID,
      authorName: AUTHOR_NAME,
      content: { kind: "collection", id: TARGET.id, title: TARGET.title },
    });
    expect(remove?.type).toBe(AdminDeleteControl);
    expect((remove as ReactElement<ComponentProps<typeof AdminDeleteControl>>).props).toEqual({
      kind: "collection",
      id: TARGET.id,
      title: TARGET.title,
      authorId: AUTHOR_ID,
      redirectHref: `/authors/${AUTHOR_ID}`,
    });
  });

  // implements FR-2, FR-14 of admin-violations-feedback
  it("fills the author page's slot with the one-time notice and an add control that records no content", () => {
    const [notice, add] = controlsOf(moderationOf(AuthorRoutePage({ params: PARAMS } as never))(TARGET));

    expect(notice?.type).toBe(AdminActionNotice);
    expect(add?.type).toBe(AddToViolationsControl);
    expect((add as ReactElement<ComponentProps<typeof AddToViolationsControl>>).props).toEqual({
      authorId: AUTHOR_ID,
      authorName: AUTHOR_NAME,
    });
  });
});
