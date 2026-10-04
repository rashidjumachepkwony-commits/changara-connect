# Changara Connect deployment preparation

## Target domains and hosting

- Frontend: `https://startechafrica.co.ke/` on Cloudflare Pages.
- API: `https://connect-api.startechafrica.co.ke/` on Cloudflare Workers.
- Database and uploads: Supabase PostgreSQL and Supabase Storage.
- Do not configure `connect.startechafrica.co.ke` as the frontend.

## Current readiness

The static frontend is in `client/`; it does not need a build command. Configure the Pages project with the repository root as the project root and `client` as the build output directory. The frontend API client defaults to the production API domain and supports an optional `window.API_BASE_URL` override.

The Worker uses `worker/index.js`, and Wrangler production configuration is in `wrangler.toml`. The production Worker custom domain is configured in Wrangler. The Supabase service-role key must be configured as a Worker secret, never as a Pages variable or frontend asset:

```powershell
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
npx wrangler secret put JWT_SECRET --env production
```

Set `SUPABASE_URL` and `SUPABASE_STORAGE_BUCKET=uploads` as production Worker variables. Create the `uploads` Storage bucket in Supabase and make it public if the application should use the public URLs returned by the upload handlers. The service-role key and `JWT_SECRET` belong only in Worker secrets; never put either in Pages settings or frontend files.

All 95 currently declared Express method/path routes have corresponding Worker registrations and implementations, and `WORKER_ROUTES.md` documents their mappings. Static coverage and Wrangler's production dry-run do not prove database compatibility or behavior parity. The Supabase migration has not been applied or tested against a project, and the Mongo-to-Supabase data migration has not been run. Do not cut over production until the schema, migrated data, and application flows have been integration-tested.

## Manual Cloudflare setup

1. Add `startechafrica.co.ke` to the Cloudflare account.
2. If DNS is hosted elsewhere, update nameservers at the domain registrar to the nameservers assigned by Cloudflare. Do not remove unrelated DNS records.
3. Create a Cloudflare Pages project connected to this repository.
4. Set the build command to empty and the build output directory to `client`.
5. Add `startechafrica.co.ke` under the Pages project's **Custom domains**.
6. Configure the production Worker variables `FRONTEND_URL=https://startechafrica.co.ke`, `SUPABASE_URL`, and `SUPABASE_STORAGE_BUCKET=uploads`; configure `SUPABASE_SERVICE_ROLE_KEY` only as a Worker secret.
7. Review and apply `supabase/migrations/001_initial_schema.sql` to the target Supabase project.
8. Create the `uploads` Storage bucket and migrate existing media before switching image URLs.
9. Run the data migration, verify row counts and owner relationships, and integration-test authentication, CRUD, admin actions, search, and uploads.
10. Only after those checks pass, deploy the Worker with `npm run deploy`.
11. Confirm `connect-api.startechafrica.co.ke` is attached as a custom domain in Worker **Settings → Domains & Routes**. Wrangler also declares this domain in the production environment.
12. Test the Pages site and Worker health endpoint, then test registration, login, protected user/admin flows, listings, search, contact, and uploads against the migrated backend before cutover.

No DNS changes, Pages creation, Worker deployment, database changes, or data migration are performed by these project files.

## Local commands

```powershell
npm install
npm run dev
npm run validate:worker
npm run validate
```

`npm run dev` starts Wrangler locally on port 8787. To continue using the legacy Express application locally, use `npm run dev:legacy` and configure its legacy MongoDB/JWT variables locally. `npm run validate:worker` performs a Wrangler dry-run only; it does not deploy. `npm run validate` compares Express route declarations with Worker handlers and checks migration configuration and schema coverage.

## Remaining migration work

- Apply and test the SQL migration against the actual Supabase project; resolve any differences from previously applied schema versions.
- Supply Worker secrets and create/configure the public `uploads` Storage bucket, or change the upload response handling to signed URLs if public objects are not acceptable.
- Run and verify the Mongo-to-Supabase data migration, including historical identifiers, password hashes, relationships, and media references.
- Add/run Supabase-backed integration tests covering authentication, users, businesses, products, jobs, rentals, notices, services, advertisements, categories, search, admin, contact, and uploads.
- Run `npm run validate:worker` and `npm run validate`, then verify the production flows before cutover.
