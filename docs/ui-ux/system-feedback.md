# Search, feedback, settings and save/load

[Handbook](README.md) · [Controls](controls.md) · [Save/load contract](../save-and-load.md)

## Every operation has a readable state

A reusable asynchronous surface needs a contract for initial, loading, ready, empty, failed and stale states, plus partial results when the backend supports them. Do not let an empty array ambiguously mean all of these.

| State | What the player should understand | Wrong implication to avoid |
| --- | --- | --- |
| Not yet requested | What opening or searching will do | Pretending the collection is empty |
| Loading | What is being retrieved; whether an old view is still usable | Erasing the interface or showing fake progress |
| Truly empty | Nothing exists in the requested permitted scope, with a useful next step | Suggesting a retry will create data |
| No filter/search matches | Data may exist; explain scope and offer to change the filter | Saying the player owns nothing |
| Partial/windowed result | What was examined and how to continue | Calling a page the complete collection |
| Unavailable/unauthorized | Why the operation cannot proceed, without leaking hidden facts | A mystery disabled button or a misleading empty state |
| Stale | Which displayed facts may have changed and which actions await refresh | Allowing a stale price, quantity or target to look final |
| Failed | What did not finish, whether anything changed, and a recovery action | A disappearing error with no retained work |
| Completed | The actual authoritative result | Treating request dispatch as success |

Put feedback where the action happened. Preserve the stable panel, selection and prior readable content during refresh where safe. Block only the operation whose prerequisites are stale, not the whole game. Do not disguise an error as a zero, an empty meter or a successful-but-blank response.

## Search is a scoped read, not a side effect

Use a persistent label or accessible name, an informative placeholder and an unambiguous clear control. Distinguish searching a catalogue from choosing a value in a form. Search should not equip, buy, move, generate or activate merely because the player pressed Enter. Where the current action search opens an invention draft, preserve its explicit-send boundary.

Scope, filters and continuation belong together. Indicate **this container**, **this conversation**, **perceived events**, **known people** or another honest domain. A broad search must use a permitted server endpoint; do not pull hidden world data into the browser and then filter it visually.

Retain query and search context when returning from detail. Match by stable identity, not display-name uniqueness. Use explicit ranking/sort semantics and stable ties; keyboard focus must not jump as late results arrive. Reject responses from an old query, actor, scope or world generation. A query change clears or invalidates old selectable results immediately when selecting them would be unsafe.

Current subject search uses a 150ms debounce, and [QU15](../limits/interface.md#qu15) records the shared reported search value. Debounce network work, not text entry. A local filter may not need debounce; expensive work needs measurement or a better query, not a longer unexplained delay. The proposed local-feedback target is separate from end-to-end server/model latency. [UXL05](../limits/ui-ux.md#uxl05)

Support no-results recovery: change query, clear filters, widen scope only when supported, or continue scanning older/remaining records. Do not recommend broadening to private data. Searchable history can remain bounded per request while preserving complete permitted access through continuation; this is already a meaningful distinction in Open Legend's history contracts.

## Notifications: match the interruption to the consequence

| Importance and duration | Appropriate presentation |
| --- | --- |
| Immediate local acknowledgement | In-place state change or brief status near the control |
| Noncritical completed background work | Quiet notice with a route to its result |
| Information needed later | Persistent history/inbox entry or durable panel state |
| Recoverable failure affecting current work | Inline error with retained draft and retry/repair route |
| Save/storage failure or unresolved consequential outcome | Persistent visible status until resolved/acknowledged; not only a timed toast |
| Decision requiring exclusive attention | A bounded dialog only when continuing without a decision would be unsafe |

Do not notify for every low-level stage or send the same event through a toast, banner, modal and chat message. Deduplicate by event identity rather than equal text. Aggregate repetitive low-importance events while preserving a route to their underlying permitted history. Avoid escalating quiet simulation updates into an attention alarm.

Respect existing per-character notice and history limits, including [LA223](../limits/interface.md#la223) and the hearing/caption owners. The current three-overhead-notice bound is not a universal rule that every notification queue may discard everything after three. Critical errors and missed information need their own persistent recovery path.

A disappearing notice cannot be the only place to act on an important failure. Do not put a time-limited essential action in a hover-only toast. Use live regions deliberately: polite for normal status, assertive only where interruption is warranted. A meter changing every simulation tick must not continually interrupt a screen reader. Reduced motion removes animation, not the message.

## Settings, menus and preference persistence

Group settings by player goals: controls/camera, readability/accessibility, audio/captions, gameplay preferences and authorized creator/operator settings. Keep accessibility discoverable before a player is stuck in a difficult interaction. A search result should take the player to the actual setting and preserve its group context.

Show the current value and describe the effect in ordinary words. Use immediate preview for reversible local appearance settings when safe, with reset; use staged Apply/Save for coordinated or consequential changes. Do not mix both models without an explicit indication. **Reset this section** and **Reset all settings** need distinct scope. Resetting presentation is not resetting the world.

Keep account/device presentation preferences separate from gameplay saves where the current contract does. A rewind must not unexpectedly restore someone else's UI scale, camera sensitivity or accessibility configuration. Operator autosave settings and creator permissions stay under their authority; a friendly switch cannot grant the player access to them.

Use Advanced for genuinely specialist options and summarize non-default hidden choices. Do not put basic text size, captions, camera recovery, input help or the only load/recovery route behind an unlabeled overflow control. [F16](research.md#f16)

## Save UI: show what is durable

Saving is a trust contract, not a button animation. Distinguish **queued**, **capturing/writing**, **durably saved**, **failed** and **outcome not confirmed** when those distinctions exist in the backend. A queued request or locally disabled Save button is not a receipt. Keep the last confirmed save visible independently from a pending one.

Identify the save meaningfully: world/character, label, manual or automatic origin, and readable timestamp. Use the server's actual capture/order information when ordering saves, not an invented browser time. Relative age can help scanning; an exact timestamp and timezone resolve ambiguity. Do not derive a fake thumbnail or progress percentage when unavailable.

A failed save preserves the current world and the last known-good save. Surface a persistent, actionable reason and a safe retry under the existing persistence contract. Do not mark the save successful because the request eventually timed out or the panel was closed. Do not automatically delete older saves, clear storage or reset the world to repair an error.

The existing [save/load owner](../save-and-load.md) distinguishes background simulation persistence, synchronous command effects, checkpoints and recovery. This handbook does not change those guarantees or promise zero crash-loss for background work. UI copy must describe the actual guarantee relevant to the player's save action, not conflate all persistence into a green check.

## Load and recovery

Show enough context to choose the correct world state and distinguish Load, Rename and Delete. Separate destructive controls from ordinary selection. Opening a save row is inspection, not immediate loading. Before replacing current gameplay state, use the current confirmation and recovery contract; explain what will be replaced and whether current progress has been preserved.

Validate compatibility and integrity before presenting a save as loadable. Under the root [development save policy](../../AGENTS.md#development-save-policy), incompatible development saves are rejected explicitly, without legacy migration, automatic deletion, reset or replacement. UX convenience is not permission to weaken that rule. Keep credentials, real spending/accounting and account preferences separate from gameplay rewind.

When preserving the current world fails, do not pretend the load can safely proceed. When the restore outcome is uncertain, show that state rather than guessing success and continuing play against inconsistent data. A retry or reconnect should reconcile the actual world/save identity before enabling another destructive action.

For future cloud conflict UI, compare meaningful save identities and timestamps, offer deliberate choices and preserve both versions where supported. Do not implement cloud sync or invent a conflict-resolution guarantee as part of a local save panel. This is a future pattern, not current delivery.

## Failure copy that helps

Use a concrete message: **Could not save this world. Your previous save is unchanged. Retry.** Include only facts the backend establishes; when outcome is uncertain, say **Save outcome not confirmed** instead. Avoid **Something went wrong** as the only explanation, internal exception codes as the title, or cheerful wording that minimizes possible data loss.

Technical detail can be expandable or copyable for diagnosis. Do not expose secrets, private records or unfiltered provider payloads in player errors. Keep the primary recovery action near the error, retain user input and avoid sending them through a global Settings hunt to repair a local problem.
