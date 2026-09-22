# Navigator 2.1 Security Boundary

Navigator local intelligence is on-device only.

- The iOS app uses Apple's on-device Foundation Models framework through a native Capacitor bridge.
- No OpenAI key, cloud-model API, model endpoint, or cloud-AI fallback exists in the active application path.
- The model receives only authenticated Navigator context supplied by Navigator and recent Navigator conversation history.
- The model has no browsing, arbitrary HTTP, filesystem, shell, external-agent, or arbitrary-code tool.
- Text stored inside Navigator is treated as data, not trusted instructions.
- Contacts and Calendar remain the only approved external user-data categories; they are exposed only through Navigator-controlled adapters when implemented and authorized.
- Human messages are created by the Human. Navigator responses generated locally are persisted only into that authenticated Human's conversation.
- Circle owners manage Circles. Added Navigator users may view and respond only unless a future in-app permission explicitly grants more.
- Public health responses remain minimal.
- Browser framing is denied and application responses carry CSP, HSTS, MIME, referrer, permissions, opener, and resource-policy headers.
- Navigator language is concise, grounded, humble, non-blaming, and must not imply absent context.
