import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContentPage } from "../../components/ContentPage/ContentPage";
import { ContentPageContent } from "../../components/ContentPageContent/ContentPageContent";
import { CONTENT_PAGE_KEYS } from "../../model/content-page.constants";

vi.mock("../../components/ContentPageContent/ContentPageContent", () => ({
  ContentPageContent: vi.fn(({ entryKey }: { entryKey: string }) => <p>{entryKey}</p>),
}));

describe.each(Object.values(CONTENT_PAGE_KEYS))("ContentPage(%s)", (entryKey) => {
  // implements FR-6 of add-privacy-policy-page
  it("passes its entry key through the Suspense boundary to the content loader", () => {
    render(<ContentPage entryKey={entryKey} />);

    expect(vi.mocked(ContentPageContent).mock.lastCall?.[0]).toEqual({ entryKey });
    expect(screen.getByText(entryKey)).toBeInTheDocument();
  });
});
