import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserStateBadge } from "../../components/UserStateBadge/UserStateBadge";
import { USER_STATE_LABELS } from "../../model/admin-messages";

describe("UserStateBadge", () => {
  // implements FR-3, NFR-5 of admin-moderation
  it.each(["active", "blocked", "banned", "admin"] as const)("names the %s state from the messages file", (state) => {
    render(<UserStateBadge state={state} />);

    expect(screen.getByText(USER_STATE_LABELS[state])).toBeInTheDocument();
  });
});
