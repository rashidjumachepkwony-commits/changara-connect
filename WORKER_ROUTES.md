# Express-to-Worker route inventory

Inventory taken from every `router.get/post/put/patch/delete` declaration mounted in `server/server.js`, plus its `/api/health` route. There are 94 Express router declarations and 1 health declaration (95 total). The Worker table below is checked against the source declarations by `npm run validate`.

All handlers use Web `Request`/`Response`. `user` means a valid bearer JWT; `admin` additionally requires role `ADMIN`; `owner-or-admin` enforces row ownership; `optional-user` permits public approved listings plus the owner's/admin's unapproved listing. Public write methods remain intentionally public only where the legacy route was public.

| Method | Route | Worker handler | Supabase tables | Authentication |
|---|---|---|---|---|
| GET | `/api/health` | `health` | none | none |
| POST | `/api/auth/register` | `register` | users | public |
| POST | `/api/auth/login` | `login` | users | public |
| GET | `/api/auth/me` | `currentUser` | users | user |
| GET | `/api/businesses` | `listBusinesses` | businesses, users | public |
| GET | `/api/businesses/needs/:key` | `businessesByNeed` | businesses, users | public |
| GET | `/api/businesses/my` | `myBusinesses` | businesses | user |
| GET | `/api/businesses/:id` | `getBusiness` | businesses, products, users | optional-user |
| POST | `/api/businesses` | `createBusiness` | businesses, Supabase Storage | user |
| PUT | `/api/businesses/:id` | `updateBusiness` | businesses, Supabase Storage | owner-or-admin |
| DELETE | `/api/businesses/:id` | `deleteBusiness` | businesses | owner-or-admin |
| POST | `/api/businesses/:id/click` | `businessClick` | businesses | public |
| POST | `/api/businesses/:id/contact` | `contactBusiness` | businesses, inquiries | user |
| POST | `/api/businesses/:id/report` | `reportBusiness` | businesses, reports | user |
| POST | `/api/businesses/:id/favorite` | `favoriteBusiness` | businesses, favorites | user |
| GET | `/api/products` | `listProducts` | products, users | public |
| GET | `/api/products/my` | `myProducts` | products | user |
| GET | `/api/products/:id` | `getProduct` | products | public |
| POST | `/api/products` | `createProduct` | products, Supabase Storage | user |
| PUT | `/api/products/:id` | `updateProduct` | products, Supabase Storage | owner-or-admin |
| DELETE | `/api/products/:id` | `deleteProduct` | products | owner-or-admin |
| POST | `/api/products/:id/favorite` | `favoriteProduct` | products, favorites | user |
| POST | `/api/products/:id/report` | `reportProduct` | products, reports | user |
| GET | `/api/jobs` | `listJobs` | jobs, users | public |
| GET | `/api/jobs/my` | `myJobs` | jobs | user |
| GET | `/api/jobs/:id` | `getJob` | jobs | public |
| POST | `/api/jobs` | `createJob` | jobs | user |
| PUT | `/api/jobs/:id` | `updateJob` | jobs | owner-or-admin |
| DELETE | `/api/jobs/:id` | `deleteJob` | jobs | owner-or-admin |
| POST | `/api/jobs/:id/favorite` | `favoriteJob` | jobs, favorites | user |
| POST | `/api/jobs/:id/report` | `reportJob` | jobs, reports | user |
| GET | `/api/rentals` | `listRentals` | rentals, users | public |
| GET | `/api/rentals/my` | `myRentals` | rentals | user |
| GET | `/api/rentals/:id` | `getRental` | rentals | public |
| POST | `/api/rentals` | `createRental` | rentals, Supabase Storage | user |
| PUT | `/api/rentals/:id` | `updateRental` | rentals, Supabase Storage | owner-or-admin |
| DELETE | `/api/rentals/:id` | `deleteRental` | rentals | owner-or-admin |
| POST | `/api/rentals/:id/favorite` | `favoriteRental` | rentals, favorites | user |
| POST | `/api/rentals/:id/report` | `reportRental` | rentals, reports | user |
| GET | `/api/notices` | `listNotices` | notices, users | public |
| GET | `/api/notices/my` | `myNotices` | notices | user |
| POST | `/api/notices` | `createNotice` | notices, Supabase Storage | user |
| GET | `/api/notices/:id` | `getNotice` | notices | public |
| PUT | `/api/notices/:id` | `updateNotice` | notices, Supabase Storage | owner-or-admin |
| DELETE | `/api/notices/:id` | `deleteNotice` | notices | owner-or-admin |
| POST | `/api/notices/:id/report` | `reportNotice` | notices, reports | user |
| GET | `/api/services` | `listServices` | businesses, users | public |
| GET | `/api/services/farm` | `farmServices` | businesses, products, users | public |
| GET | `/api/services/transport` | `transportServices` | businesses, users | public |
| GET | `/api/services/needs/:needKey` | `servicesByNeed` | businesses, products, jobs, rentals, users | public |
| GET | `/api/advertisements` | `publicAdvertisements` | advertisements | public |
| GET | `/api/categories` | `publicCategories` | categories | public |
| GET | `/api/search` | `searchAll` | businesses, products, jobs, rentals, notices | public |
| PUT | `/api/user/profile` | `updateProfile` | users, Supabase Storage | user |
| GET | `/api/user/favorites` | `userFavorites` | favorites, businesses, products, jobs, rentals | user |
| POST | `/api/user/favorites` | `addUserFavorite` | favorites, selected listing table | user |
| DELETE | `/api/user/favorites/:favoriteId` | `removeUserFavorite` | favorites | user |
| GET | `/api/user/listings` | `userListings` | businesses, products, jobs, rentals, notices | user |
| GET | `/api/user/inquiries` | `userInquiries` | inquiries, businesses | user |
| POST | `/api/user/reports` | `createUserReport` | reports, selected listing table | user |
| POST | `/api/contact` | `submitContact` | contacts | public |
| GET | `/api/admin/dashboard` | `adminDashboard` | users, businesses, products, jobs, rentals, notices, advertisements, reports, payments | admin |
| GET | `/api/admin/pending` | `adminPending` | businesses, products, jobs, rentals, notices | admin |
| GET | `/api/admin/users` | `adminUsers` | users | admin |
| PATCH | `/api/admin/users/:id` | `adminUpdateUser` | users | admin |
| GET | `/api/admin/businesses` | `adminBusinesses` | businesses, users | admin |
| PATCH | `/api/admin/businesses/:id/status` | `adminBusinessStatus` | businesses | admin |
| PATCH | `/api/admin/businesses/:id/feature` | `adminBusinessFeature` | businesses | admin |
| PATCH | `/api/admin/businesses/:id/verify` | `adminBusinessVerify` | businesses | admin |
| DELETE | `/api/admin/businesses/:id` | `adminDeleteBusiness` | businesses | admin |
| GET | `/api/admin/products` | `adminProducts` | products, users | admin |
| PATCH | `/api/admin/products/:id/status` | `adminProductStatus` | products | admin |
| PATCH | `/api/admin/products/:id/feature` | `adminProductFeature` | products | admin |
| DELETE | `/api/admin/products/:id` | `adminDeleteProduct` | products | admin |
| GET | `/api/admin/jobs` | `adminJobs` | jobs, users | admin |
| PATCH | `/api/admin/jobs/:id/status` | `adminJobStatus` | jobs | admin |
| DELETE | `/api/admin/jobs/:id` | `adminDeleteJob` | jobs | admin |
| GET | `/api/admin/rentals` | `adminRentals` | rentals, users | admin |
| PATCH | `/api/admin/rentals/:id/status` | `adminRentalStatus` | rentals | admin |
| DELETE | `/api/admin/rentals/:id` | `adminDeleteRental` | rentals | admin |
| GET | `/api/admin/notices` | `adminNotices` | notices, users | admin |
| PATCH | `/api/admin/notices/:id/status` | `adminNoticeStatus` | notices | admin |
| DELETE | `/api/admin/notices/:id` | `adminDeleteNotice` | notices | admin |
| GET | `/api/admin/ads` | `adminAds` | advertisements | admin |
| POST | `/api/admin/ads` | `adminCreateAd` | advertisements, Supabase Storage | admin |
| PATCH | `/api/admin/ads/:id` | `adminUpdateAd` | advertisements, Supabase Storage | admin |
| DELETE | `/api/admin/ads/:id` | `adminDeleteAd` | advertisements | admin |
| GET | `/api/admin/categories` | `adminCategories` | categories | admin |
| POST | `/api/admin/categories` | `adminCreateCategory` | categories | admin |
| PATCH | `/api/admin/categories/:id` | `adminUpdateCategory` | categories | admin |
| DELETE | `/api/admin/categories/:id` | `adminDeleteCategory` | categories | admin |
| GET | `/api/admin/reports` | `adminReports` | reports | admin |
| PATCH | `/api/admin/reports/:id/resolve` | `adminResolveReport` | reports | admin |
| DELETE | `/api/admin/reports/:id` | `adminDeleteReport` | reports | admin |
| GET | `/api/admin/payments` | `adminPayments` | payments, users | admin |

## Behavior and explicit source gaps

- Registration/login retain the existing `Authorization: Bearer <JWT>` API contract and HS256 `id` claim. Passwords are stored/checked with bcrypt. Set the same `JWT_SECRET` used for existing tokens on the Worker to preserve current sessions; historical user rows must retain their bcrypt hashes and Mongo ids in `password_hash` and `legacy_id`.
- Upload fields accept the legacy multipart form names (`logo`, `images`, `image`, `profileImage`), allow JPG/PNG/WEBP up to 5 MiB each, and write to the configured Supabase Storage bucket. Create that bucket as public for the generated image URLs or update the helper to issue signed URLs before using a private bucket.
- This source has customer-to-business inquiries at `/api/businesses/:id/contact` and an owner/admin inquiry inbox at `/api/user/inquiries`. It does **not** define `/api/messages`, conversation/read-state APIs, or job application APIs. The original business inquiry entity has no sender user id or read/unread state; those features have not been invented as part of this migration.
- The source defines no `/api/auth/logout` server route. Existing logout behavior is client-side token removal.
- The SQL migration is additive and retains existing rows. Apply `supabase/migrations/001_initial_schema.sql` to the target project and finish/backfill the legacy Mongo-to-Postgres data import before production cutover. No database or Worker deployment was performed.
