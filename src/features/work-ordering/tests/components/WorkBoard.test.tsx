import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkBoard } from "../../components/WorkBoard/WorkBoard";
import { WorkBoardSkeleton } from "../../components/WorkBoardSkeleton/WorkBoardSkeleton";

vi.mock("../../components/WorkBoardContent/WorkBoardContent", () => ({
  WorkBoardContent: () => <p>board content</p>,
}));

describe("WorkBoard", () => {
  // implements FR-9 of drag-and-drop-ordering
  it("renders the content inside its Suspense boundary", () => {
    render(<WorkBoard />);

    expect(screen.getByText("board content")).toBeInTheDocument();
  });
});

describe("WorkBoardSkeleton", () => {
  // implements FR-9 of drag-and-drop-ordering
  it("says it is loading to a screen reader and hides the placeholder rows", () => {
    const { container } = render(<WorkBoardSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Загрузка…");
    expect(container.querySelectorAll("[data-skeleton]").length).toBeGreaterThan(0);
    expect(container.querySelector('[aria-hidden="true"]')).toContainElement(container.querySelector("[data-skeleton]"));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
