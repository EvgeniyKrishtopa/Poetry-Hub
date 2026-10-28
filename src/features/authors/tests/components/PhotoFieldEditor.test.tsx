import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ImageFileCheck } from "@/shared/lib/image-file/image-file.types";
import { validateImageFile } from "@/shared/lib/image-file/validate-image-file";

import { deleteProfileFieldAction, savePhotoAction } from "../../actions/author-profile.actions";
import { PhotoFieldEditor } from "../../components/PhotoFieldEditor/PhotoFieldEditor";

import { deferred } from "./deferred";

vi.mock("../../actions/author-profile.actions", () => ({
  saveNameAction: vi.fn(),
  saveAboutAction: vi.fn(),
  savePhotoAction: vi.fn(),
  deleteProfileFieldAction: vi.fn(),
}));

// The real check by default; a test overrides one call to control its timing or result.
vi.mock("@/shared/lib/image-file/validate-image-file", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/lib/image-file/validate-image-file")>();
  return { validateImageFile: vi.fn(original.validateImageFile) };
});

type PhotoResponse = Awaited<ReturnType<typeof savePhotoAction>>;
type DeleteResponse = Awaited<ReturnType<typeof deleteProfileFieldAction>>;

const SAVED_URL = "https://abc.supabase.co/storage/v1/object/public/author-photos/a/b.jpg";
const PREVIEW_URL = "blob:http://localhost:3000/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const FULL_NAME = "Анна Ахматова";
const SIX_MEGABYTES = 6 * 1024 * 1024;

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const GIF_HEADER = [...new TextEncoder().encode("GIF89a"), 0, 0, 0, 0, 0, 0];

const UNAVAILABLE = { data: { status: "failed", failure: "unavailable" } } as const;

function pngFile(): File {
  return new File([new Uint8Array(PNG_HEADER)], "photo.png", { type: "image/png" });
}

const controls = {
  disabled: false,
  onEditingChange: vi.fn(),
  onActionStart: vi.fn(),
  onActionEnd: vi.fn(),
};

beforeEach(() => {
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => PREVIEW_URL);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.resetAllMocks();
});

async function chooseFile(file: File, photoUrl: string | null = null) {
  const user = userEvent.setup();
  render(<PhotoFieldEditor photoUrl={photoUrl} fullName={FULL_NAME} {...controls} />);
  await user.click(screen.getByRole("button", { name: photoUrl === null ? "Добавить фото" : "Изменить" }));
  await user.upload(screen.getByLabelText("Фото"), file);
  return user;
}

function placeholder() {
  return document.querySelector("[data-photo-placeholder]");
}

describe("PhotoFieldEditor", () => {
  // implements FR-6, FR-16 of add-author-profiles
  it("shows the placeholder and «Добавить фото» when there is no photo", () => {
    render(<PhotoFieldEditor photoUrl={null} fullName={FULL_NAME} {...controls} />);

    expect(placeholder()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить фото" })).toBeEnabled();
  });

  // implements NFR-8, NFR-5 of add-author-profiles
  it("labels the picker in Russian and shows the chosen file's name, keeping the native input focusable", async () => {
    const user = userEvent.setup();
    render(<PhotoFieldEditor photoUrl={null} fullName={FULL_NAME} {...controls} />);
    await user.click(screen.getByRole("button", { name: "Добавить фото" }));

    const input = screen.getByLabelText("Фото");
    expect(screen.getByText("Выбрать фото")).toHaveAttribute("for", input.id);
    expect(input).toHaveClass("sr-only");
    // Visually hidden yet focusable: opening the field puts focus on it (NFR-5).
    expect(input).toHaveFocus();

    await user.upload(input, pngFile());

    expect(await screen.findByText("photo.png")).toBeInTheDocument();
  });

  // implements FR-8, NFR-5 of add-author-profiles
  it("rejects a 6 MB file in the browser, without calling the action", async () => {
    const big = new File([new Uint8Array(SIX_MEGABYTES)], "big.jpg", { type: "image/jpeg" });
    await chooseFile(big);

    const input = screen.getByLabelText("Фото");
    expect(await screen.findByText("Файл должен быть не больше 5 МБ.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Файл должен быть не больше 5 МБ.");
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
    expect(savePhotoAction).not.toHaveBeenCalled();
  });

  // implements FR-8 of add-author-profiles
  it("rejects a GIF renamed to .png in the browser, without calling the action", async () => {
    const gif = new File([new Uint8Array(GIF_HEADER)], "photo.png", { type: "image/png" });
    await chooseFile(gif);

    expect(await screen.findByText("Допустимы только изображения PNG или JPEG.")).toBeInTheDocument();
    expect(savePhotoAction).not.toHaveBeenCalled();
  });

  // implements FR-10, FR-12 of add-author-profiles
  it("previews the chosen file, shows it while the save is pending, and revokes the preview once settled", async () => {
    const save = deferred<PhotoResponse>();
    vi.mocked(savePhotoAction).mockReturnValue(save.promise);
    const file = pngFile();
    const user = await chooseFile(file, SAVED_URL);
    expect(await screen.findByRole("img", { name: `Фото: ${FULL_NAME}` })).toHaveAttribute("src", PREVIEW_URL);

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(savePhotoAction).toHaveBeenCalledWith({ photo: file });
    expect(screen.getByRole("img")).toHaveAttribute("src", PREVIEW_URL);
    expect(screen.getByRole("button", { name: "Сохранение…" })).toBeDisabled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    await act(async () => save.resolve({ data: { status: "saved", profile: null } }));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(PREVIEW_URL);
  });

  // implements FR-7, FR-9 of add-author-profiles
  it("shows the previous photo with the error after a failed save", async () => {
    vi.mocked(savePhotoAction).mockResolvedValue(UNAVAILABLE);
    const user = await chooseFile(pngFile(), SAVED_URL);
    await screen.findByRole("img");

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("Сохранение сейчас недоступно. Попробуйте позже.")).toBeInTheDocument();
    expect(screen.getByRole("img").getAttribute("src")).toContain("/_next/image");
    expect(screen.getByRole("button", { name: "Изменить" })).toBeEnabled();
  });

  // implements FR-7 of add-author-profiles
  it("shows the placeholder again after a failed first upload", async () => {
    vi.mocked(savePhotoAction).mockResolvedValue(UNAVAILABLE);
    const user = await chooseFile(pngFile());
    await screen.findByRole("img");

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("Сохранение сейчас недоступно. Попробуйте позже.")).toBeInTheDocument();
    expect(placeholder()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить фото" })).toBeEnabled();
  });

  // implements FR-10 of add-author-profiles
  it("shows the placeholder with «Удаление…» while a delete is pending, then «Добавить фото»", async () => {
    const remove = deferred<DeleteResponse>();
    vi.mocked(deleteProfileFieldAction).mockReturnValue(remove.promise);
    const user = userEvent.setup();
    const { rerender } = render(<PhotoFieldEditor photoUrl={SAVED_URL} fullName={FULL_NAME} {...controls} />);

    await user.click(screen.getByRole("button", { name: "Удалить" }));

    expect(deleteProfileFieldAction).toHaveBeenCalledWith({ field: "photo" });
    expect(placeholder()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Удаление…" })).toBeDisabled();

    await act(async () => remove.resolve({ data: { status: "saved", profile: null } }));
    rerender(<PhotoFieldEditor photoUrl={null} fullName={FULL_NAME} {...controls} />);

    expect(placeholder()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить фото" })).toBeEnabled();
  });

  // implements FR-10 of add-author-profiles
  it("shows the previous photo again after a failed delete", async () => {
    vi.mocked(deleteProfileFieldAction).mockResolvedValue(UNAVAILABLE);
    const user = userEvent.setup();
    render(<PhotoFieldEditor photoUrl={SAVED_URL} fullName={FULL_NAME} {...controls} />);

    await user.click(screen.getByRole("button", { name: "Удалить" }));

    expect(await screen.findByText("Сохранение сейчас недоступно. Попробуйте позже.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `Фото: ${FULL_NAME}` })).toBeInTheDocument();
  });

  // implements FR-8 of add-author-profiles
  it("drops the preview and disables Сохранить when a rejected file replaces a valid one", async () => {
    const user = await chooseFile(pngFile());
    await screen.findByRole("img");
    const gif = new File([new Uint8Array(GIF_HEADER)], "photo.png", { type: "image/png" });

    await user.upload(screen.getByLabelText("Фото"), gif);

    expect(await screen.findByText("Допустимы только изображения PNG или JPEG.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(PREVIEW_URL);
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  });

  // implements FR-8 of add-author-profiles
  it("checks the file again on Сохранить and sends nothing when it fails then", async () => {
    const user = await chooseFile(pngFile());
    await screen.findByRole("img");
    vi.mocked(validateImageFile).mockResolvedValueOnce({ ok: false, error: "too-large" });

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("Файл должен быть не больше 5 МБ.")).toBeInTheDocument();
    expect(savePhotoAction).not.toHaveBeenCalled();
  });

  // implements FR-8 of add-author-profiles
  it("keeps the file chosen last when an earlier file's check finishes after it", async () => {
    const slowCheck = deferred<ImageFileCheck>();
    vi.mocked(validateImageFile).mockReturnValueOnce(slowCheck.promise);
    const first = pngFile();
    const second = new File([new Uint8Array(PNG_HEADER)], "second.png", { type: "image/png" });
    const user = await chooseFile(first);

    await user.upload(screen.getByLabelText("Фото"), second);
    await screen.findByRole("img");
    await act(async () => slowCheck.resolve({ ok: true, type: "png" }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(second);
  });

  // Next keeps a left route mounted but hidden (Cache Components), running effect cleanups on hide.
  it("gives the kept file a fresh preview when the page is shown again", async () => {
    const user = userEvent.setup();
    const freshUrl = "blob:http://localhost:3000/0e5c8a5d-7f2b-4c1a-9b1e-3d6f4a2c8e10";
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <PhotoFieldEditor photoUrl={null} fullName={FULL_NAME} {...controls} />
      </Activity>
    );
    const { rerender } = render(page("visible"));
    await user.click(screen.getByRole("button", { name: "Добавить фото" }));
    await user.upload(screen.getByLabelText("Фото"), pngFile());
    await screen.findByRole("img");

    rerender(page("hidden"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(PREVIEW_URL);

    vi.mocked(URL.createObjectURL).mockReturnValue(freshUrl);
    rerender(page("visible"));

    expect(await screen.findByRole("img")).toHaveAttribute("src", freshUrl);
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
  });

  it("releases the chosen file's preview when the editor unmounts", async () => {
    await chooseFile(pngFile());
    await screen.findByRole("img");

    cleanup();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(PREVIEW_URL);
  });

  // implements FR-6 of add-author-profiles
  it("discards the chosen file on Отмена", async () => {
    const user = await chooseFile(pngFile(), SAVED_URL);
    await screen.findByRole("img");

    await user.click(screen.getByRole("button", { name: "Отмена" }));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(PREVIEW_URL);
    expect(screen.getByRole("img").getAttribute("src")).toContain("/_next/image");
    expect(savePhotoAction).not.toHaveBeenCalled();
  });
});
