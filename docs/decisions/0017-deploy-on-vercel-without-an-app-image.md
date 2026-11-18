# 0017. Deploy on Vercel, with no Docker image for the app

## Status

Accepted (2026-11-18)

## Context

The repository has no `Dockerfile` and no `vercel.json`, and `docs/environment.md` only says "hosting platform". All state lives outside the app: users, poems, collections and files in Supabase, editorial content in Contentful. The app itself needs only environment variables. CI runs plain Node jobs without containers. The local Supabase stack already runs in Docker (`npx supabase start`), but that needs no image of this app.

## Decision

The app is deployed on Vercel from the repository. No Docker image, `Dockerfile` or `output: "standalone"` is added for the app.

## Consequences

**Positive**

- No image to build, scan or maintain; Vercel builds Next.js itself.
- Preview deployments per pull request, and Vercel's own build and edge caching, come for free.
- The deploy checklist in `docs/environment.md` can name the platform instead of "hosting platform".

**Negative**

- Set up by hand on the platform: environment variables per environment (Production, Preview, Development), and `NEXT_PUBLIC_SUPABASE_URL` in the build environment because `next.config.ts` reads it at build time.
- Supabase Auth redirect URLs must allow the preview URLs as well as the production one.
- The per-IP rate rule for Server Action POSTs (ADR 0007, point 5) is set in Vercel Firewall.
- The Contentful publish webhook must point at the deployed `/api/revalidate`.
- Vercel's build cache is separate from the `.next/cache` step in CI, which only speeds up the CI `build` check.
- Tied to one platform: moving off Vercel is a new decision, not a config change.

## Alternatives Considered

- Docker image on a VPS, Fly.io or Railway — rejected because it adds an image, a registry and runtime operations with no requirement that needs them, and costs the preview deployments and edge caching Vercel gives.
- Docker image on Kubernetes — rejected because the app is stateless and small, so an orchestrator is more operational weight than it saves.
- Docker for dev and CI parity only — rejected because `.nvmrc` already pins the Node version, and CI runs without containers.

If hosting moves off Vercel, a new ADR with `Supersedes: 0017` should cover the image and `output: "standalone"` and get its own spec.
