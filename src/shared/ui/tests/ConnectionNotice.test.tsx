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
});
