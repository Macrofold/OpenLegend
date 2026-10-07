# Server coordination

Use the existing [WorldService](src/world-service.ts) and repositories for admission, serialized mutations and commit ownership. HTTP/Zod validates untrusted input; domain operations validate current mechanical state. Context and [public projection](src/view.ts) disclose only permitted facts.

Trace request identity, authority/restore generation, reservation, completion, commit and invalidation when changing asynchronous work. Revalidate at commit after waits; stale or cancelled work must not regain authority. Save restoration must not rewind external billing, current privacy protection or command fencing.

For stored-history joins, updates or derived projections, read the [identity contract](../../docs/identity-and-references.md#contract). Match the owning record's complete key, including observer and record kind where applicable; a shared source ID alone may identify several legitimate records.

Keep provider/network/diagnostic I/O off the native critical path where semantics allow. Reuse existing scheduling, history and performance helpers; asynchronous work still needs an owner, bounded queues and failure handling. Do not add a second event bus, writable cache or mutation queue to bypass the first.

Use the [AI skill](../../.agents/skills/openlegend-ai/SKILL.md) for cognition/provider/context work and [save/load](../../docs/save-and-load.md) for storage/restoration. Apply the [root performance read requirement](../../AGENTS.md#performance-guidance-before-code-work) before code work, including ordinary features. Keep local-development availability distinct from production/multiplayer readiness.
