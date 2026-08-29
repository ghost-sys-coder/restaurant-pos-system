# Restaurant POS System

A multi-tenant restaurant point-of-sale application with a React terminal UI, an Express API, Clerk back-office identity, PIN-based staff sessions, and Neon Postgres persistence.

## Architecture

- **Back office:** Clerk users and Organizations control platform-owner and restaurant owner/admin access.
- **Daily POS access:** an administrator authorizes a physical terminal once; staff then select a location profile and enter a hashed PIN.
- **Tenant boundary:** operational reads and writes are scoped by restaurant and location on the server.
- **Database:** Drizzle ORM uses Neon's HTTP driver for ordinary queries and a short-lived WebSocket pool for atomic transactions.
- **Financial boundary:** the server reloads menu prices, calculates discounts/tax/tips/totals, validates state transitions, and records each tender with an idempotency key.
- **Payments:** card and digital payment screens are simulations until a processor and certified hardware integration are selected.

## Local development

Prerequisites: Node.js 20+, a Neon Postgres database, and a Clerk application with Organizations enabled.

1. Install dependencies with `npm install`.
2. Configure the environment variables below.
3. Apply committed migrations with `npm run db:migrate`.
4. Start development with `npm run dev`.

Required environment variables:

```env
DATABASE_URL=postgresql://...
VITE_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
APP_URL=http://localhost:3000
PLATFORM_OWNER_CLERK_USER_IDS=user_...
```

`PLATFORM_OWNER_CLERK_USER_IDS` accepts comma-separated Clerk user IDs. It is not an email-address list.

## Clerk setup

Follow [docs/clerk-organizations-setup.md](docs/clerk-organizations-setup.md). Clerk remains authoritative for platform and restaurant back-office memberships. Operational staff such as servers, cashiers, hosts, bartenders, and kitchen staff are location-scoped PIN profiles and do not need Clerk accounts.

## Commands

- `npm run dev` — run the Express/Vite development server.
- `npm run lint` — TypeScript validation.
- `npm test` — unit and domain-rule tests.
- `npm run build` — build the browser app and Node server bundles.
- `npm run db:generate` — generate a migration after a schema change.
- `npm run db:migrate` — apply committed migrations.

## Deployment

Deploy the built Node server with the same environment variables, run migrations before routing production traffic to a schema-dependent release, and configure Clerk invitation redirects to the deployed `APP_URL`. Do not use the development Clerk instance or simulated payment UI as a production payment processor.

See [docs/features.md](docs/features.md) for implemented workflows and current operational limitations.
