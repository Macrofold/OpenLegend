# Creator-authored family facts — feature specification

| Status            | Current progress                                                                                                                | Last updated |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Design incomplete | Deletion and learned-only disclosure are selected; the permitted learning journey and runtime implementation remain unfinished. | 2026-10-03   |

Mike authorized this scope and chose learned-only ordinary-player disclosure and deletion of mistaken creator-authored facts. The learning path still needs design. This is the BW16 slice of the bundled world, not a universal family law.

## Purpose and journey

An authorized creator opens **Family** from God mode, searches two existing actors, chooses **parent of** or **sibling of**, and sees a sentence preview naming both actors before recording. The form stays open while submitting, reports a duplicate without creating another fact, and shows the resulting relationship in a readable family list. Parent order is explicit: “Ada is parent of Ben” has a different meaning from “Ben is parent of Ada.” Sibling order does not change meaning. The list is searchable and paged so a world with many facts remains usable.

The creator can inspect objective facts separately from each character's subjective relationship notes. A character's private prose is never copied into a family fact. An ordinary player sees a family relation only after their character has learned it through a permitted in-world source; recording the objective fact alone reveals nothing to them. BW16 must define that learning path without treating a character's unverified prose as proof of the fact.

If the creator recorded the wrong relationship, they can delete that fact from the active family list after seeing which two people and relation it names. Deletion does not label the fact “mistaken,” require a reason, or create a family-specific audit record. It does not edit a character's memories or personal notes: a person who previously heard a claim may still remember hearing it, even though the world no longer treats the deleted relationship as true.

## Meaningful failures

Missing actors, self-links, duplicate pairs, parent cycles, changed creator authority and stale world generations refuse with a useful explanation. Repeating the exact creation or deletion request is safe; a late creation retry cannot restore a fact that the creator deleted. A pending request cannot silently change or delete a different fact after a restore or role change. Large actor/fact lists remain bounded and navigable. A same-format save/restart preserves active facts, request safety and unrelated world state.

## Scope

This slice records parent and sibling facts for the bundled world. It does not infer birth, adoption, inheritance, household membership, grief, access rights or anyone's beliefs. A different world can define another relation vocabulary and topology without changing the engine's identity, authority, commit or disclosure rules.

## Acceptance

The creator completes creation, permitted inspection and deletion through the UI, with rejection, replay, privacy, reload and restart evidence. Desktop and narrow layouts show the direction, affected people and action clearly, support keyboard use, and do not crowd the screen. Objective facts stay distinct from personal notes.

## Maintained records

- Implementation: [BW16](../maintainers/base-world.md#bw16--family-authoring-and-inspection).
- Limits and constraints: [BW05](../limits/base-world.md#bw05).
- Technical design: [family authoring](family-authoring-tech-design.md).
- Current world rules: [objective family facts](../worlds/base/social.md#objective-family-facts).
