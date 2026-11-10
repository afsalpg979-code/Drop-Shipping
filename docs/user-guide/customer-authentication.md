# Customer registration and login

## Included
- Email/password registration with full name and optional phone number.
- Email/password sign-in.
- Email verification flow through Supabase Auth.
- Forgot-password email and secure password update after following the reset link.
- Persistent Supabase sessions with automatic token refresh.
- Protected customer account route and sign-out.
- New-user profile creation with the database role forced to `customer`.

## Configure Supabase
1. Create or open your Supabase project.
2. In **Authentication → Providers → Email**, enable email/password sign-in and enable email confirmation.
3. In **Authentication → URL Configuration**, set the Site URL to your deployed HTTPS storefront URL. Add local development URL `http://localhost:5173` and deployed URL to the Redirect URLs allowlist.
4. Apply migrations in order:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_profile_on_signup.sql`
5. Copy `client/.env.example` to `client/.env.local` and fill in the project URL and anon/publishable key:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   ```
6. Run `npm install` at the repository root, then `npm run dev`.
7. Test registration, email confirmation, sign-in, sign-out and password reset using a real test email account.

## Important security notes
- The browser receives only the Supabase publishable/anon key. Never put the service-role key in any `VITE_*` variable or client file.
- Supabase RLS must remain enabled. The signup trigger always assigns the `customer` role; never trust a role supplied in signup metadata.
- Configure SMTP for reliable production verification and password-reset email delivery.
- Before production, test RLS with separate anonymous, customer, staff and admin accounts.
