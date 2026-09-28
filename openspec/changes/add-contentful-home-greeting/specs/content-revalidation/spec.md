# Spec Delta

## Purpose

Lets Contentful notify the app when content is published or unpublished, so cached CMS content is expired immediately instead of waiting for time-based revalidation.

## ADDED Requirements

### Requirement: Authenticated publish notification endpoint (FR-9)
The application SHALL expose `POST /api/revalidate` for Contentful webhook notifications. A request SHALL be accepted only when its `x-contentful-webhook-secret` header exactly equals the configured `CONTENTFUL_REVALIDATE_SECRET`, compared in constant time. The secret SHALL never appear in responses or logs.

#### Scenario: Valid notification
- **GIVEN** `CONTENTFUL_REVALIDATE_SECRET` is configured
- **WHEN** a POST to `/api/revalidate` carries a matching `x-contentful-webhook-secret` header
- **THEN** the response is HTTP 200 with body `{ "revalidated": true }`
- **AND** all cached Contentful content is expired immediately

#### Scenario: Wrong or missing secret
- **GIVEN** `CONTENTFUL_REVALIDATE_SECRET` is configured
- **WHEN** a POST to `/api/revalidate` has no `x-contentful-webhook-secret` header, or one that doesn't match
- **THEN** the response is HTTP 401
- **AND** no cached content is expired
- **AND** neither the response nor the server log contains the configured secret

#### Scenario: Secret not configured
- **GIVEN** `CONTENTFUL_REVALIDATE_SECRET` is unset or empty
- **WHEN** a POST to `/api/revalidate` arrives with any header value, including an empty one
- **THEN** the response is HTTP 503
- **AND** no cached content is expired
- **AND** a server log entry records that the revalidation secret is not configured

#### Scenario: Non-POST method
- **GIVEN** the application is running
- **WHEN** a GET request is sent to `/api/revalidate`
- **THEN** the response is HTTP 405 and no cached content is expired

### Requirement: Immediate expiry (FR-9, NFR-2)
An accepted notification SHALL expire cached Contentful content so that the next request waits for fresh data rather than being served the stale copy.

#### Scenario: Next request after a notification is fresh
- **GIVEN** the home page is cached with the greeting title "Welcome to Poetry Hub" and the title has since been changed to "Hello, reader" and published
- **WHEN** a valid notification is accepted and then `/` is requested
- **THEN** that first request shows "Hello, reader"
