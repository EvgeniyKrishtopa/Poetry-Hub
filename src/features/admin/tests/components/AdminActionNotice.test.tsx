import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminActionNotice } from "../../components/AdminActionNotice/AdminActionNotice";
import { DELETE_NOTICE_FAILED_COPY } from "../../model/admin-messages";
import { useViolationNotice } from "../../model/violation-notice-ui.store";

afterEach(() => {
  useViolationNotice.getState().clearFailedNotice();
});

describe("AdminActionNotice", () => {
  // implements FR-14 of admin-violations-feedback
  it("shows nothing when no failed email was stored", () => {
    const { container } = render(<AdminActionNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-14 of admin-violations-feedback
  it.each([
    ["poem", DELETE_NOTICE_FAILED_COPY.poem],
    ["collection", DELETE_NOTICE_FAILED_COPY.collection],
  ] as const)("says once that the email after a deleted %s was not sent", (deleted, text) => {
    useViolationNotice.getState().setFailedNotice({ deleted, cause: "timeout" });

    render(<AdminActionNotice />);

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });

  // implements FR-14 of admin-violations-feedback
  it("adds that the author has no address when that was the cause", () => {
    useViolationNotice.getState().setFailedNotice({ deleted: "poem", cause: "no-address" });

    render(<AdminActionNotice />);

    expect(screen.getByRole("status")).toHaveTextContent(
      `${DELETE_NOTICE_FAILED_COPY.poem}${DELETE_NOTICE_FAILED_COPY.noAddress}`,
    );
  });

  // implements FR-14 of admin-violations-feedback
  it("clears the store when it shows, so a reload or a second visit shows nothing", async () => {
    useViolationNotice.getState().setFailedNotice({ deleted: "collection", cause: "config" });
    const first = render(<AdminActionNotice />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(useViolationNotice.getState().notice).toBeNull();

    first.unmount();
    await act(async () => {});
    const second = render(<AdminActionNotice />);

    expect(second.container).toBeEmptyDOMElement();
  });
});
