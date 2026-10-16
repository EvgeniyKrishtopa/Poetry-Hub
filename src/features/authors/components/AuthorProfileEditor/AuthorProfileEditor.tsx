"use client";

import Link from "next/link";
import { useOptimistic, useState } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { ACCOUNT_LINK_LABELS, SAVED_MESSAGE } from "../../model/author-messages";
import type { ProfileField } from "../../model/author.types";
import { authorPagePath } from "../../model/author-page-path";
import { isPublicProfile } from "../../model/is-public-profile";
import { AboutFieldEditor } from "../AboutFieldEditor/AboutFieldEditor";
import { NameFieldEditor } from "../NameFieldEditor/NameFieldEditor";
import { PhotoFieldEditor } from "../PhotoFieldEditor/PhotoFieldEditor";
import { SaveNotice } from "../SaveNotice/SaveNotice";

import type { AuthorProfileEditorProps, FieldEditorControls } from "./AuthorProfileEditor.types";

/** The four field editors, the one-active-field rule, and the save notice (FR-6, FR-7). */
export function AuthorProfileEditor({ profile }: AuthorProfileEditorProps) {
  // Edit starts outside any transition, so plain state shows at once. A pending action's field must
  // be optimistic: plain state set inside the action would only commit once it has settled (design D6).
  const [editingField, setEditingField] = useState<ProfileField | null>(null);
  const [activeField, setActiveField] = useOptimistic<ProfileField | null>(null);
  const [notice, setNotice] = useState("");
  const [shownNotice, setOptimisticNotice] = useOptimistic(notice);
  const lockingField = editingField ?? activeField;

  function controlsFor(field: ProfileField): FieldEditorControls {
    return {
      disabled: lockingField !== null && lockingField !== field,
      onEditStart: () => setEditingField(field),
      onEditEnd: () => setEditingField(null),
      onActionStart: () => {
        setActiveField(field);
        // Emptied while pending, so every success changes the region's text and is announced again.
        setOptimisticNotice("");
      },
      onSaved: () => setNotice(SAVED_MESSAGE),
      onFailed: () => setNotice(""),
    };
  }

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-2">
        {profile !== null && isPublicProfile(profile) && (
          <Link href={authorPagePath(profile.id)} className="font-medium text-accent underline-offset-4 hover:underline">
            {ACCOUNT_LINK_LABELS.openPublicPage}
          </Link>
        )}
        <SaveNotice message={shownNotice} />
      </div>
      <div className="flex flex-col">
        <NameFieldEditor field="first_name" savedValue={profile?.firstName ?? null} {...controlsFor("first_name")} />
        <NameFieldEditor field="last_name" savedValue={profile?.lastName ?? null} {...controlsFor("last_name")} />
        <AboutFieldEditor
          savedAbout={profile?.about ?? null}
          savedAlign={profile?.aboutAlign ?? "left"}
          {...controlsFor("about")}
        />
        <PhotoFieldEditor photoUrl={profile?.photoUrl ?? null} fullName={fullName} {...controlsFor("photo")} />
      </div>
    </div>
  );
}
