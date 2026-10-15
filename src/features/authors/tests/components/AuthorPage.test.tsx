import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { Suspense, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentUserId } from "@/features/auth";

import { AuthorOwnerLink } from "../../components/AuthorOwnerLink/AuthorOwnerLink";
import { AuthorOwnerLinkView } from "../../components/AuthorOwnerLinkView/AuthorOwnerLinkView";
import { AuthorPage } from "../../components/AuthorPage/AuthorPage";
import { AuthorPageContent } from "../../components/AuthorPageContent/AuthorPageContent";
import { AuthorProfileView } from "../../components/AuthorProfileView/AuthorProfileView";
import { getMyAuthorProfile } from "../../dal/my-author-profile";
import { getPublicAuthor } from "../../dal/public-authors";
import type { PublicAuthor } from "../../model/author.types";

vi.mock("@/features/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("../../dal/my-author-profile", () => ({ getMyAuthorProfile: vi.fn() }));
vi.mock("../../dal/public-authors", () => ({ getPublicAuthor: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

const PROFILE_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const OTHER_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const PHOTO_URL = "https://abc.supabase.co/storage/v1/object/public/author-photos/a/b.jpg";

const ANNA: PublicAuthor = {
  id: PROFILE_ID,
  firstName: "Anna",
  lastName: "Akhmatova",
  about: "## Poet",
  aboutAlign: "center",
  photoUrl: PHOTO_URL,
};

function ownProfile(id: string) {
  return { ok: true as const, profile: { ...ANNA, id } };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthorProfileView", () => {
  // implements FR-14, NFR-8 of add-author-profiles
  it("renders the full-name h1, the photo with its alt, and the centred about on a lang=ru root", () => {
    const { container } = render(<AuthorProfileView author={ANNA} ownerLink={null} />);

    expect(screen.getByRole("heading", { level: 1, name: "Anna Akhmatova" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Фото: Anna Akhmatova" })).toBeInTheDocument();
    const subheading = screen.getByRole("heading", { level: 2, name: "Poet" });
    expect(subheading.closest(".text-center")).not.toBeNull();
    expect(container.firstElementChild).toHaveAttribute("lang", "ru");
  });

  // implements FR-14 of add-author-profiles
  it("shows the placeholder instead of an image when there is no photo", () => {
    const { container } = render(<AuthorProfileView author={{ ...ANNA, photoUrl: null }} ownerLink={null} />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("[data-photo-placeholder]")).not.toBeNull();
  });

  // implements FR-14 of add-author-profiles
  it("omits the about section when about is empty", () => {
    render(<AuthorProfileView author={{ ...ANNA, about: null }} ownerLink={null} />);

    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });

  // implements FR-15, NFR-8 of add-author-profiles
  it("places the owner's «Редактировать профиль» link before the h1", () => {
    render(<AuthorProfileView author={ANNA} ownerLink={<AuthorOwnerLinkView isOwner />} />);

    const link = screen.getByRole("link", { name: "Редактировать профиль" });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(link.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("AuthorOwnerLinkView", () => {
  // implements FR-15 of add-author-profiles
  it("links the owner to /account/author", () => {
    render(<AuthorOwnerLinkView isOwner />);

    const link = screen.getByRole("link", { name: "Редактировать профиль" });
    expect(link).toHaveAttribute("href", "/account/author");
    expect(link).toHaveAttribute("lang", "ru");
  });

  // implements FR-15 of add-author-profiles
  it("renders nothing for another visitor", () => {
    const { container } = render(<AuthorOwnerLinkView isOwner={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("AuthorOwnerLink", () => {
  async function isOwnerFor(profileId: string): Promise<boolean> {
    const element = (await AuthorOwnerLink({ profileId })) as ReactElement<{ isOwner: boolean }>;
    expect(element.type).toBe(AuthorOwnerLinkView);
    return element.props.isOwner;
  }

  // implements FR-15 of add-author-profiles
  it("is the owner when the signed-in reader's own profile has this id", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(USER_ID);
    vi.mocked(getMyAuthorProfile).mockResolvedValue(ownProfile(PROFILE_ID));

    await expect(isOwnerFor(PROFILE_ID)).resolves.toBe(true);
  });

  // implements FR-15 of add-author-profiles
  it("is not the owner for another reader's profile", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(USER_ID);
    vi.mocked(getMyAuthorProfile).mockResolvedValue(ownProfile(OTHER_ID));

    await expect(isOwnerFor(PROFILE_ID)).resolves.toBe(false);
  });

  // implements FR-15 of add-author-profiles
  it("is not the owner when signed out, without reading a profile", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    await expect(isOwnerFor(PROFILE_ID)).resolves.toBe(false);
    expect(getMyAuthorProfile).not.toHaveBeenCalled();
  });

  // implements FR-18 of add-author-profiles
  it("shows no link when the own-profile read failed", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(USER_ID);
    vi.mocked(getMyAuthorProfile).mockResolvedValue({ ok: false, failure: "unavailable" });

    await expect(isOwnerFor(PROFILE_ID)).resolves.toBe(false);
  });

  it("is not the owner when the reader has no profile", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(USER_ID);
    vi.mocked(getMyAuthorProfile).mockResolvedValue({ ok: true, profile: null });

    await expect(isOwnerFor(PROFILE_ID)).resolves.toBe(false);
  });
});

describe("AuthorPageContent", () => {
  // implements FR-14 of add-author-profiles
  it("renders the profile view, with the owner check in its own Suspense boundary", async () => {
    vi.mocked(getPublicAuthor).mockResolvedValue({ ok: true, author: ANNA });

    const element = (await AuthorPageContent({ id: Promise.resolve(PROFILE_ID) })) as ReactElement<{
      author: PublicAuthor;
      ownerLink: ReactElement<{ children: ReactElement<{ profileId: string }> }>;
    }>;

    expect(getPublicAuthor).toHaveBeenCalledWith(PROFILE_ID);
    expect(element.type).toBe(AuthorProfileView);
    expect(element.props.author).toBe(ANNA);
    expect(element.props.ownerLink.type).toBe(Suspense);
    expect(element.props.ownerLink.props.children.type).toBe(AuthorOwnerLink);
    expect(element.props.ownerLink.props.children.props.profileId).toBe(PROFILE_ID);
  });

  // implements FR-14 of add-author-profiles
  it("calls notFound() for an unknown or malformed id", async () => {
    vi.mocked(getPublicAuthor).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(AuthorPageContent({ id: Promise.resolve("not-a-uuid") })).rejects.toThrow("404");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("throws to the route's error screen when the profile is unavailable", async () => {
    vi.mocked(getPublicAuthor).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(AuthorPageContent({ id: Promise.resolve(PROFILE_ID) })).rejects.toThrow("Author page unavailable");
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("AuthorPage", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  it("streams the content inside Suspense, with heading, photo, and text skeletons as the fallback", () => {
    const id = Promise.resolve(PROFILE_ID);
    const element = AuthorPage({ id });
    expect(element.type).toBe(Suspense);
    const { fallback, children } = element.props as { fallback: ReactNode; children: ReactElement<{ id: unknown }> };

    expect(children.type).toBe(AuthorPageContent);
    expect(children.props.id).toBe(id);
    const { container } = render(fallback);
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(5);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
