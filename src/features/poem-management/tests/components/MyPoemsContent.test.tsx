import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";

import { DeletedPoemNotice } from "../../components/DeletedPoemNotice/DeletedPoemNotice";
import { MyPoemsContent } from "../../components/MyPoemsContent/MyPoemsContent";
import type { MyPoemsContentProps } from "../../components/MyPoemsContent/MyPoemsContent.types";
import { MyPoemsPage } from "../../components/MyPoemsPage/MyPoemsPage";
import { MyPoemsSkeleton } from "../../components/MyPoemsSkeleton/MyPoemsSkeleton";

vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn(), AUTHOR_EDITOR_PATH: "/account/author" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

const SLOTS = {
  actions: <a href="/slot-action">Slot action</a>,
  board: <section aria-label="Slot board" />,
};

async function renderContent(props?: MyPoemsContentProps) {
  return render(await MyPoemsContent({ ...props }));
}

/** True when `first` comes before `second` in document order. */
function precedes(first: Element, second: Element) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
  vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("MyPoemsContent", () => {
  // implements FR-2 of add-poem-creation
  it("shows only the add link, with no list and no text, when no board is passed", async () => {
    const { container } = await renderContent();

    expect(screen.getByRole("link", { name: "Добавить новое произведение" })).toHaveAttribute(
      "href",
      "/account/poems/new",
    );
    expect(screen.queryByRole("list")).toBeNull();
    expect(container).toHaveTextContent(/^Добавить новое произведение$/);
  });

  // implements FR-1 of edit-poem: the page offers no editing, only the board's links to each poem's owner page
  it("shows no «Редактировать произведение» link", async () => {
    await renderContent(SLOTS);

    expect(screen.queryByRole("link", { name: "Редактировать произведение" })).toBeNull();
  });

  // implements FR-11 of add-poem-creation
  it.each(["unauthenticated", "unavailable", "unknown"] as const)(
    "shows the alert alone when the own profile read fails (%s)",
    async (failure) => {
      vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure });

      await renderContent(SLOTS);

      expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить произведения. Попробуйте позже.");
      expect(screen.queryByRole("link")).toBeNull();
    },
  );

  // implements FR-2, FR-3 of add-poem-creation
  it("shows the not-public notice and the editor link, and no add link or board, for a non-public profile", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });

    await renderContent(SLOTS);

    expect(screen.getByText("Чтобы добавлять произведения, укажите имя и фамилию в профиле автора.")).toHaveClass(
      "text-muted",
    );
    expect(screen.getByRole("link", { name: "Перейти к профилю автора" })).toHaveAttribute("href", "/account/author");
    expect(screen.queryByRole("link", { name: "Добавить новое произведение" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Slot board" })).toBeNull();
  });

  // implements FR-2 of add-poem-creation
  it("shows the session outage alert with «Повторить», reading no profile, when the session can't be checked", async () => {
    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });

    await renderContent(SLOTS);

    expect(screen.getByRole("alert")).toHaveTextContent("Сервис временно недоступен. Попробуйте позже.");
    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Slot board" })).toBeNull();
  });

  // implements FR-1, FR-2 of add-poem-collections, FR-9 of drag-and-drop-ordering
  it("renders actions after the add link in its row, then the board below the row", async () => {
    await renderContent(SLOTS);

    const addLink = screen.getByRole("link", { name: "Добавить новое произведение" });
    const action = screen.getByRole("link", { name: "Slot action" });
    const board = screen.getByRole("region", { name: "Slot board" });

    expect(action.parentElement).toBe(addLink.parentElement);
    expect(addLink.parentElement).toHaveClass("flex", "flex-wrap", "gap-2");
    expect(precedes(addLink, action)).toBe(true);
    expect(addLink.parentElement?.contains(board)).toBe(false);
    expect(precedes(action, board)).toBe(true);
  });

  // implements FR-2 of add-poem-collections
  it("renders neither slot when the own profile read fails", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure: "unavailable" });

    await renderContent(SLOTS);

    expect(screen.queryByRole("link", { name: "Slot action" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Slot board" })).toBeNull();
  });

  // implements FR-2 of add-poem-creation
  it("reads nothing when the session gate redirects", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireSession).mockRejectedValue(redirect);

    await expect(MyPoemsContent({})).rejects.toBe(redirect);
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
    const element = MyPoemsPage({}) as ReactElement<{ lang: string; children: ReactElement[] }>;
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
    const element = MyPoemsPage({}) as ReactElement<{ children: ReactElement[] }>;

    const [, notice, , boundary] = element.props.children;

    expect(notice.type).toBe(DeletedPoemNotice);
    expect(boundary.type).toBe(Suspense);
  });

  // implements FR-1, FR-2 of add-poem-collections, FR-9 of drag-and-drop-ordering
  it("puts the notices slot after the deleted notice, outside the boundary, and passes the other two slots down", () => {
    const notices = <p>Slot notice</p>;
    const { actions, board } = SLOTS;

    const element = MyPoemsPage({ notices, actions, board }) as ReactElement<{ children: ReactElement[] }>;
    const [, deletedNotice, slotNotices, boundary] = element.props.children;

    expect(deletedNotice.type).toBe(DeletedPoemNotice);
    expect(slotNotices).toBe(notices);
    expect(boundary.type).toBe(Suspense);
    const content = (boundary.props as SuspenseProps).children as ReactElement<MyPoemsContentProps>;
    expect(content.type).toBe(MyPoemsContent);
    expect(content.props).toEqual({ actions, board });
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
