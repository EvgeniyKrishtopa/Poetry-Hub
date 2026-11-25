import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { GoogleSignInButtonWithError } from "../../components/GoogleSignInButtonWithError/GoogleSignInButtonWithError";
import { GoogleSignInPanel } from "../../components/GoogleSignInPanel/GoogleSignInPanel";
import { HeaderAuthLinks } from "../../components/HeaderAuthLinks/HeaderAuthLinks";
import { HeaderAuthLinksContent } from "../../components/HeaderAuthLinksContent/HeaderAuthLinksContent";
import { SessionExpiredNotice } from "../../components/SessionExpiredNotice/SessionExpiredNotice";
import { SignInFormWithError } from "../../components/SignInFormWithError/SignInFormWithError";
import { SignInPanel } from "../../components/SignInPanel/SignInPanel";
import { GOOGLE_BUTTON_LABEL, GOOGLE_SEPARATOR_LABEL } from "../../model/auth-messages";

vi.mock("../../actions/auth.actions", () => ({ signInAction: vi.fn(), startGoogleSignInAction: vi.fn() }));
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

describe("GoogleSignInPanel", () => {
  // The panel is the separator and a stack holding the Suspense boundary and the static hint under the button.
  function googlePanelParts(error: Promise<string | undefined>): [ReactElement, ReactElement] {
    const panel = GoogleSignInPanel({ from: "sign-up", error }) as ReactElement<{
      children: [ReactElement, ReactElement<{ children: [ReactElement, ReactElement] }>];
    }>;
    const [separator, stack] = panel.props.children;
    const [boundary] = stack.props.children;
    return [separator, boundary];
  }

  // implements FR-1, FR-3 of add-supabase-auth: the "or" separator comes before the Google button
  it("renders the separator before the Google boundary, outside it", () => {
    const [separator, boundary] = googlePanelParts(Promise.resolve(undefined));

    render(separator);
    expect(screen.getByText(GOOGLE_SEPARATOR_LABEL)).toBeInTheDocument();
    expect(boundary.type).toBe(Suspense);
  });

  // implements NFR-G2 of google-sign-in: the static shell holds a usable button
  it("wraps the error-reading button in Suspense, with the plain button as the fallback", () => {
    const error = Promise.resolve(undefined);
    const [, boundary] = googlePanelParts(error);
    const { fallback, children } = suspenseOf(boundary);

    expect(children.type).toBe(GoogleSignInButtonWithError);
    expect(children.props).toEqual({ from: "sign-up", error });

    render(fallback);
    expect(screen.getByRole("button", { name: GOOGLE_BUTTON_LABEL["sign-up"] })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("GoogleSignInPanel hint", () => {
  function hintOf(from: "sign-in" | "sign-up", error: Promise<string | undefined>): ReactElement {
    const panel = GoogleSignInPanel({ from, error }) as ReactElement<{
      children: [ReactElement, ReactElement<{ children: [ReactElement, ReactElement] }>];
    }>;
    const [, stack] = panel.props.children;
    return stack.props.children[1];
  }

  // implements FR-14 of password-recovery
  it.each([
    ["sign-in", "Регистрировались через Google? Войдите кнопкой «Войти через Google»."],
    ["sign-up", "Уже регистрировались через Google? Нажмите «Зарегистрироваться через Google»: вы войдёте в тот же аккаунт."],
  ] as const)("shows the static %s hint under the button, the same after any error", (from, text) => {
    const fresh = hintOf(from, Promise.resolve(undefined));
    const afterFailure = hintOf(from, Promise.resolve("google-failed"));

    expect(fresh.type).not.toBe(Suspense);
    render(fresh);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(afterFailure.props).toEqual(fresh.props);
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
