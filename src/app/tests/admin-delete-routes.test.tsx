import type { ComponentProps, ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AdminDeleteControl } from "@/features/admin";

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
const TARGET = { id: "30000000-0000-4000-8000-000000000051", title: "Осенний сад", authorId: AUTHOR_ID };

type ModerationSlot = (target: typeof TARGET) => ReactElement<ComponentProps<typeof AdminDeleteControl>>;

/** The `moderation` render function a route file hands to its page component. */
function moderationOf(route: ReactElement): ModerationSlot {
  const main = route as ReactElement<{ children: ReactElement<{ moderation: ModerationSlot }> }>;
  return main.props.children.props.moderation;
}

const PARAMS = Promise.resolve({ id: AUTHOR_ID, poemId: TARGET.id, collectionId: TARGET.id });

describe("the public routes' admin delete control", () => {
  // implements FR-10 of admin-moderation
  it("fills the poem page's slot with a poem delete that returns to the author's page", () => {
    const control = moderationOf(PoemRoutePage({ params: PARAMS } as never))(TARGET);

    expect(control.type).toBe(AdminDeleteControl);
    expect(control.props).toEqual({
      kind: "poem",
      id: TARGET.id,
      title: TARGET.title,
      authorId: AUTHOR_ID,
      redirectHref: `/authors/${AUTHOR_ID}`,
    });
  });

  // implements FR-10 of admin-moderation
  it("fills the collection page's slot with a collection delete that returns to the author's page", () => {
    const control = moderationOf(CollectionRoutePage({ params: PARAMS } as never))(TARGET);

    expect(control.type).toBe(AdminDeleteControl);
    expect(control.props).toEqual({
      kind: "collection",
      id: TARGET.id,
      title: TARGET.title,
      authorId: AUTHOR_ID,
      redirectHref: `/authors/${AUTHOR_ID}`,
    });
  });
});
