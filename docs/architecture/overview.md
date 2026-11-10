# Architecture

The browser uses only the Supabase anon/publishable key and user session. RLS is the authorization boundary for direct database access. The Express API validates inputs and performs privileged operations only after authenticating the caller and checking a server-resolved role. The service-role key is server-only.

Order totals, discounts, shipping quotes, inventory decrements and payment state must be calculated or verified server-side. Payment webhooks must verify provider signatures and be idempotent before updating orders. Supplier forwarding must disclose only the minimum order data required.
