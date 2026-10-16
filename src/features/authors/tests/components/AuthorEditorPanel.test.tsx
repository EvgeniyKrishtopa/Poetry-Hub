import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireUserId } from "@/features/auth";

import { AuthorEditorLoader } from "../../components/AuthorEditorLoader/AuthorEditorLoader";
import { AuthorEditorPanel } from "../../components/AuthorEditorPanel/AuthorEditorPanel";
import { AuthorEditorSkeleton } from "../../components/AuthorEditorSkeleton/AuthorEditorSkeleton";
import { getMyAuthorProfile } from "../../dal/my-author-profile";

vi.mock("@/features/auth", () => ({ requireUserId: vi.fn() }));
vi.mock("../../dal/my-author-profile", () => ({ getMyAuthorProfile: vi.fn() }));
vi.mock("../../actions/author-profile.actions", () => ({
  saveNameAction: vi.fn(),
  saveAboutAction: vi.fn(),
  savePhotoAction: vi.fn(),
  deleteProfileFieldAction: vi.fn(),
}));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";

afterEach(() => {
  vi.resetAllMocks();
});

describe("AuthorEditorLoader", () => {
  // implements FR-2, NFR-2 of add-author-profiles
  it("reads no profile when the session gate redirects", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(AuthorEditorLoader()).rejects.toThrow("NEXT_REDIRECT");
    expect(getMyAuthorProfile).not.toHaveBeenCalled();
  });

  // implements FR-18 of add-author-profiles
  it("shows the load-failure alert and no field editor when the read fails", async () => {
    vi.mocked(requireUserId).mockResolvedValue(USER_ID);
    vi.mocked(getMyAuthorProfile).mockResolvedValue({ ok: false, failure: "unavailable" });

    render(await AuthorEditorLoader());

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить профиль. Попробуйте позже.");
    expect(screen.queryByRole("button")).toBeNull();
  });

  // implements FR-2 of add-author-profiles
  it("renders the editor for the own profile", async () => {
    vi.mocked(requireUserId).mockResolvedValue(USER_ID);
    vi.mocked(getMyAuthorProfile).mockResolvedValue({ ok: true, profile: null });

    render(await AuthorEditorLoader());

    expect(screen.getByRole("button", { name: "Добавить имя" })).toBeInTheDocument();
  });
});

interface SuspenseProps {
  fallback: ReactElement;
  children: ReactElement;
}

describe("AuthorEditorPanel", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  // implements FR-2, NFR-8 of add-author-profiles
  it("puts the «Профиль автора» heading in the shell on a lang=ru root, and streams the editor behind its skeleton", () => {
    const element = AuthorEditorPanel() as ReactElement<{ lang: string; children: ReactElement[] }>;
    expect(element.props.lang).toBe("ru");

    const [heading, boundary] = element.props.children;
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Профиль автора" })).toBeInTheDocument();

    expect(boundary.type).toBe(Suspense);
    const { fallback, children } = boundary.props as SuspenseProps;
    expect(children.type).toBe(AuthorEditorLoader);
    expect(fallback.type).toBe(AuthorEditorSkeleton);
  });
});

describe("AuthorEditorSkeleton", () => {
  it("draws four field rows of placeholders, hidden from assistive technology", () => {
    const { container } = render(<AuthorEditorSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(8);
  });
});
