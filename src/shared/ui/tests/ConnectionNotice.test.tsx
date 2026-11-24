import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectionNotice } from "../ConnectionNotice/ConnectionNotice";

const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";
const SLOW_TEXT = "Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.";

// implements FR-11, NFR-7 of edit-poem
describe("ConnectionNotice", () => {
  it.each([
    ["offline", OFFLINE_TEXT],
    ["slow", SLOW_TEXT],
  ] as const)("shows the %s text in a neutral status box", (status, text) => {
    render(<ConnectionNotice status={status} />);

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(text);
    expect(notice).toHaveClass("border-muted");
  });

  it("renders nothing while online", () => {
    const { container } = render(<ConnectionNotice status="online" />);

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-G2 of google-sign-in: a caller that does not save passes its own texts
  it.each([
    ["offline", "custom offline text"],
    ["slow", "custom slow text"],
  ] as const)("shows the passed %s text instead of the default", (status, text) => {
    const messages = { offline: "custom offline text", slow: "custom slow text" };

    render(<ConnectionNotice status={status} messages={messages} />);

    expect(screen.getByRole("status")).toHaveTextContent(text);
    expect(screen.queryByText(OFFLINE_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(SLOW_TEXT)).not.toBeInTheDocument();
  });

  it("renders nothing while online even with passed texts", () => {
    const messages = { offline: "custom offline text", slow: "custom slow text" };

    const { container } = render(<ConnectionNotice status="online" messages={messages} />);

    expect(container).toBeEmptyDOMElement();
  });
});
