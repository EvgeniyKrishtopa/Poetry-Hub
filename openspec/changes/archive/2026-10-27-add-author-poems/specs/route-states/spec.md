## MODIFIED Requirements

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
