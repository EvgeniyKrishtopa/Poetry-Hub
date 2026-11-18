"use client";

import { useRef, useState } from "react";

import { useConnection } from "@/shared/lib/network/use-connection";

import { addViolationCaseAction, addViolationCaseForAuthorAction } from "../actions/add-violation-case.actions";
import type { AddCaseActionResult } from "../model/violation.types";

import { callCaseAction } from "./call-case-action";
import type { AddViolationRequest, UseAddViolationCaseResult } from "./use-add-violation-case.types";

async function runAdd({ target, ground, content }: AddViolationRequest): Promise<AddCaseActionResult | undefined> {
  if (target.by === "user") {
    const response = await addViolationCaseAction({ userId: target.userId, ground, content });
    return response.data;
  }
  const response = await addViolationCaseForAuthorAction({ authorProfileId: target.authorProfileId, ground, content });
  return response.data;
}

/** The add call both entry points share: the pending flag, the last answer and the connection (design D7). */
export function useAddViolationCase(): UseAddViolationCaseResult {
  const { status: connectionStatus, isOnline } = useConnection();
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<AddCaseActionResult | null>(null);
  // Set synchronously: a second click can arrive before the pending state disables the controls.
  const inFlightRef = useRef<Promise<AddCaseActionResult> | null>(null);

  async function send(request: AddViolationRequest): Promise<AddCaseActionResult> {
    const answer = await callCaseAction(() => runAdd(request));
    setResult(answer);
    setIsPending(false);
    inFlightRef.current = null;
    return answer;
  }

  function add(request: AddViolationRequest): Promise<AddCaseActionResult> {
    if (inFlightRef.current !== null) return inFlightRef.current;
    setIsPending(true);
    setResult(null);
    const call = send(request);
    inFlightRef.current = call;
    return call;
  }

  function clearResult() {
    setResult(null);
  }

  return { isPending, result, add, clearResult, connectionStatus, isOnline };
}
