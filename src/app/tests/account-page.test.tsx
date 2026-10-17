import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AccountPage } from "@/features/authors";

import AccountRoutePage from "../(authorized)/account/page";

vi.mock("@/features/authors", () => ({ AccountPage: () => null }));

describe("/account page", () => {
  // implements FR-1 of add-author-profiles
  it("renders the authors feature's account page inside the page's main column", () => {
    const element = AccountRoutePage() as ReactElement<{ children: ReactElement }>;

    expect(element.type).toBe("main");
    expect(element.props.children.type).toBe(AccountPage);
  });
});
