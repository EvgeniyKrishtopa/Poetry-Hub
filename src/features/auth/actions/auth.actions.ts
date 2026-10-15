"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { AuthFailedResult, AuthFailure, SignInResult, SignOutResult, SignUpResult } from "../model/auth.types";
import { classifyAuthError } from "../model/classify-auth-error";
import { signInSchema, signUpSchema } from "../model/credentials.schema";

import { authActionClient } from "./action-client";

const HOME_PATH = "/";

function failed(failure: AuthFailure): AuthFailedResult {
  return { status: "failed", failure };
}

/**
 * Creates the server client, or returns the failure for a missing config. Any other error
 * propagates to the action client's `handleServerError` (design D2).
 */
async function createClientOrFailure(): Promise<
  { readonly supabase: SupabaseClient } | { readonly failure: AuthFailure }
> {
  try {
    return { supabase: await createSupabaseServerClient() };
  } catch (error) {
    if (error instanceof SupabaseConfigError) return { failure: classifyAuthError(error) };
    throw error;
  }
}

export const signInAction = authActionClient
  .inputSchema(signInSchema)
  .action(async ({ parsedInput }): Promise<SignInResult> => {
    const client = await createClientOrFailure();
    if ("failure" in client) return failed(client.failure);

    const { error } = await client.supabase.auth.signInWithPassword(parsedInput);
    if (error) return failed(classifyAuthError(error));

    // Outside every try: `redirect` throws NEXT_REDIRECT, which a catch would swallow (Gate 1 P1).
    // The server client's setAll has already written the session cookies.
    redirect(HOME_PATH);
  });

export const signUpAction = authActionClient
  .inputSchema(signUpSchema)
  .action(async ({ parsedInput }): Promise<SignUpResult> => {
    const client = await createClientOrFailure();
    if ("failure" in client) return failed(client.failure);

    const { error } = await client.supabase.auth.signUp(parsedInput);
    if (error) return failed(classifyAuthError(error));

    // The same answer whatever `data.user.identities` holds, so an existing address isn't revealed.
    return { status: "check-email", email: parsedInput.email };
  });

export const signOutAction = authActionClient.action(async (): Promise<SignOutResult> => {
  const client = await createClientOrFailure();
  if ("failure" in client) return { ok: false };

  // `local` ends this device's session only; the default `global` would sign out everywhere.
  const { error } = await client.supabase.auth.signOut({ scope: "local" });
  if (error) return { ok: false };

  // Re-renders the server tree with the cleared cookies, so the header shows "Sign in" (design D4).
  refresh();
  return { ok: true };
});
