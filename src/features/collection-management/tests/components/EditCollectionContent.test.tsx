import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";

import { CollectionFormSkeleton } from "../../components/CollectionFormSkeleton/CollectionFormSkeleton";
import { EditCollectionContent } from "../../components/EditCollectionContent/EditCollectionContent";
import { EditCollectionForm } from "../../components/EditCollectionForm/EditCollectionForm";
import type { EditCollectionFormProps } from "../../components/EditCollectionForm/EditCollectionForm.types";
import { EditCollectionPage } from "../../components/EditCollectionPage/EditCollectionPage";
import { getOwnCollection } from "../../dal/own-collections";
import type { OwnCollection } from "../../model/collection-management.types";

vi.mock("server-only", () => ({}));
vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("../../dal/own-collections", () => ({ getOwnCollection: vi.fn() }));
// The form has its own tests; here only the props it receives matter.
vi.mock("../../components/EditCollectionForm/EditCollectionForm", () => ({ EditCollectionForm: vi.fn(() => null) }));
vi.mock("next/navigation", () => ({
  // The session outage alert's retry button.
  useRouter: () => ({ refresh: vi.fn() }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const COLLECTION: OwnCollection = { id: COLLECTION_ID, title: "Осенний цикл", description: "Стихи октября" };

type FormElement = ReactElement<EditCollectionFormProps>;

async function content(): Promise<ReactElement> {
  return (await EditCollectionContent({ collectionId: Promise.resolve(COLLECTION_ID) })) as ReactElement;
}

async function formFor(collection: OwnCollection): Promise<FormElement> {
  vi.mocked(getOwnCollection).mockResolvedValue({ ok: true, collection });
  const element = (await content()) as FormElement;
  expect(element.type).toBe(EditCollectionForm);
  return element;
}

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("EditCollectionContent", () => {
  // An async Server Component can't render in jsdom, so these check the tree it returns.
  // implements FR-7 of add-poem-collections
  it("gives the form the stored title and description", async () => {
    const form = await formFor(COLLECTION);

    expect(getOwnCollection).toHaveBeenCalledExactlyOnceWith(COLLECTION_ID);
    expect(form.props).toEqual({
      collectionId: COLLECTION_ID,
      stored: { title: "Осенний цикл", description: "Стихи октября" },
    });
  });

  // implements FR-7 of add-poem-collections
  it("gives an empty description for a collection without one", async () => {
    const form = await formFor({ ...COLLECTION, description: null });

    expect(form.props.stored.description).toBe("");
  });

  // implements FR-9 of add-poem-collections: Back after a save shows the saved values, since the form remounts
  it("keys the form by the stored values, so a save's re-render remounts it fresh", async () => {
    const first = await formFor(COLLECTION);
    const same = await formFor({ ...COLLECTION });
    const newTitle = await formFor({ ...COLLECTION, title: "Осенний цикл 2026" });
    const newDescription = await formFor({ ...COLLECTION, description: null });

    expect(same.key).toBe(first.key);
    expect(newTitle.key).not.toBe(first.key);
    expect(newDescription.key).not.toBe(first.key);
  });

  // implements FR-7 of add-poem-collections
  it("renders the 404 page for a collection that isn't the author's own", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(content()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(EditCollectionForm).not.toHaveBeenCalled();
  });

  // implements FR-7 of add-poem-collections
  it("throws to the error screen when the collection can't be read", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(content()).rejects.toThrow("Edit collection page unavailable");
  });

  // implements FR-16 of add-poem-collections
  it("shows the session outage alert, reading nothing, when the session can't be checked", async () => {
    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });

    render(await content());

    expect(screen.getByRole("alert")).toHaveTextContent("Сервис временно недоступен. Попробуйте позже.");
    expect(getOwnCollection).not.toHaveBeenCalled();
  });

  // implements FR-16 of add-poem-collections: a signed-out visitor is redirected to /login
  it("reads nothing when the session gate redirects", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireSession).mockRejectedValue(redirect);

    await expect(content()).rejects.toBe(redirect);
    expect(getOwnCollection).not.toHaveBeenCalled();
  });
});

interface SuspenseProps {
  fallback: ReactElement;
  children: ReactElement<{ collectionId: Promise<string> }>;
}

describe("EditCollectionPage", () => {
  // implements FR-7 of add-poem-collections
  it("puts the h1 «Редактирование сборника» in the shell on a lang=ru root, and streams the form behind the create page's skeleton", () => {
    const collectionId = Promise.resolve(COLLECTION_ID);
    const element = EditCollectionPage({ collectionId }) as ReactElement<{ lang: string; children: ReactElement[] }>;
    expect(element.props.lang).toBe("ru");

    const [heading, boundary] = element.props.children;
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Редактирование сборника" })).toBeInTheDocument();

    expect(boundary.type).toBe(Suspense);
    const { fallback, children } = boundary.props as SuspenseProps;
    expect(fallback.type).toBe(CollectionFormSkeleton);
    expect(children.type).toBe(EditCollectionContent);
    expect(children.props.collectionId).toBe(collectionId);
  });
});
