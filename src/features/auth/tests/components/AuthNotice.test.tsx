import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthNotice } from "../../components/AuthNotice/AuthNotice";
import { ACCOUNT_EXISTS_NOTICE } from "../../model/auth-messages";

async function renderNotice(notice: string | string[] | undefined) {
  const element = await AuthNotice({ notice: Promise.resolve(notice) });
  return render(<>{element}</>);
}

describe("AuthNotice", () => {
  // implements FR-G6 of google-sign-in
  it("shows the account-exists notice as a polite status for auth-notice=account-exists", async () => {
    await renderNotice("account-exists");

    expect(screen.getByRole("status")).toHaveTextContent(ACCOUNT_EXISTS_NOTICE);
  });

  // implements FR-G6 of google-sign-in
  it.each([undefined, "something-else", ["account-exists", "account-exists"]])(
    "shows nothing for auth-notice=%s",
    async (notice) => {
      const { container } = await renderNotice(notice);

      expect(container).toBeEmptyDOMElement();
    },
  );
});
