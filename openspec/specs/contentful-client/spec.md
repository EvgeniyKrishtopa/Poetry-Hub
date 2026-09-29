# contentful-client Specification

## Purpose
TBD - created by archiving change add-contentful-home-greeting. Update Purpose after archive.
## Requirements
### Requirement: Server-only access (FR-1)
The Contentful client SHALL be usable only from server code. Importing it into code that is bundled for the browser SHALL fail the production build.

#### Scenario: Client component imports the Contentful client
- **GIVEN** a Client Component that imports the Contentful client
- **WHEN** the application is built
- **THEN** the build fails with a server-only import error

### Requirement: Configuration validation (FR-2)
The client SHALL validate its configuration before sending any request: `CONTENTFUL_SPACE_ID` (required, lowercase alphanumeric), `CONTENTFUL_ACCESS_TOKEN` (required, non-empty, no whitespace), and `CONTENTFUL_ENVIRONMENT` (optional: unset or empty means `master`; a non-empty value must match `^[a-zA-Z0-9_.-]+$`). An invalid configuration SHALL produce a configuration error that names each offending variable and contains none of the configured values.

#### Scenario: Access token missing
- **GIVEN** `CONTENTFUL_ACCESS_TOKEN` is unset and `CONTENTFUL_SPACE_ID` is valid
- **WHEN** the Contentful configuration is loaded
- **THEN** a configuration error is raised whose message names `CONTENTFUL_ACCESS_TOKEN`
- **AND** no request is sent to Contentful

#### Scenario: Malformed space ID does not leak values
- **GIVEN** `CONTENTFUL_SPACE_ID` contains whitespace and `CONTENTFUL_ACCESS_TOKEN` is set to a known token string
- **WHEN** the Contentful configuration is loaded
- **THEN** a configuration error is raised that names `CONTENTFUL_SPACE_ID`
- **AND** the error message contains neither the space ID value nor the token string

#### Scenario: Environment defaults to master
- **GIVEN** `CONTENTFUL_SPACE_ID` and `CONTENTFUL_ACCESS_TOKEN` are valid and `CONTENTFUL_ENVIRONMENT` is unset, or set to an empty string
- **WHEN** a query is executed
- **THEN** the request targets the `master` environment of that space

#### Scenario: Malformed environment
- **GIVEN** `CONTENTFUL_SPACE_ID` and `CONTENTFUL_ACCESS_TOKEN` are valid and `CONTENTFUL_ENVIRONMENT` is `staging env/1`
- **WHEN** the Contentful configuration is loaded
- **THEN** a configuration error is raised that names `CONTENTFUL_ENVIRONMENT` and does not contain its value
- **AND** no request is sent to Contentful

### Requirement: Authenticated request (FR-1, NFR-1)
The client SHALL send each query to Contentful's GraphQL Content API for the configured space and environment, authenticating with the access token as a bearer credential, and SHALL NOT expose the token anywhere except the outgoing request's authorization header.

#### Scenario: Query is sent with bearer authentication
- **GIVEN** a valid configuration
- **WHEN** a query with variables is executed
- **THEN** a POST request carrying the query and variables is sent to the space's environment endpoint
- **AND** the request's `Authorization` header is `Bearer <token>`

### Requirement: Typed failure mapping (FR-3)
The client SHALL distinguish these failures, each as a separate typed error: the request could not complete (network failure or timeout); Contentful rejected the credentials (HTTP 401 or 403); the response body contains GraphQL errors; any other non-successful HTTP status or a response body that isn't a valid GraphQL response. A successful response SHALL contain a non-null `data` object when it has no GraphQL errors; a 2xx body without one (for example `{}` or `{ "data": null }`) is not a valid GraphQL response and SHALL fail as an HTTP error carrying the actual status. No error SHALL include the access token.

#### Scenario: Network failure
- **GIVEN** a valid configuration and Contentful is unreachable
- **WHEN** a query is executed
- **THEN** it fails with a network error

#### Scenario: Invalid token
- **GIVEN** a valid configuration and Contentful responds with HTTP 401
- **WHEN** a query is executed
- **THEN** it fails with an authentication error, distinct from a network error or a GraphQL error
- **AND** the error message does not contain the token

#### Scenario: GraphQL errors in the response
- **GIVEN** Contentful responds with a body containing a non-empty `errors` array
- **WHEN** a query is executed
- **THEN** it fails with a GraphQL error carrying the reported error messages

#### Scenario: Unexpected HTTP status
- **GIVEN** Contentful responds with HTTP 500 and no GraphQL errors
- **WHEN** a query is executed
- **THEN** it fails with an HTTP error carrying the status 500

#### Scenario: Success status without data
- **GIVEN** Contentful responds 200 with the body `{ "data": null }` or `{}`
- **WHEN** a query is executed
- **THEN** it fails with an HTTP error carrying the status 200

#### Scenario: Successful response
- **GIVEN** Contentful responds 200 with a `data` object and no errors
- **WHEN** a query is executed
- **THEN** it resolves with the `data` object, unvalidated, for the caller to validate

### Requirement: Cacheable responses (NFR-2)
Every query SHALL be cached on the server. A caller MAY set a revalidation interval and additional cache tags; when the interval is omitted it SHALL default to 60 seconds. The `contentful` tag SHALL always be applied, whether or not the caller supplies tags, so that a publish notification expires every Contentful response.

#### Scenario: Defaults when the caller passes no cache settings
- **GIVEN** a caller executes a query without cache settings
- **WHEN** the query is executed
- **THEN** the request is made with a 60-second revalidation and the `contentful` cache tag

#### Scenario: Caller-supplied settings keep the enforced tag
- **GIVEN** a caller requests a 300-second revalidation with the tag `poems`
- **WHEN** the query is executed
- **THEN** the request is made with a 300-second revalidation and the tags `poems` and `contentful`

