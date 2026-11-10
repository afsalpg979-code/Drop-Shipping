# FALCONS STORE

AI-assisted, mobile-first dropshipping commerce platform.

## Technology
- **Client:** React, Vite, TypeScript, Tailwind CSS v4, React Router
- **API:** Node.js, Express, TypeScript, Zod
- **AI service:** Python, FastAPI, Pydantic, optional OpenAI-compatible model provider
- **Data/Auth/Storage:** Supabase PostgreSQL, Auth and Storage with Row Level Security
- **Payments:** Gateway adapter boundary; test mode until credentials and webhook verification are configured

## Monorepo
- `client/` storefront, customer account, admin and supplier portals
- `server/` API, validation, security and provider adapters
- `ai-service/` private Python AI assistant and future recommendation/analytics workloads
- `supabase/` database migrations, policies and Edge Functions
- `shared/` shared types, schemas and constants
- `docs/` architecture, API, security and operational guides

## Quick start
1. Copy `.env.example` to `.env` and configure Supabase server/client values. Keep service-role credentials server-side only.
2. Run `npm install` at the repository root to install workspaces and refresh the lockfile.
3. Start client and API with `npm run dev`.
4. In a separate terminal, set up Python: `cd ai-service`, create a virtual environment, run `pip install -r requirements.txt`, then `uvicorn app.main:app --reload --port 8000`.
5. Or use `npm run dev:all` after Python dependencies are installed and the AI service environment is configured.

## AI assistant
The storefront includes a floating AI shopping assistant. The browser calls only the Node API; Node validates and rate-limits requests before forwarding them to the private FastAPI service. Python can use an optional OpenAI-compatible provider key, or deterministic fallback responses when no key is configured. Set matching `AI_SERVICE_TOKEN` values in the Node and Python environments before deployment. Do not expose the Python service publicly.

The assistant does not have direct database/payment access and must not claim it has placed orders, issued refunds, or checked private order status. Add account-specific AI tools only behind authenticated Node API endpoints with ownership checks and audit logs.

## Security and launch status
- Supabase RLS is mandatory for customer-owned data.
- Never expose Supabase service-role keys or AI provider keys in `VITE_*` variables.
- Payment processing remains test-only until a gateway is configured and webhook signatures are verified.
- Configure production SMTP, HTTPS, backups, logging, rate limits and role-based access before launch.

See [Python AI service setup](ai-service/README.md) and [customer authentication guide](docs/user-guide/customer-authentication.md).

## Commerce and AI modules
- Persistent authenticated cart and wishlist endpoints backed by Supabase.
- Customer support ticket creation with Python triage, priority/category suggestions and human-reviewed response drafts.
- Admin operations for product drafts/publishing, orders, customers, suppliers, stock adjustments and support tickets.
- Python sales trend forecasts, inventory reorder estimates and content-based product ranking.
- Storefront search is connected to the AI ranking endpoint.

Apply Supabase migrations `0001` through `0005` in order. See [commerce and AI module documentation](docs/architecture/commerce-ai-modules.md) and [initial admin setup](docs/admin-guide/initial-admin-setup.md).

**Current scope:** Cart and wishlist are database-backed. Checkout is not enabled; payment gateway integration and verified webhooks must be completed before accepting payments. Forecasting uses simple statistical baselines and should be validated against historical data before operational use. AI support drafts require human review.
