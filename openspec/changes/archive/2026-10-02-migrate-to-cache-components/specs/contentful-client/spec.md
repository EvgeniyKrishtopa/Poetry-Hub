# Spec Delta

## MODIFIED Requirements

### Requirement: Cacheable responses (NFR-2)
Every query SHALL be cached on the server in a `"use cache"` scope (migrate-to-cache-components FR-2):
- The scope's lifetime SHALL be `cacheLife({ revalidate: <seconds>, expire: 3600 })`. A caller MAY set the revalidation interval; when the caller omits it, the interval SHALL default to 60 seconds.
- A failed outcome SHALL be cached for the same lifetime as a success, and the rebuilt error carries no `cause`.
- The scope SHALL be tagged with `cacheTag`. The `contentful` tag SHALL always be applied, together with any caller-supplied tags, so that a publish notification expires every Contentful response.
- The outgoing request SHALL carry no `fetch` `next` cache options.
- A failure SHALL reach the caller as the same typed `ContentfulError` kind and status as an uncached call would produce, whether the failed outcome was just fetched or served from the cache (migrate-to-cache-components FR-3).

#### Scenario: Defaults when the caller passes no cache settings
- **GIVEN** a caller executes a query without cache settings
- **WHEN** the query is executed
- **THEN** the cache scope's lifetime is set with `cacheLife({ revalidate: 60, expire: 3600 })`
- **AND** the scope is tagged `contentful`

#### Scenario: Caller-supplied settings keep the enforced tag
- **GIVEN** a caller requests a 300-second revalidation with the tag `poems`
- **WHEN** the query is executed
- **THEN** the cache scope's lifetime is set with `cacheLife({ revalidate: 300, expire: 3600 })`
- **AND** the scope is tagged exactly `poems` and `contentful`

#### Scenario: No fetch-level cache options
- **GIVEN** any query
- **WHEN** the request is sent
- **THEN** the `fetch` init has no `next` property

#### Scenario: Failure kind survives the cache boundary
- **GIVEN** Contentful responds with HTTP 401
- **WHEN** a query is executed
- **THEN** it fails with an authentication `ContentfulError` carrying status 401, exactly as without caching
