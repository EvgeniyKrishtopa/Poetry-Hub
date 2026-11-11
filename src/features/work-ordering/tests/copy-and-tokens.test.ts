// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ANNOUNCEMENTS,
  collectionHandleLabel,
  MOVE_FAILURE_MESSAGES,
  poemHandleLabel,
  WORK_BOARD_COPY,
} from "../model/work-ordering-messages";

const COMPONENTS_DIR = "src/features/work-ordering/components";
const FEATURE_DIR = "src/features/work-ordering";
const MESSAGES_FILE = "work-ordering-messages.ts";

const CYRILLIC = /[А-Яа-яЁё]/;
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;
const ARBITRARY_TAILWIND_VALUE = /\b[a-z][a-z0-9-]*-\[[^\]]+\]/;
const SOURCE_FILE = /\.(tsx?|css)$/;

function files(dir: string, kinds: RegExp): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => kinds.test(path) && !path.split("/").includes("tests"))
    .map((path) => join(dir, path));
}

function filesMatching(paths: readonly string[], pattern: RegExp): string[] {
  return paths.filter((path) => pattern.test(readFileSync(path, "utf8")));
}

describe("work-ordering copy", () => {
  // implements NFR-6 of drag-and-drop-ordering: the proposal's UI copy table, verbatim, from the messages module
  it("exports every string of the proposal's UI copy table", () => {
    expect(collectionHandleLabel("«x»")).toBe("Переместить сборник ««x»»");
    expect(poemHandleLabel("Т")).toBe("Переместить произведение «Т»");
    expect(WORK_BOARD_COPY.emptyCollectionArea).toBe("Перетащите сюда произведение.");
    expect(WORK_BOARD_COPY.emptyFreeArea).toBe("Перетащите сюда произведение, чтобы оно не входило ни в один сборник.");
    expect(WORK_BOARD_COPY.keyboardInstructions).toBe(
      "Нажмите пробел, чтобы взять. Стрелками выберите место. Пробел — положить, Escape — отменить.",
    );
    expect(ANNOUNCEMENTS.picked("Т")).toBe("Взято: «Т».");
    expect(ANNOUNCEMENTS.position("Т", 2, 5)).toBe("«Т» — позиция 2 из 5.");
    expect(ANNOUNCEMENTS.movedToCollection("Т", "С", 1, 3)).toBe("«Т» помещено в сборник «С», позиция 1 из 3.");
    expect(ANNOUNCEMENTS.movedToFree("Т", 1, 3)).toBe("«Т» помещено в свободные, позиция 1 из 3.");
    expect(ANNOUNCEMENTS.cancelled("Т")).toBe("«Т» возвращено на прежнее место.");
    expect(MOVE_FAILURE_MESSAGES.failed).toBe("Не удалось сохранить порядок. Попробуйте ещё раз.");
    expect(MOVE_FAILURE_MESSAGES["rate-limited"]).toBe("Слишком много перестановок за минуту. Подождите немного и повторите.");
    expect(MOVE_FAILURE_MESSAGES.stale).toBe("Список изменился в другой вкладке. Мы обновили его — попробуйте ещё раз.");
  });

  // implements NFR-6 of drag-and-drop-ordering
  it("keeps every Cyrillic string out of the components, the hooks, the DAL and the actions", () => {
    const production = files(FEATURE_DIR, /\.tsx?$/).filter((path) => !path.endsWith(MESSAGES_FILE));

    expect(filesMatching(production, CYRILLIC)).toEqual([]);
  });
});

describe("work-ordering styles", () => {
  // implements NFR-5 of drag-and-drop-ordering
  it("holds no colour literal in any component or style", () => {
    expect(filesMatching(files(COMPONENTS_DIR, SOURCE_FILE), COLOUR_LITERAL)).toEqual([]);
  });

  // implements NFR-5 of drag-and-drop-ordering
  it("holds no arbitrary Tailwind value in any component", () => {
    expect(filesMatching(files(COMPONENTS_DIR, /\.tsx$/), ARBITRARY_TAILWIND_VALUE)).toEqual([]);
  });
});
