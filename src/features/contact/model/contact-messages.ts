import { EMAIL_MAX_LENGTH, MESSAGE_MAX_LENGTH, NAME_MAX_LENGTH } from "./contact.constants";

// Every string of the proposal's UI copy table, verbatim and in Russian.

export const CONTACT_FIELD_ERRORS = {
  nameRequired: "Введите имя",
  nameTooLong: `Имя должно быть не длиннее ${NAME_MAX_LENGTH} символов`,
  emailInvalid: "Введите корректный адрес электронной почты",
  emailTooLong: `Адрес почты должен быть не длиннее ${EMAIL_MAX_LENGTH} символов`,
  messageTooLong: `Сообщение должно быть не длиннее ${MESSAGE_MAX_LENGTH} символов`,
} as const;

export const CONTACT_COPY = {
  trigger: "Связаться с нами",
  title: "Связаться с нами",
  intro: "Напишите нам, и мы ответим на указанную почту.",
  close: "Закрыть",
  /** The corner close button's visible mark; its accessible name is `close`. */
  closeGlyph: "×",
  nameLabel: "Имя",
  emailLabel: "Электронная почта",
  messageLabel: "Ваше сообщение",
  submit: "Отправить",
  submitting: "Отправка…",
  sendFailed: "Не удалось отправить сообщение. Попробуйте ещё раз позже.",
  sent: "Спасибо! Ваше сообщение отправлено.",
} as const;
