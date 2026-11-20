import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { addViolationCaseForAuthorAction } from "../../actions/add-violation-case.actions";
import { AddToViolationsButton } from "../../components/AddToViolationsButton/AddToViolationsButton";
import {
  ADD_TO_VIOLATIONS_COPY,
  CASE_FAILURE_MESSAGES,
  CONTENT_GONE_MESSAGES,
  GROUND_CHOICE_COPY,
} from "../../model/admin-messages";
import type { AddCaseActionResult } from "../../model/violation.types";

vi.mock("../../actions/add-violation-case.actions", () => ({
  addViolationCaseAction: vi.fn(),
  addViolationCaseForAuthorAction: vi.fn(),
}));
const connection = vi.hoisted(() => ({ status: "online" as "online" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));

stubModalDialog();
afterEach(() => {
  vi.clearAllMocks();
  connection.status = "online";
});

const AUTHOR_ID = "11111111-2222-4333-8444-555555555555";
const AUTHOR_NAME = "Анна Ахматова";
const POEM = { kind: "poem", id: "30000000-0000-4000-8000-000000000051", title: "Осенний сад" } as const;
const COLLECTION = { kind: "collection", id: "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a", title: "Осенний цикл" } as const;

type Response = Awaited<ReturnType<typeof addViolationCaseForAuthorAction>>;
const respond = (result: AddCaseActionResult): Response => ({ data: result }) as Response;

function renderButton(content?: typeof POEM | typeof COLLECTION) {
  return render(<AddToViolationsButton authorProfileId={AUTHOR_ID} authorName={AUTHOR_NAME} content={content} />);
}

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: ADD_TO_VIOLATIONS_COPY.button }));
}

async function confirm() {
  await userEvent.click(screen.getByRole("button", { name: GROUND_CHOICE_COPY.confirm }));
}

describe("AddToViolationsButton", () => {
  // implements FR-2 of admin-violations-feedback
  it("opens the ground choice naming the author and adds nobody until it is confirmed", async () => {
    renderButton();

    await openDialog();

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByText(GROUND_CHOICE_COPY.description(AUTHOR_NAME))).toBeInTheDocument();
    expect(addViolationCaseForAuthorAction).not.toHaveBeenCalled();
  });

  // implements FR-2 of admin-violations-feedback
  it("adds the author from the author page with no content and the default ground", async () => {
    vi.mocked(addViolationCaseForAuthorAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    renderButton();

    await openDialog();
    await confirm();

    expect(addViolationCaseForAuthorAction).toHaveBeenCalledWith({
      authorProfileId: AUTHOR_ID,
      ground: "harmful-content",
      content: undefined,
    });
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    expect(screen.getByText(ADD_TO_VIOLATIONS_COPY.added)).toBeInTheDocument();
  });

  // implements FR-1, FR-2 of admin-violations-feedback
  it("sends the chosen ground and the poem that prompted the case, and names the poem in the dialog", async () => {
    vi.mocked(addViolationCaseForAuthorAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    renderButton(POEM);

    await openDialog();
    expect(screen.getByText(GROUND_CHOICE_COPY.contentNote.poem(POEM.title))).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("radio")[1] as HTMLElement);
    await confirm();

    expect(addViolationCaseForAuthorAction).toHaveBeenCalledWith({
      authorProfileId: AUTHOR_ID,
      ground: "malicious-activity",
      content: { kind: "poem", id: POEM.id },
    });
  });

  // implements FR-2 of admin-violations-feedback
  it("sends the collection that prompted the case without its title", async () => {
    vi.mocked(addViolationCaseForAuthorAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    renderButton(COLLECTION);

    await openDialog();
    await confirm();

    expect(addViolationCaseForAuthorAction).toHaveBeenCalledWith({
      authorProfileId: AUTHOR_ID,
      ground: "harmful-content",
      content: { kind: "collection", id: COLLECTION.id },
    });
  });

  // implements FR-2 of admin-violations-feedback
  it("adds nobody when the choice is cancelled", async () => {
    renderButton();

    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: GROUND_CHOICE_COPY.cancel }));

    expect(addViolationCaseForAuthorAction).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
  });

  // implements FR-2 of admin-violations-feedback
  it("says the author is already on the list and changes nothing else", async () => {
    vi.mocked(addViolationCaseForAuthorAction).mockResolvedValue(respond({ ok: true, status: "already-in-list" }));
    renderButton();

    await openDialog();
    await confirm();

    expect(screen.getByText(ADD_TO_VIOLATIONS_COPY["already-in-list"])).toBeInTheDocument();
    expect(screen.queryByText(ADD_TO_VIOLATIONS_COPY.added)).toBeNull();
  });

  // implements FR-15 of admin-violations-feedback
  it("keeps the dialog open with the failure inside it, then shows it above the button once the dialog is closed", async () => {
    vi.mocked(addViolationCaseForAuthorAction).mockResolvedValue(respond({ ok: false, reason: "already-restricted" }));
    renderButton();

    await openDialog();
    await confirm();

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByRole("alert")).toHaveTextContent(CASE_FAILURE_MESSAGES["already-restricted"]);

    await userEvent.click(screen.getByRole("button", { name: GROUND_CHOICE_COPY.cancel }));

    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    expect(screen.getByText(CASE_FAILURE_MESSAGES["already-restricted"])).toBeInTheDocument();
  });

  // implements FR-15 of admin-violations-feedback
  it.each([
    ["poem", POEM, CONTENT_GONE_MESSAGES.poem],
    ["collection", COLLECTION, CONTENT_GONE_MESSAGES.collection],
  ] as const)("words a deleted %s by its kind", async (_kind, content, text) => {
    vi.mocked(addViolationCaseForAuthorAction).mockResolvedValue(respond({ ok: false, reason: "content-not-found" }));
    renderButton(content);

    await openDialog();
    await confirm();

    expect(screen.getByRole("alert")).toHaveTextContent(text);
  });

  // implements FR-15 of admin-violations-feedback
  it("reads a thrown or missing answer as an outage and keeps the dialog open", async () => {
    vi.mocked(addViolationCaseForAuthorAction).mockRejectedValue(new Error("network"));
    renderButton();

    await openDialog();
    await confirm();

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByRole("alert")).toHaveTextContent(CASE_FAILURE_MESSAGES.unavailable);
  });

  // implements FR-15 of admin-violations-feedback
  it("offline: shows the connection notice in the dialog, disables adding and sends nothing", async () => {
    connection.status = "offline";
    renderButton();

    await openDialog();

    expect(screen.getByRole("button", { name: GROUND_CHOICE_COPY.confirm })).toBeDisabled();
    expect(addViolationCaseForAuthorAction).not.toHaveBeenCalled();
  });

  // implements FR-2 of admin-violations-feedback
  it("clears the last result when the dialog is opened again", async () => {
    vi.mocked(addViolationCaseForAuthorAction).mockResolvedValue(respond({ ok: true, status: "added" }));
    renderButton();
    await openDialog();
    await confirm();
    expect(screen.getByText(ADD_TO_VIOLATIONS_COPY.added)).toBeInTheDocument();

    await openDialog();

    expect(screen.queryByText(ADD_TO_VIOLATIONS_COPY.added)).toBeNull();
  });
});
