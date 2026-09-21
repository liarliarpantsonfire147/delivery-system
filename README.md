# RouteFlow

**Smart delivery dispatch, without the logistics headache.**

RouteFlow is a role-based delivery operations platform for customers, businesses, riders, dispatchers, and administrators. It combines delivery booking, wallet payments, rider assignment, live status progression, operational reporting, and exportable delivery records in one workspace.

## What the project demonstrates

- A multi-role delivery workflow from quote to completed delivery
- Backend-enforced authorization, rather than relying only on client-side navigation
- Automated rider matching with an explanation of the assignment decision
- Location-aware pricing using geocoding and driving-route estimates
- Wallet debits, platform commissions, rider earnings, withdrawals, and payout details
- Audit-friendly activity logs and delivery status history
- A deployable single-origin frontend/API architecture for Vercel

## Core features

### Customer and business workflows

- Register and sign in as a customer or business
- Request a delivery with pickup, destination, recipient, package, vehicle, and priority details
- Receive a fare estimate in Nigerian naira (NGN)
- Fund a wallet and pay for a delivery
- View active and historical deliveries, rider details, status, ETA, and progress
- Download a delivery PDF or export scoped delivery data as CSV

### Rider workflows

- Register a rider profile with vehicle, capacity, phone, and payout information
- Browse available paid delivery orders
- Accept, reject, cancel, and advance assigned deliveries
- Track active work and completed delivery history
- Receive delivery earnings in the wallet model

### Dispatcher and administrator workflows

- View the full operational delivery board and live Abuja map
- Automatically assign an available rider
- Inspect assignment score and the reason for the selected rider
- Advance a delivery through rider accepted, pickup, transit, and delivered stages
- Review riders, businesses, users, activity logs, and analytics
- Monitor completion rate, active deliveries, available riders, and total volume

## Technology stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| UI | React | Role-based dashboards, forms, delivery views, wallet screens, and navigation |
| Build tool | Vite | Development server, React bundling, and production build |
| Styling | CSS | Responsive workspace layout and role-aware visual presentation |
| API | Node.js + Express | REST endpoints, middleware, authorization, business rules, and static hosting |
| Persistence | Supabase + `@supabase/supabase-js` | Hosted state, users, businesses, wallets, transactions, and payout records |
| Local fallback | JSON file | Development persistence through `server/data.json` when Supabase is not configured |
| Authentication | Node `crypto` | Scrypt password hashes, signed session tokens, and HttpOnly cookies |
| Routing | Nominatim + OSRM | Address geocoding and driving distance/time estimates |
| Documents | PDFKit | Server-generated delivery PDF exports |
| Tooling | npm, Vite, Concurrently | Dependency management, frontend build, and simultaneous local servers |

## Architecture

```text
Browser
  React + Vite
	|
	| JSON requests with cookies
	v
Express API (`server/index.js`)
  auth middleware -> role checks -> delivery/wallet logic -> persistence
	|                         |
	|                         +--> Nominatim / OSRM for route estimates
	|
	+--> Supabase (`@supabase/supabase-js`)
	|
	+--> `server/data.json` local fallback
```

The frontend is intentionally thin: it renders the current user workspace and calls the API through `VITE_API_URL`. The Express server owns authentication, access control, quoting, rider assignment, delivery lifecycle rules, wallet mutations, logging, and exports.

## Frontend structure

The React entry point is [`src/main.jsx`](./src/main.jsx). It contains the client-side route table and role-specific views for:

- Customer dashboard, deliveries, history, profile, and wallet
- Rider dashboard, available orders, active delivery, history, profile, and wallet
- Business dashboard, deliveries, riders, analytics, activity, profile, and wallet
- Dispatcher and administrator operational views

Navigation uses browser history with `pushState` and `popstate`, while API calls are centralized through a small JSON `fetch` helper. Styling is split between [`src/style.css`](./src/style.css) and [`src/production.css`](./src/production.css).

## Backend structure

The server entry point is [`server/index.js`](./server/index.js). Its important building blocks are:

### Middleware

- `express.json()` parses JSON request bodies.
- Session middleware reads the `rf_session` cookie and attaches the authenticated user to `req.user`.
- Lifecycle middleware releases riders after delivery completion and settles wallet earnings/commissions.
- `auth(roles)` blocks unauthenticated requests and rejects users without the required role.
- Static-file middleware serves the Vite `dist` output in production.

### Representative API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/register` | Create a customer, rider, or business account |
| `POST` | `/api/login` / `/api/logout` | Start or end a signed cookie session |
| `GET` | `/api/state` | Return data scoped to the current role |
| `GET` | `/api/deliveries/quote` | Estimate route distance, duration, and fare |
| `POST` | `/api/deliveries` | Create and pay for a delivery from the wallet |
| `POST` | `/api/deliveries/:id/accept` | Let a rider accept an available order |
| `POST` | `/api/deliveries/:id/auto-assign` | Assign an available rider automatically |
| `POST` | `/api/deliveries/:id/status` | Advance an authorized delivery stage |
| `GET` | `/api/deliveries/:id/history` | Read status transitions for a delivery |
| `GET` | `/api/deliveries/:id/activity` | Read delivery-specific audit activity |
| `GET` | `/api/analytics/overview` | Return dispatcher/admin operational metrics |
| `GET` | `/api/export/csv` | Export role-scoped deliveries |
| `GET` | `/api/deliveries/:id/export/pdf` | Generate a delivery PDF |
| `GET/POST` | `/api/wallet/*` | Read, fund, or withdraw from a wallet |

## Delivery lifecycle

```text
PAYMENT_PENDING
	|
	v
LOOKING_FOR_RIDER -> RIDER_ACCEPTED -> HEADED_TO_PICKUP
							   |
							   v
						  HEADED_TO_DELIVERY
							   |
							   v
						     DELIVERED
```

The server calculates progress from the delivery clock, keeps status history, releases riders after completion, and records platform commission and rider earning transactions. A rider can also manually advance the lifecycle when authorized.

## Pricing and dispatch logic

1. Addresses are geocoded through Nominatim when available.
2. OSRM supplies driving distance and duration.
3. If an external lookup fails, RouteFlow falls back to Abuja zone coordinates and an estimated travel time.
4. The quote applies base, distance, time, vehicle, and priority multipliers.
5. The platform fee is calculated at 10% of the delivery total.
6. Automatic dispatch chooses an available simulated rider and records an assignment score and explanation.

## Data and security model

The server returns sanitized user objects and never sends password fields to the browser. Passwords are hashed with Node's built-in `crypto.scryptSync`; sessions are signed with an HMAC secret and sent using an HttpOnly, SameSite cookie. Every protected route applies server-side role and resource checks.

Supabase is used only from the server. The service-role key must never be placed in a `VITE_*` variable, committed to source control, or exposed to the browser. The SQL schema and indexes are documented in [`supabase-state.sql`](./supabase-state.sql).

## Run locally

```bash
npm install
npm run dev
```

This starts the Vite client at <http://localhost:5173> and the Express API at `http://localhost:3001`. Vite proxies `/api` requests to the API during development.

To use Supabase, create a local `.env` from this shape and provide real values privately:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
ROUTEFLOW_SESSION_SECRET=your-session-secret
ROUTEFLOW_ADMIN_EMAIL=admin@example.com
ROUTEFLOW_ADMIN_PASSWORD=choose-a-strong-password
VITE_API_URL=/api
```

Without Supabase variables, the API uses [`server/data.json`](./server/data.json) for local persistence. Run [`supabase-state.sql`](./supabase-state.sql) in the Supabase SQL editor before connecting a hosted environment.

## Deploy to Vercel

The deployment is configured in [`vercel.json`](./vercel.json):

- `npm run build` produces the `dist` directory.
- `api/index.js` exposes the Express application as a Vercel function.
- `/api/*` requests are rewritten to that function.
- Other requests are rewritten to the React application.

Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ROUTEFLOW_SESSION_SECRET`, `ROUTEFLOW_ADMIN_EMAIL`, `ROUTEFLOW_ADMIN_PASSWORD`, and `VITE_API_URL=/api` in Vercel. Keep the service-role key and session secret server-side.

## Suggested presentation flow

1. Register a customer or business and open the dashboard.
2. Fund the wallet and create a delivery from one Abuja zone to another.
3. Show the calculated fare, platform fee, ETA, and payment deduction.
4. Sign in as a rider, accept the available order, and advance its status.
5. Return to the operations view to show the rider assignment, live progress, activity history, and analytics.
6. Export the delivery as PDF or CSV.

## Production considerations

This repository is structured as a functional prototype and presentation-ready demonstration. Before handling real payments or high-volume operations, add a durable session store, a transactional relational delivery model, a real payment provider, rate limiting, request validation, structured logging, background job processing, and production observability. Rotate any credential that has been exposed outside the server environment.
