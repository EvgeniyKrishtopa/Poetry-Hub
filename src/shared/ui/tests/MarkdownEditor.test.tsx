import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { MarkdownFormat } from "@/shared/lib/markdown/markdown.types";

import { MarkdownEditor } from "../MarkdownEditor/MarkdownEditor";
import type { MarkdownEditorProps } from "../MarkdownEditor/MarkdownEditor.types";

const POEM_FORMATS: readonly MarkdownFormat[] = ["bold", "italic", "epigraph", "separator", "indent"];
const POEM_MAX_LENGTH = 10000;

type EditorOptions = Partial<Pick<MarkdownEditorProps, "error" | "formats" | "variant" | "maxLength" | "autoFocus">> & {
  readonly initialValue?: string;
};

/** The editor with its value held in state, labelled the way a caller labels it. */
function Harness({ initialValue = "", ...options }: EditorOptions) {
  const [value, setValue] = useState(initialValue);
  return (
    <>
      <label htmlFor="poem-text">Текст произведения</label>
      <MarkdownEditor
        id="poem-text"
        value={value}
        onChange={setValue}
        error={options.error}
        length={[...value].length}
        maxLength={options.maxLength ?? POEM_MAX_LENGTH}
        formats={options.formats ?? POEM_FORMATS}
        variant={options.variant ?? "poem"}
        autoFocus={options.autoFocus}
      />
    </>
  );
}

function setup(options: EditorOptions = {}) {
  const user = userEvent.setup();
  render(<Harness {...options} />);
  return { user, textarea: screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Текст произведения" }) };
}

describe("MarkdownEditor", () => {
  // implements FR-3 of add-poem-creation
  it("shows only the given formats, in order", () => {
    setup();

    const toolbarButtons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(toolbarButtons).toEqual(["Жирный", "Курсив", "Эпиграф", "Разделитель частей", "Отступ"]);
    expect(screen.queryByRole("button", { name: "Заголовок" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Маркированный список" })).toBeNull();
  });

  // implements FR-3 of add-poem-creation
  it("wraps the selection in bold and previews the poem with its line breaks", async () => {
    const { user, textarea } = setup({ initialValue: "строка один\nстрока два" });
    textarea.setSelectionRange("строка ".length, "строка один".length);

    await user.click(screen.getByRole("button", { name: "Жирный" }));
    expect(textarea).toHaveValue("строка **один**\nстрока два");

    await user.click(screen.getByRole("tab", { name: "Просмотр" }));
    const panel = screen.getByRole("tabpanel");
    expect(panel.querySelector("strong")).toHaveTextContent("один");
    expect(panel.querySelector("p")?.textContent).toBe("строка один\nстрока два");
    expect(panel.querySelector(".poem")).not.toBeNull();
  });

  // implements FR-11, NFR-5 of add-author-profiles
  it("moves between «Редактор» and «Просмотр» with the arrow keys", async () => {
    const { user } = setup();
    screen.getByRole("tab", { name: "Редактор" }).focus();

    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Просмотр" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Редактор" })).toHaveAttribute("aria-selected", "true");
  });

  // implements FR-4 of add-poem-creation
  it("keeps a long paste whole and shows the over-limit count in the danger colour", async () => {
    const { user, textarea } = setup({ maxLength: 10 });
    await user.click(textarea);

    await user.paste("a".repeat(12));

    expect(textarea).toHaveValue("a".repeat(12));
    expect(screen.getByText("12 / 10")).toHaveClass("text-danger");
  });

  // implements NFR-7 of add-poem-creation
  it("marks the textarea invalid and describes it with the error and the counter", () => {
    const { textarea } = setup({ error: "Обязательное поле." });

    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAccessibleDescription("Обязательное поле. 0 / 10000");
  });

  it("is not invalid without an error, and doesn't take focus on its own", () => {
    const { textarea } = setup();

    expect(textarea).not.toHaveAttribute("aria-invalid");
    expect(textarea).not.toHaveFocus();
    expect(textarea).toHaveAccessibleDescription("0 / 10000");
  });

  // implements NFR-5 of add-author-profiles
  it("takes focus on mount when autoFocus is set", () => {
    const { textarea } = setup({ autoFocus: true });

    expect(textarea).toHaveFocus();
  });
});
