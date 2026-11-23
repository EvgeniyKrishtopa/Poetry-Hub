import { render, screen, within } from "@testing-library/react";
import { Suspense, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";

import { UserModerationPage } from "../../pages/UserModerationPage/UserModerationPage";
import { UserModerationPageContent } from "../../pages/UserModerationPageContent/UserModerationPageContent";
import { checkIsAdmin } from "../../dal/admin-check";
import { ADMIN_LIST_COPY } from "../../model/admin-messages";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("../../dal/admin-check", () => ({ checkIsAdmin: vi.fn() }));
const userList = vi.hoisted(() => vi.fn());
vi.mock("../../components/AdminUserList/AdminUserList", () => ({
  AdminUserList: (props: unknown) => {
    userList(props);
    return <p>rows</p>;
  },
}));
vi.mock("../../components/ViolationDndArea/ViolationDndArea", () => ({
  ViolationDndArea: ({ children }: { children: ReactNode }) => <section aria-label="area">{children}</section>,
}));
vi.mock("@/shared/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/ui")>()),
  SessionUnavailableAlert: () => <p>unavailable</p>,
}));

afterEach(() => vi.clearAllMocks());

const SIGNED_IN = {
  state: "signed-in",
  userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b",
} as const;
const QUERY = Promise.resolve({});

describe("UserModerationPage", () => {
  // implements FR-2 of admin-moderation
  it("wraps the gate in its own Suspense whose fallback holds no title", () => {
    const element = UserModerationPage({ query: QUERY }) as ReactElement<{
      fallback: ReactElement;
      children: ReactElement;
    }>;

    expect(element.type).toBe(Suspense);
    expect(isValidElement(element.props.children) && element.props.children.type).toBe(UserModerationPageContent);
    const { container } = render(element.props.fallback);
    expect(container).not.toHaveTextContent(ADMIN_LIST_COPY.title);
  });
});

describe("UserModerationPageContent", () => {
  // implements FR-2 of admin-moderation
  it("shows the title and the list, inside the review-list area, to an admin", async () => {
    vi.mocked(requireSession).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: true });

    render(await UserModerationPageContent({ query: QUERY }));

    expect(screen.getByRole("heading", { name: ADMIN_LIST_COPY.title })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "area" })).getByText("rows")).toBeInTheDocument();
    expect(userList).toHaveBeenCalledWith({ query: {} });
  });

  // implements FR-3 of admin-violations-feedback
  it("has no email field and no find button, and a request carrying ?email= shows the unfiltered list", async () => {
    vi.mocked(requireSession).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: true });

    render(await UserModerationPageContent({ query: Promise.resolve({ email: "a@b.co" }) }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Найти" })).not.toBeInTheDocument();
    expect(userList).toHaveBeenCalledWith({ query: {} });
  });

  // implements FR-2 of admin-moderation
  it("gives a signed-in non-admin the not-found screen and no data", async () => {
    vi.mocked(requireSession).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: false });

    await expect(UserModerationPageContent({ query: QUERY })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // implements FR-2 of admin-moderation
  it("shows the outage state when the admin check or the session can't be read, never the tools or a 404", async () => {
    vi.mocked(requireSession).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkIsAdmin).mockResolvedValue({
      ok: false,
      failure: "unavailable",
    });
    render(await UserModerationPageContent({ query: QUERY }));
    expect(screen.getByText("unavailable")).toBeInTheDocument();
    expect(screen.queryByText("rows")).not.toBeInTheDocument();

    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });
    render(await UserModerationPageContent({ query: QUERY }));
    expect(checkIsAdmin).toHaveBeenCalledTimes(1);
    expect(notFound).not.toHaveBeenCalled();
  });

  // implements FR-2 of admin-moderation
  it("lets requireSession's redirect through for a signed-out request", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(UserModerationPageContent({ query: QUERY })).rejects.toThrow("NEXT_REDIRECT");
    expect(checkIsAdmin).not.toHaveBeenCalled();
  });
});
