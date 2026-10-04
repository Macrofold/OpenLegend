# Creator edit propagation — feature specification

| Status      | Current progress                                                                                                    | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | General policy accepted; explicit dependency previews have earlier priority than optional memory convenience tools. | 2026-10-03   |

## Accepted policy

Creator edits change the selected authoritative objects. They never automatically search for and rewrite or delete characters' memories to make those memories agree with the new world. This applies to all creator edits, including names, family, objects and authored rules. Characters can retain outdated or mistaken beliefs. Computed descriptions refresh from current authority; that is not a memory cascade.

Actual explicit dependencies are different. A record that cannot legally exist without a deleted record must be handled coherently. Existing privacy revocation, explicit forgetting and invalidation of summaries derived from selected forgotten evidence remain integrity obligations; this policy does not weaken them. Merely mentioning an edited thing, semantic similarity or an AI opinion does not establish a mandatory dependency.

## Earlier follow-up: approved dependency deletion

Before applying a destructive cascade, show every record that will be deleted, its reason and dependency path. Required dependents are checked and cannot be unchecked; optional associated deletions are individually selectable. Show why a required choice is locked. Changing optional selections recomputes the required closure; approval covers exactly the final list. Cancel changes nothing. If the root cannot be deleted without an unacceptable dependent, cancel the root operation rather than allowing an invalid world.

Use paging/grouping for large lists while preserving the complete approved set and truthful totals. Truncated or unknown dependency coverage cannot be presented as complete or applied. Changed dependencies or permissions invalidate the preview and require a fresh review. An ordinary edit needs no invented cascade when it has no destructive dependents. This is planned general tooling, not implemented by the family-tree change.

## Later follow-up: optional memory convenience tool

After an edit, optionally search permitted character memories by semantic vector similarity using the creator's selected scope and old/new descriptions. Results are suggestions, not proof that a memory is wrong. Let the creator multiselect memories and choose deletion, manual editing, or an AI-assisted bulk-edit proposal. Preview exact per-memory diffs and require approval before applying. Preserve unselected memories; allow cancellation and partial selection. AI generation requires the existing spending authority and cap, and never applies its own suggestions.

Keep memory identity, speaker attribution, dates and uncertainty visible. Do not silently broaden into human-private memories or revive forgotten material. A stale result must be refreshed before mutation. This convenience feature is explicitly lower priority and not a prerequisite for family editing or dependency deletion.

## Acceptance

Dependency work must demonstrate a complete transitive preview, optional selection, locked required dependencies, cancellation, stale preview rejection, atomic apply and retry safety. Memory convenience work must demonstrate scoped semantic search, false positives, multiselection, exact manual/AI diffs, refusal without budget/access, stale edits and preservation of unselected memories. Neither feature is runtime-complete from this design alone.

## Maintained records

- Implementation: [creator edit propagation tasks](../maintainers/creator-edits.md).
- Limits and constraints: [creator edits](../limits/creator-edits.md).
- Technical design: [propagation](creator-edit-propagation-tech-design.md).
