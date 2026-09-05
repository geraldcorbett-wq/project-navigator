# Navigator 2.0

Navigator 2.0 is the consolidated mobile/web release with one application tree, private persistence, native iOS/Android shells, contained server-side Navigator AI, and closed-world security controls.

## Release boundary

- AI sees authenticated Navigator context only.
- AI has no web/browser/tools/arbitrary network access.
- Human messages are the only client-created conversation role.
- Shared Circle users are view/respond only.
- AI requests have burst, concurrency, input, and output containment while legitimate aggregate use is recorded for operating-cost analysis.
- Public health exposes only ready/not-ready.
- Mobile binds to one approved HTTPS Navigator deployment at build time. It cannot be pointed at arbitrary sites at runtime.
- No live deployment values ship in the source package.

## Private deployment values

Set these only in the protected deployment environment:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=...
NAVIGATOR_RATE_LIMIT_SALT=...
CAPACITOR_SERVER_URL=https://...
```

Apply `supabase/project-navigator-setup.sql` to a fresh environment, or apply migration `019_navigator_containment.sql` to an existing Navigator database.

## Validation

```bash
npm install --no-audit --no-fund
npm run verify:package
npm run validate:release
npm run typecheck
npm run build
```

Codemagic refuses to produce a mobile artifact when required protected deployment configuration is absent or the mobile deployment URL is not HTTPS.
