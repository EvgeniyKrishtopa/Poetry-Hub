import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AccountAuthorSection } from "@/features/authors";

import AccountPage from "../(authorized)/account/page";

vi.mock("@/features/authors", () => ({ AccountAuthorSection: () => null }));

describe("/account page", () => {
  // implements FR-1 of add-author-profiles
  it("renders the authors feature's account section inside the page's main column", () => {
    const element = AccountPage() as ReactElement<{ children: ReactElement }>;

    expect(element.type).toBe("main");
    expect(element.props.children.type).toBe(AccountAuthorSection);
  });
});
