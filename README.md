# Project Navigator v1.0.1

Backend-complete baseline for Project Navigator.

## Database
Run `supabase/project-navigator-setup.sql` once in the Supabase SQL Editor. It contains every migration in order and is safe to rerun.

## Local
```powershell
npm install
npm run build
npm run dev
```

Keep `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for account deletion

## Package 10.4
Deleting an entity now removes its connections. Existing orphan links are cleaned when a Chain loads. No new SQL is required.
