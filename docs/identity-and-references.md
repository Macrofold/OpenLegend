# Identity and references

Identity and reference changes must preserve the reconstruction and compatibility constraints in the [save/load design](save-and-load.md).

This document owns the identity contract. [Agent agency runtime](../archive/07-technical-architecture/agent-agency-runtime.md#2-decision-envelope-and-translation) owns response shape and admission semantics; [Narration and conversations](narration-and-conversations.md) retains speech targets and audience behavior.

## Contract

Names, labels and descriptions are display prose. Entity, item instance, definition, recipe, event, memory, conversation, request and job relationships use the appropriate stable ID, scoped to their world or owning record. Renaming or duplicate names must not change relationships. Memory perspective uses event source IDs to identify self-authored speech; an unknown source must not be inferred from a matching name. IDs may be readable strings; their authority comes from an exact stored key, never text matching. Enumerated kinds, verbs and control roles are values, not entity identities.

A source occurrence can legitimately support several record kinds for one character, such as awareness and a commitment sharing that source ID. Joins, updates and reused metadata must match the complete owning key, including world, observer and record kind when those scope identity. Eligibility or a newer revision in one kind cannot select or modify another kind merely because their source IDs match. [PX03 review evidence](verification/useful-discoveries.md#october-6-2026--requested-review) records the collision that motivated this clarification.

When several fields jointly identify something, preserve their boundaries with nested maps, a structured tuple or an unambiguous encoding; reuse the owning key encoder when one exists. Individually valid IDs do not make delimiter concatenation unambiguous. Include namespace/separator-containing values in a meaningful collision/refusal case when changing such keys. The [shield review](verification/shield-defense.md#second-implementation-review--october-7-2026) found two distinct body/port pairs mistaken for one occupied place; keeping the fields separate fixes the general cause without restricting authored IDs.

The application allocates durable identities; generated prose cannot create or resolve them. Agency response-local aliases identify only objects proposed within that response; they are not stored IDs or authority. Client intentions and generated structured fields must supply IDs of the expected kind. Admission validates existence, permissions and current mechanical prerequisites. No name lookup, fuzzy resolution, role substitution or paid repair retry is allowed. New generated definitions use the existing validated declaration path and application-owned content identities.

## Actor context

Keep the narrative sections in English. Finish immediate response prompts with References containing the permitted entity IDs, permitted labels, self/trigger relationships and currently visible positions to distinguish duplicate names. Action IDs are explicitly scoped to that response. Unrecognized sources receive generic labels; historical awareness must not reveal their current location.

Generate the reference table and response binding together. Reserve required reference bytes before optional recall; recheck the full refreshed prompt before dispatch. Never silently remove required mappings to fit a budget. The provider schema and local parser constrain reference fields to the same permitted IDs. Domain admission independently checks current state. Component failures explain the invalid field or prerequisite; successful components may still commit.

## Control and projection

A saved world binding identifies the local-mode controlled entity and starting resident convenience target. Resolve bindings by ID in constant time. Do not scan names or search for the player every frame. Keep the existing explicit player DTO, ID-keyed nearby entities and incremental public patches. Include the controlled ID in projection cache dependencies. Private NPC state remains outside the player projection.

Local mode has one authenticated principal and follows the saved local binding. Hosted control and private projections use authenticated principal/world/actor scopes and control generations through the existing [account authority](architecture.md#account-authority-and-participation). Neither mode derives a second entity identity from a role or accepts arbitrary client actor authority.

## Compatibility

Definition and entity IDs remain stable stored keys. Existing bindings are authoritative; renaming must not rewrite historical IDs, request fingerprints, response digests or provider audit data. The former older-world binding conversion and diagnostic fallback description is historical, not an instruction to retain or extend it. Current-format integrity and explicit incompatible-save rejection follow the [development save policy](../AGENTS.md#development-save-policy).

A current permitted entity ID may literally be spelled `player` or `ada`. Those strings are accepted only when present in its permitted ID set. These spellings are not special roles and do not require a rename campaign. Names such as Mike are never accepted merely because they match a label.

Interrupted paid jobs retain the existing stale-on-restart behavior and are never automatically resubmitted. The current response shape/version belongs to the [cognition contract](../apps/server/src/cognition-contracts.ts); do not maintain an independent version number here.
