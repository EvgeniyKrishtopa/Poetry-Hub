import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { listPoemGenres, type PoemGenre } from "@/features/poems";

import { NewPoemContent } from "../../components/NewPoemContent/NewPoemContent";
import { NewPoemPage } from "../../components/NewPoemPage/NewPoemPage";
import { NewPoemSkeleton } from "../../components/NewPoemSkeleton/NewPoemSkeleton";

vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn(), AUTHOR_EDITOR_PATH: "/account/author" }));
vi.mock("@/features/poems", () => ({ listPoemGenres: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// The form has its own tests; here it only shows which genres it was given.
vi.mock("../../components/NewPoemForm/NewPoemForm", () => ({
  NewPoemForm: ({ genres }: { genres: readonly PoemGenre[] }) => (
    <form aria-label="new poem" data-genres={genres.map((genre) => genre.name).join(",")} />
  ),
}));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const GENRES: readonly PoemGenre[] = [
  { id: "lyric", name: "Лирика" },
  { id: "sonnet", name: "Сонет" },
];

async function renderContent() {
  return render(await NewPoemContent());
}

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
  vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
  vi.mocked(listPoemGenres).mockResolvedValue({ ok: true, genres: GENRES });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("NewPoemContent", () => {
  // implements FR-3 of add-poem-creation
  it("renders the form with the genre list for a public own profile", async () => {
    await renderContent();

    expect(screen.getByRole("form", { name: "new poem" })).toHaveAttribute("data-genres", "Лирика,Сонет");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // implements FR-3 of add-poem-creation
  it("shows the genres-unavailable alert and no form when the genres can't be read", async () => {
    vi.mocked(listPoemGenres).mockResolvedValue({ ok: false, reason: "unavailable" });

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent("Список жанров сейчас недоступен. Попробуйте позже.");
    expect(screen.queryByRole("form")).toBeNull();
  });

  // implements FR-2, FR-3 of add-poem-creation
  it("shows the not-public notice and no form, reading no genres, for a non-public profile", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });

    await renderContent();

    expect(screen.getByText("Чтобы добавлять произведения, укажите имя и фамилию в профиле автора.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти к профилю автора" })).toHaveAttribute("href", "/account/author");
    expect(screen.queryByRole("form")).toBeNull();
    expect(listPoemGenres).not.toHaveBeenCalled();
  });

  // implements FR-11 of add-poem-creation
  it("shows the load alert and no form when the own profile read fails", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure: "unavailable" });

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить произведения. Попробуйте позже.");
    expect(screen.queryByRole("form")).toBeNull();
    expect(listPoemGenres).not.toHaveBeenCalled();
  });

  // implements FR-3 of add-poem-creation
  it("shows the session outage alert, reading nothing, when the session can't be checked", async () => {
    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent("Сервис временно недоступен. Попробуйте позже.");
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
  });

  // implements FR-3 of add-poem-creation
  it("reads nothing when the session gate redirects", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireSession).mockRejectedValue(redirect);

    await expect(NewPoemContent()).rejects.toBe(redirect);
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
  });
});

interface SuspenseProps {
  fallback: ReactElement;
  children: ReactElement;
}

describe("NewPoemPage", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  // implements FR-3, FR-13 of add-poem-creation
  it("puts the h1 «Добавление нового произведения» in the shell on a lang=ru root, and streams the form behind its skeleton", () => {
    const element = NewPoemPage() as ReactElement<{ lang: string; children: ReactElement[] }>;
    expect(element.props.lang).toBe("ru");

    const [heading, boundary] = element.props.children;
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Добавление нового произведения" })).toBeInTheDocument();

    expect(boundary.type).toBe(Suspense);
    const { fallback, children } = boundary.props as SuspenseProps;
    expect(children.type).toBe(NewPoemContent);
    expect(fallback.type).toBe(NewPoemSkeleton);
  });
});

describe("NewPoemSkeleton", () => {
  // implements FR-13 of add-poem-creation
  it("announces «Загрузка…» and draws four field blocks and a button block, hidden and still when reduced", () => {
    const { container } = render(<NewPoemSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Загрузка…");
    const blocks = container.querySelectorAll("[data-skeleton]");
    // A label line and a control per field, then the button.
    expect(blocks).toHaveLength(9);
    for (const block of blocks) {
      expect(block).toHaveClass("motion-reduce:animate-none");
      expect(block.closest("[aria-hidden='true']")).not.toBeNull();
    }
  });
});
