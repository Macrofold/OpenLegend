# NPC reply preview delivery and feasibility

## Initial attempt before configuration correction — October 3, 2026 — Configured-route gate blocked

**Historical initial outcome:** NP05/NC19 implementation was incomplete. The configured direct-conversation path did not reach NPC reply generation. No safe earlier-display opportunity or browser latency improvement was demonstrated. Final-only behavior is retained; no production decoder, progress callback, preview endpoint, protocol field or UI was added.

### Environment and method

OpenLegend source and refreshed `origin/main`: `b528af6d`; working branch: `codex/np05-npc-reply-preview`. The worktree had no `.env` or inherited provider configuration, so the probe explicitly loaded the existing local game's configuration from the primary checkout. Credentials, connection IDs, database URLs and payloads are omitted here.

That configuration selects Macrofold at `http://localhost:3210`, BYOK, with `MACROFOLD_JEV_MODEL=meta/muse-spark-1.3-contributor`. NPC level-2/complex generation settings retain their defaults, `openai/gpt-5-mini` and `openai/gpt-5`. The configured Macrofold key takes precedence over direct OpenAI. No model, route, response schema, prompt, recipient or operation policy was changed.

Read-only requests to the running service's health, OpenAPI and model catalogue succeeded. Its deployed OpenAPI advertises top-level `stream: true` on `/v1/inferences`, `text/event-stream` delivery and a final inference result. The mini/complex generation models are enabled. This establishes advertised capability, **not observed structured-output streaming or latency**. Local Macrofold source at `9948ba64` documents direct inference's own `output.delta`/terminal result channel, separately from native owner Runs; its correspondence to the deployed implementation was not independently established.

A temporary probe exercised `AiDirector.submitInteractive('chat', ...)` with the real Macrofold backend, original accounting and final admission. It used a fresh disposable loopback PostgreSQL database/world and local authenticated player control. The local-auth override affected only that disposable world. Other residents were kept out of the workload, paid embeddings were disabled, and no simulation loop or browser was started. All owned database connections, databases and temporary world files were cleaned up.

The probe could request documented streaming on the original structured generation request and return its saved terminal result to the unchanged adapter. **No generation request reached that instrumentation.** Its bounded timing-only scan was not a production disclosure decoder and published no text. No constructed multi-operation fixture or fake routing answer was used to claim success.

### Initial caller inventory

| Caller                                                                                                              | Delivery / scope at the initial failed gate                                                                                       |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Direct NPC conversation, Macrofold fast/complex generation                                                          | Complete native inference choice, schema validation, then native admission; NP05's gate never reached generation.                 |
| Direct OpenAI structured NPC generation                                                                             | Complete Responses body before local validation; separately configured adapter, not substituted or qualified here.                |
| Structured invention-workshop explanations                                                                          | Complete validated tool/answer envelope; inventoried for possible reuse, outside NP05's first-release grant and unqualified.      |
| Invention proposals, private narration, conversation compaction, consolidation/reflection and action interpretation | Existing final validated values; private cognition/proposals are not NPC conversation previews.                                   |
| Native World Agent owner conversation                                                                               | Separate existing plain-text Run progress; its transport and PW05/PW11 qualification do not establish structured NPC feasibility. |

### Observed results

| Ordinary player turn                     | Time from submission to failed job | Decision requests | NPC generation requests | First safe operation / final reply |
| ---------------------------------------- | ---------------------------------: | ----------------: | ----------------------: | ---------------------------------- |
| Greeting and asking how Ada is           |                    2,737.620458 ms |                 1 |                       0 | Unavailable                        |
| Asking what to do around camp            |                      754.680792 ms |                 1 |                       0 | Unavailable                        |
| Asking what Ada enjoys about living here |                        523.4975 ms |                 1 |                       0 | Unavailable                        |

Each decision admission returned HTTP 200, but the director's player conversation job failed during preparation. HTTP success did not produce a usable decision or generated speech. These elapsed times measure failed turns, **not reply generation or streaming latency**. Exact upstream failure codes were not retained by the probe; no particular terminal/billing classification is inferred from HTTP status.

### Concrete blocker and interpretation

The game sends Jev decisions as native `{state, questions}` and expects an `answers` map (`MacrofoldBackend.judge`). Its configured decision model is instead Muse Spark. Local Macrofold's `decisionProtocol` selects OpenRouter Decisions only for `typesafe/jev-1.13`; the configured Muse identity selects OpenRouter chat. That is a source-confirmed protocol mismatch and the explanation supported by inspection for the observed preparation failures. It is not a measured failure of the mini/complex models' streaming capability.

Changing the decision binding or substituting a direct generator would violate NP05's unchanged-model/route condition. The probe therefore did not repair the shared `.env`, bypass Jev, fabricate answers, force extra operations or replay failed requests. The latency prerequisite remains unresolved. Preview/UI implementation stops at this boundary, as required by [NP05's gate](../projects/next-priority-batch-feature-spec.md#feasibility-gate-before-implementation).

Owner options are to retain final-only replies; separately authorize correcting the decision-model configuration and then rerun representative direct-conversation feasibility; or, if a functioning route later shows no useful closed-operation opportunity, separately design a server-bound public reply channel. The latter changes the response contract and is not authorized or implemented by this investigation. Correcting configuration alone does not pass the gate.

### Costs and evidence limits

The explicit probe ceiling was **$2**, within the shared **$10** implementation-task ceiling. Three decision requests each reserved **$0.005**, for **$0.015 cumulative reserved exposure**. The probe reported no usable prices; actual additional and cumulative Jev/provider charges are **unknown**, not $0. Count the entire $0.015 against the task ceiling until authoritative billing is available. There were zero generative calls; read-only capability checks created no inference.

No browser text, safe first-operation arrival, whole-reply completion, split/Unicode decoder handling, preview privacy/lifecycle/reconnect, final-history deduplication or changed UI qualification was demonstrated. No claim about ordinary early-output benefit, model quality or provider cost savings follows. NPC previews, other structured conversation callers and PW05/PW11 remain unqualified. The existing three-dot presentation was inspected in source only.

The full documentation diff was reviewed against the source and observed probe results. Changed/new local links and anchors passed a focused check; pinned Prettier and `git diff --check` verify the documentation. Runtime logic is unchanged, so no type/build/game test suite was required or claimed.

### Maintained records

- Implementation/blocker/remaining acceptance: [NP05](../maintainers/next-priority-batch.md#np05--read-npc-replies-before-generation-finishes), [NC19](../maintainers/narration-and-conversations.md#nc19--progressive-display-of-structured-conversation-replies), scoped NC02/NC10 and [CR02/CR12](../maintainers/cognition-redesign.md).
- Delivery constraint: [NPV01](../limits/interface.md#npv01--private-npc-reply-preview); all preview restrictions remain targets, not shipped protections.
- Conditional plan and source inventory: [NP05 technical design](../projects/next-priority-batch-tech-design.md#np05--read-npc-replies-before-generation-finishes).

## Corrected configured-route gate — October 3, 2026

Mike explicitly authorized replacing the incorrect local decision binding with `MACROFOLD_JEV_MODEL=typesafe/jev-1.13`. The generator, prompts, schema, routing decisions and final admission were unchanged. A disposable PostgreSQL world used actual authenticated player control, ordinary chat submissions, the original inference request with documented streaming, and the existing terminal-result/receipt owners. A fixed fixture clock prevented presence expiry during measurement. No text was published.

| Ordinary turn     | First complete eligible speech | Remaining body complete | Provider terminal | Earlier than body | Earlier than terminal |
| ----------------- | -----------------------------: | ----------------------: | ----------------: | ----------------: | --------------------: |
| Greeting          |                3,978.891583 ms |         4,477.315833 ms |   4,637.524667 ms |     498.424250 ms |         658.633084 ms |
| Camp question     |                5,629.288333 ms |         6,123.693208 ms |   6,278.539625 ms |     494.404875 ms |         649.251292 ms |
| Personal question |                6,173.473541 ms |         6,194.823166 ms |   6,349.638958 ms |      21.349625 ms |         176.165417 ms |

Times begin at the player submission. All three complete bodies validated against their exact request schemas; all three first operations were independent directed speech followed by private thought. The pure current hearing query returned clear exposure and visible source for the player. Final jobs completed through normal admission. This passes the configured-route feasibility prerequisite for a complete-operation preview; benefit varies and can be small. It does not demonstrate a production decoder, private delivery, browser behavior or other adapters.

A preceding corrected-clockless probe captured two valid eligible replies, then stalled because its simulated player presence expired while waiting for admission. Its paid results and exact attempt/Run identities were retained privately before stopping only the owned process and dropping only its owned database. Its estimates remain included in the task total. The final fixed-clock probe retained safe receipt/Run summaries outside Git and cleaned up its owned database and temporary files.

The final gate made six Jev calls with **$0.002353050** in provider-reported estimates, plus **$0.010512750** reply estimates, totaling **$0.012865800**. Across both corrected probes, Jev estimates total **$0.003448998** and all reported estimates total **$0.021749498**. Another **$0.020** remains reserved and unpriced (the original $0.015 and one $0.005 uncertain decision), for **$0.041749498** cumulative estimated/reserved task exposure. These are estimates/reservations, not invoices. The final probe used an explicit $2 cap including prior exposure; all work shares the $10 task ceiling.

At this stage implementation was authorized to proceed under the durable plan; the production integration and later qualification are recorded below.

## Implemented configured-route delivery

The qualified Macrofold fast/complex direct-conversation route now uses one original streamed inference, schema-owned first-operation validation, a bounded `@streamparser/json` wrapper, a volatile private snapshot and the existing Talk components. The initial custom lexer was replaced under the later authorization and evidence below. No model/schema/recipient policy changed to obtain a preview. Direct Responses, full-harness calls, workshop explanations and background/private callers remain completed-value paths and are not qualified here. The local decision setting is Jev; the generic Muse setting remains available for its existing separate callers.

The first operation must be complete, independent speech to the authenticated requesting character. Current control, timeline, attempt, conversation membership, clear hearing at the parsed volume and visible observer-safe attribution are checked before disclosure and before queued publication. Losing eligibility permanently withdraws this attempt. The preview creates no speech event, awareness, memory, caption, action or stored conversation row. Final callbacks retire before admission; actual native utterance identity resolves only to existing permitted history IDs. Transport interruption or a different terminal body withdraws presentation while normal final validation/receipt observation continues for the original accepted Run. Terminal receipt delivery completes without waiting for HTTP EOF. No paid retry or second billing owner was added.

### Provider-free parser, native and delivery checks

A temporary bounded qualification scenario used injected streams, a disposable PostgreSQL world and a global external-network prohibition. These initial measurements used the former custom lexer; the replacement was requalified below. No source test suite or generated payloads were committed. Additional Jev/provider cost was **$0**; cumulative paid totals remain those below.

- All **491 split positions** of a representative body decoded exactly one complete first operation, including escaped keys, escaped surrogate pairs, quotes/braces and JSON-looking private-field names inside public speech. Duplicate escaped/root/deeper keys, lone surrogates, malformed numbers/structure, trailing content and byte overflow were rejected. Private-first/later/dependent/different-recipient talk was withheld.
- One-byte UTF-8/SSE framing preserved text; reasoning was ignored. One POST delivered accepted identity and the normal terminal result. Interrupted streams retained the original Run; changed terminal output withdrew text; throwing viewers could not lose the final result. A terminal receipt on a deliberately open HTTP stream completed promptly. No inference replay occurred.
- Real server/native owners showed no world change from previewing. Wrong viewer scope was refused. Late duplicate/truncated bodies cleared text and failed completion; abandoned partial transport representations deferred to normal final validation. Walking away and returning, invisible source despite clear sound, death, leaving the conversation, stale attempt and supersession retired text without revival. A later speech-capability loss produced a rejected native talk receipt and zero correlated speech IDs; partial hearing withdrew the preview while ordinary native speech/history preserved the actual partly heard projection. An old settlement could not remove a newer preview.
- Actual `commitActorResponse` plus PostgreSQL transcript projection produced the genuine **two speech messages**, with one actual public history ID correlated to the first operation and no stored preview row. A fresh preview owner returned no prior draft.
- A blocked consumer coalesced 100 changes into two writes rather than retaining every prefix. Access loss closed it. A deliberately delayed snapshot was refused after its sequence became stale, covering the publication-after-await boundary.
- Thirty decoder runs over a **22,614-byte, 16-operation** body in seven-character fragments took approximately **30.222042 ms** in the final isolated run. This is a bounded fixture stress observation, not deployed capacity or a model-quality result. SSE parsing consumes characters once instead of rescanning the pending frame on each tiny chunk.

## Browser and recovery qualification

Three ordinary full-game conversations used the real configured Macrofold route and production preview/HTTP/UI/final-admission path. The first two server-side complete-operation-to-body opportunities were about **597 ms** and **354 ms**. The third was measured in the actual browser with bounded DOM observations:

| Milestone from player submission          |  Elapsed |
| ----------------------------------------- | -------: |
| First readable browser speech             | 5,165 ms |
| Remaining structured body complete        | 5,607 ms |
| Generator returned its terminal result    | 5,909 ms |
| Saved heard message visible and dots gone | 6,588 ms |

Browser text was readable **442 ms before the whole body**, **744 ms before generator return**, and **1,423 ms before final visible reconciliation**. These are one local observed turn, including preparation/startup; they are not guaranteed latency or evidence of improvement on every reply. One genuine final message replaced the temporary speech. Private thought, raw JSON and visible generation-status prose were absent; the existing accessible waiting dots remained beside the provisional speech.

A separate full-game provider-free host supplied long held decisions through the real director, private endpoint and native PostgreSQL admission. It was visibly labeled Fixture mode and prohibited external provider requests. Actual interaction covered:

- A 1,200-character provisional reply, long permitted older history, scrolling away from the bottom, retained multiline/Unicode draft, explicit New Message control and one final message. Reading scrollTop remained **3,119 px** across final replacement; draft text was unchanged.
- Hide/reopen retired the hidden browser subscription and preserved the draft; the same current attempt could be read again without new inference. Browser reload required current character control; replacing that control cancelled the old attempt and removed its unfinished words.
- A fresh server instance and a **full operating-system process restart** reopened the owned database. Saved history remained, provisional text disappeared and generation/judgment counters stayed zero until another explicit player turn. Restart did not resume paid work for preview delivery.
- Actual **420×600 narrow** presentation with **130% UI scale**, plus **1024×600 wide/short** presentation, readable wrapping, no horizontal document overflow and reachable composer. Enter sent; Shift+Enter inserted a newline; Unicode text remained intact. Review corrected an existing floating-panel offset retained during sheet conversion, and Talk reused the expanded Work sheet with scrollable controls.
- Malformed final output removed the provisional NPC row, stopped the dots and retained the existing restrained failure/retry controls without automatic retry. Private-only final output produced no fake NPC speech or exposed thought. Native text selection and Copy returned exactly the selected provisional speech. A named disposable save loaded while a reply was active; the game reopened paused with the saved history, no discarded player turn, no provisional words and no waiting dots. The delayed-publication fixture above independently covers an already queued snapshot becoming stale.

The shared Conversation helpers were not modified. The generic private-stream extraction preserves owner delivery cadence/frame/backpressure/access behavior; provider-free transport scenarios cover the changed helper. These observations do not close PW05/PW11's separate full workspace qualification.

### Costs, cleanup and remaining limits

The three actual browser turns added six Jev estimates totaling **$0.002353890**, plus **$0.010009500** generation estimates, for **$0.012363390**. Cumulative task Jev estimates are **$0.005802888**; all reported estimates total **$0.034112888**. Another **$0.020** remains unpriced reserved exposure, for **$0.054112888** total estimated/reserved exposure under the shared **$10** ceiling. These are provider estimates and reservations, not settled invoices. Native/fixture checks added **$0**. Exact Run/attempt receipts and generated screenshots/payloads remain outside Git.

Live hosts with retained ownership records and their disposable databases/files were cleaned up. An earlier UI-host startup failed before listening or inference, before the probe retained its database identity. Its empty owned directory was removed, but a disposable database may remain: do not guess at another fixture database or force-drop sessions. That cleanup limitation is tracked in NP05.

Focused existing checks passed **41 tests in three files** (AI client, director and conversation view). Typecheck and production build passed, with existing PlayCanvas browser-externalization and large-bundle warnings. Pinned changed-file formatting, a focused check of 49 changed/new local documentation links and anchors, `git diff --check` and the full affected-diff review passed. Required CI remains separate from these focused local checks.

**NP05 acceptance remains incomplete:** native OS IME composition could not be exercised through the available browser-control surface; Unicode/multiline input and the unchanged `isComposing` send guard are not a native IME pass. Assistive devices, other adapters/callers, broader CR/NC/UIUX and PW05/PW11 remain unqualified. No ordinary autonomous-behavior quality, population scale or production deployment claim follows from these local checks.

## Library parser replacement — October 3, 2026

Mike selected `@streamparser/json` after the broader library comparison and authorized removing superseded parsing code. The current branch was refreshed to `Macrofold/OpenLegend`'s `origin/main` at `9cffc23f`; upstream changes were documentation only, and both independent changelog additions were preserved. The exact dependency is 0.0.26, with no runtime dependencies of its own. The former 190-line custom lexer is replaced by an 81-line integrity wrapper. No former constructor overload, alternative lexer, prefix repair, captured JSON reparsing or manually tracked value paths remain. The single server caller releases parser references on decoding failure or completion.

A review found that the library's string selectors conflate an object field named `"0"` with array index `0`. The wrapper checks the library's actual typed path metadata before release. A valid-looking speech operation under an object field named `"0"` therefore produces no preview; only the intended first array entry can qualify. Decoded duplicate-key rejection, root-field restrictions, byte/depth/key bounds, finite numbers and well-formed text remain enforced before the existing speech schema and current recipient/hearing checks.

The reused temporary qualification scenario ran with injected provider transport, an owned disposable PostgreSQL database, `AI_BUDGET_USD=0`, no provider credentials and external requests prohibited. Its final run passed **972 split positions** across escaped and literal Unicode bodies, including splitting a literal surrogate pair between fragments. It rejected duplicate escaped/root/deeper keys, malformed/truncated structure, nonfinite numbers, lone surrogates, unsupported root fields and byte/depth/key overflow. The wrong-shaped operations object was withheld by both the decoder and real preview owner.

The real preview owner/native-history checks passed: private-first, dependent and wrong-recipient speech stayed hidden; incomplete later output allowed the already complete eligible speech to appear and then withdrew it on failed completion; late duplicate keys failed completion. Previewing left the world unchanged. Walking away, loss of attribution, death, conversation loss, stale attempts and supersession withdrew text without revival. Final native admission produced the genuine two speech messages with one actual history ID correlated to the first operation, no stored preview row and no duplicate speech. The existing injected transport and private-delivery checks also passed with the replacement.

Thirty decoder runs over the same **22,614-byte, 16-operation** body in seven-character fragments took **81.96504200000004 ms** in the final isolated run. The earlier custom-parser observation was 30.222042 ms; these separate local runs are bounded handling evidence, not proof of a speed improvement or deployed capacity. The dependency replaces handwritten grammar ownership, while the application retains only its integrity/disclosure checks.

`pnpm typecheck`, `pnpm build` and the **26 existing AI client tests** passed. Formatting, changed documentation links and the complete affected diff were checked after documentation reconciliation. The build retained the existing PlayCanvas worker externalization and large-chunk warnings. No new game/browser behavior or live-provider latency was claimed: the earlier browser evidence remains relevant to unchanged delivery/UI, and the native IME acceptance gap and earlier unidentifiable fixture-cleanup limitation remain open.

Additional Jev/provider cost for replacement qualification was **$0**. Cumulative Jev estimates remain **$0.005802888**, all reported provider estimates remain **$0.034112888**, and **$0.020** remains unpriced reserved exposure, totaling **$0.054112888** estimated/reserved task exposure. No additional paid request was made; these totals are estimates/reservations, not invoices.
