# Creator-authored family tree — feature specification

| Status    | Current progress                                                                                                              | Last updated |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Parentage, computed descriptions and the creator journey are implemented and qualified through native/service/browser checks. | 2026-10-03   |

## Purpose and decisions

Creators need a consistent family tree, not independently editable sibling claims. Mike explicitly replaced the former independent parent/sibling design on October 3. A recorded parent link is the only objective family fact. Every displayed relationship is calculated from those links. The first bundled-world interpretation is biological ancestry, with at most two recorded parents; adoption, partnership and households need separately designed meanings.

Unknown ancestry stays unknown. Two shared parents establish full siblings. One shared parent establishes siblings; call them half-siblings only when both people have two recorded parents and their other parents differ. Do not invent people or assume that missing parents differ. The graph can share ancestors through several paths; it is not restricted to a mathematically strict tree.

## Creator journey

Open **Family** in a character's God-mode controls. Search existing characters, choose a child and parent, review the direction in a sentence, then record the parent. Inspect the selected person's parents, children, siblings and more distant ancestors/descendants in a paged list. Follow a relative to inspect their part of the tree. There is no independent sibling selector or saved sibling description. Cousins, partnerships and adoption are outside the first inspection vocabulary; omission does not establish that people are unrelated.

Delete a parent link after reviewing its exact parent and child. Computed descriptions refresh immediately; there are no dependent sibling records to delete. Character memories and personal notes remain untouched. Corrections use delete followed by adding the intended link. No mistaken status or dedicated family audit system is introduced.

## Invariants and failures

Endpoints must be existing characters of the same known biological species; constructs have no supported biological parentage. Reject self-parentage, duplicate parent/child links, more than two parents, and cycles at any depth. Admission and saved-world validation enforce the same rules. Current starting birth timestamps are placeholders, not a reliable genealogy chronology. Do not infer ages, genders, births, emotional responses, permissions or inheritance. Related parents and multiple ancestry paths are not inherently impossible.

Writes are atomic and creator-authorized. Reject stale tree revisions, changed authority/worlds and conflicting request identities. Retry an uncertain result with the same identity. A successful old creation retry cannot recreate a deleted link. Incompatible saves are rejected without conversion, reset or replacement.

## Knowledge and privacy

Objective inspection is creator-only. Ordinary players and NPCs do not receive the authoritative tree automatically. The existing learning journey is sufficient: hear a permitted utterance, remember it, or begin with creator-authored personal knowledge. Remembered claims can be mistaken and do not certify the current tree. Existing permitted memory/journal views expose learned prose; this slice adds no ordinary objective-family badge. Creator edits do not rewrite memories. Human-private material remains inaccessible.

## Acceptance and scope

Complete the real creator UI journey, keyboard/narrow-screen use, invalid edits, duplicate/late retry, stale revision/generation rejection, paging and same-format persistence. Demonstrate sibling changes after parent changes, incomplete ancestry, multigeneration cycles and no automatic family disclosure in NPC input. No paid model call is required.

General dependency previews and optional memory repair are separately scheduled in [creator edit propagation](../creator-edit-propagation-feature-spec.md).

## Maintained records

- Implementation: [BW16](../../maintainers/base-world.md#bw16--family-authoring-and-inspection).
- Limits and constraints: [BW05](../../limits/base-world.md#bw05).
- Technical design: [family tree](family-authoring-tech-design.md).
- Current world rules: [objective family facts](../../worlds/base/social.md#objective-family-facts).
