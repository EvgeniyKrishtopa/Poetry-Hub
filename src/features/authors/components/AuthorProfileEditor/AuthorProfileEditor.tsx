"use client";

import Link from "next/link";

import { CONTENT_LANG } from "@/shared/config/constants";

import type { FieldEditorControls } from "../../hooks/profile-field.types";
import { useFieldLock } from "../../hooks/use-field-lock";
import { useSaveNotice } from "../../hooks/use-save-notice";
import { ACCOUNT_LINK_LABELS } from "../../model/author-messages";
import type { ProfileField } from "../../model/author.types";
import { authorPagePath } from "../../model/author-page-path";
import { isPublicProfile } from "../../model/is-public-profile";
import { AboutFieldEditor } from "../AboutFieldEditor/AboutFieldEditor";
import { NameFieldEditor } from "../NameFieldEditor/NameFieldEditor";
import { PhotoFieldEditor } from "../PhotoFieldEditor/PhotoFieldEditor";
import { SaveNotice } from "../SaveNotice/SaveNotice";

import type { AuthorProfileEditorProps } from "./AuthorProfileEditor.types";

/** The four field editors, the one-active-field rule, and the save notice (FR-6, FR-7). */
export function AuthorProfileEditor({ profile }: AuthorProfileEditorProps) {
  const lock = useFieldLock();
  const notice = useSaveNotice();

  function controlsFor(field: ProfileField): FieldEditorControls {
    return {
      disabled: lock.isLockedFor(field),
      onEditingChange: (isEditing) => lock.setEditing(field, isEditing),
      onActionStart: () => {
        lock.markActive(field);
        notice.clear();
      },
      onActionEnd: notice.settle,
    };
  }

  const isPublic = profile !== null && isPublicProfile(profile);
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-2">
        {isPublic && (
          <Link href={authorPagePath(profile.id)} className="font-medium text-accent underline-offset-4 hover:underline">
            {ACCOUNT_LINK_LABELS.openPublicPage}
          </Link>
        )}
        <SaveNotice message={notice.shownNotice} />
      </div>
      <div className="flex flex-col">
        <NameFieldEditor field="first_name" savedValue={profile?.firstName ?? null} {...controlsFor("first_name")} />
        <NameFieldEditor field="last_name" savedValue={profile?.lastName ?? null} {...controlsFor("last_name")} />
        <AboutFieldEditor savedAbout={profile?.about ?? null} {...controlsFor("about")} />
        <PhotoFieldEditor photoUrl={profile?.photoUrl ?? null} fullName={fullName} {...controlsFor("photo")} />
      </div>
    </div>
  );
}
