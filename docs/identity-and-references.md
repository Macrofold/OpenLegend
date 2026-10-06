# Identity and references

This document owns the stable-identity and permitted-reference contract. [Actor knowledge](knowledge.md#subject-binding) owns observer references and recognition; [memory architecture](memory-architecture.md#metadata-stays-in-the-server-binding) owns the model-facing binding. Control and disclosure follow [multiplayer authority](maintainers/multiplayer.md), with current-format reconstruction governed by [save/load](save-and-load.md) and the [root development policy](../AGENTS.md#development-save-policy).

## Contract

Names, labels and descriptions are display prose. Entity, item instance, definition, recipe, event, memory, conversation, request and job relationships use the appropriate stable ID, scoped to their world or owning record. Renaming or duplicate names must not change relationships. Memory perspective uses event source IDs to identify self-authored speech; an unknown source must not be inferred from a matching name. IDs may be readable strings; their authority comes from an exact stored key, never text matching. Enumerated kinds, verbs and control roles are values, not entity identities.

The application allocates durable identities; generated prose cannot create or resolve them. Response-local operation aliases and references to proposed outputs are not stored object IDs or authority. Client intentions use IDs of the expected kind; model-facing entity handles resolve through that decision's server-owned permitted map before domain admission. Admission checks existence, permissions and current mechanical prerequisites. No name lookup, fuzzy resolution, role substitution or automatic paid repair retry grants a target. New generated definitions use the existing validated declaration path and application-owned content identities.

## Actor context

Current narrative context uses English. Its References section identifies permitted entities with observer-scoped opaque handles and permitted labels, not raw stored entity IDs. It also binds self/trigger relationships and supplies current positions only where the actor is allowed to perceive them. Unrecognized sources receive generic labels; historical awareness must not reveal their current location or identify a new encounter without supported recognition. Offered action IDs are scoped to the prepared decision, not permanent capabilities.

Generate the reference table and response binding together. Reserve required reference bytes before optional recall; recheck the full refreshed prompt before dispatch. Never silently remove required mappings to fit a budget. The provider schema and local parser constrain reference fields to the same permitted handles. The server resolves structured fields and explicit reference annotations before persistence, and reprojects stored annotations for later permitted context. Quotes and ordinary names are not rewritten by substring guesses. Domain admission independently checks current state; component outcomes explain an invalid field or prerequisite while retaining any independently accepted components.

## Control and projection

Authenticated accounts already have server-owned world grants and character bindings. Each request carries its account/session, world/timeline, grant revision, audience and current control generation; final publication rechecks the required authority after asynchronous work. Human ownership, sessions, grants and control generations live outside gameplay checkpoints, so loading an earlier world cannot restore revoked access or another tab's former control. Characterless operators and spectators receive only granted operations, never an inferred player character.

The saved world identity retains a controlled-entity/default-resident pair for the explicit local composition root and existing optional-target callers. It is not shared-host account authority: the server's local controlled-entity accessor refuses use outside local authentication mode. Shared commands, history and private projections use the authenticated request's actor and audience instead. Rebinding does not transfer another human's private notes or turn an abandoned human character into an NPC.

Resolve stored identities by exact key, not name scans or a per-frame search for the player. Preserve explicit player projections, ID-keyed nearby entities and incremental public patches. Cache and delayed-publication dependencies must include the relevant account/actor, audience, grant, timeline and control state; a controlled entity ID alone is not a complete privacy boundary. Private NPC and human data remain subject to their distinct ownership rules.

## Compatibility

The bundled world's generated entity keys are creation choices, not engine roles. A supported current record may use a literal key such as `player` or `ada`; that spelling has no special authority and does not require renaming. Names such as Mike are never accepted merely because they match a display label. Keep historical IDs, request fingerprints, response digests and provider audit identities stable within the supported format.

Do not add old-save readers, role-derived upgrade bindings or diagnostic fallback readers to preserve an earlier format. The current `initializeIdentity` helper still infers absent local bindings from controller metadata and is called both by fresh-world construction and `migrateCognition`. That retained loading path is a compatibility-cleanup concern under [DF04](maintainers/production-data.md#df04--retire-residual-compatibility-paths), not authorization to continue the earlier conversion design. Preserve deliberate world creation, valid current bindings and current external authority; reject genuinely incompatible data intact rather than inventing ownership or resetting it.

Interrupted paid work retains its existing restart/publication rules and is never automatically resubmitted. The current cognition request identity is owned by `COGNITION_VERSION` in `apps/server/src/cognition-contracts.ts`; do not pin an obsolete response version here or maintain a parallel reader for it.

## Maintained records

- Implementation: [multiplayer authority and private projections](maintainers/multiplayer.md), [cognition and knowledge](maintainers/cognition-redesign.md), and [residual compatibility cleanup](maintainers/production-data.md#df04--retire-residual-compatibility-paths).
- Limits and constraints: [multiplayer authority](limits/multiplayer.md) and [memory/knowledge references](limits/memory.md).
- Related contracts: [entity-name grammar](entity-names.md), [knowledge subject binding](knowledge.md#subject-binding) and [narration audiences](narration-and-conversations.md).
