# Production security checklist

- Configure Supabase Auth email verification, password reset and redirect allowlists.
- Review every RLS policy with customer, staff, admin and anonymous test accounts.
- Provision the first admin using a trusted one-time server-side process; never expose role mutation in public APIs.
- Keep service-role and payment secrets in deployment secret storage only.
- Verify payment webhook signatures, amount, currency, order reference and idempotency.
- Use hosted/tokenized checkout; never store card numbers or CVV.
- Add rate limits, request schemas, CSRF protection where cookie auth is used, and security monitoring.
- Configure storage bucket MIME/size restrictions and private access policies.
- Enable backups and test restore procedures.
- Replace example domain in sitemap and configure HTTPS, email sender, privacy/terms and tax rules before launch.
