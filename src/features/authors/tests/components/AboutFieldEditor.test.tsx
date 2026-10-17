import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { deleteProfileFieldAction, saveAboutAction } from "../../actions/author-profile.actions";
import { AboutFieldEditor } from "../../components/AboutFieldEditor/AboutFieldEditor";
import type { AboutFieldEditorProps } from "../../components/AboutFieldEditor/AboutFieldEditor.types";

vi.mock("../../actions/author-profile.actions", () => ({
  saveNameAction: vi.fn(),
  saveAboutAction: vi.fn(),
  savePhotoAction: vi.fn(),
  deleteProfileFieldAction: vi.fn(),
}));

const OVER_LIMIT_LENGTH = 1012;

afterEach(() => {
  vi.resetAllMocks();
});

function renderAbout(saved: Pick<AboutFieldEditorProps, "savedAbout" | "savedAlign">) {
  const controls = {
    disabled: false,
    onEditingChange: vi.fn(),
    onActionStart: vi.fn(),
    onActionEnd: vi.fn(),
  };
  const view = render(<AboutFieldEditor {...saved} {...controls} />);
  return { ...view, controls };
}

async function openEmptyEditor() {
  const user = userEvent.setup();
  renderAbout({ savedAbout: null, savedAlign: "left" });
  await user.click(screen.getByRole("button", { name: "Добавить «О себе»" }));
  return { user, textarea: screen.getByRole<HTMLTextAreaElement>("textbox", { name: "О себе" }) };
}

describe("AboutFieldEditor", () => {
  // implements FR-11, NFR-5 of add-author-profiles
  it("offers the seven toolbar buttons by their Russian names", async () => {
    await openEmptyEditor();

    for (const name of ["Жирный", "Курсив", "Заголовок", "Подзаголовок", "Маркированный список", "Нумерованный список", "Цитата"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  // implements FR-11 of add-author-profiles
  it("wraps the selection in bold and keeps it selected", async () => {
    const { user, textarea } = await openEmptyEditor();
    await user.type(textarea, "hello world");
    textarea.setSelectionRange("hello ".length, "hello world".length);

    await user.click(screen.getByRole("button", { name: "Жирный" }));

    expect(textarea).toHaveValue("hello **world**");
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe("world");
  });

  // implements FR-11 of add-author-profiles
  it("renders the Markdown in «Просмотр»", async () => {
    const { user, textarea } = await openEmptyEditor();
    await user.type(textarea, "## Hi");

    await user.click(screen.getByRole("tab", { name: "Просмотр" }));

    expect(screen.getByRole("heading", { level: 2, name: "Hi" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Жирный" })).toBeNull();
  });

  // implements FR-11, NFR-5 of add-author-profiles
  it("moves between «Редактор» and «Просмотр» with the arrow keys", async () => {
    const { user } = await openEmptyEditor();
    screen.getByRole("tab", { name: "Редактор" }).focus();

    await user.keyboard("{ArrowRight}");

    const preview = screen.getByRole("tab", { name: "Просмотр" });
    expect(preview).toHaveAttribute("aria-selected", "true");
    expect(preview).toHaveFocus();
  });

  // implements FR-11 of add-author-profiles
  it("counts code points after trimming", async () => {
    const { user, textarea } = await openEmptyEditor();

    await user.type(textarea, "  hi  ");

    expect(screen.getByText("2 / 1000")).toBeInTheDocument();
  });

  // implements FR-11 of add-author-profiles
  it("keeps a long paste whole and shows the over-limit count in the danger colour", async () => {
    const { user, textarea } = await openEmptyEditor();
    await user.click(textarea);

    await user.paste("a".repeat(OVER_LIMIT_LENGTH));

    expect(textarea).toHaveValue("a".repeat(OVER_LIMIT_LENGTH));
    expect(screen.getByText("1012 / 1000")).toHaveClass("text-danger");
  });

  // implements FR-8, FR-11, NFR-5 of add-author-profiles
  it("sends the text with the chosen alignment, and shows a validation error under about", async () => {
    vi.mocked(saveAboutAction).mockResolvedValue({
      validationErrors: { formErrors: [], fieldErrors: { about: ["Не более 1000 символов."] } },
    });
    const { user, textarea } = await openEmptyEditor();
    await user.type(textarea, "**Поэт**");
    await user.click(screen.getByRole("button", { name: "По центру" }));

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(saveAboutAction).toHaveBeenCalledWith({ about: "**Поэт**", align: "center" });
    const field = screen.getByRole("textbox", { name: "О себе" });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/Не более 1000 символов\./);
  });

  // implements FR-7, FR-9 of add-author-profiles
  it("stays in edit mode with the text and alignment kept after a failed save", async () => {
    vi.mocked(saveAboutAction).mockResolvedValue({ data: { status: "failed", failure: "unavailable" } });
    const { user, textarea } = await openEmptyEditor();
    await user.type(textarea, "Поэт");
    await user.click(screen.getByRole("button", { name: "По центру" }));

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    const field = await screen.findByRole("textbox", { name: "О себе" });
    expect(field).toHaveValue("Поэт");
    expect(field).toHaveAccessibleDescription(/Сохранение сейчас недоступно\. Попробуйте позже\./);
    expect(screen.getByRole("button", { name: "По центру" })).toHaveAttribute("aria-pressed", "true");
  });

  // implements FR-10 of add-author-profiles
  it("starts a new about with left alignment after a delete", async () => {
    vi.mocked(deleteProfileFieldAction).mockResolvedValue({ data: { status: "saved", profile: null } });
    const user = userEvent.setup();
    const { rerender, controls } = renderAbout({ savedAbout: "Поэт", savedAlign: "center" });

    await user.click(screen.getByRole("button", { name: "Удалить" }));
    rerender(<AboutFieldEditor savedAbout={null} savedAlign="center" {...controls} />);
    await user.click(screen.getByRole("button", { name: "Добавить «О себе»" }));

    expect(screen.getByRole("button", { name: "По левому краю" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "По центру" })).toHaveAttribute("aria-pressed", "false");
  });

  // implements FR-6, FR-14 of add-author-profiles
  it("renders a saved about as Markdown with its alignment, and edits it from the saved values", async () => {
    const user = userEvent.setup();
    renderAbout({ savedAbout: "## Поэт", savedAlign: "right" });
    expect(screen.getByRole("heading", { level: 2, name: "Поэт" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Изменить" }));

    expect(screen.getByRole("textbox", { name: "О себе" })).toHaveValue("## Поэт");
    expect(screen.getByRole("button", { name: "По правому краю" })).toHaveAttribute("aria-pressed", "true");
  });
});
