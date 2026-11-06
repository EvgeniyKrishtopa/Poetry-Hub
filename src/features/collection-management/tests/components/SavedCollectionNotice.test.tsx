import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SavedCollectionNotice } from "../../components/SavedCollectionNotice/SavedCollectionNotice";
import { useSavedCollectionNotice } from "../../model/saved-collection-notice-ui.store";

const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const OTHER_ID = "40000000-0000-4000-8000-000000000032";

afterEach(() => {
  useSavedCollectionNotice.getState().clearSavedNotice();
});

describe("SavedCollectionNotice", () => {
  // implements FR-9, NFR-4 of add-poem-collections
  it("shows «Изменения сохранены.» as a status for the collection just saved, then clears the store", () => {
    useSavedCollectionNotice.getState().setSavedNotice({ collectionId: COLLECTION_ID });

    render(<SavedCollectionNotice collectionId={COLLECTION_ID} />);

    expect(screen.getByRole("status")).toHaveTextContent("Изменения сохранены.");
    expect(useSavedCollectionNotice.getState().notice).toBeNull();
  });

  // implements FR-9 of add-poem-collections
  it("shows nothing on a later visit", () => {
    useSavedCollectionNotice.getState().setSavedNotice({ collectionId: COLLECTION_ID });
    const first = render(<SavedCollectionNotice collectionId={COLLECTION_ID} />);
    first.unmount();

    render(<SavedCollectionNotice collectionId={COLLECTION_ID} />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  // implements FR-9 of add-poem-collections
  it("shows nothing on another collection's page", () => {
    useSavedCollectionNotice.getState().setSavedNotice({ collectionId: OTHER_ID });

    render(<SavedCollectionNotice collectionId={COLLECTION_ID} />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  // implements FR-9 of add-poem-collections
  it("shows nothing when nothing was saved", () => {
    render(<SavedCollectionNotice collectionId={COLLECTION_ID} />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
