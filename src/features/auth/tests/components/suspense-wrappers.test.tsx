import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { HeaderAuthLinks } from "../../components/HeaderAuthLinks/HeaderAuthLinks";
import { HeaderAuthLinksContent } from "../../components/HeaderAuthLinksContent/HeaderAuthLinksContent";
import { SessionExpiredNotice } from "../../components/SessionExpiredNotice/SessionExpiredNotice";
import { SignInFormWithError } from "../../components/SignInFormWithError/SignInFormWithError";
import { SignInPanel } from "../../components/SignInPanel/SignInPanel";

vi.mock("../../actions/auth.actions", () => ({ signInAction: vi.fn() }));
vi.mock("../../dal/current-user", () => ({ getSessionState: vi.fn() }));

interface SuspenseProps {
  fallback: ReactElement;
  children: ReactElement<Record<string, unknown>>;
}

// An async Server Component can't render in jsdom, so these check the tree each wrapper returns.
function suspenseOf(element: ReactElement): SuspenseProps {
  expect(element.type).toBe(Suspense);
  return element.props as SuspenseProps;
}

function panelParts(error: Promise<string | undefined>): [ReactElement, ReactElement] {
  const panel = SignInPanel({ error }) as ReactElement<{ children: [ReactElement, ReactElement] }>;
  return panel.props.children;
}

describe("SignInPanel", () => {
  // implements FR-6 of delete-poem: the notice sits above the form
  it("renders the session-expired notice before the form, outside the Suspense boundary", () => {
    const [notice, boundary] = panelParts(Promise.resolve(undefined));

    expect(notice.type).toBe(SessionExpiredNotice);
    expect(boundary.type).toBe(Suspense);
  });

  it("wraps the error-reading form in Suspense, with the plain form as the fallback", () => {
    const error = Promise.resolve(undefined);
    const [, boundary] = panelParts(error);
    const { fallback, children } = suspenseOf(boundary);

    expect(children.type).toBe(SignInFormWithError);
    expect(children.props.error).toBe(error);

    render(fallback);
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("HeaderAuthLinks", () => {
  it("wraps the session status in Suspense, with an empty placeholder as the fallback", () => {
    const { fallback, children } = suspenseOf(HeaderAuthLinks());

    expect(children.type).toBe(HeaderAuthLinksContent);

    const { container } = render(fallback);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveTextContent("");
  });
});
