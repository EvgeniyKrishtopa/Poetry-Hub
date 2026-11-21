"use client";

import { useRef, useState } from "react";

import { useConnection } from "@/shared/lib/network/use-connection";

import { addHomeAuthorAction } from "../actions/add-home-author.actions";
import { addHomePoemAction } from "../actions/add-home-poem.actions";
import type { HomeActionResult, HomeAddStatus, HomeEntryKind } from "../model/home-entry.types";

import { callCaseAction } from "./call-case-action";
import type { UseAddToHomeResult } from "./use-add-to-home.types";

async function runAdd(kind: HomeEntryKind, id: string): Promise<HomeActionResult<HomeAddStatus> | undefined> {
  if (kind === "poem") {
    const response = await addHomePoemAction({ poemId: id });
    return response.data;
  }
  const response = await addHomeAuthorAction({ authorProfileId: id });
  return response.data;
}

/** The add call of one control: the pending flag, the last answer and the connection. */
export function useAddToHome(kind: HomeEntryKind, id: string): UseAddToHomeResult {
  const { status: connectionStatus, isOnline } = useConnection();
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<HomeActionResult<HomeAddStatus> | null>(null);
  // Set synchronously: a second press can arrive before the pending state disables the button.
  const inFlightRef = useRef(false);

  async function add(): Promise<void> {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsPending(true);
    setResult(null);

    const answer = await callCaseAction(() => runAdd(kind, id));
    setResult(answer);
    setIsPending(false);
    inFlightRef.current = false;
  }

  return { isPending, result, add, connectionStatus, isOnline };
}
