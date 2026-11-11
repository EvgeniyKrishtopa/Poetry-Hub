/** Every user-facing string of the board, verbatim from the proposal's UI copy table (NFR-6). */
export const WORK_BOARD_COPY = {
  emptyCollectionArea: "Перетащите сюда произведение.",
  emptyFreeArea: "Перетащите сюда произведение, чтобы оно не входило ни в один сборник.",
  keyboardInstructions: "Нажмите пробел, чтобы взять. Стрелками выберите место. Пробел — положить, Escape — отменить.",
  loading: "Загрузка…",
  collectionsUnavailable: "Не удалось загрузить сборники. Попробуйте позже.",
  poemsUnavailable: "Не удалось загрузить произведения. Попробуйте позже.",
} as const;

/** The alert above the board for each refused move (FR-6, FR-11). */
export const MOVE_FAILURE_MESSAGES = {
  failed: "Не удалось сохранить порядок. Попробуйте ещё раз.",
  "rate-limited": "Слишком много перестановок за минуту. Подождите немного и повторите.",
  stale: "Список изменился в другой вкладке. Мы обновили его — попробуйте ещё раз.",
  unauthenticated: "Не удалось сохранить порядок. Попробуйте ещё раз.",
} as const;

/** The handles' accessible names (FR-7). */
export function collectionHandleLabel(title: string): string {
  void title;
  throw new Error("not implemented");
}

/** The handles' accessible names (FR-7). */
export function poemHandleLabel(title: string): string {
  void title;
  throw new Error("not implemented");
}

/** The live-region announcements of FR-7, one function per phrase. */
export const ANNOUNCEMENTS = {
  picked: (title: string): string => {
    void title;
    throw new Error("not implemented");
  },
  position: (title: string, position: number, total: number): string => {
    void title;
    void position;
    void total;
    throw new Error("not implemented");
  },
  movedToCollection: (title: string, collectionTitle: string, position: number, total: number): string => {
    void title;
    void collectionTitle;
    void position;
    void total;
    throw new Error("not implemented");
  },
  movedToFree: (title: string, position: number, total: number): string => {
    void title;
    void position;
    void total;
    throw new Error("not implemented");
  },
  cancelled: (title: string): string => {
    void title;
    throw new Error("not implemented");
  },
} as const;
