# FALCONS STORE

Premium, mobile-first dropshipping commerce platform.

## Stack
- Client: React, Vite, TypeScript, Tailwind CSS, React Router
- API: Node.js, Express, TypeScript, Zod
- Data/Auth/Storage: Supabase PostgreSQL, Auth and Storage with Row Level Security
- Payments: gateway adapter boundary; test mode until credentials and webhook verification are configured

## Workspace
`client/` storefront and role-based portals · `server/` API · `supabase/` migrations and Edge Functions · `shared/` contracts · `docs/` operational guides.

## Quick start
1. Copy `.env.example` to `.env` and configure Supabase values.
2. Run `npm install`.
3. Run `npm run dev`.

The API refuses to start without required server environment variables. Never put a Supabase service-role key in the browser. Configure an initial admin through a trusted server-side process; never promote a user from client input.

## Current delivery
This commit establishes the monorepo foundation, starter storefront, API health endpoint, initial schema/RLS migration and CI. Payment, shipping, supplier integrations and production deployment require provider credentials and environment-specific verification.
