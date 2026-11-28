import { render, screen } from "@testing-library/react";
import { Suspense, isValidElement, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";

import { checkIsAdmin } from "../../dal/admin-check";
import { listHomeEntries } from "../../dal/home-rpc";
import { ADMIN_HOME_PAGE_COPY } from "../../model/admin-messages";
import type { HomeEntry } from "../../model/home-entry.types";
import { HomeCurationPage } from "../../pages/HomeCurationPage/HomeCurationPage";
import { HomeCurationPageContent } from "../../pages/HomeCurationPage/HomeCurationPageContent";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
);
vi.mock("next/navigation", () => ({ notFound: () => notFound(), redirect }));
vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("../../dal/admin-check", () => ({ checkIsAdmin: vi.fn() }));
vi.mock("../../dal/home-rpc", () => ({ listHomeEntries: vi.fn() }));
const listProps = vi.hoisted(() => vi.fn());
vi.mock("../../components/HomeEntryList/HomeEntryList", () => ({
  HomeEntryList: (props: { kind: string; entries: readonly { label: string }[] }) => {
    listProps(props);
    return <p>{`${props.kind}: ${props.entries.map((entry) => entry.label).join(", ")}`}</p>;
  },
}));
vi.mock("../../components/HomeConnectionNotice/HomeConnectionNotice", () => ({
  HomeConnectionNotice: () => <p>connection notice</p>,
}));
vi.mock("@/shared/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/ui")>()),
  SessionUnavailableAlert: () => <p>unavailable</p>,
}));

afterEach(() => vi.clearAllMocks());

const SIGNED_IN = { state: "signed-in", userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b", aal: "aal2", amr: [] } as const;
const PASSWORD_ONLY = { ...SIGNED_IN, aal: "aal1" } as const;

function entry(kind: HomeEntry["kind"], position: number, label: string): HomeEntry {
  return { kind, id: `${kind}-${position}`, position, shown: true, label, authorName: null };
}

function asAdmin() {
  vi.mocked(requireSession).mockResolvedValue(SIGNED_IN);
  vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: true });
}

describe("HomeCurationPage", () => {
  // implements FR-9 of home-page-sections
  it("wraps the gate in its own Suspense whose fallback holds no title", () => {
    const element = HomeCurationPage() as ReactElement<{ fallback: ReactElement; children: ReactElement }>;

    expect(element.type).toBe(Suspense);
    expect(isValidElement(element.props.children) && element.props.children.type).toBe(HomeCurationPageContent);
    const { container } = render(element.props.fallback);
    expect(container).not.toHaveTextContent(ADMIN_HOME_PAGE_COPY.title);
  });
});

describe("HomeCurationPageContent", () => {
  // implements FR-9 of home-page-sections
  it("shows the two lists in the order the database gave, under the title", async () => {
    asAdmin();
    vi.mocked(listHomeEntries).mockResolvedValue({
      ok: true,
      poems: [entry("poem", 1, "Осень"), entry("poem", 2, "Зима")],
      authors: [entry("author", 1, "Анна Лис")],
    });

    render(await HomeCurationPageContent());

    expect(screen.getByRole("heading", { name: ADMIN_HOME_PAGE_COPY.title })).toBeInTheDocument();
    expect(screen.getByText("poem: Осень, Зима")).toBeInTheDocument();
    expect(screen.getByText("author: Анна Лис")).toBeInTheDocument();
    expect(screen.getByText("connection notice")).toBeInTheDocument();
  });

  // implements FR-9 of home-page-sections
  it("still shows both lists when one of them is empty", async () => {
    asAdmin();
    vi.mocked(listHomeEntries).mockResolvedValue({ ok: true, poems: [], authors: [entry("author", 1, "Анна Лис")] });

    render(await HomeCurationPageContent());

    expect(listProps).toHaveBeenCalledTimes(2);
    expect(screen.getByText("poem:")).toBeInTheDocument();
  });

  // implements FR-9 of home-page-sections
  it("shows a danger alert in place of the lists when they can't be read, keeping the title", async () => {
    asAdmin();
    vi.mocked(listHomeEntries).mockResolvedValue({ ok: false, failure: "unavailable" });

    render(await HomeCurationPageContent());

    expect(screen.getByRole("heading", { name: ADMIN_HOME_PAGE_COPY.title })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(ADMIN_HOME_PAGE_COPY.loadFailed);
    expect(listProps).not.toHaveBeenCalled();
  });

  // implements FR-9 of home-page-sections
  it("gives a signed-in non-admin the not-found screen and reads no entry", async () => {
    vi.mocked(requireSession).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: false });

    await expect(HomeCurationPageContent()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(listHomeEntries).not.toHaveBeenCalled();
  });

  // implements FR-9 of home-page-sections
  // implements FR-8 of pre-deploy-security-hardening
  it("redirects an admin without the second factor to /admin/verify, reading no entry", async () => {
    vi.mocked(requireSession).mockResolvedValue(PASSWORD_ONLY);
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: true });

    await expect(HomeCurationPageContent()).rejects.toThrow("NEXT_REDIRECT /admin/verify");
    expect(listHomeEntries).not.toHaveBeenCalled();
  });

  // implements FR-9 of home-page-sections
  it("shows the outage state, never the lists or a 404, when the admin check or the session can't be read", async () => {
    vi.mocked(requireSession).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: false, failure: "unavailable" });
    render(await HomeCurationPageContent());
    expect(screen.getByText("unavailable")).toBeInTheDocument();

    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });
    render(await HomeCurationPageContent());

    expect(listHomeEntries).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });
});
