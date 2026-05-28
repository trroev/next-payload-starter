# @repo/payload

Embedded [PayloadCMS 3](https://payloadcms.com) configuration for the starter:
collections, access control, hooks, the Payload config factory, and a Cloudinary
storage adapter wired to the `media` collection.

## Media storage

Media defaults to **Payload's built-in local-disk storage**. With no
configuration, uploads to the `media` collection land in `apps/web/media/`
(ignored by git) and are served by Payload's static handler. This is the
zero-configuration path a fresh fork gets.

### Opting into Cloudinary

Set all three values in your environment (e.g. `apps/web/.env.development`):

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

When all three are present, `createPayloadConfig` wires
`@payloadcms/plugin-cloud-storage` with the bundled `cloudinaryAdapter`,
sets `disableLocalStorage: true` on the `media` collection, and serves URLs
straight from Cloudinary's CDN. With any of the three missing, the plugin is
omitted entirely — local-disk storage is used.

Half-configured environments (e.g. only `CLOUDINARY_CLOUD_NAME` set) fall back
to local-disk; the env schema is `.optional()` on all three keys.

### Swapping in a different adapter

The bundled `cloudinaryAdapter` is intentionally small (~80 LOC at
`src/adapters/cloudinary/index.ts`) — it doubles as a working example of how to
write a Payload storage adapter against `@payloadcms/plugin-cloud-storage`. To
back the `media` collection with S3, Vercel Blob, UploadThing, GCS, or Azure
instead, replace the conditional `cloudStoragePlugin(...)` block in
`src/payload.config.ts` with the corresponding `@payloadcms/storage-*` package
and delete `src/adapters/cloudinary/` plus the `cloudinary` dependency and
`@repo/env/cloudinary` import.

## Investigation: keep or replace the custom Cloudinary adapter? (#29)

This section records the outcome of investigation issue #29, which weighed
keeping the hand-written Cloudinary adapter against swapping it for a community
adapter or dropping cloud storage from the starter defaults.

### Decision

**Default to Payload's local-disk storage; keep the custom Cloudinary adapter
as an opt-in example wired only when `CLOUDINARY_*` env is set.** Implemented in
this change.

Concretely:

- `@repo/env/cloudinary` now declares all three `CLOUDINARY_*` vars as
  `z.string().optional()` so the env module no longer throws on a fresh fork.
- `createPayloadConfig` calls `resolveCloudinaryConfig()`; when it returns
  `undefined` the `cloudStoragePlugin(...)` entry is omitted from the plugins
  array and Payload's built-in local-disk storage takes over.
- The adapter file at `src/adapters/cloudinary/index.ts` stays put as the
  canonical "how to write a Payload storage adapter" reference for forkers.

### Rationale

Three considerations drove the choice:

1. **Starter onboarding.** A `git clone && pnpm dev` flow that requires
   provisioning a Cloudinary account before the app boots is a poor default for
   a "skip the first two weeks" starter. Local disk gets a forker to a working
   admin upload in zero steps; Cloudinary is a paste-three-env-vars upgrade.
2. **Payload has no official Cloudinary adapter.** Of the
   `@payloadcms/storage-*` family — S3, Vercel Blob, UploadThing, GCS, Azure —
   none target Cloudinary. Swapping our ~80-line adapter for a community package
   would trade auditable in-tree code for an external dependency without a
   clear upgrade in surface area. Keeping it in-tree preserves the
   illustrative value of a real adapter implementation.
3. **The adapter is small and self-contained.** `buildPublicId`, the
   `upload_stream` Promise wrapper, and the `staticHandler` redirect total
   under 80 lines and have not needed maintenance since they were written.
   Carrying that as a documented example costs less than negotiating a
   community-adapter dependency.

### Out of scope

The `CLOUDINARY_URL: ''` workaround in
`tooling/github/ci/generate-types/action.yml` is tracked separately in #34 and
not removed here.
