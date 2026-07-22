# Project Navigator v0.0.3

Phase 003: identity.

This version preserves the healthy v0.0.2 shell and adds one coherent capability:

- Email/password sign up
- Email/password sign in
- Sign out
- Browser session persistence and token refresh
- Identity state visible in the existing shell

It does **not** add profiles, application tables, authorization policies, AI, billing, or notifications.

## Configure

Keep the same `.env.local` values used by v0.0.2:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

In Supabase, confirm **Authentication → Providers → Email** is enabled. Hosted projects normally require email confirmation by default. For local testing, either follow the confirmation email or temporarily disable confirmation in the Supabase dashboard.

For confirmation links, set the Auth Site URL to the address where this version is running, such as:

```text
http://localhost:3000
```

## Install and verify

```bash
npm install
npm run build
npm run dev
```

Test in this order:

1. Open the shell and confirm the heartbeat remains healthy.
2. Create an account.
3. Confirm the email if required.
4. Sign in.
5. Refresh the browser and confirm the session persists.
6. Sign out.
7. Refresh again and confirm the user remains signed out.

Only after all seven pass should this version become the new baseline.

Suggested checkpoint:

```bash
git add .
git commit -m "Phase 003: add identity"
git tag known-good-03-identity
git push
git push origin known-good-03-identity
```
