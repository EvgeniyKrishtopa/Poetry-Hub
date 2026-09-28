// `server-only` throws when imported outside a React Server Components bundle.
// Vitest aliases it to this empty module so server-only code stays unit-testable.
// implements FR-1 of add-contentful-home-greeting (test side of the server-only guard)
export {};
