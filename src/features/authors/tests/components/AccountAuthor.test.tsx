import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";

import { AccountAuthorLinks } from "../../components/AccountAuthorLinks/AccountAuthorLinks";
import { AccountAuthorSection } from "../../components/AccountAuthorSection/AccountAuthorSection";
import { AccountAuthorSectionSkeleton } from "../../components/AccountAuthorSectionSkeleton/AccountAuthorSectionSkeleton";
import { AccountPage } from "../../components/AccountPage/AccountPage";
import { getMyAuthorProfile } from "../../dal/my-author-profile";
import type { AuthorProfile, MyProfileResult } from "../../model/author.types";

vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("../../dal/my-author-profile", () => ({ getMyAuthorProfile: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const PROFILE_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";

function profile(firstName: string | null, lastName: string | null): MyProfileResult {
  const own: AuthorProfile = { id: PROFILE_ID, firstName, lastName, about: null, photoUrl: null };
  return { ok: true, profile: own };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("AccountAuthorLinks", () => {
  // implements FR-1 of add-author-profiles
  it("offers «Создать кабинет автора» and no public link when there is no profile", () => {
    render(<AccountAuthorLinks result={{ ok: true, profile: null }} />);

    expect(screen.getByRole("link", { name: "Создать кабинет автора" })).toHaveAttribute("href", "/account/author");
    expect(screen.queryByRole("link", { name: "Открыть публичную страницу" })).toBeNull();
  });

  // implements FR-1 of add-author-profiles
  it("offers «Редактировать профиль автора» and no public link for a profile that isn't public", () => {
    render(<AccountAuthorLinks result={profile("Анна", null)} />);

    expect(screen.getByRole("link", { name: "Редактировать профиль автора" })).toHaveAttribute("href", "/account/author");
    expect(screen.queryByRole("link", { name: "Открыть публичную страницу" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Создать кабинет автора" })).toBeNull();
  });

  // implements FR-1 of add-author-profiles
  it("adds «Открыть публичную страницу» to /authors/<id> for a public profile", () => {
    render(<AccountAuthorLinks result={profile("Анна", "Ахматова")} />);

    expect(screen.getByRole("link", { name: "Редактировать профиль автора" })).toHaveAttribute("href", "/account/author");
    expect(screen.getByRole("link", { name: "Открыть публичную страницу" })).toHaveAttribute(
      "href",
      `/authors/${PROFILE_ID}`,
    );
  });

  // implements FR-1 of add-poem-creation
  it("adds «Управление произведениями» to /account/poems last, for a public profile only", () => {
    render(<AccountAuthorLinks result={profile("Анна", "Ахматова")} />);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Редактировать профиль автора",
      "Открыть публичную страницу",
      "Управление произведениями",
    ]);
    expect(screen.getByRole("link", { name: "Управление произведениями" })).toHaveAttribute("href", "/account/poems");
  });

  // implements FR-1 of add-poem-creation
  it.each([
    ["no profile", { ok: true, profile: null } as const],
    ["a profile with no last name", profile("Анна", null)],
  ])("shows no «Управление произведениями» for %s", (_case, result) => {
    render(<AccountAuthorLinks result={result} />);

    expect(screen.queryByRole("link", { name: "Управление произведениями" })).toBeNull();
  });

  // implements FR-18 of add-author-profiles
  it("shows the load-failure alert instead of any link when the read failed", () => {
    render(<AccountAuthorLinks result={{ ok: false, failure: "unavailable" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить профиль. Попробуйте позже.");
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("AccountAuthorSection", () => {
  // implements FR-1, NFR-2 of add-author-profiles
  it("reads no profile when the session gate redirects", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(AccountAuthorSection()).rejects.toThrow("NEXT_REDIRECT");
    expect(getMyAuthorProfile).not.toHaveBeenCalled();
  });

  // implements FR-1, FR-18 of add-author-profiles
  it("renders the «Профиль автора» section over the links for the read's result", async () => {
    const result: MyProfileResult = { ok: false, failure: "unavailable" };
    vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(getMyAuthorProfile).mockResolvedValue(result);

    render(await AccountAuthorSection());

    expect(screen.getByRole("heading", { level: 2, name: "Профиль автора" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить профиль. Попробуйте позже.");
  });

  // implements FR-20 of add-author-profiles
  it("keeps the heading and shows the outage alert with «Повторить», reading no profile, when the session can't be checked", async () => {
    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });

    render(await AccountAuthorSection());

    expect(screen.getByRole("heading", { level: 2, name: "Профиль автора" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Сервис временно недоступен. Попробуйте позже.");
    expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
    expect(screen.queryByRole("link")).toBeNull();
    expect(getMyAuthorProfile).not.toHaveBeenCalled();
  });
});

interface SuspenseProps {
  fallback: ReactElement;
  children: ReactElement;
}

describe("AccountPage", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  // implements FR-1, NFR-8 of add-author-profiles
  it("puts the «Мастерская поэта» heading in the shell on a lang=ru root, and streams the section behind its skeleton", () => {
    const element = AccountPage() as ReactElement<{ lang: string; children: ReactElement[] }>;
    expect(element.props.lang).toBe("ru");

    const [heading, boundary] = element.props.children;
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Мастерская поэта" })).toBeInTheDocument();

    expect(boundary.type).toBe(Suspense);
    const { fallback, children } = boundary.props as SuspenseProps;
    expect(children.type).toBe(AccountAuthorSection);
    expect(fallback.type).toBe(AccountAuthorSectionSkeleton);
  });
});

describe("AccountAuthorSectionSkeleton", () => {
  it("draws the heading and link-pill placeholders, hidden from assistive technology", () => {
    const { container } = render(<AccountAuthorSectionSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(2);
  });
});
