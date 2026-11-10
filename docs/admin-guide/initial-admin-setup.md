# Initial administrator setup

1. Register your own customer account through the storefront and verify the email address.
2. In Supabase SQL Editor, find the profile UUID for that exact email and promote only that account:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = lower('YOUR-ADMIN-EMAIL')
);
```

3. Sign out and sign back in so the app receives a fresh session.
4. Open `/admin`. The API checks the profile role on every protected request.
5. Create product drafts, add supplier records, and publish reviewed products.

Do not expose the service-role key in the browser. Keep the initial admin account protected with a unique password and MFA where available. Promote additional staff only through a controlled administrative process.

## Apply database migrations

Run all files under `supabase/migrations` in numeric order before using cart, support, inventory forecasts or admin features.
