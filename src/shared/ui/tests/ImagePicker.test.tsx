import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImagePicker } from "../ImagePicker/ImagePicker";

describe("ImagePicker", () => {
  it("names the hidden file input with its button label and shows the chosen file's name", () => {
    render(
      <ImagePicker
        id="illustration"
        buttonLabel="Выбрать иллюстрацию"
        fileName="рисунок.png"
        errorId={undefined}
        onFileChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Выбрать иллюстрацию");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "image/png,image/jpeg");
    expect(input).not.toHaveFocus();
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText("рисунок.png")).toBeInTheDocument();
  });

  it("is invalid and described by the error when one is shown", () => {
    render(
      <>
        <ImagePicker id="photo" buttonLabel="Выбрать фото" fileName={null} errorId="photo-error" onFileChange={vi.fn()} />
        <p id="photo-error">Файл должен быть не больше 5 МБ.</p>
      </>,
    );

    const input = screen.getByLabelText("Выбрать фото");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Файл должен быть не больше 5 МБ.");
  });
});
