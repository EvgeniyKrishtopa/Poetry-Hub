# Spec Delta

## Purpose

Defines the app-wide fallback screens rendered by the root route segment when a URL matches no route, when rendering throws, and while a segment is loading, so readers always see a branded, accessible screen with a way forward.

## ADDED Requirements

### Requirement: Not-found screen (FR-1)
An unmatched URL SHALL render the app's not-found screen with HTTP status 404 inside the root layout, containing an `h1` reading "Page not found", a short explanation, and a link to `/`.

#### Scenario: Unknown URL
- **GIVEN** the app is running
- **WHEN** a browser requests `/does-not-exist`
- **THEN** the response status is 404
- **AND** the page shows the `h1` "Page not found" and a link whose `href` is `/`

#### Scenario: Back to home
- **GIVEN** the not-found screen is shown
- **WHEN** the reader activates the home link
- **THEN** the browser navigates to `/` and the home page renders

### Requirement: Error screen (FR-2)
When a page or component inside the root layout throws during rendering, the app SHALL render its error screen inside the root layout, containing an `h1` reading "Something went wrong" and a generic explanation.

#### Scenario: Render error caught
- **GIVEN** the root error boundary receives an `Error`
- **WHEN** it renders
- **THEN** the `h1` "Something went wrong" and the generic explanation are visible

### Requirement: No internal detail on the error screen (FR-3)
The error screen SHALL NOT render the thrown error's `message` or stack. When the error carries a `digest`, it SHALL show "Error reference: <digest>"; otherwise no reference line is shown.

#### Scenario: Error with message and digest
- **GIVEN** an error with message "secret internal detail" and digest "abc123"
- **WHEN** the error screen renders
- **THEN** the text "secret internal detail" is absent
- **AND** "Error reference: abc123" is present

#### Scenario: Error without digest
- **GIVEN** an error with no `digest`
- **WHEN** the error screen renders
- **THEN** no "Error reference" text is present

### Requirement: Retry from the error screen (FR-4)
The error screen SHALL offer a "Try again" button that calls the `retry` function Next.js passes to the boundary exactly once per activation.

#### Scenario: Reader retries
- **GIVEN** the error screen is shown
- **WHEN** the reader clicks "Try again"
- **THEN** `retry` has been called exactly once

### Requirement: Error logging (FR-5)
The error screen SHALL log the caught error with `console.error` once each time it receives a new error.

#### Scenario: Error logged on mount
- **GIVEN** the error screen mounts with an error
- **WHEN** it renders
- **THEN** `console.error` has been called once with that error

#### Scenario: New error logged on re-render
- **GIVEN** the error screen has logged one error
- **WHEN** it re-renders with a different error
- **THEN** `console.error` has been called once more, with the new error

### Requirement: Loading state (FR-6)
While a route segment under the root layout is loading, the app SHALL render a `role="status"` region with accessible text "Loading…" plus skeleton blocks hidden from assistive technology.

#### Scenario: Segment loading
- **GIVEN** a route segment is loading
- **WHEN** the loading state renders
- **THEN** an element with role `status` and accessible text "Loading…" is present
- **AND** the skeleton blocks carry `aria-hidden="true"`

### Requirement: Design tokens only (NFR-1)
The three screens SHALL use only existing design tokens and Tailwind utilities, with no hard-coded colors and no new dependencies.

#### Scenario: No hard-coded colors or new dependencies
- **GIVEN** the change is complete
- **WHEN** the three screen files are searched for hex color literals, `rgb(`/`hsl(` calls, and Tailwind arbitrary color values, and `package.json` is diffed
- **THEN** there are no matches and no dependency changes

### Requirement: Reduced motion (NFR-2)
The loading skeleton's pulse animation SHALL be disabled when the reader prefers reduced motion.

#### Scenario: Skeleton respects reduced motion
- **GIVEN** the loading state renders
- **WHEN** its skeleton blocks are inspected
- **THEN** each carries both `animate-pulse` and `motion-reduce:animate-none`

### Requirement: Server Components by default (NFR-3)
Only `error.tsx` SHALL be a Client Component; `not-found.tsx` and `loading.tsx` SHALL remain Server Components.

#### Scenario: Client directive only on the error boundary
- **GIVEN** the change is complete
- **WHEN** the first statement of each new route file (the three screens and two group layouts) is read
- **THEN** only `error.tsx` starts with `"use client"`
