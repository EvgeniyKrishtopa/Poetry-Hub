import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ViolationsConnectionNotice } from "../../components/ViolationsConnectionNotice/ViolationsConnectionNotice";

const connection = vi.hoisted(() => ({ status: "online" as "online" | "slow" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));

afterEach(() => {
  connection.status = "online";
});

describe("ViolationsConnectionNotice", () => {
  // implements FR-15 of admin-violations-feedback
  it("says there is no connection while offline", () => {
    connection.status = "offline";

    render(<ViolationsConnectionNotice />);

    expect(screen.getByRole("status")).toHaveTextContent("Нет подключения к интернету");
  });

  // implements FR-15 of admin-violations-feedback
  it("shows nothing on a normal connection", () => {
    const { container } = render(<ViolationsConnectionNotice />);

    expect(container).toBeEmptyDOMElement();
  });
});
