import { describe, expect, it } from "vitest";

import {
  COLLECTION_FIELD_ERRORS,
  COLLECTION_FORM_COPY,
  COLLECTION_LIST_COPY,
  COLLECTION_PAGE_COPY,
  COLLECTION_POEMS_LEAVE_COPY,
  COLLECTION_POEMS_ON_PAGE_COPY,
  COLLECTION_POEMS_PAGE_COPY,
  COLLECTION_TRAIL_LABELS,
  CREATE_COLLECTION_FAILURE_MESSAGES,
  EDIT_COLLECTION_COPY,
  MANAGE_COLLECTION_POEMS_ERRORS,
  NEW_COLLECTION_COPY,
  SAVE_COLLECTION_POEMS_FAILURE_MESSAGES,
  UPDATE_COLLECTION_FAILURE_MESSAGES,
} from "../../model/collection-management-messages";

const TITLE = "Осень";

// The expected texts are copied from the proposal's UI copy table, one row per assertion.
describe("collection-management messages", () => {
  // implements NFR-7 of add-poem-collections
  it("match the /account/poems rows", () => {
    expect(COLLECTION_LIST_COPY.createLink).toBe("Создать сборник произведений");
    expect(COLLECTION_LIST_COPY.sectionHeading).toBe("Сборники произведений");
    expect(COLLECTION_LIST_COPY.sectionUnavailable).toBe("Не удалось загрузить сборники. Попробуйте позже.");
    expect(COLLECTION_LIST_COPY.created(TITLE)).toBe("Сборник «Осень» создан.");
    expect(COLLECTION_LIST_COPY.deleted(TITLE)).toBe("Сборник «Осень» удалён.");
    expect(COLLECTION_LIST_COPY.alreadyDeleted).toBe("Сборник уже удалён.");
  });

  // implements NFR-7 of add-poem-collections
  it("match the create page and form rows", () => {
    expect(NEW_COLLECTION_COPY.heading).toBe("Создание сборника");
    expect(COLLECTION_TRAIL_LABELS.newCollection).toBe("Создание сборника");
    expect(COLLECTION_FORM_COPY.titleLabel).toBe("Название сборника");
    expect(COLLECTION_FORM_COPY.descriptionLabel).toBe("Описание (необязательно)");
    expect(NEW_COLLECTION_COPY.submit).toBe("Создать сборник");
    expect(NEW_COLLECTION_COPY.submitPending).toBe("Создание…");
    expect(CREATE_COLLECTION_FAILURE_MESSAGES["too-many-collections"]).toBe(
      "Слишком много новых сборников. Попробуйте позже.",
    );
    expect(NEW_COLLECTION_COPY.notPublic).toBe("Чтобы создавать сборники, укажите имя и фамилию в профиле автора.");
    expect(CREATE_COLLECTION_FAILURE_MESSAGES["not-public"]).toBe(NEW_COLLECTION_COPY.notPublic);
    expect(NEW_COLLECTION_COPY.profileEditorLink).toBe("Перейти к профилю автора");
  });

  // implements NFR-7 of add-poem-collections
  it("match the field error and shared failure rows", () => {
    expect(COLLECTION_FIELD_ERRORS.required).toBe("Обязательное поле.");
    expect(COLLECTION_FIELD_ERRORS.titleTooLong).toBe("Не более 80 символов.");
    expect(COLLECTION_FIELD_ERRORS.descriptionTooLong).toBe("Не более 1000 символов.");
    for (const messages of [CREATE_COLLECTION_FAILURE_MESSAGES, UPDATE_COLLECTION_FAILURE_MESSAGES]) {
      expect(messages.unavailable).toBe("Сохранение сейчас недоступно. Попробуйте позже.");
      expect(messages.unknown).toBe("Что-то пошло не так. Попробуйте ещё раз.");
    }
  });

  // implements NFR-7 of add-poem-collections
  it("match the collection page and delete dialog rows", () => {
    expect(COLLECTION_PAGE_COPY.edit).toBe("Редактировать сборник");
    expect(COLLECTION_PAGE_COPY.delete).toBe("Удалить сборник");
    expect(COLLECTION_PAGE_COPY.saved).toBe("Изменения сохранены.");
    expect(COLLECTION_PAGE_COPY.dialogTitle).toBe("Удалить сборник?");
    expect(COLLECTION_PAGE_COPY.dialogBody(TITLE)).toBe("Сборник «Осень» будет удалён без возможности восстановления.");
    expect(COLLECTION_PAGE_COPY.cancel).toBe("Отмена");
    expect(COLLECTION_PAGE_COPY.confirm).toBe("Удалить");
    expect(COLLECTION_PAGE_COPY.confirmPending).toBe("Удаление…");
    expect(COLLECTION_PAGE_COPY.close).toBe("Закрыть");
    expect(COLLECTION_PAGE_COPY.deleteFailure).toBe("Не удалось удалить сборник. Попробуйте позже.");
  });

  // implements NFR-7 of add-poem-collections
  it("match the edit page rows", () => {
    expect(EDIT_COLLECTION_COPY.heading).toBe("Редактирование сборника");
    expect(COLLECTION_TRAIL_LABELS.editCollection).toBe("Редактирование");
    expect(EDIT_COLLECTION_COPY.submit).toBe("Сохранить изменения");
    expect(EDIT_COLLECTION_COPY.submitPending).toBe("Сохранение…");
    expect(EDIT_COLLECTION_COPY.discard).toBe("Отменить изменения");
    expect(EDIT_COLLECTION_COPY.backToCollection).toBe("Вернуться к сборнику");
    expect(UPDATE_COLLECTION_FAILURE_MESSAGES["too-many-saves"]).toBe("Слишком много сохранений. Попробуйте через минуту.");
    expect(UPDATE_COLLECTION_FAILURE_MESSAGES["not-public"]).toBe(
      "Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.",
    );
  });

  // implements NFR-7 of add-poems-to-collections
  it("match the collection page's poem list and manage button rows", () => {
    expect(COLLECTION_POEMS_ON_PAGE_COPY.poemsHeading).toBe("Произведения");
    expect(COLLECTION_POEMS_ON_PAGE_COPY.manage).toBe("Произведения сборника");
    expect(MANAGE_COLLECTION_POEMS_ERRORS["not-found"]).toBe("Сборник уже удалён.");
    expect(MANAGE_COLLECTION_POEMS_ERRORS["nothing-to-manage"]).toBe(
      "Нет свободных произведений для добавления в сборник.",
    );
    expect(MANAGE_COLLECTION_POEMS_ERRORS.unavailable).toBe("Не удалось открыть произведения сборника. Попробуйте позже.");
  });

  // implements NFR-7 of add-poems-to-collections
  it("match the collection poems page rows", () => {
    expect(COLLECTION_POEMS_PAGE_COPY.heading).toBe("Произведения сборника");
    expect(COLLECTION_TRAIL_LABELS.collectionPoems).toBe("Произведения сборника");
    expect(COLLECTION_POEMS_PAGE_COPY.hint(TITLE)).toBe(
      "Отметьте произведения сборника «Осень». Произведение может входить только в один сборник.",
    );
    expect(COLLECTION_POEMS_PAGE_COPY.legend).toBe("Произведения");
    expect(COLLECTION_POEMS_PAGE_COPY.empty).toBe("Нет свободных произведений для добавления в сборник.");
    expect(COLLECTION_POEMS_PAGE_COPY.save).toBe("Сохранить выбранное");
    expect(COLLECTION_POEMS_PAGE_COPY.savePending).toBe("Сохранение…");
    expect(COLLECTION_POEMS_PAGE_COPY.saved).toBe("Произведения сборника сохранены.");
    expect(COLLECTION_POEMS_PAGE_COPY.backToCollection).toBe("Вернуться к сборнику");
    expect(COLLECTION_POEMS_PAGE_COPY.stale).toBe(
      "Часть произведений уже недоступна: список обновлён. Отметьте произведения заново.",
    );
    expect(SAVE_COLLECTION_POEMS_FAILURE_MESSAGES["too-many-saves"]).toBe(
      "Слишком много сохранений. Попробуйте через минуту.",
    );
    expect(SAVE_COLLECTION_POEMS_FAILURE_MESSAGES["not-public"]).toBe(
      "Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.",
    );
    expect(SAVE_COLLECTION_POEMS_FAILURE_MESSAGES.unavailable).toBe("Сохранение сейчас недоступно. Попробуйте позже.");
    expect(SAVE_COLLECTION_POEMS_FAILURE_MESSAGES.unknown).toBe("Что-то пошло не так. Попробуйте ещё раз.");
  });

  // implements NFR-7 of add-poems-to-collections
  it("match the collection poems leave dialog rows", () => {
    expect(COLLECTION_POEMS_LEAVE_COPY.title).toBe("Есть несохранённые изменения");
    expect(COLLECTION_POEMS_LEAVE_COPY.linkBody).toBe("Сохранить выбранные произведения перед уходом?");
    expect(COLLECTION_POEMS_LEAVE_COPY.signOutBody).toBe("Сохранить выбранные произведения перед выходом?");
    expect(COLLECTION_POEMS_LEAVE_COPY.save).toBe("Сохранить изменения");
    expect(COLLECTION_POEMS_LEAVE_COPY.savePending).toBe("Сохранение…");
    expect(COLLECTION_POEMS_LEAVE_COPY.leaveLink).toBe("Уйти без сохранения");
    expect(COLLECTION_POEMS_LEAVE_COPY.leaveSignOut).toBe("Выйти без сохранения");
    expect(COLLECTION_POEMS_LEAVE_COPY.stay).toBe("Остаться");
    expect(COLLECTION_POEMS_LEAVE_COPY.close).toBe("Закрыть");
  });
});
