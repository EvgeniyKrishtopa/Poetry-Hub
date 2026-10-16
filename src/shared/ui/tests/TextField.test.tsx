import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { TextField } from "../TextField/TextField";

function ControlledField() {
  const [value, setValue] = useState("Анна");
  return (
    <>
      <TextField label="Имя" value={value} onChange={(event) => setValue(event.target.value)} />
      <output>{value}</output>
    </>
  );
}

describe("TextField", () => {
  it("associates the label with the input", () => {
    render(<TextField label="Email" name="email" type="email" />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("name", "email");
  });

  it("sets no error wiring without an error", () => {
    render(<TextField label="Email" />);
    const input = screen.getByLabelText("Email");

    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("renders the error and wires it to the input", () => {
    render(<TextField label="Email" error="Enter a valid email." />);
    const input = screen.getByLabelText("Email");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email.");
    expect(screen.getByText("Enter a valid email.")).toBeInTheDocument();
  });

  it("places the label and input in the caller's grid columns with the columns layout", () => {
    const { container } = render(<TextField label="Имя" layout="columns" error="Обязательное поле." />);

    expect(container.firstElementChild).toHaveClass("contents");
    expect(screen.getByText("Имя")).toHaveClass("min-[600px]:col-start-1");
    expect(screen.getByLabelText("Имя")).toHaveClass("min-[600px]:col-start-2");
    expect(screen.getByText("Обязательное поле.")).toHaveClass("min-[600px]:col-start-2");
  });

  it("works as a controlled input", () => {
    render(<ControlledField />);
    const input = screen.getByLabelText("Имя");
    expect(input).toHaveValue("Анна");

    fireEvent.change(input, { target: { value: "Мария" } });

    expect(input).toHaveValue("Мария");
    expect(screen.getByRole("status")).toHaveTextContent("Мария");
  });
});
