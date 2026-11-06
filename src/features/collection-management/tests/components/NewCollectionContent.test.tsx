import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";

import { CollectionFormSkeleton } from "../../components/CollectionFormSkeleton/CollectionFormSkeleton";
import { NewCollectionContent } from "../../components/NewCollectionContent/NewCollectionContent";
import { NewCollectionPage } from "../../components/NewCollectionPage/NewCollectionPage";

vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn(), AUTHOR_EDITOR_PATH: "/account/author" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// The form has its own tests; here it only shows that it rendered.
vi.mock("../../components/NewCollectionForm/NewCollectionForm", () => ({
  NewCollectionForm: () => <form aria-label="new collection" />,
}));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

async function renderContent() {
  return render(await NewCollectionContent());
}

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
  vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("NewCollectionContent", () => {
  // implements FR-3 of add-poem-collections
  it("renders the form for a public own profile", async () => {
    await renderContent();

    expect(screen.getByRole("form", { name: "new collection" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  // implements FR-16 of add-poem-collections
  it("checks the session before reading the profile", async () => {
    await renderContent();

    expect(requireSession).toHaveBeenCalledTimes(1);
    expect(vi.mocked(requireSession).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(getOwnPublicAuthor).mock.invocationCallOrder[0] ?? 0,
    );
  });

  // implements FR-16 of add-poem-collections
  it("shows the session-unavailable alert and reads nothing when the session can't be checked", async () => {
    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent("Сервис временно недоступен. Попробуйте позже.");
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
    expect(screen.queryByRole("form")).toBeNull();
  });

  // implements FR-3 of add-poem-collections
  it("shows the not-public text and the profile editor link instead of the form", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });

    await renderContent();

    expect(screen.getByText("Чтобы создавать сборники, укажите имя и фамилию в профиле автора.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти к профилю автора" })).toHaveAttribute("href", "/account/author");
    expect(screen.queryByRole("form")).toBeNull();
  });

  // implements FR-3 of add-poem-collections
  it("throws to the generic error screen when the profile can't be read", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure: "unavailable" });

    await expect(NewCollectionContent()).rejects.toThrow("New collection page unavailable");
  });
});

describe("NewCollectionPage", () => {
  // implements FR-3 of add-poem-collections
  it("shows the heading «Создание сборника» in the static shell", () => {
    render(<NewCollectionPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Создание сборника" })).toBeInTheDocument();
  });
});

describe("CollectionFormSkeleton", () => {
  // implements FR-3 of add-poem-collections
  it("announces loading and draws two field blocks and a button block", () => {
    const { container } = render(<CollectionFormSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Загрузка…");
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(5);
  });
});
