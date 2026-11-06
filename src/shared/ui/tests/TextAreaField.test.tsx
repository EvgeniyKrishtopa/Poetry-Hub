import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { TextAreaField } from "../TextAreaField/TextAreaField";

function ControlledField() {
  const [value, setValue] = useState("Стихи октября");
  return (
    <>
      <TextAreaField label="Описание" value={value} onChange={(event) => setValue(event.target.value)} />
      <output>{value}</output>
    </>
  );
}

describe("TextAreaField", () => {
  // implements NFR-4 of add-poem-collections
  it("ties the visible label to a multi-line text area", () => {
    render(<TextAreaField label="Описание" name="description" />);
    const field = screen.getByRole("textbox", { name: "Описание" });

    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveAttribute("name", "description");
  });

  it("sets no error wiring without an error", () => {
    render(<TextAreaField label="Описание" />);
    const field = screen.getByLabelText("Описание");

    expect(field).not.toHaveAttribute("aria-invalid");
    expect(field).not.toHaveAttribute("aria-describedby");
  });

  // implements NFR-4 of add-poem-collections
  it("renders the error under the field and announces it through aria-describedby and aria-invalid", () => {
    render(<TextAreaField label="Описание" error="Не более 1000 символов." />);
    const field = screen.getByLabelText("Описание");

    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Не более 1000 символов.");
  });

  it("works as a controlled text area and keeps line breaks", () => {
    render(<ControlledField />);
    const field = screen.getByLabelText("Описание");

    fireEvent.change(field, { target: { value: "Стихи октября\nи ноября" } });

    expect(field).toHaveValue("Стихи октября\nи ноября");
    expect(screen.getByRole("status")).toHaveTextContent("Стихи октября и ноября");
  });
});
