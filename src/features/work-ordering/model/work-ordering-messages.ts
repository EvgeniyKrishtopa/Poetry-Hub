/**
 * Every user-facing string of the board (NFR-6): the proposal's UI copy table verbatim, plus the section heading
 * the page already had (artboard 40).
 */
export const WORK_BOARD_COPY = {
  sectionHeading: "Сборники произведений",
  // Read by a screen reader with each handle, in place of the library's English default.
  draggableRole: "перетаскиваемый элемент",
  emptyCollectionArea: "Перетащите сюда произведение.",
  emptyFreeArea: "Перетащите сюда произведение, чтобы оно не входило ни в один сборник.",
  screenReaderInstructions: "Нажмите пробел, чтобы взять. Стрелками выберите место. Пробел — положить, Escape — отменить.",
  loading: "Загрузка…",
  collectionsUnavailable: "Не удалось загрузить сборники. Попробуйте позже.",
  poemsUnavailable: "Не удалось загрузить произведения. Попробуйте позже.",
} as const;

/** The alert above the board for each refused move that keeps the author here (FR-6, FR-11); `unauthenticated` redirects instead. */
export const MOVE_FAILURE_MESSAGES = {
  failed: "Не удалось сохранить порядок. Попробуйте ещё раз.",
  "rate-limited": "Слишком много перестановок за минуту. Подождите немного и повторите.",
  restricted: "Ваш аккаунт заблокирован: изменения недоступны.",
  stale: "Список изменился в другой вкладке. Мы обновили его — попробуйте ещё раз.",
} as const;

/** The handles' accessible names (FR-7). */
export function collectionHandleLabel(title: string): string {
  return `Переместить сборник «${title}»`;
}

/** The handles' accessible names (FR-7). */
export function poemHandleLabel(title: string): string {
  return `Переместить произведение «${title}»`;
}

/** The live-region announcements of FR-7, one function per phrase. */
export const SCREEN_READER_ANNOUNCEMENTS = {
  picked: (title: string): string => `Взято: «${title}».`,
  position: (title: string, position: number, total: number): string => `«${title}» — позиция ${position} из ${total}.`,
  movedToCollection: (title: string, collectionTitle: string, position: number, total: number): string =>
    `«${title}» помещено в сборник «${collectionTitle}», позиция ${position} из ${total}.`,
  movedToFree: (title: string, position: number, total: number): string =>
    `«${title}» помещено в свободные, позиция ${position} из ${total}.`,
  cancelled: (title: string): string => `«${title}» возвращено на прежнее место.`,
} as const;
