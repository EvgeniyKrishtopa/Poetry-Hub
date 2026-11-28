import { render, screen } from "@testing-library/react";
import { Suspense, isValidElement, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";

import { AdminVerifyTrail } from "../../components/AdminVerifyTrail/AdminVerifyTrail";
import { AdminVerifyTrailContent } from "../../components/AdminVerifyTrail/AdminVerifyTrailContent";
import { checkIsAdmin } from "../../dal/admin-check";
import { readTotpFactor } from "../../dal/totp";
import { ADMIN_VERIFY_COPY } from "../../model/admin-messages";
import { AdminVerifyPage } from "../../pages/AdminVerifyPage/AdminVerifyPage";
import { AdminVerifyPageContent } from "../../pages/AdminVerifyPage/AdminVerifyPageContent";

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
);
const getSessionState = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("@/features/auth", () => ({ requireSession: vi.fn(), getSessionState }));
vi.mock("../../dal/admin-check", () => ({ checkIsAdmin: vi.fn() }));
vi.mock("../../dal/totp", () => ({ readTotpFactor: vi.fn() }));
vi.mock("../../components/TotpEnrolment/TotpEnrolment", () => ({ TotpEnrolment: () => <p>enrolment</p> }));
vi.mock("../../components/TotpCodeForm/TotpCodeForm", () => ({
  TotpCodeForm: ({ factorId, children }: { factorId: string; children: React.ReactNode }) => (
    <div>
      {children}
      <p>code form for {factorId}</p>
    </div>
  ),
}));
vi.mock("@/shared/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/ui")>()),
  SessionUnavailableAlert: () => <p>unavailable</p>,
}));

afterEach(() => vi.clearAllMocks());

const PASSWORD_ONLY = { state: "signed-in", userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b", aal: "aal1", amr: [] } as const;
const VERIFIED = { ...PASSWORD_ONLY, aal: "aal2" } as const;
const ENROLLED = { ok: true, status: "enrolled", factorId: "factor-1" } as const;
const NOT_ENROLLED = { ok: true, status: "not-enrolled" } as const;

function asAdmin(session: typeof PASSWORD_ONLY | typeof VERIFIED = PASSWORD_ONLY) {
  vi.mocked(requireSession).mockResolvedValue(session);
  getSessionState.mockResolvedValue(session);
  vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: true });
}

describe("AdminVerifyPage", () => {
  it("wraps the gate in its own Suspense whose fallback holds no title", () => {
    const element = AdminVerifyPage() as ReactElement<{ fallback: ReactElement; children: ReactElement }>;

    expect(element.type).toBe(Suspense);
    expect(isValidElement(element.props.children) && element.props.children.type).toBe(AdminVerifyPageContent);
    const { container } = render(element.props.fallback);
    expect(container).not.toHaveTextContent(ADMIN_VERIFY_COPY.codeTitle);
    expect(container).not.toHaveTextContent(ADMIN_VERIFY_COPY.enrolTitle);
  });
});

describe("AdminVerifyPageContent", () => {
  // implements FR-8 of pre-deploy-security-hardening
  it("asks an enrolled admin for the code", async () => {
    asAdmin();
    vi.mocked(readTotpFactor).mockResolvedValue(ENROLLED);

    render(await AdminVerifyPageContent());

    expect(screen.getByRole("heading", { name: ADMIN_VERIFY_COPY.codeTitle })).toBeInTheDocument();
    expect(screen.getByText(ADMIN_VERIFY_COPY.codeIntro)).toBeInTheDocument();
    expect(screen.getByText("code form for factor-1")).toBeInTheDocument();
    expect(screen.queryByText("enrolment")).not.toBeInTheDocument();
  });

  // implements FR-7 of pre-deploy-security-hardening
  it("offers enrolment to an admin with no verified factor", async () => {
    asAdmin();
    vi.mocked(readTotpFactor).mockResolvedValue(NOT_ENROLLED);

    render(await AdminVerifyPageContent());

    expect(screen.getByRole("heading", { name: ADMIN_VERIFY_COPY.enrolTitle })).toBeInTheDocument();
    expect(screen.getByText("enrolment")).toBeInTheDocument();
  });

  // implements FR-8 of pre-deploy-security-hardening: already verified
  it("redirects a verified admin to /admin, reading no factor", async () => {
    asAdmin(VERIFIED);

    await expect(AdminVerifyPageContent()).rejects.toThrow("NEXT_REDIRECT /admin");
    expect(readTotpFactor).not.toHaveBeenCalled();
  });

  // implements FR-7 of pre-deploy-security-hardening: not an admin
  it("gives a non-admin the not-found screen", async () => {
    asAdmin();
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: false });

    await expect(AdminVerifyPageContent()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(readTotpFactor).not.toHaveBeenCalled();
  });

  // implements FR-8 of pre-deploy-security-hardening: unreadable check
  it("shows the unavailable state when the admin check or the factors can't be read", async () => {
    asAdmin();
    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: false, failure: "unavailable" });
    const { unmount } = render(await AdminVerifyPageContent());
    expect(screen.getByText("unavailable")).toBeInTheDocument();
    unmount();

    vi.mocked(readTotpFactor).mockResolvedValue({ ok: false, failure: "unavailable" });
    render(await AdminVerifyPageContent());
    expect(screen.getByText("unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

describe("AdminVerifyTrail", () => {
  const slots = { enrolled: <p>enrolled trail</p>, notEnrolled: <p>setup trail</p> };

  it("holds an empty fallback in its own boundary", () => {
    const element = AdminVerifyTrail(slots) as ReactElement<{ fallback: unknown }>;

    expect(element.type).toBe(Suspense);
    expect(element.props.fallback).toBeNull();
  });

  // implements FR-8 of pre-deploy-security-hardening: the three trail scenarios
  it.each([
    ["enrolled", ENROLLED, "enrolled trail"],
    ["not yet enrolled", NOT_ENROLLED, "setup trail"],
  ] as const)("shows the %s admin its own trail", async (_case, factor, text) => {
    asAdmin();
    vi.mocked(readTotpFactor).mockResolvedValue(factor);

    render(await AdminVerifyTrailContent(slots));

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("shows no trail to a non-admin, a guest, or when the factors can't be read", async () => {
    asAdmin();
    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: true, isAdmin: false });
    expect(await AdminVerifyTrailContent(slots)).toBeNull();

    getSessionState.mockResolvedValueOnce({ state: "signed-out" });
    expect(await AdminVerifyTrailContent(slots)).toBeNull();

    vi.mocked(readTotpFactor).mockResolvedValue({ ok: false, failure: "unavailable" });
    expect(await AdminVerifyTrailContent(slots)).toBeNull();
  });
});
