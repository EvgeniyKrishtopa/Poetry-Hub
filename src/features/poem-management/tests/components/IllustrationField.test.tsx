import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IllustrationField } from "../../components/PoemForm/IllustrationField";
import type { IllustrationLayout } from "../../components/PoemForm/IllustrationField.types";
import type { IllustrationState } from "../../model/poem-form-values";
import type { IllustrationLabels } from "../../model/poem-management.types";

// A local-stack URL, which next/image serves as is.
const STORED_URL = "http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/a/b.png";
const PREVIEW_URL = "blob:http://localhost:3000/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const EDIT_LABELS: IllustrationLabels = {
  choose: "Выбрать иллюстрацию",
  replace: "Заменить иллюстрацию",
  remove: "Удалить иллюстрацию",
};

function renderField(illustration: IllustrationState, error?: string, layout: IllustrationLayout = "preview-first") {
  render(
    <IllustrationField
      layout={layout}
      id="illustration"
      pickerKey={0}
      illustration={illustration}
      error={error}
      labels={EDIT_LABELS}
      onFileChange={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
}

// implements FR-4 of edit-poem
describe("IllustrationField", () => {
  it("shows the stored illustration's 16:9 preview with «Заменить иллюстрацию» and «Удалить иллюстрацию»", () => {
    renderField({ kind: "stored", url: STORED_URL });

    const preview = screen.getByRole("presentation");
    expect(preview).toHaveAttribute("src", STORED_URL);
    expect(preview).toHaveAttribute("alt", "");
    expect(preview).toHaveClass("aspect-video", "object-cover");
    expect(screen.getByText("Заменить иллюстрацию")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Удалить иллюстрацию" })).toBeInTheDocument();
  });

  it("shows a newly picked file's preview and name with the replace label", () => {
    const file = new File(["x"], "snow.png", { type: "image/png" });
    renderField({ kind: "new", draft: { file, previewUrl: PREVIEW_URL } });

    expect(screen.getByRole("presentation")).toHaveAttribute("src", PREVIEW_URL);
    expect(screen.getByText("snow.png")).toBeInTheDocument();
    expect(screen.getByText("Заменить иллюстрацию")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Удалить иллюстрацию" })).toBeInTheDocument();
  });

  it("offers only «Выбрать иллюстрацию» with no illustration", () => {
    renderField({ kind: "none" });

    expect(screen.queryByRole("presentation")).toBeNull();
    expect(screen.getByText("Выбрать иллюстрацию")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers the remove button for a rejected file, with no preview", () => {
    renderField({ kind: "none" }, "Допустимы только изображения PNG или JPEG.");

    expect(screen.queryByRole("presentation")).toBeNull();
    expect(screen.getByRole("button", { name: "Удалить иллюстрацию" })).toBeInTheDocument();
  });

  // ui-plan, artboard 26: the edit page's preview comes before the picker, the remove button beside it.
  it("puts the preview first on the edit page, and the picker first on the add form", () => {
    const stored: IllustrationState = { kind: "stored", url: STORED_URL };
    const follows = (first: Element, second: Element) =>
      (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

    renderField(stored, undefined, "preview-first");
    expect(follows(screen.getByRole("presentation"), screen.getByText("Заменить иллюстрацию"))).toBe(true);
    cleanup();

    renderField(stored, undefined, "picker-first");
    expect(follows(screen.getByText("Заменить иллюстрацию"), screen.getByRole("presentation"))).toBe(true);
  });
});
