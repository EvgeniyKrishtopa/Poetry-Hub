import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionUnavailableAlert } from "../../components/SessionUnavailableAlert/SessionUnavailableAlert";

import { deferred } from "./deferred";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  vi.resetAllMocks();
});

describe("SessionUnavailableAlert", () => {
  // implements FR-20, NFR-8 of add-author-profiles
  it("says the service is unavailable, in Russian, with a «Повторить» button", () => {
    const { container } = render(<SessionUnavailableAlert />);

    expect(screen.getByRole("alert")).toHaveTextContent("Сервис временно недоступен. Попробуйте позже.");
    expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
    expect(container.firstElementChild).toHaveAttribute("lang", "ru");
  });

  // implements FR-20 of add-author-profiles
  it("refreshes the route and stays disabled while the refresh is pending", async () => {
    // The router's refresh keeps its transition pending until the server answers; a pending promise
    // returned into the transition stands in for that answer.
    const answer = deferred<void>();
    refresh.mockReturnValue(answer.promise);
    const user = userEvent.setup();
    render(<SessionUnavailableAlert />);

    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Повторить" })).toBeDisabled();

    await act(async () => answer.resolve());

    expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
  });
});
