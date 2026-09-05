# Project Navigator 10.5

Navigator is a Next.js + Supabase application with a Capacitor 8 mobile shell for Android and iOS.

## Requirements

- Node.js 22 or newer
- npm
- A Supabase project
- Android Studio for Android native builds
- macOS + Xcode for iOS native builds

## Configure

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` only if permanent account deletion is enabled

Run `supabase/project-navigator-setup.sql` once in the Supabase SQL Editor. The consolidated setup is designed to be safe to rerun.

## Verify and run

```powershell
npm run verify:package
npm install
npm run typecheck
npm run build
npm run dev
```

The package intentionally does not include the stale pre-10.5 `package-lock.json`. The first `npm install` generates a lockfile that includes the Capacitor 8 dependencies declared by 10.5.

## Mobile

Set `CAPACITOR_SERVER_URL` to a Navigator URL reachable by the phone, then add/sync the native shells. See `MOBILE-POC.md` for Android and iOS commands.

Capacitor 8 requires Node.js 22+.

## 10.5 stabilization

- Preserves the existing 10.5 application and database behavior.
- Declares the Node.js runtime required by Capacitor 8.
- Removes the stale 1.0.10 lockfile that did not include 10.5's Capacitor dependencies.
- Adds `npm run verify:package`, which runs without installed dependencies and checks the package structure and required dependency declarations.
