import { render, screen, within } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { listAuthorPoems, type Poem } from "@/features/poems";

import { DeletedPoemNotice } from "../../components/DeletedPoemNotice/DeletedPoemNotice";
import { MyPoemsContent } from "../../components/MyPoemsContent/MyPoemsContent";
import type { MyPoemsContentProps } from "../../components/MyPoemsContent/MyPoemsContent.types";
import { MyPoemsPage } from "../../components/MyPoemsPage/MyPoemsPage";
import { MyPoemsSkeleton } from "../../components/MyPoemsSkeleton/MyPoemsSkeleton";
import type { CollectedPoemsRead } from "../../model/poem-management.types";

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

const FIRST_SNOW = poem("30000000-0000-4000-8000-000000000033", "Первый снег", "2026-10-03");

const readCollectedPoems = vi.fn<() => Promise<CollectedPoemsRead>>();

function collectedAre(...poems: readonly Poem[]) {
  readCollectedPoems.mockResolvedValue({ ok: true, poems: poems.map(({ id }) => ({ id })) });
}

async function renderContent(props?: Omit<MyPoemsContentProps, "readCollectedPoems">) {
  return render(await MyPoemsContent({ ...props, readCollectedPoems }));
}

const SLOTS = {
  actions: <a href="/slot-action">Slot action</a>,
  beforeList: <section aria-label="Slot section" />,
};

function listedTitles() {
  return within(screen.getByRole("list")).getAllByRole("link").map((link) => link.textContent);
}

/** True when `first` comes before `second` in document order. */
function precedes(first: Element, second: Element) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
  vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
  vi.mocked(listAuthorPoems).mockResolvedValue({ ok: true, poems: [NIGHT_STATION, AUTUMN_GARDEN] });
  collectedAre();
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

  // implements FR-1 of edit-poem: the list offers no editing, only links to each poem's owner page
  it("shows no «Редактировать произведение» link", async () => {
    await renderContent();

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Редактировать произведение" })).toBeNull();
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

  // implements FR-1, FR-2 of add-poem-collections
  it("renders actions after the add link in its row, then beforeList, then the poem list", async () => {
    await renderContent(SLOTS);

    const addLink = screen.getByRole("link", { name: "Добавить новое произведение" });
    const action = screen.getByRole("link", { name: "Slot action" });
    const section = screen.getByRole("region", { name: "Slot section" });
    const list = screen.getByRole("list");

    expect(action.parentElement).toBe(addLink.parentElement);
    expect(addLink.parentElement).toHaveClass("flex", "flex-wrap", "gap-2");
    expect(precedes(addLink, action)).toBe(true);
    expect(addLink.parentElement?.contains(section)).toBe(false);
    expect(precedes(action, section)).toBe(true);
    expect(precedes(section, list)).toBe(true);
  });

  // implements FR-2 of add-poem-collections
  it("keeps both slots when only the poem list read fails", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue({ ok: false, reason: "unavailable" });

    await renderContent(SLOTS);

    expect(screen.getByRole("link", { name: "Slot action" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Slot section" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить произведения. Попробуйте позже.");
  });

  // implements FR-2 of add-poem-collections
  it("renders neither slot for a non-public profile", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });

    await renderContent(SLOTS);

    expect(screen.queryByRole("link", { name: "Slot action" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Slot section" })).toBeNull();
  });

  // implements FR-2 of add-poem-collections
  it("renders neither slot when the own profile read fails", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure: "unavailable" });

    await renderContent(SLOTS);

    expect(screen.queryByRole("link", { name: "Slot action" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Slot section" })).toBeNull();
  });

  // implements FR-2 of add-poem-creation
  it("reads nothing when the session gate redirects", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireSession).mockRejectedValue(redirect);

    await expect(MyPoemsContent({ readCollectedPoems })).rejects.toBe(redirect);
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
    expect(readCollectedPoems).not.toHaveBeenCalled();
  });
});

describe("MyPoemsContent: free poems only", () => {
  // implements FR-1 of show-only-free-poems
  it("lists only the poems in no collection, newest first, after the section", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue({ ok: true, poems: [FIRST_SNOW, NIGHT_STATION, AUTUMN_GARDEN] });
    collectedAre(NIGHT_STATION);

    await renderContent(SLOTS);

    expect(readCollectedPoems).toHaveBeenCalledOnce();
    expect(listedTitles()).toEqual(["Первый снег", "Осенний сад"]);
    expect(precedes(screen.getByRole("region", { name: "Slot section" }), screen.getByRole("list"))).toBe(true);
  });

  // implements FR-1 of show-only-free-poems
  it("lists only «Первый снег» when the other two poems are in a collection", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue({ ok: true, poems: [FIRST_SNOW, NIGHT_STATION, AUTUMN_GARDEN] });
    collectedAre(NIGHT_STATION, AUTUMN_GARDEN);

    await renderContent(SLOTS);

    expect(listedTitles()).toEqual(["Первый снег"]);
  });

  // implements FR-1 of show-only-free-poems
  it("shows no list and no text when every poem is in a collection", async () => {
    collectedAre(NIGHT_STATION, AUTUMN_GARDEN);

    const { container } = await renderContent();

    expect(screen.queryByRole("list")).toBeNull();
    expect(container).toHaveTextContent(/^Добавить новое произведение$/);
  });

  // implements FR-2 of show-only-free-poems
  it("shows the list alert and no poem link when the membership read fails, keeping the buttons and the section", async () => {
    readCollectedPoems.mockResolvedValue({ ok: false });

    await renderContent(SLOTS);

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить произведения. Попробуйте позже.");
    expect(screen.queryByRole("list")).toBeNull();
    for (const title of ["Ночной вокзал", "Осенний сад"]) expect(screen.queryByRole("link", { name: title })).toBeNull();
    expect(screen.getByRole("link", { name: "Добавить новое произведение" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Slot action" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Slot section" })).toBeInTheDocument();
  });

  // implements FR-1, FR-2 of show-only-free-poems
  it("still lists free poems only when the section shows its own collections alert", async () => {
    collectedAre(NIGHT_STATION);

    await renderContent({ ...SLOTS, beforeList: <p role="alert">Не удалось загрузить сборники. Попробуйте позже.</p> });

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить сборники. Попробуйте позже.");
    expect(listedTitles()).toEqual(["Осенний сад"]);
  });

  // implements FR-2 of show-only-free-poems
  it("shows the list alert when the poem read fails, whatever the membership read says", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue({ ok: false, reason: "unavailable" });
    collectedAre(NIGHT_STATION);

    await renderContent(SLOTS);

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить произведения. Попробуйте позже.");
    expect(screen.queryByRole("list")).toBeNull();
  });

  // implements FR-1, FR-2 of show-only-free-poems
  it.each([
    ["the session can't be checked", () => vi.mocked(requireSession).mockResolvedValue({ state: "unknown" })],
    ["the profile isn't public", () => vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" })],
    [
      "the profile read fails",
      () => vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure: "unavailable" }),
    ],
  ])("doesn't read membership when %s", async (_case, arrange) => {
    arrange();

    await renderContent();

    expect(readCollectedPoems).not.toHaveBeenCalled();
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
    const element = MyPoemsPage({ readCollectedPoems }) as ReactElement<{ lang: string; children: ReactElement[] }>;
    expect(element.props.lang).toBe("ru");

    const [heading, , , boundary] = element.props.children;
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Ваши Произведения" })).toBeInTheDocument();

    expect(boundary.type).toBe(Suspense);
    const { fallback, children } = boundary.props as SuspenseProps;
    expect(children.type).toBe(MyPoemsContent);
    expect(fallback.type).toBe(MyPoemsSkeleton);
  });

  // implements FR-3, FR-4 of delete-poem
  it("puts the deleted notice between the heading and the boundary, so a failed list read keeps it", () => {
    const element = MyPoemsPage({ readCollectedPoems }) as ReactElement<{ children: ReactElement[] }>;

    const [, notice, , boundary] = element.props.children;

    expect(notice.type).toBe(DeletedPoemNotice);
    expect(boundary.type).toBe(Suspense);
  });

  // implements FR-1, FR-2 of add-poem-collections
  it("puts the notices slot after the deleted notice, outside the boundary, and passes the other two slots down", () => {
    const notices = <p>Slot notice</p>;
    const actions = <a href="/slot-action">Slot action</a>;
    const beforeList = <section aria-label="Slot section" />;

    const element = MyPoemsPage({ notices, actions, beforeList, readCollectedPoems }) as ReactElement<{
      children: ReactElement[];
    }>;
    const [, deletedNotice, slotNotices, boundary] = element.props.children;

    expect(deletedNotice.type).toBe(DeletedPoemNotice);
    expect(slotNotices).toBe(notices);
    expect(boundary.type).toBe(Suspense);
    const content = (boundary.props as SuspenseProps).children as ReactElement<MyPoemsContentProps>;
    expect(content.type).toBe(MyPoemsContent);
    expect(content.props).toEqual({ actions, beforeList, readCollectedPoems });
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
