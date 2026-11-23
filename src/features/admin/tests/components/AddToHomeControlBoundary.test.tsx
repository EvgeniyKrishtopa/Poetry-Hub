import { Suspense, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AddToHomeControl } from "../../components/AddToHomeControl/AddToHomeControl";
import { AddToHomeControlContent } from "../../components/AddToHomeControl/AddToHomeControlContent";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../actions/add-home-poem.actions", () => ({ addHomePoemAction: vi.fn() }));
vi.mock("../../actions/add-home-author.actions", () => ({ addHomeAuthorAction: vi.fn() }));

const POEM_ID = "30000000-0000-4000-8000-000000000051";

describe("AddToHomeControl", () => {
  // implements FR-8 of home-page-sections
  it("wraps its content in its own Suspense with an empty fallback, passing the props through", () => {
    const element = AddToHomeControl({ kind: "poem", id: POEM_ID }) as ReactElement<{
      fallback: unknown;
      children: ReactElement<{ kind: string; id: string }>;
    }>;

    expect(element.type).toBe(Suspense);
    expect(element.props.fallback).toBeNull();
    expect(element.props.children.type).toBe(AddToHomeControlContent);
    expect(element.props.children.props).toEqual({ kind: "poem", id: POEM_ID });
  });
});
