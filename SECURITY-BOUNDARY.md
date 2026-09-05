# Navigator 2.0 Security Boundary

Navigator is a closed application boundary.

- Navigator AI receives only authenticated Navigator data supplied by the server.
- AI tool access is disabled. No web browsing, arbitrary HTTP, external agents, filesystem access, or arbitrary code execution is exposed to the AI.
- External data integrations are limited by product policy to user-authorized Contacts and Calendar. They are not implemented by this package unless explicitly added through Navigator-controlled adapters.
- Human messages are the only client-created conversation role. Navigator/system messages are server-created only.
- AI requests are bounded by input/output size, concurrent-request leases, and burst controls. Consumption is recorded internally for aggregate operating-cost analysis, not exposed in the UI.
- Circle owners manage Circles. Added Navigator users may view and respond only unless a future in-app permission explicitly grants more.
- Public health responses reveal only ready/not-ready.
- Infrastructure configuration and secrets are deployment-only and are not included in the source package.
- Browser framing is denied and application responses carry CSP, HSTS, MIME, referrer, permissions, opener, and resource-policy headers.
- Navigator language must remain concise, grounded, humble, and non-blaming. It must not imply absent context.
