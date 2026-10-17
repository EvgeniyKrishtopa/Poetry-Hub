import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { signOutAction } from "../../actions/auth.actions";
import { SignOutButton } from "../../components/SignOutButton/SignOutButton";

vi.mock("../../actions/auth.actions", () => ({ signOutAction: vi.fn() }));

type SignOutResult = Awaited<ReturnType<typeof signOutAction>>;

const FAILURE_TEXT = "Не удалось выйти. Попробуйте ещё раз.";

describe("SignOutButton", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-4 of remove-browser-session-read
  it("calls the action and shows no alert when sign-out succeeds", async () => {
    let settle: (result: SignOutResult) => void = () => {};
    vi.mocked(signOutAction).mockReturnValue(new Promise((resolve) => (settle = resolve)));
    render(<SignOutButton />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));
    expect(screen.getByRole("button", { name: "Выйти" })).toBeDisabled();
    settle({ data: { ok: true } } as SignOutResult);

    // Enabled again means the transition has settled, so a failure alert would already show.
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Выйти" })).toBeEnabled());
    expect(signOutAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // implements FR-5 of add-feedback-color-tokens
  it.each<[string, () => void]>([
    ["ok: false", () => vi.mocked(signOutAction).mockResolvedValue({ data: { ok: false } } as SignOutResult)],
    ["a serverError", () => vi.mocked(signOutAction).mockResolvedValue({ serverError: "x" } as SignOutResult)],
    ["a rejected call", () => vi.mocked(signOutAction).mockRejectedValue(new TypeError("Failed to fetch"))],
  ])("keeps Sign out and shows the failure inline in danger when sign-out returns %s", async (_label, arrange) => {
    arrange();
    render(<SignOutButton />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(FAILURE_TEXT);
    expect(alert).toHaveClass("text-danger");
    expect(alert.tagName).toBe("P");
    expect(screen.getByRole("button", { name: "Выйти" })).toBeEnabled();
  });

  it("disables Sign out while the sign-out is pending", async () => {
    let settle: (result: SignOutResult) => void = () => {};
    vi.mocked(signOutAction).mockReturnValue(new Promise((resolve) => (settle = resolve)));
    render(<SignOutButton />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));

    expect(screen.getByRole("button", { name: "Выйти" })).toBeDisabled();
    // React entangles pending async transitions, so a never-settling one would keep later tests pending.
    settle({ data: { ok: true } } as SignOutResult);
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Выйти" })).toBeEnabled());
  });

  it("clears the alert when a retry succeeds", async () => {
    vi.mocked(signOutAction)
      .mockResolvedValueOnce({ data: { ok: false } } as SignOutResult)
      .mockResolvedValueOnce({ data: { ok: true } } as SignOutResult);
    render(<SignOutButton />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Выйти" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Выйти" }));

    await vi.waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(signOutAction).toHaveBeenCalledTimes(2);
  });
});
