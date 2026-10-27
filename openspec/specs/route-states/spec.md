# route-states Specification

## Purpose
Defines the app-wide fallback screens rendered by the root route segment when a URL matches no route, when rendering throws, and while a segment is loading, so readers always see a branded, accessible screen with a way forward.
## Requirements
### Requirement: Not-found screen (FR-1)
An unmatched URL SHALL render the app's not-found screen with HTTP status 404 inside the root layout, containing an `h1` reading "Страница не найдена", a short explanation, and a link to `/`.

#### Scenario: Unknown URL
- **GIVEN** the app is running
- **WHEN** a browser requests `/does-not-exist`
- **THEN** the response status is 404
- **AND** the page shows the `h1` "Страница не найдена" and a link whose `href` is `/`

#### Scenario: Back to home
- **GIVEN** the not-found screen is shown
- **WHEN** the reader activates the home link
- **THEN** the browser navigates to `/` and the home page renders

### Requirement: Error screen (FR-2)
When a page or component inside the root layout throws during rendering, the app SHALL render its error screen inside the root layout, containing an `h1` reading "Что-то пошло не так" and a generic explanation.

#### Scenario: Render error caught
- **GIVEN** the root error boundary receives an `Error`
- **WHEN** it renders
- **THEN** the `h1` "Что-то пошло не так" and the generic explanation are visible

### Requirement: No internal detail on the error screen (FR-3)
The error screen SHALL NOT render the thrown error's `message` or stack. When the error carries a `digest`, it SHALL show "Код ошибки: <digest>"; otherwise no reference line is shown.

#### Scenario: Error with message and digest
- **GIVEN** an error with message "secret internal detail" and digest "abc123"
- **WHEN** the error screen renders
- **THEN** the text "secret internal detail" is absent
- **AND** "Код ошибки: abc123" is present

#### Scenario: Error without digest
- **GIVEN** an error with no `digest`
- **WHEN** the error screen renders
- **THEN** no "Код ошибки" text is present

### Requirement: Retry from the error screen (FR-4)
The error screen SHALL offer a "Повторить" button that, exactly once per activation, re-requests the current route (the page and its parallel slots, such as the breadcrumb trail, together) and resets the boundary. Only one retry attempt SHALL run at a time (add-author-poems FR-11): from an activation until that attempt finishes, the button SHALL be disabled and further activations SHALL NOT refresh the route or reset the boundary again. When the attempt finishes and the error screen is still shown, the button SHALL be enabled again. Its label SHALL stay "Повторить" throughout.

#### Scenario: Reader retries
- **GIVEN** the error screen is shown
- **WHEN** the reader clicks "Повторить"
- **THEN** the route has been refreshed and the boundary reset exactly once

#### Scenario: Repeated clicks during an attempt
- **GIVEN** the error screen is shown and the reader has clicked "Повторить", and the attempt has not finished
- **WHEN** the reader clicks "Повторить" again, or presses Enter on it
- **THEN** the route has still been refreshed exactly once
- **AND** the button is disabled and still reads "Повторить"

#### Scenario: Attempt fails again
- **GIVEN** a retry attempt has finished and the page still fails
- **WHEN** the error screen is shown again
- **THEN** the "Повторить" button is enabled, and clicking it refreshes the route once more

#### Scenario: Recovery refreshes the trail too
- **GIVEN** `/authors/<id>` shows the error screen with the trail item «Автор» because the author read failed, and the author service is back
- **WHEN** the reader clicks "Повторить"
- **THEN** the author's page replaces the error screen and the trail's last item reads the author's name, not «Автор»

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
While a route segment under the root layout is loading, the app SHALL render a `role="status"` region with accessible text "Загрузка…" plus skeleton blocks hidden from assistive technology.

#### Scenario: Segment loading
- **GIVEN** a route segment is loading
- **WHEN** the loading state renders
- **THEN** an element with role `status` and accessible text "Загрузка…" is present
- **AND** the skeleton blocks carry `aria-hidden="true"`

### Requirement: Design tokens only (NFR-1)
The three screens SHALL use only existing design tokens and Tailwind utilities, with no hard-coded colors and no new dependencies.

#### Scenario: No hard-coded colors or new dependencies
- **GIVEN** the change is complete
- **WHEN** the three screen files are searched for hex color literals, `rgb(`/`hsl(` calls, and Tailwind arbitrary color values, and `package.json` `dependencies` are diffed
- **THEN** there are no matches and no runtime dependency changes

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

