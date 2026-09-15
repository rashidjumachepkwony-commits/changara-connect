# Changara Connect

**Find It. Connect Locally. Grow Together.**

A local marketplace and services platform for Changara and the surrounding areas of Teso North, Busia County, Kenya.

- Discover local businesses, service providers, products, jobs, rentals, agricultural services, transport services, and community announcements.
- Every listing has real CALL (`tel:`) and WHATSAPP (`wa.me`) buttons.
- Every submission is saved to MongoDB, goes through admin approval, and appears publicly only when approved.
- Progressive Web App (PWA) installable on Android phones.
- Mobile-first, low-data, fast, secure.
---

## Getting Started

### Prerequisites

- Node.js 18+ ([nodejs.org](https://nodejs.org))
- MongoDB 6+ locally, a MongoDB Atlas cluster, or a Render-managed MongoDB
- A terminal (PowerShell, Git Bash, or similar)
- Git for version control

### 1. Install dependencies

```bash
cd changara-connect
npm install
```

### 2. Configure environment

Create your `.env` file from the example:

```bash
cp .env.example .env
```

Then edit `.env` and fill in your values:

```bash
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/changara-connect
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=change-this-strong-password
ADMIN_PHONE=254700000000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
```

Notes:

- `MONGODB_URI`: a local connection string, or your Atlas cluster URI.
- `JWT_SECRET`: generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE`: used only to create the first admin when the server starts.
- Cloudinary and M-Pesa fields are configuration placeholders for future integration. They are **not** required for version 1.

### 3. Start MongoDB

If you are running MongoDB locally:

```bash
mongod --dbpath ./data
```

Or use MongoDB Atlas and paste the connection string into `MONGODB_URI`.

### 4. Run the application

Development (with auto-restart):

```bash
npm run dev
```

Production:

```bash
npm start
```

Frontend and API are served from the same port:

- Frontend: http://localhost:5000/
- API: http://localhost:5000/api/...

### 5. Create the first admin

The first admin account is created automatically from the `.env` values when the server starts for the first time. After that, additional admins can be created in the admin dashboard.

If you need to recreate the admin manually:

```bash
node server/seed/seed-admin.js
```

### 6. Seed demo data (optional)

To fill the database with sample businesses, products, jobs, rentals, notices, and services for testing:

```bash
npm run seed
```

The seed data is clearly marked as **DEMONSTRATION DATA**. It uses fictional business names such as:

- Changara Electronics
- Changara Phone Care
- Star Hardware
- Changara Fresh Foods
- Example Electrician Services

Do not treat seed data as real businesses. You can delete it later from the admin panel.

### 7. Open the app

Open http://localhost:5000 in your browser.

On the homepage, try:

- The hero search bar
- The **I NEED SOMETHING** button
- The Business Directory link
- The Marketplace link

### 8. Install as a PWA

On supported browsers, especially Chrome on Android, use the browser install prompt or the **Install Changara Connect** button to install the app to the home screen.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts — Inter and Poppins |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT + bcrypt |
| File uploads | Multer (stored in `server/uploads/`) |
| PWA | `manifest.json` + `service-worker.js` |
| Deployment | Render |

No React, Angular, Vue, or other large frontend framework is used. The goal is a simple, fast, maintainable codebase that a single developer can understand and extend.

---

## Folder Structure

```
changara-connect/
  .env.example
  .gitignore
  package.json
  README.md

  server/
    server.js                 # Express app entry point
    config/
      db.js                   # MongoDB connection
      categories.js           # Static category lists
    middleware/
      authMiddleware.js       # JWT verification
      adminMiddleware.js      # Admin / owner authorization
      uploadMiddleware.js     # Multer file upload config
    models/
      User.js
      Business.js
      Product.js
      Job.js
      Rental.js
      Notice.js
      Advertisement.js
      Favorite.js
      Category.js
      Inquiry.js
      Report.js
      Payment.js
    routes/
      authRoutes.js
      businessRoutes.js
      productRoutes.js
      jobRoutes.js
      rentalRoutes.js
      noticeRoutes.js
      serviceRoutes.js
      searchRoutes.js
      categoryRoutes.js
      advertisementRoutes.js
      userRoutes.js
      adminRoutes.js
    utils/
      helpers.js              # Slug, phone normalization, WhatsApp/tel links, pagination
    seed/
      seed.js                 # Demo data seeder
      seed-admin.js           # First admin seeder
    uploads/                  # Uploaded images (gitignored)

  client/
    index.html
    about.html
    contact.html
    businesses.html
    business-details.html
    marketplace.html
    jobs.html
    rentals.html
    services.html
    notices.html
    login.html
    register.html
    dashboard.html
    profile.html

    css/
      style.css
      responsive.css
      admin.css

    js/
      api.js                  # Fetch wrapper with JWT
      app.js                  # Shared UI helpers (toasts, modals, drawers, renderers)
      home.js
      businesses.js
      details.js
      marketplace.js
      jobs.js
      rentals.js
      services.js
      notices.js
      auth.js
      dashboard.js

    assets/images/
      placeholder.svg
      icon.svg
      icon-192.png

    manifest.json
    service-worker.js
```

---

## Features

  ### Public features

  - Homepage hero search bar
  - **I NEED SOMETHING** quick category picker with real results
  - Business directory with categories, featured-first sorting, search, and filters
  - Business detail pages with CALL and WHATSAPP buttons, favorites, and report actions
  - Marketplace, Jobs, Rentals, Services, Farm Services, Transport, and Notices sections
  - Combined search across businesses, products, jobs, rentals, services, and notices
  - Pagination, empty states, loading states, and friendly error messages
  - Contact page with form submission
  - About Us, Privacy Policy, and Terms of Service pages
  - PWA that can be installed on Android phones
  - Mobile-first layout optimized for low-end devices and slower connections

### User features

- Register with name, phone, email, password, location, and role
- Login with JWT sessions stored in `localStorage`
- Three roles: `USER`, `BUSINESS_OWNER`, `ADMIN`
- Dashboard with profile, my listings, saved items, and settings
- Favorites for businesses, products, jobs, and rentals
- Secure image uploads with Multer, including file-type and size limits

### Business owner features

- Register a business with a logo and multiple photos
- Add and edit products
- View listing status: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`
- View favorites and inquiries
- Basic listing click analytics

### Admin features

- Dashboard with analytics cards and summary stats
- Pending approvals for businesses, marketplace listings, jobs, rentals, and notices
- Actions: approve, reject, request changes, delete, suspend, verify, feature
- Manage advertisements, categories, reported listings, and payments
- Only `APPROVED` listings appear on public pages

### Monetization-ready (not forced in v1)

- Listing types: `FREE`, `FEATURED`, `PREMIUM`
- Admin can manually upgrade a listing
- Advertisement model for homepage banners, category ads, and business promotion
- Payment model prepared for future M-Pesa integration
- Payment credentials are kept out of source code

---

## API

All API routes are served under `/api`.

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Businesses

- `GET /api/businesses`
- `GET /api/businesses/:id`
- `POST /api/businesses`
- `PUT /api/businesses/:id`
- `DELETE /api/businesses/:id`
- `GET /api/businesses/approved/:slug`
- `GET /api/businesses/search`
- `GET /api/businesses/needs/:categorySlug`
- `GET /api/businesses/:id/analytics`

Favorites, inquiries, and reports are exposed on `/api/businesses/:id/favorites`, `/api/businesses/:id/inquiries`, and `/api/businesses/:id/reports`.

### Marketplace (products)

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

Favorites and reports are exposed on `/api/products/:id/favorites` and `/api/products/:id/reports`.

### Jobs

- `GET /api/jobs`
- `GET /api/jobs/:id`
- `POST /api/jobs`
- `PUT /api/jobs/:id`
- `DELETE /api/jobs/:id`

Favorites and reports are exposed on `/api/jobs/:id/favorites` and `/api/jobs/:id/reports`.

### Rentals

- `GET /api/rentals`
- `GET /api/rentals/:id`
- `POST /api/rentals`
- `PUT /api/rentals/:id`
- `DELETE /api/rentals/:id`

Favorites and reports are exposed on `/api/rentals/:id/favorites` and `/api/rentals/:id/reports`.

### Notices

- `GET /api/notices`
- `GET /api/notices/:id`
- `POST /api/notices`
- `PUT /api/notices/:id`
- `DELETE /api/notices/:id`

Reports are exposed on `/api/notices/:id/reports`.

### Services

Services are exposed as grouped views rather than a separate content type:

- `GET /api/services`
- `GET /api/services/:categorySlug`
- `GET /api/services/farm/:categorySlug`
- `GET /api/services/transport/:categorySlug`

### Search

- `GET /api/search?q=&type=&category=&location=&sort=`

This endpoint searches across businesses, products, jobs, rentals, services, and notices.


