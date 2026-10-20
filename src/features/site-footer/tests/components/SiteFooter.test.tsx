import { render, screen, within } from "@testing-library/react";
import { cacheLife } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SiteFooter } from "../../components/SiteFooter/SiteFooter";

const NAV_NAME = "Информация о проекте";

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
  it("lists the about, privacy, and contact links in order", async () => {
    await renderFooterAt("2026-10-20T12:00:00Z");

    const links = within(screen.getByRole("navigation", { name: NAV_NAME })).getAllByRole("link");

    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["О проекте", "/about"],
      ["Политика конфиденциальности", "/privacy"],
      ["Связаться с нами", "/contact"],
    ]);
  });

  // implements NFR-1 of add-site-footer
  it("exposes a contentinfo landmark holding the named navigation", async () => {
    await renderFooterAt("2026-10-20T12:00:00Z");

    const footer = screen.getByRole("contentinfo");

    expect(within(footer).getByRole("navigation", { name: NAV_NAME })).toBeInTheDocument();
  });
});
