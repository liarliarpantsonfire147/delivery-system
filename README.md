# RouteFlow

**Smart delivery dispatch, without the logistics headache.**

RouteFlow is a production-structured delivery dispatch platform for small and medium-sized businesses. It supports customer and rider registration, delivery requests, rider acceptance, automatic dispatch, delivery status tracking, audit history, exports, and operational analytics.

## Features

- Server-backed cookie sessions, password hashing, protected API access and registration
- Customer and delivery-rider account creation and login
- Delivery queue and dispatch board backed by Supabase state
- Automatic driver assignment using availability, proximity and workload score
- Assignment explanation shown in the delivery detail view
- Delivery status progression and route progress
- Driver capacity/status view, activity history, analytics and CSV export
- Responsive operations dashboard with mobile-friendly delivery detail modal

## Architecture

The Vite React client calls an Express REST API. The API owns authentication, assignment logic, status progression, reporting and persistence. In hosted mode it uses the Supabase API through `@supabase/supabase-js`. Operational state remains compatible with the protected `routeflow_state` JSONB row, while wallet accounts, wallet transactions and payout accounts are also persisted in dedicated Supabase tables. Without Supabase variables it falls back to the empty rider-only `server/data.json` for local development.

### Supabase setup

Run [`supabase-state.sql`](./supabase-state.sql) once in Supabase Dashboard → SQL Editor. This creates the application tables plus `wallet_accounts`, `wallet_transactions`, and `payout_accounts`. Then ensure `.env` contains `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and start the server. RouteFlow starts with an empty database; users create the records themselves. The service-role key is server-only and must never be exposed to the React client.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API runs on port 3001.

## Deploy to Vercel

1. Run `supabase-state.sql` in the Supabase SQL editor.
2. Rotate the Supabase service-role key if it has ever been committed, pasted into chat, or exposed outside the server environment.
3. Import the repository into Vercel. Vercel uses `vercel.json`, builds `dist`, and serves the Express API through `api/index.js`.
4. Add these Vercel environment variables for Production, Preview, and Development as needed: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ROUTEFLOW_SESSION_SECRET`, `ROUTEFLOW_ADMIN_EMAIL`, and `ROUTEFLOW_ADMIN_PASSWORD`.
5. Set `VITE_API_URL` to `/api` for a same-domain deployment. Only set it to a full HTTPS API URL when the API is deployed separately.

The service-role key is server-only. Do not use it in any `VITE_*` variable or client-side file. Vercel provides the `api/index.js` function at the same origin, so the deployed client does not call localhost.

## Presentation flow

1. Register a customer, business, or rider account.
2. Create a delivery and choose Automatically assign, or sign in as a rider and accept an available order.
3. Observe the selected driver, score and reason.
4. Advance a delivery through pickup, transit and delivered.
5. Review Activity and Analytics; use the CSV export from the delivery detail.

## Production hardening path

For a production deployment, point `DATABASE_URL`/`DIRECT_URL` at Supabase, run Prisma migrations, use a durable session store, and configure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. The local API already hashes passwords with Node's built-in scrypt, uses HttpOnly sessions, and applies backend role checks for protected operations.
