"use client";

import { useDroppable } from "@dnd-kit/core";

import { ButtonLink } from "@/shared/ui";

import { ADMIN_VIOLATION_COPY } from "../../model/admin-messages";
import { VIOLATION_DROP_TARGET_ID } from "../../model/violation.constants";

import styles from "./ViolationDropLink.module.css";
import type { ViolationDropLinkProps } from "./ViolationDropLink.types";

/** The violation-list link as a `@dnd-kit` droppable, with its drop-target state (FR-3). */
export function ViolationDropLink({ href, disabled }: ViolationDropLinkProps) {
  const { setNodeRef, isOver } = useDroppable({ id: VIOLATION_DROP_TARGET_ID, disabled });

  return (
    <div ref={setNodeRef} className={`${styles.target} ${isOver ? styles.over : ""}`}>
      <ButtonLink variant="ghost" href={href}>
        {ADMIN_VIOLATION_COPY.listLink}
      </ButtonLink>
      {isOver && <span className={styles.caption}>{ADMIN_VIOLATION_COPY.dropCaption}</span>}
    </div>
  );
}
