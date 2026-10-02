# Spec Delta

## MODIFIED Requirements

### Requirement: Content freshness (NFR-2)
**Hard deadline.** 60 seconds is a hard deadline measured from the moment an entry is published (or unpublished) in Contentful. The first request for the home page made more than 60 seconds after publishing SHALL show the new content, never a stale copy.
- The guarantee is delivered by Contentful's publish notification (see the `content-revalidation` capability). Once a notification is accepted, the very next request SHALL show the new content.
- The deadline is conditional on three things: the notification is delivered and accepted, the application runs as a single instance, and Contentful's delivery API already serves the published version when the notification is processed.

**Safety net.** As a best-effort safety net for a missed notification, cached greeting content SHALL also go stale 60 seconds after it was fetched. The page and its data are cached in nested scopes, each with stale-while-revalidate (migrate-to-cache-components). On this path, therefore, up to two request-driven refresh windows may pass before new content shows: a stale copy can be served once per level while fresh content is fetched in the background. This path is not covered by the hard deadline.

**After a failed fetch.** A page first built while Contentful was unreachable or unconfigured is cached together with the failed outcome (migrate-to-cache-components FR-3). Recovery is driven by requests, under stale-while-revalidate at both the page and data levels. The clock starts when the failed outcome was cached. If there is a request for `/` more than 60 seconds later, and another more than 60 seconds after that one, each completing its background refresh, then the next request after the second refresh SHALL show the CMS greeting. Without such requests, recovery takes longer. That is accepted, because the publish notification remains the guarantee.

#### Scenario: Publish notification makes the next request fresh
- **GIVEN** the home page is cached with title "Welcome to Poetry Hub"
- **WHEN** the title is changed to "Hello, reader" and published, and Contentful's publish notification is accepted
- **THEN** the first request for `/` after the notification shows "Hello, reader"

#### Scenario: Fallback page recovers after configuration is fixed
- **GIVEN** the home page was generated with the static fallback because the configuration was missing
- **WHEN** the configuration is provided, a request for `/` is made more than 60 seconds after the failed outcome was cached, and another more than 60 seconds after that, each one's background refresh completing
- **THEN** the next request for `/` shows the CMS greeting
