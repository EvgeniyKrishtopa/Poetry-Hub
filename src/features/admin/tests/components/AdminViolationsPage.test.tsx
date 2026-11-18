import { render, screen } from "@testing-library/react";
import { Suspense, isValidElement, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";

import { AdminViolationsPage } from "../../components/AdminViolationsPage/AdminViolationsPage";
import { AdminViolationsPageContent } from "../../components/AdminViolationsPageContent/AdminViolationsPageContent";
import { checkIsAdmin } from "../../dal/admin-check";
import { listViolationCases } from "../../dal/violation-rpc";
import { VIOLATIONS_PAGE_COPY } from "../../model/admin-messages";
import type { ViolationCase } from "../../model/violation.types";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("../../dal/admin-check", () => ({ checkIsAdmin: vi.fn() }));
vi.mock("../../dal/violation-rpc", () => ({ listViolationCases: vi.fn() }));
const rowProps = vi.hoisted(() => vi.fn());
vi.mock("../../components/ViolationCaseRow/ViolationCaseRow", () => ({
  ViolationCaseRow: (props: { violationCase: { email: string } }) => {
    rowProps(props);
    return <li>{props.violationCase.email}</li>;
  },
}));
vi.mock("../../components/ViolationsConnectionNotice/ViolationsConnectionNotice", () => ({
  ViolationsConnectionNotice: () => <p>connection notice</p>,
}));
vi.mock("@/shared/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/ui")>()),
  SessionUnavailableAlert: () => <p>unavailable</p>,
}));

afterEach(() => vi.clearAllMocks());

const SIGNED_IN = { state: "signed-in", userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b" } as const;

function violationCase(n: number): ViolationCase {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    userId: `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    email: `user${n}@example.com`,
    authorName: null,
    authorProfileId: null,
    ground: "harmful-content",
    content: null,
    createdAt: "2026-11-17T09:00:00+00:00",
    warnedAt: null,
  };
}

function asAdmin() {
  vi.mocked(requireSession).mockResolvedValue(SIGNED_IN);
  vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: true });
}

describe("AdminViolationsPage", () => {
  // implements FR-4 of admin-violations-feedback
  it("wraps the gate in its own Suspense whose fallback holds no title", () => {
    const element = AdminViolationsPage() as ReactElement<{ fallback: ReactElement; children: ReactElement }>;

    expect(element.type).toBe(Suspense);
    expect(isValidElement(element.props.children) && element.props.children.type).toBe(AdminViolationsPageContent);
    const { container } = render(element.props.fallback);
    expect(container).not.toHaveTextContent(VIOLATIONS_PAGE_COPY.title);
  });
});

describe("AdminViolationsPageContent", () => {
  // implements FR-4 of admin-violations-feedback
  it("lists the cases in the order the database gave, newest first, under the title", async () => {
    asAdmin();
    vi.mocked(listViolationCases).mockResolvedValue({
      ok: true,
      cases: [violationCase(2), violationCase(1)],
      capReached: false,
    });

    render(await AdminViolationsPageContent());

    expect(screen.getByRole("heading", { name: VIOLATIONS_PAGE_COPY.title })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "user2@example.com",
      "user1@example.com",
    ]);
    expect(screen.getByText("connection notice")).toBeInTheDocument();
    expect(screen.queryByText(VIOLATIONS_PAGE_COPY.capReached)).not.toBeInTheDocument();
  });

  // implements FR-5 of admin-violations-feedback
  it("gives each row the instant it was rendered, so the rows derive their status from the server's clock", async () => {
    asAdmin();
    vi.mocked(listViolationCases).mockResolvedValue({ ok: true, cases: [violationCase(1)], capReached: false });

    render(await AdminViolationsPageContent());

    const [props] = rowProps.mock.calls[0] ?? [];
    expect(new Date((props as { renderedAt: string }).renderedAt).toISOString()).toBe(
      (props as { renderedAt: string }).renderedAt,
    );
  });

  // implements FR-4 of admin-violations-feedback
  it("says more cases exist than it shows when the list hit its cap", async () => {
    asAdmin();
    vi.mocked(listViolationCases).mockResolvedValue({ ok: true, cases: [violationCase(1)], capReached: true });

    render(await AdminViolationsPageContent());

    expect(screen.getByText(VIOLATIONS_PAGE_COPY.capReached)).toBeInTheDocument();
  });

  // implements FR-4 of admin-violations-feedback
  it("shows the empty state for no open case, and no list", async () => {
    asAdmin();
    vi.mocked(listViolationCases).mockResolvedValue({ ok: true, cases: [], capReached: false });

    render(await AdminViolationsPageContent());

    expect(screen.getByText(VIOLATIONS_PAGE_COPY.empty)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("connection notice")).not.toBeInTheDocument();
  });

  // implements FR-4 of admin-violations-feedback
  it("shows a danger alert in place of the list when it can't be read, keeping the title", async () => {
    asAdmin();
    vi.mocked(listViolationCases).mockResolvedValue({ ok: false, failure: "unavailable" });

    render(await AdminViolationsPageContent());

    expect(screen.getByRole("heading", { name: VIOLATIONS_PAGE_COPY.title })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(VIOLATIONS_PAGE_COPY.loadFailed);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  // implements FR-4 of admin-violations-feedback
  it("gives a signed-in non-admin the not-found screen and reads no case", async () => {
    vi.mocked(requireSession).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: false });

    await expect(AdminViolationsPageContent()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(listViolationCases).not.toHaveBeenCalled();
  });

  // implements FR-4 of admin-violations-feedback
  it("shows the outage state, never the list or a 404, when the admin check or the session can't be read", async () => {
    vi.mocked(requireSession).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: false, failure: "unavailable" });
    render(await AdminViolationsPageContent());
    expect(screen.getByText("unavailable")).toBeInTheDocument();

    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });
    render(await AdminViolationsPageContent());

    expect(listViolationCases).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });

  // implements FR-4 of admin-violations-feedback
  it("lets requireSession's redirect through for a signed-out request, reading nothing", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(AdminViolationsPageContent()).rejects.toThrow("NEXT_REDIRECT");
    expect(checkIsAdmin).not.toHaveBeenCalled();
    expect(listViolationCases).not.toHaveBeenCalled();
  });
});
