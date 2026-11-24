import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LoginPage from "../(public)/login/page";
import SignUpPage from "../(public)/signup/page";

const received = vi.hoisted(() => ({ errors: [] as Promise<unknown>[] }));

// The feature components are stand-ins: this test only pins what each route composes, in which order, and
// that both password and Google parts read the same `error` param.
vi.mock("@/features/auth", () => ({
  SignInPanel: ({ error }: { error: Promise<unknown> }) => {
    received.errors.push(error);
    return <section>password form</section>;
  },
  SignUpForm: () => <section>password form</section>,
  GoogleSignInPanel: ({ from, error }: { from: string; error: Promise<unknown> }) => {
    received.errors.push(error);
    return <section>google panel {from}</section>;
  },
  getLoginPageMetadata: () => ({}),
  getSignupPageMetadata: () => ({}),
}));

const NO_PARAMS = Promise.resolve({});

function sectionTexts(): (string | null)[] {
  const main = screen.getByRole("main");
  return Array.from(main.querySelectorAll("section")).map((section) => section.textContent);
}

describe("auth route pages", () => {
  // implements FR-1 of add-supabase-auth, design D6 of google-sign-in: the Google widget sits under the password form
  it("puts the Google panel for sign-in below the password form on /login, both reading ?error", async () => {
    received.errors = [];
    const searchParams = Promise.resolve({ error: "google-blocked" });

    render(<LoginPage params={NO_PARAMS} searchParams={searchParams} />);

    expect(sectionTexts()).toEqual(["password form", "google panel sign-in"]);
    const errors = await Promise.all(received.errors);
    expect(errors).toEqual(["google-blocked", "google-blocked"]);
  });

  // implements FR-3 of add-supabase-auth, design D6 of google-sign-in
  it("puts the Google panel for sign-up below the password form on /signup, reading ?error", async () => {
    received.errors = [];
    const searchParams = Promise.resolve({ error: "google-cancelled" });

    render(<SignUpPage params={NO_PARAMS} searchParams={searchParams} />);

    expect(sectionTexts()).toEqual(["password form", "google panel sign-up"]);
    const errors = await Promise.all(received.errors);
    expect(errors).toEqual(["google-cancelled"]);
  });
});
