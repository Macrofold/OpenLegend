# Audio production: implementation and integration design

| Status      | Current progress                                                                                                     | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Design and module boundaries are specified; provider, production-tool and game-playback implementation remains open. | 2026-11-06   |

Read the [feature specification](audio-production-feature-spec.md) for behavior, the [procedure](../production-workflows/audio-production.md) for the operator sequence, and [AUD](../maintainers/audio-production.md) for task status. Paths explicitly described as **new** below are implementation targets, not existing commands or delivered modules.

## 1. Smallest architecture and existing owners

Use an offline agent plus narrow local helpers, existing provider interfaces, and the existing asset authority. The initial implementation is a CLI and generated listening page, not a continuously running production service. It needs neither a world database nor a new queue/database/catalogue service. The game consumes only selected approved exports and world-owned bindings.

| Responsibility                                               | Owner and implementation target                                                                                                                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared production behavior                                   | Existing production guidance plus [production-process.md](../production-workflows/production-process.md); no executable generic workflow engine                                              |
| Natural-language intent and creative judgment                | The operating agent/Mike; the agent resolves an explicit brief and operations before invoking tools                                                                                          |
| Offline run records, commands and provider calls             | New `scripts/audio.ts` entry point and focused modules under `scripts/audio/`; root package command `pnpm audio` when implemented                                                            |
| Exact media files, rights, publication and release selection | Existing `packages/assets/src/index.ts`, `scripts/assets.ts`, server asset authority/delivery owners; extend their supported metadata at the existing boundary                               |
| Audio metadata validation and catalogue derivation           | New `packages/assets/src/audio.ts`, exported from its package; plain serializable data, no provider or world policy                                                                          |
| Base-world vocabulary, musical direction and bindings        | New `packages/domain/src/worlds/base/audio.ts`, selected through existing world definition installation; [world audio direction](../worlds/base/audio-direction.md) owns its authored values |
| Generic binding shapes/admission                             | Domain definition owner, with supported exact predicates over permitted facts; no I/O or browser dependencies                                                                                |
| Permitted runtime audio projection                           | Existing server event/view projection extended through a focused audio projection helper; protocol owns the public shape                                                                     |
| Playback and selection                                       | New client audio controller independent of renderer backend; receives allowed views and exact delivery references, owns browser resources                                                    |

The present `AssetManifest` already has `identity`, `files`, `dependencies`, `rightsEvidence` and `metadata`; `ArtifactReference` already identifies bytes, media type and storage/access boundary. Reuse these. Do not invent audio-specific S3 identities, a competing permission table or a second release-selection owner. Existing `PublicEvent.sound` supplies permitted hearing information but does not yet specify a complete sample-playback event. Add the missing projection deliberately rather than treating captions as audio instructions.

No backward-compatible formats, migration framework or `V2` aliases are required. New current-format validators reject incompatible development records. Actual media, acquired rights and retained study history are assets, not disposable game saves; the root policy does not authorize their loss.

## 2. Offline records and ownership

Store active files outside every checkout in a deliberately named external study workspace. Use the existing art-workspace convention with an audio study name; media need no new top-level storage system. Publish meaningful immutable snapshots through the existing study/library mechanisms. Git contains the brief, selected recipes, curated small semantic catalogues, implementation and verified permanent references, never media payloads or provider credentials.

One operator owns a study write session. An exclusive local lock prevents two agents from modifying the same working record; a conflicting operator may inspect or work on an independent candidate but must hand results back to the owner. A lock is local coordination, not cross-machine asset permission. Concurrent remote publication remains protected by the existing authority. A resumed study on another machine first selects the exact latest intended retained snapshot; it does not merge two branches of a study automatically.

Use one atomically replaced `run.json` for active study metadata, plus separate per-operation records/files where size warrants it. Append new candidates/decisions, do not repeatedly embed prompts and audio metadata into every child. This is an authoring record, not another gameplay database. Each meaningful batch produces a new immutable study snapshot. A local interrupted write leaves the last complete record; exact provider submission receipts are saved immediately, before later listening-page work.

### Record contract

| Record            | Required meaning                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Study             | Stable study ID, owner/collection/world scope, brief, defaults, current candidate-group IDs, selected exact revisions, shared task budget reference, next requested boundary                                              |
| Brief             | Role, intended listening/use context, duration or range, instrumental/vocal requirement, direction/reference roles, protected/free properties, candidate count and finish/integration scope                               |
| Reference         | Link or exact owned asset reference, inspected extent/timestamps, purpose, and independent permissions for listening, provider input, retention and distribution                                                          |
| Candidate         | Stable candidate ID/alias, exact revision, parent revision(s), operation ID, actual output file references, review status, technical status, proposed/approved metadata and comments                                      |
| Operation         | Stable operation ID, resolved target revisions, operation kind/arguments, actual provider/model/settings, request fingerprint, submission state/receipt, output references, cost commitment/settlement and failure reason |
| Review decision   | Target revision, person/agent making the decision, aesthetic/technical/use scope, accepted/rejected/deferred result, reasons and next requested operation                                                                 |
| Release selection | Existing asset release identity and exact accepted revisions; no mutable filename-based lookup                                                                                                                            |

Names and aliases are display conveniences. Use existing structured asset identities and UUID-like application IDs for studies/operations; never resolve an identity from a generated title. Within a study, `A` can denote the currently displayed exact candidate revision; freeze that mapping at operation admission. A group request records its members once. Later additions cannot silently join a paid batch.

Keep independent states independent: a candidate can be archived, aesthetically rejected and technically valid; a favorite can be accepted but not licensed for the proposed use; a published library recording can remain unbound to the game. Do not create one enormous status enum for every combination.

## 3. Provider operations, cost and recovery

Supported operator intentions are `generate`, `vary`, `edit-section`, `extend`, `finish`, `analyze`, `tag`, `publish` and `bind`. These are offline helper operations, not world actions. `finish` normally invokes local editing/export; it becomes a paid generation only when the actual repair requires that route and its scope/cost is admitted. `tag` does not call a music generator.

Use a small provider capability description for the route actually implemented: supported operations, reference-file rules, duration/output constraints, receipt lookup, cancellation, export formats and account/plan needs. Store verified product/model/access route and last check with its evidence. A consumer UI feature is not automatically an API feature. No common adapter may advertise section editing, same-theme variation, stems or seeds unless that exact route supports it.

Start with the [provider shortlist and qualification](../production-workflows/audio-tools.md). Prefer official connectors/APIs. A provider UI or human finishing route can supply the same record/output contract without pretending to be automated. Keep the adapter narrow; do not implement every shortlisted vendor before the first useful recording is delivered.

### Paid submission sequence

1. Resolve the complete request, exact inputs, current input/output permissions, account access and supported operation. Record unsupported constraints before spending.
2. Calculate the batch's conservative upper commitment, including provider-imposed paired outputs, credits, required exports, possible billable analysis and already outstanding task work. The [spending owner](../../.agents/rules/verification.md#spending) controls admission; a study is not another $10 allowance. Unknown cost with no defensible bound blocks dispatch.
3. Save the admitted operation and task commitment before submitting. Supply the provider's idempotency key when supported; otherwise do not claim exactly-once remote execution.
4. Submit once. Immediately retain the provider receipt/job ID and observed state. Poll/read that same job under the existing network lifetime/timeout policy; cancellation of local waiting is not proof of remote cancellation or zero charge.
5. On success, retrieve the actual files, check identity/type/decodability, save exact outputs and settle known charges. Provider-created extra takes remain outputs of that one operation, not a reason to hide cost or silently expand subsequent variations.
6. If submission outcome is unknown, mark `submission-unknown`, retain the commitment, and reconcile provider history/receipts. Never submit a replacement merely because the agent lost the response. If the service cannot resolve it, report the specific unknown and continue independent work. A newly authorized replacement is a new operation with the prior possible charge still counted.
7. A failed, refused or cancelled generation has its actual terminal result and observed charge. No automatic paid retry or provider fallback. Pure retrieval of an existing completed output may be retried through the existing bounded network mechanism when it cannot trigger generation.

Polling uses bounded concurrent active jobs and one next-due timer per active run; no daemon or empty background polling. Default dispatch is two outstanding generations, bounded additionally by the provider and task budget. Additional requests form a finite admitted batch, not an unbounded automatic queue. Long batches stop before the next unaffordable job and report the unstarted members.

Secrets stay in the authorized credential tool/environment; store only an account alias and safe entitlement evidence. Public review bundles exclude raw receipts, tokens, private source prompts and billing details that are not intended for viewers. Never log full authorization headers or signed download URLs.

## 4. Minimal command contract

These commands are **targets to implement**, not commands to run until `pnpm audio help` lists them. All mutating commands take `--study` and explicit input file/IDs, return structured result JSON plus a short summary, and fail without silently selecting another source. CLI errors exit nonzero; helper functions return typed outcomes without exiting the host process.

| Command                                | Input → output and purpose                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `init --brief FILE --output DIR`       | Validated brief → external study record; refuses checkout destinations and nonempty output directories                         |
| `status --study DIR`                   | Current jobs, candidate aliases/revisions, actual/uncertain costs and next boundary; never dispatches                          |
| `run --study DIR --request FILE`       | Explicit operation/batch → recorded jobs and actual retrieved candidates; requires finite targets/count and cost admission     |
| `recover --study DIR`                  | Reconcile existing job receipts and retrieve existing results; no replacement generation                                       |
| `inspect --study DIR --candidate ID`   | File properties, exact references, waveform/measurement report and available playback; no claim of subjective quality          |
| `review --study DIR --output DIR`      | Immutable listening page and review manifest for a selected candidate set; does not create a separate writable catalogue       |
| `finish --study DIR --request FILE`    | Local processing/export recipe → new derived revision and analysis, preserving parent master                                   |
| `catalog --release REF --query FILE`   | Paged eligible metadata, tag vocabulary, family matches and counts; never loads unrelated audio bodies                         |
| `tag --study DIR --changes FILE`       | Explicit suggestions/acceptance/rejection → metadata revision, preserving approved manual choices                              |
| `publish --study DIR --selection FILE` | Validated exact package → existing asset prepare/approve/publish path under current authorization; returns verified references |
| `binding --selection FILE --world ID`  | A reviewable world-content patch and missing prerequisites; no direct mutation of a running world's private state              |

The agent translates natural language to these explicit inputs; no new parser of arbitrary English is required. A small existing provider tool may substitute for `run` during qualification if its receipts and outputs are recorded. Do not duplicate asset-CLI internals: reuse its library calls or invoke its documented command with structured files, including unchanged operation identity when recovering a publication.

### Request and state details

A `run` request contains `operationId`, `kind`, `targets` (exact candidate/revision pairs), `count` for new generation or `countPerTarget` for a parent-based batch, `briefPatch`, `protectedFeatures`, optional `timeRangeSeconds`, `route` and `admittedCostBound`. A new generation has no parents and one requested count; a variation requires parents. A section edit requires a valid source range and an actually supported operation. An ordinary finish request contains explicit processing steps and export-profile ID instead of an invented generative quality number. Provider-specific controls stay under the chosen adapter's options and must be checked against that route. These are proposed internal shapes to implement with the package's normal typed validation, not a second public wire protocol.

Validate the finite operation and input identity once before dispatch; validate provider-returned file facts once on intake. Refuse a missing source, an invalid edit range, an unsupported operation or a cost beyond admission. Do not reject a usable song just because its provider omitted a requested descriptive tag. A provider count/length mismatch is an explicit result to review, not an automatic replacement generation.

Persist operations through `prepared → admitted → dispatching → submitted → retrieving → succeeded`, with `failed`, `cancelled` and `submission-unknown` outcomes as appropriate. Persist `dispatching` before the network call; `submitted` requires a known receipt. A resumed `dispatching` record without a receipt becomes `submission-unknown` even if a crash might have occurred before transmission. Reconcile before any replacement; never assume it is an unstarted job. Recovering a result may move to retrieval/success; failure of a listening-page export does not change a succeeded provider job into a failed generation. Cancellation and settlement are independent: a cancelled operation may still have a charge. Keep a finite record per requested operation rather than storing every polling response.

Candidate review has independent aesthetic (`unreviewed`, `preferred`, `accepted`, `rejected`), technical (`unchecked`, `issues`, `passed`) and intended-use findings. Selection, preservation/publication and game binding are separate references/facts. An agent's recommendation is not Mike's acceptance; delegated selection names the delegate. Metadata analysis/approval and byte processing create explicit revisions using the existing asset identity mechanism. No legacy reader is required.

### Worked continuation

1. A new three-candidate request returns A, B and C with exact output references. The listening record names the current displayed revisions and all outstanding jobs.
2. “Three variations of A and B” freezes those two revisions, creates six child requests under one admitted batch and retains the parent mapping. If one fails, present five successes and that failure; do not silently rerun or pretend the requested batch completed.
3. “More bass in A2” first chooses an ordinary local edit when appropriate. The child retains A2's original and the actual processing recipe. A generative replacement requires its own admitted operation and listening comparison.
4. “Finish A2” resolves the currently displayed revision, diagnoses actual defects and exports a derived candidate. Its accepted composition is protected; an unavoidable recomposition returns for listening rather than inheriting acceptance automatically.
5. “Also melancholy” adds an approved vocabulary ID to the chosen metadata revision while preserving other manual choices. It does not generate bytes or edit a runtime trigger.
6. “Publish it” selects the exact finished metadata/files for the named audience through asset publication. “Use it during known conflict” separately proposes an approved pool binding, supported producer and fallback. If that continuation was already authorized, proceed under the ordinary implementation workflow without asking again.

## 5. Metadata and catalogue contract

Add typed `metadata.audio` to recording manifests. Family membership is derived from their stable family IDs; no separately writable family database or byte-less recording is required. Validate once at asset intake/catalogue admission because playback needs trustworthy duration, representation and loop facts. Existing generic manifests remain generic; runtime consumers request the audio shape explicitly, rather than reading arbitrary `Record<string, unknown>` values throughout the client.

### Per-recording metadata

| Field                                        | Meaning and validation                                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`                                       | Closed mechanism kinds: music, song, accent, effect, source-loop, ambience; vocabulary within them is authored                                                             |
| `compositionId`, `arrangementId`, `familyId` | Optional stable authored IDs scoped to their collection/world; do not require all three for a fire loop or unrelated draft                                                 |
| `parentRevisions`                            | Exact source/derivation references; aligns with manifest dependencies, with relationship kind such as edit, alternate, extraction or encoding                              |
| `representations`                            | Named master/playback/preview/source members referring to existing manifest file keys; format, sample rate, channels, duration and decoded-byte estimate from actual files |
| `playback`                                   | One-shot/loop/full-cue behavior; source-frame loop start/end and sample rate when used; optional reviewed entry/exit markers, gain trim and intended mono/stereo use       |
| `measured`                                   | True peak/clipping, duration, channel count, measured loudness when meaningful; technique/tool version and warnings. No universal LUFS target for all media                |
| `descriptors`                                | Facet/tag IDs plus provenance `suggested`/`approved`; optional tempo/key and their evidence/uncertainty; free description kept separate                                    |
| `uses`                                       | Explicit approved uses and exclusions, context-pool IDs and review reasons; never inferred execution authority                                                             |
| `source`                                     | Safe provider/model/operation or recording/library origin, generation/acquisition date, exact recipe and source references; private detail stays in restricted records     |
| `performanceNotes`                           | Optional named instrument/skill roles and vocal characteristics for a future authored performance arrangement; descriptive, not executable requirements                    |

Durations are finite positive seconds derived from the decoded file. Loop ranges satisfy `0 <= startFrame < endFrame <= frameCount` in the named representation; conversion to another sample rate recomputes/validates the markers. Do not assume compressed encoder padding preserves a loop. Store measured facts for each representation rather than copying the master's frame numbers into MP3 metadata. Gain values use dB for presentation, not modeled sound-pressure levels.

Source masters are the best actually available files, not re-encoded MP3 labeled as lossless. Prefer 48 kHz/24-bit WAV interchange when it preserves a genuine source or is needed for editing; retain original lower/different-rate output too and disclose it. For long music, choose an actually supported browser streaming representation after qualification. Short precisely looping effects should use a representation whose decoded loop can be verified; WAV is a practical initial choice. Codec choice, resampling and loudness presets live in one export profile selected by use, not hard-coded independently in each provider adapter.

### Vocabulary and corrections

The selected world/collection owns a compact vocabulary: stable tag ID, facet, display name, definition, aliases and optional broader tag. Initial base-world terms live in [audio direction](../worlds/base/audio-direction.md); the engine does not enumerate folk music, melancholy, plate armor or character traits. Genre extensions need an authored vocabulary entry, not engine changes. Asset helpers accept the selected vocabulary as data; `packages/assets` does not import bundled-world definitions.

Resolve aliases on edit/search; do not silently merge distinct meanings. A proposed new tag is shown beside related existing terms with the intended distinction. A simple vocabulary edit is sufficient; do not create an ontology service. Numeric energy/tension/prominence can use an ordinal 0–4 authoring scale with named endpoints and unknown values. These are editorial descriptors, not measured emotional truth or a requirement that generated scores sum to one.

Suggestions retain the analysis source and target revision. Mike's approved tags are not overwritten by later reanalysis. Tag-only corrections reuse existing bytes and create an updated metadata revision through the same asset identity. Existing runtime releases stay pinned until deliberately updated. Rejected suggestions need only their decision in the study record, not a permanent negative label on the song.

### Producing suggestions from audio

Use local file inspection for format, duration, channels, peaks and any supported loudness measurement. Semantic tags need actual audio input: use the operating agent's verified listening capability or one qualified offline audio-input model from [audio tools](../production-workflows/audio-tools.md). Reuse existing typed provider execution/accounting where it supports that modality; otherwise add one narrow offline adapter. Do not send a waveform image, transcript or generation prompt and report the result as listening to music.

For an `analyze` operation, supply the exact permitted recording, selected relevant vocabulary definitions and a compact response shape: description, suggested facet/tag IDs, optional proposed new terms, uncertain properties, and timestamped reasons when relevant. Energy/tension/prominence may be unknown. Measured file facts stay separate and cannot be overwritten by the model. Only supported submitted vocabulary IDs enter suggestions; unknown returned terms become visible proposals rather than silently approved tags. A malformed response is an analysis failure with no paid automatic repair. Prior approved tags remain intact.

Analyze a whole ordinary cue when supported and affordable. If only excerpts are inspected, record their exact ranges and label the result partial; do not claim to have checked a missing ending or the entire mood progression. A longer recording can use an explicitly admitted segmented analysis, with coverage and disagreement retained. Do not upload unrelated catalogue media or unpermitted reference songs. Cache the retained analysis by recording revision and actual model/recipe; tag corrections do not rerun it. This produces metadata suggestions, not another audio candidate or aesthetic acceptance.

If audio analysis is unavailable, preserve measured facts and manual review with semantic tags unknown/provisional. Report auto-tagging as unqualified rather than fabricating it from the brief. AUD06 acceptance requires actual inspected recordings, useful suggestions, a deliberate manual correction and proof that reanalysis preserves that correction. Qualification can reuse the same few production recordings; no independent large paid evaluation campaign is required.

### Search and large collections

Derive an audio catalogue from a selected exact release's manifests. It is a rebuildable search projection, not writable authority. The offline helper builds it once per release selection, indexed by role/facet/tag/family and stable asset identity; deterministic lexical search and exact facet filters are sufficient initially. No embedding database or whole-library model prompt is required.

Page results at 50 records, with explicit continuation and total-match count when available. Suggestions request a bounded relevant set (default 12 comparable entries) and label the sample; they do not claim a global musical ranking. Release compilation visits manifests once; subsequent filtered requests intersect existing metadata postings and hydrate only the returned records. If a library outgrows local index memory, partition the derived index by collection/role before introducing a new datastore. No limit on retained official assets is imposed; indexing cost grows with metadata at authoring/release time, not every simulation tick.

## 6. Listening surface and review storage

Generate a trusted static study page using the existing study hosting/delivery route. Start with native accessible audio controls, stable candidate labels, ordered comparisons, seek/time labels and plain review summaries. Reuse the existing study page's shared styles/components where applicable; do not build another product UI framework. The page reads an exact review manifest. Browser playback state is transient and changing playback cannot alter accepted catalogue data.

Provide level-matched audition gain as a reversible playback option and a clear original-level option. No autoplay on opening. Stop the previous audition when another starts. A/B comparison can return to the same timestamp when meaningful; do not pretend unrelated arrangements align beat-for-beat. Timestamped feedback is stored by the operator/agent against the source revision, not anonymously written into S3 from a static page. Chat feedback remains the primary editing interface; a full web editor is unnecessary.

Show enough to choose: title/alias, duration, parent/operation, brief distinction, actual tags with suggestion status, technical issues and selection. Group rejected drafts separately. Keep source/rights/cost details inspectable without forcing them into every player or artist listening control. Long names, narrow screens, keyboard focus, audio errors and unavailable private assets need honest readable states.

## 7. Finishing and qualification

Use the existing [audio finishing recipe](../production-workflows/art-flows/production.md#audio); new helpers automate its file measurements/exports rather than create competing criteria. Prefer a standard audio editor or a narrow FFmpeg/analysis recipe with retained settings. Inspect the actual final file after encoding.

For one-shots, preserve the actual attack and natural tail; remove unintended leading silence and unintended extra impacts. Variants should have compatible perceived loudness and material identity without flattening useful dynamics. For loops, listen across several wraps at normal gain and verify no click, gap or conspicuous repeating event. A long fire ambience containing distant speech is not a clean fire source.

For music, check the full progression, ending/entry, unwanted vocals, artifacts, distracting density and repeated exposure. A technical pass cannot establish appeal. A provider's own description cannot establish motif retention. If a section edit changes the theme, preserve it as a new candidate and report the drift. Keep composition stems distinct from machine-separated stems, and record missing/bleeding parts honestly. Neither is mandatory for initial fixed playback.

Measure cash/credits and generation, review and repair effort per accepted recording or minute, including rejected attempts. Separate subscription purchases, incremental usage, estimated allocation and human time. No target acceptance rate or cost is claimed before the trial. Trial failure can select another route, reduce scope, use recording/licensing or require a specialist; it does not justify an automatic spending extension.

## 8. Publication and rights

One published asset revision contains only files needed by its audience. Private originals and source projects remain in the art library; approved previews use the study collection; runtime encodings use runtime storage. Manifest dependencies connect the exact permitted source/export relationship. Publication delegates checksums, integrity, rights decisions, current grants and immutable object writes to the existing asset owner.

Record supplier/creator, original source, applicable product/model/plan/licensee, creation/acquisition and authorized download evidence, permitted uses, attribution, restrictions and the practical response/contact for mistaken claims against permitted gameplay videos. This is an exact practical record, not a legal document generated from marketing claims. Source access, provider input, game embedding, gameplay-video rights and raw redistribution are separate uses. An invoice or paid-tier label does not settle every use.

The first package requires the official-game uses in the feature spec. Optional OST/creator/self-host rights are recorded as allowed/unknown/restricted with evidence; unavailable optional rights do not block a game-only asset. If the selected browser delivery conflicts with supplier conditions, do not publish and substitute a cleared source or resolve that specific issue. Public hosting is not inferred from the earlier art-migration permission.

Publication retries use the existing operation identity and exact request. A completed upload with a failed local response is reconciled; it is not regenerated or copied under a new identity automatically. Changing the selected runtime release remains explicit. Current permissions can invalidate use even though the bytes and historical approval still exist.

## 9. Integration contract and initial selection

Integration is a later authorized implementation stage, fully separated from offline production. The client audio controller consumes only server-permitted presentation data. It does not write domain state, grant hearing, award skills or produce NPC reactions. The domain owns real actions/sounds; the server owns disclosure; the client owns audible rendering. A different world may use a different palette, vocabulary, cue map or no score at all.

### Bindings and projected inputs

A world audio profile contains exact asset/family selections, role/intent pools, supported event-to-intent mappings, priority/transition policy and ambience/source-loop bindings. Bindings use existing typed event/definition IDs and admitted predicates over known material/action/outcome fields. No regular expression over narration, arbitrary JavaScript, or raw hidden trait comparison is allowed. The implementation first inventories actual event producers and marks unavailable semantic facts as a dependency; it cannot invent a fire emitter or a successful plate impact from an animation label.

Extend the protocol with a compact audio presentation shape derived by the existing scoped projection:

- One-shots: occurrence identity, approved cue/family, current timeline/sequence, and only permitted location/bearing/identity. Distinguish replaying history from receiving a new occurrence.
- Active source loops: permitted source handle, selected family, current active/inactive state and allowed spatial information, delivered in the existing view lifecycle.
- Music context: current world audio-profile/release reference and a small set of already-permitted semantic context IDs plus priority. The server maps actual known facts, not private source records. Client bundles include only approved presentation fields; private acquisition prompts, explanatory hidden-trait predicates and confidential editorial notes remain server/authoring data.

Use the ordinary authenticated stream/views; no separate event bus, soundtrack subscription or audio-specific server polling. Source projection must be revalidated under current access after asynchronous work. Unknown source identity or approximate bearing cannot become an exact position in an audio URL, label or spatial node. Generic unknown-source effects may be used when the perceived event permits that sound but not its detailed material/source.

The initial context map accepts explicit native conflict start/current activity/end where available, observed danger under the owning evidence contract, an approved location/activity context, and the world fallback. Give unsupported mappings an implementation prerequisite rather than deriving them from unrelated event prose. Existing acoustic-source work remains with [ACS](../maintainers/acoustic-stealth.md); audio playback must not duplicate its physical emitters.

### Selector algorithm

At world/profile/release load, compile approved music memberships into pools by intent and allowed energy range. Hard eligibility includes current release/permission, supported playback representation, instrumental/vocal policy and explicit use exclusions. Descriptive tags alone never make a track eligible. Optional preferences are authored weights; they need not sum to one. An empty eligible pool returns silence or the profile's explicit approved fallback.

Compile cumulative weights once per pool. A weighted draw uses binary search; recent-play rejection tries at most eight draws, then chooses the least recent eligible result among the inspected candidates. Track the last three recordings and their family IDs; relax family avoidance before exact-recording avoidance in a small pool. One available track may repeat after its prescribed gap. This is varied selection, not a claim of optimal emotional ranking. Rebuild only for changed profile/release/membership/permission, not every movement frame.

Reconsider on a meaningful context change, cue end or owned transition deadline. Ordinary repeated attacks refresh the existing conflict context rather than restart the track. Highest eligible context priority wins; ties preserve the current compatible intent, then use authored order. A direct assignment is an explicit supported rule with its context lifetime, override priority and ending/fallback, not a second playback controller. A persistent ordinary location theme belongs in its ordinary pool; it does not automatically override urgent conflict. If the pending context changes during loading, keep only the latest eligible target and cancel/fence the superseded load. If two tracks are already fading, finish or shorten that transition before starting another; never create a third music stream. Ambience, effects and music have separate volume buses.

The world owns minimum hold, recovery grace, silence gaps, transition durations and whether an urgent change can interrupt a cue. Initial values and their reasons are in [audio direction](../worlds/base/audio-direction.md). The generic controller accepts those values without embedding battle, forest or mood semantics. For a transition, retain the current suitable cue while the next loads; use an approved exit marker if it is within the allowed transition delay, otherwise fade. Never overlap more than the outgoing and incoming music track. Failed next-track load leaves a suitable current cue or fades to silence, with no generation request.

Rich emotional-disclosure/fight-motive interpretation is an explicit later capability. It would need an evidence-scoped semantic intent producer and qualification for useful interpretation; this design does not add paid per-event classification or expose hidden character context. A future producer supplies the same finite intent IDs through the same projection and selector, not arbitrary executable music instructions.

### Effects, loops and lifetimes

Resolve a supported effect family from the exact permitted event, including known material/outcome. Select a variant without immediate repeat when the family has alternatives. Respect actual occurrence order and deduplicate against the bounded current event-stream cursor; do not replay an old events page or a reconnect backlog as a burst of sound. If decoding or scheduling delays a fresh live effect for more than 500 ms after its first local arrival, omit that presentation; its game/history outcome remains intact. Measure this local queue delay with a monotonic browser clock, not accelerated simulation time or subtraction of unsynchronized server/client clocks. This bound does not claim to detect all network delay. Existing view/stream freshness and replay semantics determine which arrivals are live; a missing reliable distinction is an integration prerequisite, not permission to play history.

Loop keys use the source's current world/timeline/handle, never its display name. Start once on becoming audible, update gain/spatial presentation from allowed data, and stop when inactive, removed, inaudible, replaced or control/world access changes. On reconnect, rebuild loops from the current view, not missed start/stop messages. Maintain no client-created physical sound facts.

Listener sound-pressure evidence and digital playback gain are different units. Use a world-authored presentation mapping and comfortable bus levels; do not turn modeled dB SPL directly into browser amplitude. Precise panning needs precise permitted location; coarse bearing receives coarse presentation, and unknown bearing stays nonpositional.

Interface feedback may use the same effects bus for a supported local UI state such as accepted input, a refused request or a confirmed result. Its owning UI component supplies the actual state and mapped cue; a click cannot announce successful world execution before the result exists. These are nonphysical presentation sounds and grant no character hearing. Use the current UI feedback contract and authored cue selection, without manufacturing domain events or a second controller.

### Browser resources and settings

Use browser-native Web Audio for short effects/loops and streaming media elements for long music, behind one controller. This avoids committing the score to PlayCanvas or a new middleware stack. Qualify actual browser/codec behavior; the library's existence is not a compatibility proof. Reuse shared network/asset loading rules and cancel or fence stale loads on world/control replacement.

Resolve playback through the existing authorized asset-delivery URL owner. `apps/server/src/asset-delivery.ts` already accepts audio MIME types and byte-range requests; qualify seeking and streaming through that path instead of exposing a private S3 source or creating another media server. A media element can feed the controller's gain bus when the delivered origin/CORS policy permits it. Verify activation, seek, end and decode/load failure using the actual chosen encodings. Restricted review sources and public runtime exports retain their distinct audience; signed transport URLs, when used, are transient and never permanent catalogue identity.

Create/resume audio only after a user gesture. Settings provide master, music, effects and ambience levels/mute; voice stays with its own future owner. Store these presentation preferences through the existing client-settings owner. No essential game meaning depends on sound. Tab suspension, mute, stop, route teardown and access loss release owned nodes/timers; an async decode cannot restart a removed source. On return, resume a still-valid current selection or choose from current context rather than replaying history.

Keep at most two music streams during a transition. Load current/next music only. Bound decoded short-audio cache by estimated float-buffer bytes (initial 64 MiB), two concurrent decodes and 32 active effect/loop voices; configurable device settings may lower them. Evict inactive least-recent buffers, never live ones. At voice pressure drop the least-important presentation instance using authored priority, not the domain event; preserve critical information in existing text/visual feedback. Count live buffers against the same cache budget; defer/refuse a new decode if inactive eviction cannot fit it. Verify format/frame-size estimates before expensive decoding where available, and refuse an oversized short-audio export or use a qualified streaming role. Omitted loops may be reconsidered when a voice ends or the current source view changes, using the maintained active-source set rather than a per-frame whole-world scan. Exact figures and late-event policy are starting engineering envelopes in [limits](../limits/audio-production.md), requiring measurement, not capacity claims.

Playback history is session presentation state, not a gameplay save dependency. Reopening may choose a new suitable track; no migration or checkpointed millisecond playhead is needed. Future learned songs/jukebox access are gameplay state under their own design, not these transient selections.

## 10. Implementation order and review gates

1. Read the feature spec, procedure, shared process, current AUD scope and actual existing asset/tool interfaces. Confirm implementation authorization and base selection under repository rules.
2. Qualify one provider path using a retained small study. Demonstrate revision of a liked source and useful export before writing adapters around unproven assumptions. Keep vendor selection revisable; no comparison quota after one route meets the needs.
3. Implement metadata validators and the local run owner, then generation/receipt recovery and ordinary local inspect/finish helpers. Reuse network lifetime and asset owners. A manually recorded real provider job can establish the record contract before full automation.
4. Implement listening-page output, tag suggestions/corrections and derived catalogue retrieval. Exercise an exact A/B batch and resume it from its preserved snapshot.
5. Publish one complete selected package through existing storage; retrieve it into another fresh workspace and compare exact references. Complete rights and full-recording review before scaling production.
6. Only for authorized integration, inventory actual sound/context producers, add world-owned bindings, permitted projection and one browser audio controller. Deliver a real sound family and one musical context transition before broad coverage.
7. Run the selected checks and listening sessions below, fix in-scope failures, reconcile tracker/limits/current behavior and commit. Optional catalogue breadth, richer semantics and musician gameplay are not prerequisites to this slice.

## 11. Verification and evidence

| Question                                       | Smallest sufficient evidence and failure outcome                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Is the design/guide usable and nonduplicative? | Diff/link/format/guidance review and a dry walkthrough of the request examples; missing steps fixed in this design. Installed-agent dispatch remains separately measured.                                                                                                                        |
| Can the provider revise a favorite?            | Live requested revision and full audition; record identity drift and select a different operation/route if necessary. A generated fixture does not prove it.                                                                                                                                     |
| Can work resume without duplicate spend?       | One recorded submitted job with an intentionally interrupted local wait, then recover the same job/output; no second submission. Where safe interruption is unavailable, inspect an actual unresolved receipt and report narrower evidence.                                                      |
| Do tags and identity remain useful?            | Compare actual approved library entries, apply Mike's correction, reanalyze and confirm it remains approved; retrieve families and aliases with exact source lineage.                                                                                                                            |
| Are exports and publication usable?            | Decode/inspect final files, loop/listen, publish/retrieve exact package, verify bytes and intended access through the existing asset tools.                                                                                                                                                      |
| Does playback follow play truthfully?          | A real hit/miss/material sequence, a source loop stop, two listening perspectives, one context transition, reconnect and audio off; no private facts or duplicate effects.                                                                                                                       |
| Is near-term growth reasonable?                | Measure one index build/search using 1,000 metadata entries and a runtime scene using 32 active sounds, two music streams and bounded cache. Record actual workload/latency/memory; these are measurements, not a promise to support every device or a new requirement to generate 1,000 sounds. |
| Does the result appeal and remain welcome?     | Mike listens to complete cues and a repeated representative scene; retain distinct appeal, fit and fatigue findings. No statistical enjoyment/retention claim.                                                                                                                                   |

Use current [verification policy](../../.agents/rules/verification.md). Automated test suites and new test authoring remain paused unless explicitly requested. Static/manual checks use the actual changed consumer and appropriate execution location; the design-only task does not run the game or pay for a provider trial. No quality result, scale pass or new access permission follows from document completion.

## 12. Extension seams and deliberate omissions

Provider adapters can be replaced behind the small operation/output contract. New audio roles require actual consumers, not a generic plugin language. More genres/tags/families are authored data. More useful event bindings extend the existing world/profile producer and permitted projection. A catalogue UI can reuse the same derived metadata later; it is not required to start production.

Stems, synchronized multiplayer performances, live song generation, semantic conversation scoring, melody embeddings, self-hosted weights and creator export packs each require a concrete selected use and evidence. Do not prebuild their infrastructure. Standard masters, exact identities and source relationships preserve useful options without requiring archival compatibility code or speculative schema versions.

## Maintained records

- Behavior: [Feature specification](audio-production-feature-spec.md).
- Execution and provider qualification: [Procedure](../production-workflows/audio-production.md), [tools](../production-workflows/audio-tools.md).
- Implementation: [AUD tracker](../maintainers/audio-production.md).
- Limits: [Audio inventory](../limits/audio-production.md); shared [asset inventory](../limits/game-asset-storage.md) and [verification/spending](../../.agents/rules/verification.md).
- World content: [Audio direction](../worlds/base/audio-direction.md); physical sound remains [its own owner](../worlds/base/physical-sound.md).
