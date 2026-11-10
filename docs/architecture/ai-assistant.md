# AI assistant architecture

## Request path
Storefront chat widget → Node `POST /api/ai/chat` → Zod validation and per-IP throttle → private Python `POST /v1/chat` → optional model provider or safe fallback.

## Trust boundaries
- The browser never receives AI provider credentials or the internal service token.
- The Python service has no Supabase service-role or payment credentials.
- The assistant cannot execute refunds, alter orders, or access customer records.
- Account-aware tools must be implemented in Node, require a verified Supabase session, enforce row ownership/role checks, and log sensitive actions.
- Keep Python on a private network and configure the same high-entropy `AI_SERVICE_TOKEN` in both services.

## Extend safely
Future modules can add product recommendation ranking, catalog enrichment, support-ticket summarization, demand forecasting, supplier price comparison and profit analysis. Feed these modules only the minimum data needed and use server-side authorization before returning customer-specific results.
