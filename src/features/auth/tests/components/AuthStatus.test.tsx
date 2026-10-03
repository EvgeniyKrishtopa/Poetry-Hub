import type { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabaseBrowserClient, SupabaseConfigError } from "@/shared/lib/supabase";

import { signOutAction } from "../../actions/auth.actions";
import { getSignedInEmail } from "../../api/auth.api";
import { AuthStatus } from "../../components/AuthStatus/AuthStatus";

vi.mock("../../api/auth.api", () => ({ getSignedInEmail: vi.fn() }));
vi.mock("../../actions/auth.actions", () => ({ signOutAction: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: vi.fn(), useRouter: vi.fn() }));
vi.mock("@/shared/lib/supabase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/supabase")>()),
  getSupabaseBrowserClient: vi.fn(),
}));

const EMAIL = "reader@example.com";
const refresh = vi.fn();

type SignOutResult = Awaited<ReturnType<typeof signOutAction>>;

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function renderWidget() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<AuthStatus />, { wrapper });
}

describe("AuthStatus", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
    vi.mocked(useRouter).mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-7 of add-supabase-auth
  it("shows neither Sign in nor Sign out while the first read is pending", () => {
    vi.mocked(getSignedInEmail).mockReturnValue(new Promise(() => {}));
    renderWidget();

    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("shows a Sign in link to /login when signed out", async () => {
    vi.mocked(getSignedInEmail).mockResolvedValue(null);
    renderWidget();

    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("shows the email and a Sign out button when signed in", async () => {
    vi.mocked(getSignedInEmail).mockResolvedValue(EMAIL);
    renderWidget();

    expect(await screen.findByText(EMAIL)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

  it("re-reads the session when the pathname changes, not on the first render", async () => {
    vi.mocked(usePathname).mockReturnValue("/login");
    vi.mocked(getSignedInEmail).mockResolvedValueOnce(null).mockResolvedValueOnce(EMAIL);
    const { rerender } = renderWidget();
    await screen.findByRole("link", { name: "Sign in" });
    expect(getSignedInEmail).toHaveBeenCalledTimes(1);

    vi.mocked(usePathname).mockReturnValue("/");
    rerender(<AuthStatus />);

    expect(await screen.findByText(EMAIL)).toBeInTheDocument();
    expect(getSignedInEmail).toHaveBeenCalledTimes(2);
  });

  it("ignores a read that a newer read superseded", async () => {
    vi.mocked(usePathname).mockReturnValue("/login");
    vi.mocked(getSignedInEmail).mockResolvedValueOnce(null);
    const { rerender } = renderWidget();
    await screen.findByRole("link", { name: "Sign in" });

    // A read for /login is still in flight when the pathname changes to /.
    const stale = deferred<string | null>();
    const fresh = deferred<string | null>();
    vi.mocked(getSignedInEmail).mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
    vi.mocked(usePathname).mockReturnValue("/signup");
    rerender(<AuthStatus />);
    await vi.waitFor(() => expect(getSignedInEmail).toHaveBeenCalledTimes(2));
    vi.mocked(usePathname).mockReturnValue("/");
    rerender(<AuthStatus />);
    await vi.waitFor(() => expect(getSignedInEmail).toHaveBeenCalledTimes(3));

    await act(async () => fresh.resolve(EMAIL));
    expect(await screen.findByText(EMAIL)).toBeInTheDocument();

    await act(async () => stale.resolve(null));
    // TanStack notifies observers on a timer, so give a late (wrong) update the chance to land.
    await new Promise((settle) => setTimeout(settle, 0));

    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("signs out: refreshes the server tree and shows Sign in", async () => {
    vi.mocked(getSignedInEmail).mockResolvedValue(EMAIL);
    vi.mocked(signOutAction).mockResolvedValue({ data: { ok: true } } as SignOutResult);
    renderWidget();

    await userEvent.setup().click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(signOutAction).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("drops a session read still in flight when sign-out succeeds", async () => {
    vi.mocked(usePathname).mockReturnValue("/login");
    vi.mocked(getSignedInEmail).mockResolvedValueOnce(EMAIL);
    vi.mocked(signOutAction).mockResolvedValue({ data: { ok: true } } as SignOutResult);
    const { rerender } = renderWidget();
    const signOutButton = await screen.findByRole("button", { name: "Sign out" });

    // A navigation starts a read just before the reader signs out.
    const inFlight = deferred<string | null>();
    vi.mocked(getSignedInEmail).mockReturnValueOnce(inFlight.promise);
    vi.mocked(usePathname).mockReturnValue("/");
    rerender(<AuthStatus />);
    await vi.waitFor(() => expect(getSignedInEmail).toHaveBeenCalledTimes(2));

    await userEvent.setup().click(signOutButton);
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();

    await act(async () => inFlight.resolve(EMAIL));
    await new Promise((settle) => setTimeout(settle, 0));

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText(EMAIL)).not.toBeInTheDocument();
  });

  it("clears the sign-out alert when a retry succeeds", async () => {
    vi.mocked(getSignedInEmail).mockResolvedValue(EMAIL);
    vi.mocked(signOutAction)
      .mockResolvedValueOnce({ data: { ok: false } } as SignOutResult)
      .mockResolvedValueOnce({ data: { ok: true } } as SignOutResult);
    renderWidget();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each<[string, () => void]>([
    ["ok: false", () => vi.mocked(signOutAction).mockResolvedValue({ data: { ok: false } } as SignOutResult)],
    ["a serverError", () => vi.mocked(signOutAction).mockResolvedValue({ serverError: "x" } as SignOutResult)],
    ["a rejected call", () => vi.mocked(signOutAction).mockRejectedValue(new TypeError("Failed to fetch"))],
  ])("stays signed in and alerts when sign-out returns %s", async (_label, arrange) => {
    vi.mocked(getSignedInEmail).mockResolvedValue(EMAIL);
    arrange();
    renderWidget();

    await userEvent.setup().click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't sign out. Try again.");
    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("disables Sign out while the sign-out is pending", async () => {
    vi.mocked(getSignedInEmail).mockResolvedValue(EMAIL);
    vi.mocked(signOutAction).mockReturnValue(new Promise(() => {}));
    renderWidget();

    await userEvent.setup().click(await screen.findByRole("button", { name: "Sign out" }));

    expect(screen.getByRole("button", { name: "Sign out" })).toBeDisabled();
  });

  // implements FR-8 of add-supabase-auth
  it("shows Sign in when the browser client throws SupabaseConfigError", async () => {
    const actual = await vi.importActual<typeof import("../../api/auth.api")>("../../api/auth.api");
    vi.mocked(getSignedInEmail).mockImplementation(actual.getSignedInEmail);
    vi.mocked(getSupabaseBrowserClient).mockImplementation((): SupabaseClient => {
      throw new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]);
    });
    renderWidget();

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });
});
