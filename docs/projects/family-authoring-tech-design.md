# Creator-authored family facts — technical design

| Status            | Current progress                                                                                                                     | Last updated |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Design incomplete | Mutation and disclosure owners are outlined; the permitted learning path must be designed before ordinary disclosure is implemented. | 2026-10-03   |

BW16 implementation design: learned-only ordinary disclosure and creator deletion are selected. The permitted learning path still needs design. [Feature behavior](family-authoring-feature-spec.md).

## Owners and data flow

The engine owns stable actor/fact identity, creator admission, serialized commit, replay fencing, save integrity and scoped read projection. The bundled world's relation evaluator owns the fixed `parent`/`sibling` vocabulary and its topology checks. Move that evaluator from the generic `social.ts` body to `worlds/base/`; retain one public transition entrypoint and one authoritative saved fact collection. Do not add a second writable relationship graph.

The client sends selected actor IDs, relation and an idempotency identity. HTTP validates shape and body size; `WorldService` rechecks generation and creator capability inside its mutation lane; the domain checks current actors and topology at commit. The server builds a bounded list of creator-permitted actor labels and objective facts. Protocol types carry only that projection. UI state owns search, selected pair, relation and submit status; it never decides validity or derives hidden relations from public `GameView` entities.

Mike chose learned-only ordinary disclosure. Creator-authorized inspection may read objective facts; an ordinary player's relation view must depend on that character's permitted learning, never on mere existence in the world-wide fact collection. The learning/evidence path must be specified before ordinary disclosure is implemented and must not treat freeform subjective notes or an unverified claim as objective knowledge.

The creator deletes an incorrect fact from the authoritative active collection. That removes it from topology validation, creator lists and future objective-fact projections. Delete by stable fact ID and the expected fact identity inside the same creator-authorized mutation lane as creation; reject a stale delete that would affect a different fact. Use ordinary idempotency receipts for creation and deletion so an old creation retry cannot recreate a deleted fact and a repeated deletion does not touch a later fact. Receipts protect command correctness, not a family edit history. Do not add a “mistaken” status, reason field or family-specific audit table. Existing generic event/history behavior remains separate from the active fact collection and is not represented as a complete audit of creator edits. Deletion does not rewrite a character's past observations or subjective notes; any correction to their belief needs a separate in-world learning path.

## Scale and privacy

Index facts by stable ID in saved state; avoid per-render full-world scans. Bound each actor-search and fact-list request before projection, page results with a deterministic cursor, and include a concise count/status. Candidate actors are scoped at the server and never obtained by broadening ordinary public entity visibility. Human-private notes and hidden identity prose are not included. Every read and mutation rechecks the scope after waits and restore generation. A label may be shown only under the agreed audience rule.

## Persistence and failure

Only current-format saved state is supported. A same-format restart reconstructs the active fact view from the authoritative collection; no old-save migration or automatic reset. A duplicate creation request with identical payload is a no-op, conflicting identity rejects, and cycle validation uses only active parent facts. Failure before commit leaves the collection unchanged; success is acknowledged after durable commit. A repeated creation request cannot create a second relationship or revive one subsequently deleted.

## UI

Use the existing God-mode editor/panel system, tokens, 4px spacing and accessible controls. A compact two-column desktop form may collapse to one column on narrow screens. Put the human-readable relation preview immediately before the primary action; keep search results within a bounded scroll area and make current selection apparent. A separate list uses concise relationship sentences, pagination and an empty state. Avoid raw IDs and private notes in visible copy. Verify actual viewport, wrapping, padding, focus and submit/rejection feedback in a browser.

## Verification and tradeoffs

Exercise creator and ordinary HTTP reads, self/invalid/duplicate/cycle/stale/replay cases, including a delayed creation retry after deletion, creator journey, reload/restart and a large fact collection. Focused tests cover domain/service contracts; actual UI interaction/visual inspection covers layout. The fixed relation vocabulary belongs to the bundled world; generalizing a relation registry now would add an unused engine surface. A bounded list/search adds complexity but prevents increasing world size from forcing giant client payloads.

## Maintained records

- Implementation: [BW16](../maintainers/base-world.md#bw16--family-authoring-and-inspection).
- Limits and constraints: [BW05](../limits/base-world.md#bw05).
- Feature specification: [family authoring](family-authoring-feature-spec.md).
