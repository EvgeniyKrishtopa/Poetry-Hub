import { render, screen, within } from "@testing-library/react";
import { cacheLife } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { FOOTER_LINK_CLASS } from "../../model/site-footer.constants";

const NAV_NAME = "Информация о проекте";

const CONTACT_STUB_LABEL = "Contact stub";

// The real dialog has its own tests; this stand-in shows which class the footer hands it.
vi.mock("@/features/contact", () => ({
  ContactDialog: ({ triggerClassName }: { readonly triggerClassName: string }) => (
    <button type="button" className={triggerClassName}>
      {CONTACT_STUB_LABEL}
    </button>
  ),
}));

async function renderFooterAt(isoDate: string) {
  vi.setSystemTime(new Date(isoDate));
  render(await SiteFooter());
}

describe("SiteFooter", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // implements FR-2 of add-site-footer
  it("shows only the founding year while it is still the founding year", async () => {
    await renderFooterAt("2026-10-20T12:00:00Z");

    expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026 Поэтический Хаб");
  });

  // implements FR-2 of add-site-footer
  it("switches to the founding-to-current range on 1 January (UTC)", async () => {
    await renderFooterAt("2027-01-01T00:00:00Z");

    expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026–2027 Поэтический Хаб");
  });

  // implements FR-2 of add-site-footer
  it("keeps the range growing in later years", async () => {
    await renderFooterAt("2030-06-15T12:00:00Z");

    expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026–2030 Поэтический Хаб");
  });

  // A shorter profile would make the footer a short-lived cache in every page's shell (design D2, NFR-3).
  it("caches the footer with the days profile", async () => {
    await renderFooterAt("2026-10-20T12:00:00Z");

    expect(cacheLife).toHaveBeenCalledWith("days");
  });

  // implements FR-3 of add-site-footer
  // implements FR-1, FR-12 of add-contact-form
  it("lists the about and privacy links in order with the shared link class, then the contact button with the same class", async () => {
    await renderFooterAt("2026-10-20T12:00:00Z");

    const nav = screen.getByRole("navigation", { name: NAV_NAME });
    const links = within(nav).getAllByRole("link");

    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["О проекте", "/about"],
      ["Политика конфиденциальности", "/privacy"],
    ]);
    for (const link of links) expect(link).toHaveClass(...FOOTER_LINK_CLASS.split(" "));

    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(links.length + 1);
    const contactButton = within(items[items.length - 1]).getByRole("button", { name: CONTACT_STUB_LABEL });
    expect(contactButton).toHaveClass(...FOOTER_LINK_CLASS.split(" "));
  });

  // implements FR-12 of add-contact-form
  it("renders no link to /contact", async () => {
    await renderFooterAt("2026-10-20T12:00:00Z");

    expect(screen.getByRole("contentinfo").querySelector('[href="/contact"]')).toBeNull();
  });

  // implements NFR-1 of add-site-footer
  it("exposes a contentinfo landmark holding the named navigation", async () => {
    await renderFooterAt("2026-10-20T12:00:00Z");

    const footer = screen.getByRole("contentinfo");

    expect(within(footer).getByRole("navigation", { name: NAV_NAME })).toBeInTheDocument();
  });
});
