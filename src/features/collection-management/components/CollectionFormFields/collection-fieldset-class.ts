// The disabled fieldset dims the whole form while sending; its buttons would dim a second time on their own
// `:disabled` style. Only while the fieldset itself is disabled: a button disabled on its own (offline) still dims.
// The poem forms' rule, repeated (design D1).
export const COLLECTION_FIELDSET_CLASS =
  "flex min-w-0 flex-col gap-6 disabled:opacity-50 disabled:[&_button:disabled]:opacity-100";
