# Identity and references

This document owns the identity contract. [Narration and conversations](narration-and-conversations.md#3-talk-act-and-think-response-contract) owns the response shape and admission semantics.

## Contract

Names, labels and descriptions are display prose. Entity, item instance, definition, recipe, event, memory, conversation, request and job relationships use the appropriate stable ID, scoped to their world or owning record. Renaming or duplicate names must not change relationships. Memory perspective uses event source IDs to identify self-authored speech; an unknown source must not be inferred from a matching name. IDs may be readable strings; their authority comes from an exact stored key, never text matching. Enumerated kinds, verbs and control roles are values, not entity identities.

The application allocates identities; generated prose cannot create or resolve them. Client intentions and generated structured fields must supply IDs of the expected kind. Admission validates existence, permissions and current mechanical prerequisites. No name lookup, fuzzy resolution, role substitution or paid repair retry is allowed. New generated definitions use the existing validated declaration path and application-owned content identities.

## Actor context

Keep the narrative sections in English. Finish immediate response prompts with References containing the permitted entity IDs, permitted labels, self/trigger relationships and currently visible positions to distinguish duplicate names. Action IDs are explicitly scoped to that response. Unrecognized sources receive generic labels; historical awareness must not reveal their current location.

Generate the reference table and response binding together. Reserve required reference bytes before optional recall; recheck the full refreshed prompt before dispatch. Never silently remove required mappings to fit a budget. The provider schema and local parser constrain reference fields to the same permitted IDs. Domain admission independently checks current state. Component failures explain the invalid field or prerequisite; successful components may still commit.

## Control and projection

A saved world binding identifies the local controlled entity and the starting resident used by legacy optional-target interfaces. Resolve bindings by ID in constant time. Do not scan names or search for the player every frame. Keep the existing explicit player DTO, ID-keyed nearby entities and incremental public patches. Include the controlled ID in projection cache dependencies. Private NPC state remains outside the player projection.

The local host has one authenticated principal. Its history perspective follows the saved controlled entity binding. A future multi-user host must move control bindings to authenticated principal/world associations; it must not add a second role-derived entity ID or accept arbitrary client actor authority.

## Compatibility

New worlds seed people as `entity-0001` and `entity-0002`; other existing definition and entity IDs remain stable keys. Loading older worlds adds the control binding from controller metadata once. Existing bindings are authoritative. This does not rename entities or rewrite historical IDs, request fingerprints, response digests or provider audit data. Old diagnostic fields are read only for display.

Consequently an older save can still have a canonical entity ID literally spelled `player` or `ada`. Those strings are accepted only when present in its permitted ID set. Eliminating those spellings from every existing save remains a separate coordinated migration across domain state and durable database references; a partial JSON rewrite is not safe. Names such as Mike are never accepted merely because they match a label.

Interrupted paid jobs retain the existing stale-on-restart behavior and are never automatically resubmitted. New response requests use cognition contract version 6.
