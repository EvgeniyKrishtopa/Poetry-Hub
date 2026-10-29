import { render, screen, within } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { listAuthorPoems, type Poem } from "@/features/poems";

import { MyPoemsContent } from "../../components/MyPoemsContent/MyPoemsContent";
import { MyPoemsPage } from "../../components/MyPoemsPage/MyPoemsPage";
import { MyPoemsSkeleton } from "../../components/MyPoemsSkeleton/MyPoemsSkeleton";

vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn(), AUTHOR_EDITOR_PATH: "/account/author" }));
vi.mock("@/features/poems", async () => ({
  listAuthorPoems: vi.fn(),
  // The real list, so the links and their hrefs are what the page renders.
  PoemTitleList: (
    await vi.importActual<typeof import("@/features/poems/components/PoemTitleList/PoemTitleList")>(
      "@/features/poems/components/PoemTitleList/PoemTitleList",
    )
  ).PoemTitleList,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

function poem(id: string, title: string, publishedAt: string): Poem {
  return { id, title, text: "строка", illustrationUrl: null, publishedAt, genreId: null };
}

const NIGHT_STATION = poem("30000000-0000-4000-8000-000000000032", "Ночной вокзал", "2026-10-02");
const AUTUMN_GARDEN = poem("30000000-0000-4000-8000-000000000031", "Осенний сад", "2026-10-01");

async function renderContent() {
  return render(await MyPoemsContent());
}

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
  vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
  vi.mocked(listAuthorPoems).mockResolvedValue({ ok: true, poems: [NIGHT_STATION, AUTUMN_GARDEN] });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("MyPoemsContent", () => {
  // implements FR-2 of add-poem-creation
  it("shows the add link, then the own poems newest first, each linking to its owner page", async () => {
    await renderContent();

    expect(listAuthorPoems).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID);
    expect(screen.getByRole("link", { name: "Добавить новое произведение" })).toHaveAttribute(
      "href",
      "/account/poems/new",
    );
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Ночной вокзал", `/account/poems/${NIGHT_STATION.id}`],
      ["Осенний сад", `/account/poems/${AUTUMN_GARDEN.id}`],
    ]);
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
  });

  // implements FR-2 of add-poem-creation
  it("shows only the add link, with no list and no empty text, when the author has no poems", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue({ ok: true, poems: [] });

    const { container } = await renderContent();

    expect(screen.getByRole("link", { name: "Добавить новое произведение" })).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
    expect(container).toHaveTextContent(/^Добавить новое произведение$/);
  });

  // implements FR-11 of add-poem-creation
  it("keeps the add link and shows the alert instead of the list when the list can't be read", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue({ ok: false, reason: "unavailable" });

    await renderContent();

    expect(screen.getByRole("link", { name: "Добавить новое произведение" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить произведения. Попробуйте позже.");
    expect(screen.queryByRole("list")).toBeNull();
  });

  // implements FR-11 of add-poem-creation
  it.each(["unauthenticated", "unavailable", "unknown"] as const)(
    "shows the alert alone, reading no list, when the own profile read fails (%s)",
    async (failure) => {
      vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure });

      await renderContent();

      expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить произведения. Попробуйте позже.");
      expect(screen.queryByRole("link")).toBeNull();
      expect(listAuthorPoems).not.toHaveBeenCalled();
    },
  );

  // implements FR-2, FR-3 of add-poem-creation
  it("shows the not-public notice and the editor link, and no add link or list, for a non-public profile", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });

    await renderContent();

    expect(screen.getByText("Чтобы добавлять произведения, укажите имя и фамилию в профиле автора.")).toHaveClass(
      "text-muted",
    );
    expect(screen.getByRole("link", { name: "Перейти к профилю автора" })).toHaveAttribute("href", "/account/author");
    expect(screen.queryByRole("link", { name: "Добавить новое произведение" })).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
    expect(listAuthorPoems).not.toHaveBeenCalled();
  });

  // implements FR-2 of add-poem-creation
  it("shows the session outage alert with «Повторить», reading nothing, when the session can't be checked", async () => {
    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent("Сервис временно недоступен. Попробуйте позже.");
    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
  });

  // implements FR-2 of add-poem-creation
  it("reads nothing when the session gate redirects", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireSession).mockRejectedValue(redirect);

    await expect(MyPoemsContent()).rejects.toBe(redirect);
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
  });
});

interface SuspenseProps {
  fallback: ReactElement;
  children: ReactElement;
}

describe("MyPoemsPage", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  // implements FR-2, FR-13, NFR-7 of add-poem-creation
  it("puts the h1 «Ваши Произведения» in the shell on a lang=ru root, and streams the content behind its skeleton", () => {
    const element = MyPoemsPage() as ReactElement<{ lang: string; children: ReactElement[] }>;
    expect(element.props.lang).toBe("ru");

    const [heading, boundary] = element.props.children;
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Ваши Произведения" })).toBeInTheDocument();

    expect(boundary.type).toBe(Suspense);
    const { fallback, children } = boundary.props as SuspenseProps;
    expect(children.type).toBe(MyPoemsContent);
    expect(fallback.type).toBe(MyPoemsSkeleton);
  });
});

describe("MyPoemsSkeleton", () => {
  // implements FR-13 of add-poem-creation
  it("announces «Загрузка…» and draws still-when-reduced blocks hidden from assistive technology", () => {
    const { container } = render(<MyPoemsSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Загрузка…");
    const blocks = container.querySelectorAll("[data-skeleton]");
    expect(blocks).toHaveLength(4);
    for (const block of blocks) {
      expect(block).toHaveClass("motion-reduce:animate-none");
      expect(block.closest("[aria-hidden='true']")).not.toBeNull();
    }
  });
});
