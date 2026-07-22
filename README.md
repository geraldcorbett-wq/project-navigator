# Navigator Shell v0.0.1

The first known-good baseline for Navigator.

## Included

- Responsive visual shell
- Static landing page that says `HI.`
- `/api/health` endpoint
- No database
- No authentication
- No AI integration
- No environment variables

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Health check: `http://localhost:3000/api/health`

## Success criteria

1. `npm install` completes.
2. `npm run build` completes.
3. Home page loads on desktop and mobile.
4. `/api/health` returns `ok: true`.

Suggested Git tag after verification:

```bash
git tag known-good-01-shell
git push origin known-good-01-shell
```
