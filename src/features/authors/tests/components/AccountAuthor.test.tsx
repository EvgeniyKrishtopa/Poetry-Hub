import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireUserId } from "@/features/auth";

import { AccountAuthorLinks } from "../../components/AccountAuthorLinks/AccountAuthorLinks";
import { AccountAuthorLoader } from "../../components/AccountAuthorLoader/AccountAuthorLoader";
import { AccountAuthorSection } from "../../components/AccountAuthorSection/AccountAuthorSection";
import { getMyAuthorProfile } from "../../dal/my-author-profile";
import type { AuthorProfile, MyProfileResult } from "../../model/author.types";

vi.mock("@/features/auth", () => ({ requireUserId: vi.fn() }));
vi.mock("../../dal/my-author-profile", () => ({ getMyAuthorProfile: vi.fn() }));

const PROFILE_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";

function profile(firstName: string | null, lastName: string | null): MyProfileResult {
  const own: AuthorProfile = { id: PROFILE_ID, firstName, lastName, about: null, aboutAlign: "left", photoUrl: null };
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

  // implements FR-18 of add-author-profiles
  it("shows the load-failure alert instead of any link when the read failed", () => {
    render(<AccountAuthorLinks result={{ ok: false, failure: "unavailable" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить профиль. Попробуйте позже.");
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("AccountAuthorLoader", () => {
  // implements FR-1, NFR-2 of add-author-profiles
  it("reads no profile when the session gate redirects", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(AccountAuthorLoader()).rejects.toThrow("NEXT_REDIRECT");
    expect(getMyAuthorProfile).not.toHaveBeenCalled();
  });

  // implements FR-1, FR-18 of add-author-profiles
  it("renders the «Профиль автора» section over the links for the read's result", async () => {
    const result: MyProfileResult = { ok: false, failure: "unavailable" };
    vi.mocked(requireUserId).mockResolvedValue(USER_ID);
    vi.mocked(getMyAuthorProfile).mockResolvedValue(result);

    render(await AccountAuthorLoader());

    expect(screen.getByRole("heading", { level: 2, name: "Профиль автора" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить профиль. Попробуйте позже.");
  });
});

interface SuspenseProps {
  fallback: ReactElement;
  children: ReactElement;
}

describe("AccountAuthorSection", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  // implements FR-1, NFR-8 of add-author-profiles
  it("puts the «Личный кабинет» heading in the shell on a lang=ru root, and streams the loader with skeletons", () => {
    const element = AccountAuthorSection() as ReactElement<{ lang: string; children: ReactElement[] }>;
    expect(element.props.lang).toBe("ru");

    const [heading, boundary] = element.props.children;
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Личный кабинет" })).toBeInTheDocument();

    expect(boundary.type).toBe(Suspense);
    const { fallback, children } = boundary.props as SuspenseProps;
    expect(children.type).toBe(AccountAuthorLoader);
    const { container } = render(fallback);
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(2);
  });
});
