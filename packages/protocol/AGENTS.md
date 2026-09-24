# Public transport contracts

This package contains public DTOs and intentions, not domain authority or server behavior. Preserve the distinction between a requested action and an admitted effect. Runtime IDs alone do not prove an observer knows an entity's identity.

For a wire change, trace [server admission](../../apps/server/src/world-service.ts), projection, serialization/patch application and all client consumers together. Never solve a missing client field by exposing the full world or another actor's private state. Keep absent, unknown, unsupported and empty values semantically distinct; do not silently coerce incompatible payloads.

Follow the current development compatibility policy rather than inventing a parallel versioned protocol. A changed type does not update its validators or consumers automatically.
