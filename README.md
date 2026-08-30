# Tech Fluid Industries — Corporate Website

A Node.js/Express + PostgreSQL (Neon) website for Tech Fluid Industries, a
hydraulic equipment manufacturer in Ahmedabad. Built with EJS server-rendered
views, a hand-built design system (no CSS framework), and a Request-for-Quote
form that writes to Postgres.

## Stack

- **Server**: Node.js + Express
- **Views**: EJS (server-rendered, no client framework)
- **Database**: PostgreSQL, hosted on [Neon](https://neon.tech)
- **Styling**: hand-written CSS (`public/css/style.css`) — no Tailwind/Bootstrap
- **Client JS**: vanilla JS (`public/js/main.js`) — mobile nav, scroll-reveal,
  product tab filtering, AJAX RFQ form submission

## Pages

| Route | Purpose |
|---|---|
| `/` | Home — hero, product preview, why-us, industries, QA strip, FAQ |
| `/about` | Company story, capabilities |
| `/products` | Filterable product catalog (Cylinders / Power Packs / Jacks) with full spec sheets |
| `/applications` | Industries served |
| `/quality` | QA/testing protocol, standards reference, FAQ |
| `/contact` | Request-for-Quote form (writes to Postgres) |
| `/admin` | Password-protected staff dashboard — view, update status, and delete RFQ leads |
| `/healthz` | Health check — verifies real DB connectivity, not just that the process is up |

## 1. Install dependencies

```bash
npm install
```

## 2. Set up the database (Neon)

1. Create a free project at [neon.tech](https://neon.tech) if you don't have one.
2. In the Neon dashboard, open **Connection Details** and copy the connection
   string. It looks like:
   ```
   postgresql://user:password@ep-xxxx-xxxx.region.aws.neon.tech/dbname?sslmode=require
   ```
3. Copy `.env.example` to `.env` and paste your connection string in:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   ```
   DATABASE_URL=postgresql://user:password@ep-xxxx-xxxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. Run the migration to create the `rfq_requests` table:
   ```bash
   npm run migrate
   ```
   This runs every `.sql` file in `/migrations` against your Neon database.
   It's safe to re-run — every migration uses `CREATE TABLE IF NOT EXISTS`.

## 3. Fill in your real contact details

Still in `.env`, update:
```
COMPANY_PHONE=+91 79 XXXX XXXX
COMPANY_WHATSAPP=+91 98XXXXXXXX
COMPANY_EMAIL=info@techfluidindustries.com
COMPANY_ADDRESS=32, Victoria Industrial Park, Kathwada GIDC, Ahmedabad, Gujarat, India
```
These populate the footer, the contact page, the `tel:`/`mailto:` links, the
floating WhatsApp button (bottom-right on every page), and the embedded
Google Map (which geocodes the address string directly — no Google Maps
API key needed).

Also set the admin panel credentials (see `/admin` below):
```
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_APP_SECRET=a-long-random-string
```

> The placeholder phone number in the code (`+91 79 XXXX XXXX`) is **not a
> real number** — replace it before going live. The `public/brochure.pdf`
> linked from the footer's "Download Product Brochure" button is a generated
> starter brochure with the same placeholder contact details — regenerate it
> (or swap in your own PDF at the same path) once your real phone number is set.

## 4. Run it

```bash
npm start          # production
npm run dev         # auto-restarts on file changes (Node's --watch)
```

Visit `http://localhost:3000`.

## Where the RFQ submissions go

Every submission from `/contact` is validated server-side (`routes/rfq.js`)
and inserted into the `rfq_requests` table via `db.insertRfq()`.

**View, update, or delete leads at `/admin`** — a password-protected
dashboard (`routes/admin.js`). Set `ADMIN_PASSWORD` and `ADMIN_APP_SECRET`
in `.env` (see `.env.example`), then log in at `/admin/login`. From the
dashboard you can filter by status, change a lead's status (new →
contacted → quoted → closed), or delete a lead. Sessions are signed,
httpOnly cookies valid for 12 hours; the login endpoint is rate-limited.

You can also query Neon directly if you prefer, in the Neon SQL editor or
via `psql`:

```sql
SELECT id, name, email, phone, company, product_category,
       bore, stroke, pressure, tonnage, message, status, created_at
FROM rfq_requests
ORDER BY created_at DESC;
```

## Editing content

Product specs, industries served, quality checklist items, and the
"why choose us" copy all live in one place: **`data/content.js`**. Editing
that file updates the home page, `/products`, `/applications`, and
`/quality` consistently — nothing is duplicated in the templates.

## Editing the design

- **Colors, type, spacing**: CSS custom properties at the top of
  `public/css/style.css` (`:root { ... }`).
- **Icons**: all icons are hand-drawn inline SVG symbols in
  `views/partials/icons.ejs` (no icon font/library dependency). Add a new
  `<symbol id="icon-whatever">` there and reference it anywhere with
  `<svg class="icon"><use href="#icon-whatever"/></svg>`.
- **Hero diagram**: the animated cylinder cross-section is
  `views/partials/hero-diagram.ejs` — plain SVG, animated via CSS in
  `style.css` under `/* hero SVG diagram behaviour */`.

## Deployment notes

- Set `NODE_ENV=production` in your host's environment — this enables
  7-day cache headers on static assets.
- `DATABASE_URL`, `COMPANY_PHONE`, `COMPANY_EMAIL`, and `COMPANY_ADDRESS`
  should be set as environment variables on your host (Render, Railway,
  Fly.io, a VPS, etc.) rather than committing `.env`.
- The RFQ endpoint is rate-limited (10 submissions / 15 minutes / IP) and
  has a honeypot field — no CAPTCHA needed for reasonable spam protection.
- `helmet` is configured with a CSP that allows Google Fonts and the Google
  Maps embed and nothing else external — if you add other third-party
  scripts/embeds later, extend the CSP in `server.js`.

## Project structure

```
├── server.js              # Express app entry point
├── db.js                  # Postgres pool (Neon) + query helpers
├── data/content.js         # Product/industry/quality copy — single source of truth
├── routes/
│   ├── pages.js            # GET routes for all public pages
│   └── rfq.js               # POST /api/rfq — validation + DB insert
├── views/
│   ├── partials/            # head, header, footer, icons, hero-diagram
│   └── *.ejs                 # one template per page
├── public/
│   ├── css/style.css        # entire design system, hand-written
│   ├── js/main.js            # nav, tabs, reveal-on-scroll, RFQ form
│   └── images/favicon.svg
├── migrations/001_init.sql   # rfq_requests table
└── scripts/migrate.js        # runs migrations against DATABASE_URL
```
