import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CONTENT_LANG } from "@/shared/config/constants";

import { addHomeAuthorAction } from "../../actions/add-home-author.actions";
import { addHomePoemAction } from "../../actions/add-home-poem.actions";
import { AddToHomeButton } from "../../components/AddToHomeButton/AddToHomeButton";
import { ADD_TO_HOME_COPY } from "../../model/admin-messages";
import type { HomeActionResult, HomeAddStatus } from "../../model/home-entry.types";

vi.mock("../../actions/add-home-poem.actions", () => ({ addHomePoemAction: vi.fn() }));
vi.mock("../../actions/add-home-author.actions", () => ({ addHomeAuthorAction: vi.fn() }));
const connection = vi.hoisted(() => ({ status: "online" as "online" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  connection.status = "online";
});

const POEM_ID = "30000000-0000-4000-8000-000000000051";
const PROFILE_ID = "11111111-2222-4333-8444-555555555555";

type PoemResponse = Awaited<ReturnType<typeof addHomePoemAction>>;
/** The safe-action response around a result; the type comes from the mock it is handed to (poem or author action). */
function respond<Response>(result: HomeActionResult<HomeAddStatus>): Response {
  return { data: result } as Response;
}

async function press() {
  await userEvent.click(screen.getByRole("button", { name: ADD_TO_HOME_COPY.button }));
}

describe("AddToHomeButton", () => {
  // implements FR-8 of home-page-sections
  it("sends the poem id for a poem and shows the success line", async () => {
    vi.mocked(addHomePoemAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    render(<AddToHomeButton kind="poem" id={POEM_ID} />);

    await press();

    expect(addHomePoemAction).toHaveBeenCalledExactlyOnceWith({ poemId: POEM_ID });
    expect(addHomeAuthorAction).not.toHaveBeenCalled();
    expect(screen.getByText(ADD_TO_HOME_COPY.added)).toBeInTheDocument();
  });

  // implements FR-8 of home-page-sections
  it("sends the profile id for an author", async () => {
    vi.mocked(addHomeAuthorAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    render(<AddToHomeButton kind="author" id={PROFILE_ID} />);

    await press();

    expect(addHomeAuthorAction).toHaveBeenCalledExactlyOnceWith({ authorProfileId: PROFILE_ID });
    expect(addHomePoemAction).not.toHaveBeenCalled();
    expect(screen.getByText(ADD_TO_HOME_COPY.added)).toBeInTheDocument();
  });

  // implements FR-8 of home-page-sections
  it.each([
    ["poem", "limit-reached", ADD_TO_HOME_COPY.limitReached.poem],
    ["author", "limit-reached", ADD_TO_HOME_COPY.limitReached.author],
    ["poem", "already-in-list", ADD_TO_HOME_COPY.alreadyInList],
    ["poem", "not-found", ADD_TO_HOME_COPY.notFound.poem],
    ["author", "not-found", ADD_TO_HOME_COPY.notFound.author],
  ] as const)("shows the line for %s and the status %s", async (kind, status, text) => {
    vi.mocked(addHomePoemAction).mockResolvedValue(respond({ ok: true, status }));
    vi.mocked(addHomeAuthorAction).mockResolvedValue(respond({ ok: true, status }));
    render(<AddToHomeButton kind={kind} id={PROFILE_ID} />);

    await press();

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  // implements FR-8, FR-13 of home-page-sections
  it.each([
    ["forbidden", ADD_TO_HOME_COPY.forbidden],
    ["unauthenticated", ADD_TO_HOME_COPY.unauthenticated],
    ["unavailable", ADD_TO_HOME_COPY.failed],
  ] as const)("shows a failure with the reason %s", async (reason, text) => {
    vi.mocked(addHomePoemAction).mockResolvedValue(respond({ ok: false, reason }));
    render(<AddToHomeButton kind="poem" id={POEM_ID} />);

    await press();

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  // implements FR-8 of home-page-sections
  it("shows the failure line when the action gives no answer or throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(addHomePoemAction).mockResolvedValueOnce({} as PoemResponse);
    render(<AddToHomeButton kind="poem" id={POEM_ID} />);

    await press();
    expect(screen.getByText(ADD_TO_HOME_COPY.failed)).toBeInTheDocument();

    vi.mocked(addHomePoemAction).mockRejectedValueOnce(new Error("network"));
    await press();
    expect(screen.getByText(ADD_TO_HOME_COPY.failed)).toBeInTheDocument();
  });

  // implements FR-8 of home-page-sections
  it("disables the button and marks it busy while the call runs, and joins a second press into the first call", async () => {
    let finish: (response: PoemResponse) => void = () => {};
    vi.mocked(addHomePoemAction).mockReturnValue(new Promise<PoemResponse>((resolve) => (finish = resolve)));
    render(<AddToHomeButton kind="poem" id={POEM_ID} />);
    const button = screen.getByRole("button", { name: ADD_TO_HOME_COPY.button });

    await userEvent.click(button);
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(addHomePoemAction).toHaveBeenCalledOnce();

    await act(async () => finish(respond({ ok: true, status: "added" })));

    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "false");
  });

  // implements FR-8 of home-page-sections
  it("clears the last line while the next call runs", async () => {
    vi.mocked(addHomePoemAction).mockResolvedValueOnce(respond({ ok: true, status: "added" }));
    render(<AddToHomeButton kind="poem" id={POEM_ID} />);
    await press();
    expect(screen.getByText(ADD_TO_HOME_COPY.added)).toBeInTheDocument();

    let finish: (response: PoemResponse) => void = () => {};
    vi.mocked(addHomePoemAction).mockReturnValueOnce(new Promise<PoemResponse>((resolve) => (finish = resolve)));
    await press();

    expect(screen.queryByText(ADD_TO_HOME_COPY.added)).not.toBeInTheDocument();
    await act(async () => finish(respond({ ok: true, status: "already-in-list" })));
    expect(screen.getByText(ADD_TO_HOME_COPY.alreadyInList)).toBeInTheDocument();
  });

  // implements FR-8 of home-page-sections
  it("disables the button offline and sends nothing", async () => {
    connection.status = "offline";
    render(<AddToHomeButton kind="poem" id={POEM_ID} />);

    const button = screen.getByRole("button", { name: ADD_TO_HOME_COPY.button });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(addHomePoemAction).not.toHaveBeenCalled();
  });

  // implements FR-8 of home-page-sections
  it("marks the content as Russian, like the other admin controls", () => {
    const { container } = render(<AddToHomeButton kind="poem" id={POEM_ID} />);

    expect(container.firstElementChild).toHaveAttribute("lang", CONTENT_LANG);
  });
});
