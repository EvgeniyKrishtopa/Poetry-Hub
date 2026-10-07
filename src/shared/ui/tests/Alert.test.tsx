import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert } from "../Alert/Alert";

const BOX_CLASSES = ["rounded-md", "border-l-4", "bg-surface", "text-foreground"];

describe("Alert", () => {
  // implements FR-3 of add-feedback-color-tokens
  it("renders a danger tone as one alert with the danger border", () => {
    render(<Alert tone="danger">Boom</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Boom");
    expect(alert).toHaveClass(...BOX_CLASSES, "border-danger");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders a success tone as one status with the success border", () => {
    render(<Alert tone="success">Done</Alert>);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Done");
    expect(status).toHaveClass(...BOX_CLASSES, "border-success");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("appends layout classes without dropping the tone", () => {
    render(
      <Alert tone="success" className="flex flex-col gap-2">
        Done
      </Alert>,
    );

    expect(screen.getByRole("status")).toHaveClass("flex", "flex-col", "gap-2", "border-success", "border-l-4");
  });
});
