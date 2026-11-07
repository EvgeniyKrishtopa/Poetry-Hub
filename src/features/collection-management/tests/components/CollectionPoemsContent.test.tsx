import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";

import { CollectionPoemsContent } from "../../components/CollectionPoemsContent/CollectionPoemsContent";
import type { CollectionPoemsFormProps } from "../../components/CollectionPoemsForm/CollectionPoemsForm.types";
import { getCollectionPoemChoices } from "../../dal/collection-poems";
import { getOwnCollection } from "../../dal/own-collections";
import type { CollectionPoemChoice, OwnCollection } from "../../model/collection-management.types";

vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("../../dal/own-collections", () => ({ getOwnCollection: vi.fn() }));
vi.mock("../../dal/collection-poems", () => ({ getCollectionPoemChoices: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  // The session alert's retry button.
  useRouter: () => ({ refresh: vi.fn() }),
}));
// The form has its own tests; here only what the content hands it matters.
const formProps = vi.fn();
vi.mock("../../components/CollectionPoemsForm/CollectionPoemsForm", () => ({
  CollectionPoemsForm: (props: CollectionPoemsFormProps) => {
    formProps(props);
    return <div data-testid="collection-poems-form" />;
  },
}));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const COLLECTION: OwnCollection = { id: COLLECTION_ID, title: "Осенний цикл", description: null };
const CHOICES: readonly CollectionPoemChoice[] = [
  { id: "50000000-0000-4000-8000-000000000002", title: "Ночной вокзал", selected: true },
  { id: "50000000-0000-4000-8000-000000000001", title: "Осенний сад", selected: false },
];

async function renderContent() {
  return render(await CollectionPoemsContent({ collectionId: Promise.resolve(COLLECTION_ID) }));
}

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
  vi.mocked(getOwnCollection).mockResolvedValue({ ok: true, collection: COLLECTION });
  vi.mocked(getCollectionPoemChoices).mockResolvedValue({ ok: true, choices: CHOICES });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CollectionPoemsContent", () => {
  // implements FR-4 of add-poems-to-collections
  it("shows the hint with the collection's title and hands the form the choices", async () => {
    await renderContent();

    expect(
      screen.getByText(
        "Отметьте произведения сборника «Осенний цикл». Произведение может входить только в один сборник.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("collection-poems-form")).toBeInTheDocument();
    expect(formProps).toHaveBeenCalledWith({ collectionId: COLLECTION_ID, choices: CHOICES });
    expect(getOwnCollection).toHaveBeenCalledExactlyOnceWith(COLLECTION_ID);
    expect(getCollectionPoemChoices).toHaveBeenCalledExactlyOnceWith(COLLECTION_ID);
  });

  // implements FR-13 of add-poems-to-collections
  it("checks the session before any read", async () => {
    await renderContent();

    const sessionOrder = vi.mocked(requireSession).mock.invocationCallOrder[0] ?? Infinity;
    const readOrder = vi.mocked(getOwnCollection).mock.invocationCallOrder[0] ?? -Infinity;
    expect(sessionOrder).toBeLessThan(readOrder);
  });

  // implements FR-13 of add-poems-to-collections
  it("shows the session alert and reads nothing while the session is unknown", async () => {
    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });

    await renderContent();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(getOwnCollection).not.toHaveBeenCalled();
    expect(getCollectionPoemChoices).not.toHaveBeenCalled();
    expect(formProps).not.toHaveBeenCalled();
  });

  // implements FR-4 of add-poems-to-collections
  it("renders the 404 for another author's collection, before reading the choices", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(renderContent()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getCollectionPoemChoices).not.toHaveBeenCalled();
  });

  // implements FR-4 of add-poems-to-collections
  it("throws to the error screen when the collection can't be read", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(renderContent()).rejects.toThrow("Collection poems page unavailable");
    expect(getCollectionPoemChoices).not.toHaveBeenCalled();
  });

  // implements FR-4 of add-poems-to-collections
  it("throws to the error screen when the choices can't be read", async () => {
    vi.mocked(getCollectionPoemChoices).mockResolvedValue({ ok: false });

    await expect(renderContent()).rejects.toThrow("Collection poems page unavailable");
    expect(formProps).not.toHaveBeenCalled();
  });
});
