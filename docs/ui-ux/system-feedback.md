# Search, feedback, settings and save/load

[Handbook](README.md) · [Controls](controls.md) · [Save/load contract](../save-and-load.md)

## Every operation has a readable state

A reusable asynchronous surface needs a contract for initial, loading, ready, empty, failed and stale states, plus partial results when supported. An empty array must not ambiguously mean all of these.

| State                    | What the player should understand                                        | Wrong implication to avoid                       |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------ |
| Not yet requested        | What opening/searching will do                                           | Pretending the collection is empty               |
| Loading                  | What is being retrieved and whether an old view is usable                | Erasing the interface or fake progress           |
| Truly empty              | Nothing exists in the requested permitted scope, with a useful next step | Suggesting retry will create data                |
| No matches               | Data may exist; show scope and filter recovery                           | Saying the player owns nothing                   |
| Partial/windowed         | What was examined and how to continue                                    | Calling a page complete                          |
| Unavailable/unauthorized | Why it cannot proceed, without hidden facts                              | Mystery disabled buttons or misleading emptiness |
| Stale                    | Which facts may have changed and actions await refresh                   | Making an old price/quantity look final          |
| Failed                   | What did not finish, whether anything changed, and recovery              | Disappearing errors and lost work                |
| Completed                | The actual authoritative result                                          | Treating dispatch as success                     |

Put feedback where the action happened. Preserve stable panels, selection and readable prior content during safe refresh. Block the operation whose prerequisites are stale, not the whole game. Do not disguise error/unknown as zero or a successful blank response.

A loading control should retain its action identity, accessible name and stable geometry. Show prompt local acknowledgement without forcing every brief read to flash a spinner. A delayed visual loader must not delay duplicate-submit protection; a minimum animation duration must not keep presenting false pending state after completion/failure. Prefer truthful state over importing exact vendor delays. These are task-specific decisions, not new timer defaults. Vercel's stable-control guidance informs the approach. [S07](research.md#s07)

Distinguish local input echo from network/storage/model duration. An arbitrary sub-500ms mutation target is not a valid promise for saves or AI work. Performance terminology and proposed local targets are separate in [UXL05](../limits/ui-ux.md#uxl05).

## Search is a scoped read, not a side effect

Use a persistent label/accessibility name, informative placeholder and unambiguous clear utility. Catalogue search differs from choosing a form value. Searching cannot equip, buy, move, generate or activate merely on Enter; current action search may open an invention draft but preserves explicit Send.

Keep scope, filters and continuation together: **this container**, **this conversation**, **perceived events**, **known people**. Broad search uses a permitted server endpoint, not hidden-world data downloaded and filtered visually. Place search according to its importance to the task, and clearly distinguish any local search from a broader entry point. Apple's searching guidance supports intentional location and scope, not the same toolbar on every surface. [S13](research.md#s13)

Retain query/context when returning from detail. Use stable identity, explicit ranking/sort semantics and ties; late results must not jump focus. Ignore old query/actor/scope/generation results and immediately invalidate unsafe selectable rows after query changes.

Current subject search debounces by 150ms; [QU15](../limits/interface.md#qu15) retains that reported shared value. Debounce network work, not text entry. Local filtering may need no debounce; expensive work needs measurement/better queries, not an unexplained longer delay. This differs from end-to-end latency and [UXL05](../limits/ui-ux.md#uxl05).

Provide recovery: change query, clear filters, widen scope only when supported, or continue older/remaining records. Never suggest broadening to private data. Bounded per-request work can preserve complete permitted access through continuation. Recent-search suggestions, if added, require an explicit storage/scope/clear-history policy; they must not resurrect a private query in another account or world.

## Classify navigation, drafts and persistence

Do not adopt “put all state in the URL.” Decide what the state means, who may see it, how long it persists and what restoration does. Vercel's deep-link guidance is useful for navigation, not a reason to expose private work. [S07](research.md#s07)

| State                                              | Appropriate ownership                               | Boundary                                                                                                       |
| -------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Sharable view/filter or permitted object reference | URL when the feature supports meaningful navigation | Validate current permission on opening; the URL grants no authority                                            |
| Popup, hover, drag and temporary focus             | Local interaction state                             | Restoring a page must not resume a half-finished gesture                                                       |
| Unsent message or dirty editor                     | Existing scoped draft owner                         | Do not put private text/credentials in URLs, analytics or broad diagnostic logs; define retention and clearing |
| UI scale, accessibility or camera preferences      | Existing account/device preference owner            | Distinct from gameplay rewind and another user's settings                                                      |
| Trade, save, installed invention or world effect   | Authoritative server state/receipt                  | Browser navigation or local storage cannot establish completion or authorization                               |

Preserve safe navigation through Back/Forward or panel return when supported, including list position. Do not serialize every component boolean or duplicate writable authority. On account/world changes, re-scope or clear sensitive retained state according to its owner before rendering it; a stale key prefix alone is not an access policy. New persistence, telemetry or history collection is a feature decision, not automatically authorized by these recommendations.

## Notifications: match interruption to consequence

| Importance and duration                             | Appropriate presentation                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| Immediate local acknowledgement                     | In-place change or brief nearby status                                      |
| Noncritical background completion                   | Quiet notice linking to result                                              |
| Needed later                                        | Persistent history/inbox or durable panel state                             |
| Recoverable current-work failure                    | Inline error retaining draft and repair/retry                               |
| Storage failure or unresolved consequential outcome | Persistent visible status until resolved/acknowledged, not only timed toast |
| Decision requiring exclusive attention              | Bounded dialog only when proceeding without it would be unsafe              |

Do not announce every stage or duplicate one event as toast, banner, modal and chat. Deduplicate by identity, not equal text. Aggregate repetitive low-importance events with access to underlying permitted history. Avoid escalating quiet simulation updates into attention alarms.

Carbon's notification distinctions reinforce selecting the surface by context, action and persistence. Do not import a version-specific notification's automatic focus behavior wholesale. A background completion should not steal focus or displace typed text; reserve intentional focus moves for an active task/error/decision that requires them. [S10](research.md#s10)

Respect current per-character notice/history limits, including [LA223](../limits/interface.md#la223) and hearing/caption owners. Three overhead notices is not a universal license to discard all later notifications; critical failures and missed information need recovery.

A timed notice cannot be the sole important failure/action route. Use live regions deliberately: polite normal status; assertive only when interruption is warranted. Per-tick meters must not continually interrupt screen readers. Reduced motion removes animation, not the information.

## Settings, menus and preference persistence

The [whole-interface design](../projects/game-interaction-redesign-feature-spec.md#settings-controls-help-and-accessibility) applies this to the existing entry, settings/help, graphics/profile, invention-policy, save/load and operations surfaces. Keep device preferences, player-profile writes, world policy and account/access actions visibly distinct. Preserve automatic sole-tab entry and the existing other-tab Resume contract; a loading/error screen must distinguish denied access, connection failure and broken rendering. The [coverage map](interface-coverage.md#entry-settings-and-world-administration) identifies actual owners and evidence instead of assuming a new generic settings flow replaces them.

Group by goals: controls/camera, readability/accessibility, audio/captions, gameplay preferences and authorized creator/operator settings. Keep accessibility discoverable before the player is stuck. Settings search should take them to the real setting/group.

Show current value and explain its effect. Reversible local appearance can preview immediately with reset; coordinated/consequential changes use staged Apply/Save. Do not silently mix models. **Reset this section** differs from **Reset all settings**; presentation reset is not a world reset.

Account/device presentation preferences stay separate from gameplay saves where the owner specifies. Rewind must not restore someone else's UI scale, sensitivity or accessibility setup. Autosave operator controls and creator permissions retain their authority boundaries.

Advanced is for specialist options with summaries of hidden non-defaults. Do not bury text size, captions, camera recovery, help or the only load/recovery route behind unlabeled overflow. Essential configuration should not require console commands or pasted scripts; Blizzard's Classic UI follow-up illustrates replacing temporary script workarounds with discoverable settings. This is a design direction, not authorization to add every imagined setting. [F16](research.md#f16) [S20](research.md#s20)

## Save UI: show what is durable

The current checkpoint and automatic-protection owners already supply catalogue/compatibility, named Load/Delete confirmation, Before last load protection, queued/writing state and persistent failure acknowledgement. The [redesign](../projects/game-interaction-redesign-feature-spec.md#saves-checkpoints-and-recovery) makes their scope and return route legible; it does not replace the save mechanism. Acknowledging a failure means it was read, not repaired. Operations overview remains public and read-only, while invitation/access and maintenance forms retain deliberate authorization, revision and timezone choices.

Saving is a trust contract. Distinguish **queued**, **capturing/writing**, **durably saved**, **failed** and **outcome not confirmed** where the backend has those states. Dispatch or a disabled button is not a receipt. Retain the last confirmed save independently of a pending one.

Identify world/character, label, manual/automatic origin and timestamp meaningfully. Order by actual capture/order information, not invented browser time. Relative age helps scanning; exact timestamp/timezone resolves ambiguity. No fake thumbnail or percentage when unavailable.

A save failure must not destroy the current world or last known-good save. Provide a persistent reason and safe retry under the current contract. Timeout/panel closure is not success. Never automatically delete saves, clear storage or reset the world as error repair.

The [save/load owner](../save-and-load.md) distinguishes background simulation persistence, synchronous command effects, checkpoints and recovery. These guarantees are unchanged; background work does not acquire zero crash-loss through optimistic copy. Describe the guarantee relevant to the actual save action rather than conflate all persistence into a green check.

## Load and recovery

Provide enough context to choose the correct state; distinguish Load, Rename and Delete and separate destructive controls. Opening a row is inspection, not immediate load. Before replacing gameplay state, use existing confirmation/recovery; explain what is replaced and whether current progress is preserved.

Validate compatibility/integrity before presenting a save as loadable. The root [development save policy](../../AGENTS.md#development-save-policy) rejects incompatible development saves without legacy migration, automatic deletion, reset or replacement. UX convenience cannot weaken it. Credentials, real spending/accounting and preferences stay separate from rewind.

If preserving the current world fails, do not imply load can safely proceed. An uncertain restore outcome stays uncertain until reconciled, rather than guessing success and resuming against inconsistent data. Reconnect/retry must establish actual world/save identity before another destructive operation.

Future cloud-conflict UI should compare meaningful identities/timestamps, offer deliberate choices and preserve versions where supported. That is a future pattern, not authorization to add cloud sync or invent its guarantees.

## Failure copy that helps

Use concrete copy such as **Could not save this world. Your previous save is unchanged. Retry.** only when the backend establishes those facts. Say **Save outcome not confirmed** when uncertain. Avoid a lone **Something went wrong**, raw codes as titles or cheerful wording that minimizes possible loss.

Offer diagnostic details progressively without secrets, private records or unfiltered provider payloads. Keep recovery near the error and retain input rather than sending the player through global Settings to repair a local issue. Alerts should earn their interruption with an important actionable consequence; a common genuinely undoable operation does not need repetitive confirmation. Existing protected approvals remain. [S14](research.md#s14)
