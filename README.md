# Navigator 2.1 Local AI

Navigator 2.1 moves conversation intelligence onto the iPhone. The active AI path uses Apple's on-device Foundation Models framework through a native Capacitor plugin. There is no OpenAI API key and no cloud-model fallback.

## Runtime

- Navigator web/data services continue to provide authenticated Navigator data and persistence.
- The iPhone requests a bounded Navigator-only context packet.
- The iPhone's on-device language model generates the response.
- Navigator saves that local response back into the authenticated conversation.
- If the local model is unavailable, Navigator reports that state rather than using an external model.

## Device requirement

The local model requires a supported Apple Intelligence device running iOS 26 or later with Apple Intelligence enabled and the model ready on-device.

## Protected deployment values

The server build requires only the existing Navigator data configuration:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

No AI API credential is required.

## Validation

```bash
npm install --no-audit --no-fund
npm run verify:package
npm run validate:release
npm run typecheck
npm run build
```
