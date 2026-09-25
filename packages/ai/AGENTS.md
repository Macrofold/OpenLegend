# Typed AI execution

Read the [AI skill](../../.agents/skills/openlegend-ai/SKILL.md) for changes here. This package is server-only transport/validation, not a scheduler, billing ledger, prompt-policy owner or world mutator.

Extend the existing [client](src/client.ts), [types](src/types.ts) and validators; preserve injectable transport, explicit receipts, byte/time limits and distinct failure/uncertainty outcomes. Configuration endpoints are privileged because they receive credentials. Do not add automatic fallback, paid retry or fabricated success.

A typed result proves shape, not truth or current authority. Reuse the caller's admission/accounting boundaries rather than introducing equivalent ones here. Provider-specific behavior belongs in its adapter, not in generic game code.
