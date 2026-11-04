import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";
import { listPoemGenres, type Poem, type PoemGenre } from "@/features/poems";

import { EditPoemContent } from "../../components/EditPoemContent/EditPoemContent";
import { EditPoemForm } from "../../components/EditPoemForm/EditPoemForm";
import type { EditPoemFormProps } from "../../components/EditPoemForm/EditPoemForm.types";
import { EditPoemPage } from "../../components/EditPoemPage/EditPoemPage";
import { PoemFormSkeleton } from "../../components/PoemFormSkeleton/PoemFormSkeleton";
import { getOwnPoem } from "../../dal/own-poem";

vi.mock("server-only", () => ({}));
vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("@/features/poems", () => ({ listPoemGenres: vi.fn() }));
vi.mock("../../dal/own-poem", () => ({ getOwnPoem: vi.fn() }));
// The form has its own tests; here only the props it receives matter.
vi.mock("../../components/EditPoemForm/EditPoemForm", () => ({ EditPoemForm: vi.fn(() => null) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const POEM_ID = "30000000-0000-4000-8000-000000000021";
const ILLUSTRATION_URL = "http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/a/b.png";
const GENRES: readonly PoemGenre[] = [
  { id: "lyric", name: "Лирика" },
  { id: "sonnet", name: "Сонет" },
];
const POEM: Poem = {
  id: POEM_ID,
  title: "Первый снег",
  text: "строка",
  illustrationUrl: ILLUSTRATION_URL,
  publishedAt: "2026-10-01",
  genreId: "lyric",
};

type FormElement = ReactElement<EditPoemFormProps>;

async function content(): Promise<ReactElement> {
  return (await EditPoemContent({ poemId: Promise.resolve(POEM_ID) })) as ReactElement;
}

async function formFor(poem: Poem): Promise<FormElement> {
  vi.mocked(getOwnPoem).mockResolvedValue({ ok: true, poem });
  const element = (await content()) as FormElement;
  expect(element.type).toBe(EditPoemForm);
  return element;
}

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
  vi.mocked(listPoemGenres).mockResolvedValue({ ok: true, genres: GENRES });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("EditPoemContent", () => {
  // An async Server Component can't render in jsdom, so these check the tree it returns.
  // implements FR-2 of edit-poem
  it("gives the form the stored title, text, genre, and illustration, with the genre list", async () => {
    const form = await formFor(POEM);

    expect(getOwnPoem).toHaveBeenCalledExactlyOnceWith(POEM_ID);
    expect(form.props).toEqual({
      poemId: POEM_ID,
      genres: GENRES,
      stored: {
        title: "Первый снег",
        text: "строка",
        genreId: "lyric",
        illustration: { kind: "stored", url: ILLUSTRATION_URL },
      },
    });
  });

  // implements FR-2 of edit-poem
  it("selects «—» for a stored genre no longer offered, and «Без жанра» for none", async () => {
    const removed = await formFor({ ...POEM, genreId: "ballad" });
    expect(removed.props.stored.genreId).toBe("");

    const none = await formFor({ ...POEM, genreId: null, illustrationUrl: null });
    expect(none.props.stored.genreId).toBe(":none");
    expect(none.props.stored.illustration).toEqual({ kind: "none" });
  });

  // implements FR-6 of edit-poem: Back after a save shows the saved values, since the form remounts
  it("keys the form by the stored values, so a save's re-render remounts it fresh", async () => {
    const first = await formFor(POEM);
    const same = await formFor({ ...POEM });
    const saved = await formFor({ ...POEM, title: "Первый снег." });
    const newIllustration = await formFor({ ...POEM, illustrationUrl: `${ILLUSTRATION_URL}?v=2` });

    expect(same.key).toBe(first.key);
    expect(saved.key).not.toBe(first.key);
    expect(newIllustration.key).not.toBe(first.key);
  });

  // implements FR-2 of edit-poem
  it("renders the 404 page for a poem that isn't the author's own, reading no genres", async () => {
    vi.mocked(getOwnPoem).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(content()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(listPoemGenres).not.toHaveBeenCalled();
  });

  // implements FR-2 of edit-poem
  it("throws to the error screen when the poem can't be read", async () => {
    vi.mocked(getOwnPoem).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(content()).rejects.toThrow("Edit poem page unavailable");
  });

  // implements FR-2 of edit-poem
  it("shows the genres alert and no form when the genres can't be read", async () => {
    vi.mocked(getOwnPoem).mockResolvedValue({ ok: true, poem: POEM });
    vi.mocked(listPoemGenres).mockResolvedValue({ ok: false, reason: "unavailable" });

    render(await content());

    expect(screen.getByRole("alert")).toHaveTextContent("Список жанров сейчас недоступен. Попробуйте позже.");
    expect(EditPoemForm).not.toHaveBeenCalled();
  });

  // implements FR-2 of edit-poem
  it("shows the session outage alert, reading nothing, when the session can't be checked", async () => {
    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });

    render(await content());

    expect(screen.getByRole("alert")).toHaveTextContent("Сервис временно недоступен. Попробуйте позже.");
    expect(getOwnPoem).not.toHaveBeenCalled();
  });

  // implements FR-2 of edit-poem: a signed-out visitor is redirected to /login
  it("reads nothing when the session gate redirects", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireSession).mockRejectedValue(redirect);

    await expect(content()).rejects.toBe(redirect);
    expect(getOwnPoem).not.toHaveBeenCalled();
  });
});

interface SuspenseProps {
  fallback: ReactElement;
  children: ReactElement<{ poemId: Promise<string> }>;
}

describe("EditPoemPage", () => {
  // implements FR-2 of edit-poem
  it("puts the h1 «Редактирование произведения» in the shell on a lang=ru root, and streams the form behind the add page's skeleton", () => {
    const poemId = Promise.resolve(POEM_ID);
    const element = EditPoemPage({ poemId }) as ReactElement<{ lang: string; children: ReactElement[] }>;
    expect(element.props.lang).toBe("ru");

    const [heading, boundary] = element.props.children;
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Редактирование произведения" })).toBeInTheDocument();

    expect(boundary.type).toBe(Suspense);
    const { fallback, children } = boundary.props as SuspenseProps;
    expect(fallback.type).toBe(PoemFormSkeleton);
    expect(children.type).toBe(EditPoemContent);
    expect(children.props.poemId).toBe(poemId);
  });
});
