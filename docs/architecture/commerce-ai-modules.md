# Commerce and AI modules

## Database migrations
Apply migrations in numeric order in Supabase SQL Editor:
1. `0001_initial_schema.sql`
2. `0002_profile_on_signup.sql`
3. `0003_cart_support_inventory_analytics.sql`
4. `0004_admin_operations.sql`
5. `0005_protect_profile_privileges.sql`

## Customer APIs
- `GET /api/cart`
- `POST /api/cart/items` with `productId` and `quantity`
- `PATCH /api/cart/items/:itemId` with `quantity`
- `DELETE /api/cart/items/:itemId`
- `GET /api/wishlist`
- `POST /api/wishlist/:productId`
- `DELETE /api/wishlist/:productId`
- `POST /api/support/tickets`
- `GET /api/support/tickets`

Cart and wishlist routes require a Supabase access token. Prices are read from the product database; do not trust browser-submitted prices. Checkout/payment authorization is not implemented by these cart endpoints.

## Admin APIs
All admin routes verify the Supabase access token and read the user's role from `profiles`. Staff/admin can access operational reads; account suspension is admin-only.
- `GET /api/admin/overview`
- `GET|POST /api/admin/products`, `PATCH /api/admin/products/:productId`
- `GET /api/admin/orders`, `PATCH /api/admin/orders/:orderId`
- `GET /api/admin/customers`, `PATCH /api/admin/customers/:customerId/status`
- `GET|POST /api/admin/suppliers`, `PATCH /api/admin/suppliers/:supplierId`
- `PATCH /api/admin/products/:productId/stock`
- `PATCH /api/support/tickets/:ticketId`
- `GET /api/admin/forecast/sales`
- `GET /api/admin/forecast/inventory`

## Python AI endpoints
These endpoints are private and require `x-ai-service-token`.
- `POST /v1/recommendations/rank`: content/category/budget/stock ranking of supplied product candidates.
- `POST /v1/forecast/sales`: trend and recent-baseline projection using supplied daily history.
- `POST /v1/forecast/inventory`: moving-average demand, days-of-stock and reorder suggestions using recent units sold and supplier lead time.
- `POST /v1/support/assist`: ticket category, priority and suggested response. Human support staff must review all suggestions.

## Limitations and production requirements
- Forecasts are lightweight statistical baselines, not trained ML models. Validate accuracy against held-out historical data before relying on them for purchasing or financial planning.
- Product recommendations are content-based scoring, not a trained personalization model. Customer browsing event collection and consent controls are not yet included.
- AI ticket triage is rule-based fallback logic. It never sends a customer-facing response automatically.
- Admin screens provide operational overview and basic product/order/customer/supplier/ticket controls. Full CRUD for every store entity, staff role administration, refunds, tax and shipping provider integrations remain separate work.
- Checkout is intentionally disabled until a payment provider is configured and webhook signature verification is implemented.
- Configure Supabase SMTP, backups, storage policies, HTTPS, monitoring and rate limiting before production.
