# Audio production: from an idea to a playable library

| Status      | Current progress                                                                                                            | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The workflow and initial integration are designed; tooling, provider qualification, assets and playback remain undelivered. | 2026-11-06   |

## 1. Purpose and selected scope

Mike can describe music or a sound, supply references, compare candidates, ask for precise or broad revisions, select favorites, finish them, organize them and publish them through the existing asset system. An optional continuation installs selected recordings into the game with understandable bindings. Natural language is the primary control surface; the agent handles tool choices, records, files and technical preparation.

The payoff is a world worth inhabiting: satisfying material contact, varied encounters, welcoming ordinary places, musical recognition, tension and relief, and room for conversation and environmental sound. A large collection should contain coherent families and memorable ideas, not merely many files. Musical attraction, suitability in a scene and comfort over repeated exposure are separate acceptance questions.

This project designs offline production and the first fixed-recording integration. It does not implement these capabilities. The [technical design](audio-production-tech-design.md) specifies the future modules and data flow; the [operator procedure](../production-workflows/audio-production.md) is the step-by-step execution guide, including work that can already be done with existing tools. The [shared production process](../production-workflows/production-process.md) owns cross-media mechanics.

```mermaid
flowchart LR
    A[Brief and references] --> B[Finite draft batch]
    B --> C[Listen and choose]
    C -->|Requested revisions or more variations| B
    C --> D[Finish selected recordings]
    D --> E[Review tags and intended uses]
    E --> F[Publish exact asset selection]
    F -->|When requested| G[Bind and qualify in play]
```

Feedback can resume from any selected recording; publication does not end its creative history. New revisions preserve their parents and become selected only through the existing review/release process.

### Agreed decisions

- Explore substantially broad genres. The earlier folk/chamber/electroacoustic palette is an optional reference direction, not a required style. Sci-fi and EDM are unlikely fits for the bundled world, not forbidden engine categories. Select by listening and the intended use; no stricter genre decision is needed before production.
- Automate as far as practical, with quality as the ultimate goal. A provider interface, ordinary editing, recording, licensed source or specialist may be preferable for a particular result. The agent explains a consequential change of route; no requirement to use AI for every ingredient.
- Produce fixed recordings offline. Initial adaptive music selects and transitions between complete cues; synchronized stems, live composition and per-event generation are not prerequisites.
- Support the rights and asset needs of official game playback and an internal jukebox initially; this workflow does not itself build a player jukebox interface or song-unlock mechanic. Downloadable soundtracks, creator asset packs and independent hosts are optional only when already permitted without material work or expense. No subscription or permission expansion is assumed.
- A future musician activity can play one fixed recording. The authored arrangement says which instrument/skill roles must be filled; three required roles may require three performers. The recording does not have to change when a part is absent. The mechanic's admission, interruption and progression remain separate design work.
- Spoken dialogue/TTS stays with voice and hearing owners. A deliberately sung song belongs to music production and needs its own vocal/lyric brief; this does not select live generated singing.
- No fixed cap on useful library size or on feedback rounds. Each batch still has a known scope and the existing task spending ceiling; repeated prompts do not create fresh allowances. Preserve requested iterations under the existing asset policy.

### Current baseline and evidence limits

The November 4 [sourcing investigation](../research/audio/README.md) and [player-reception study](../research/player-music-appreciation/README.md) are available. They contain provider claims, licensing evidence, production cases and qualitative player accounts. They do not establish an OpenLegend listening winner, tag accuracy, revision fidelity, accepted-cue cost or measured runtime capacity.

The asset manifest, shared authority, S3 publication and selected-release mechanisms already exist. Audio media types are accepted by the delivery layer. That is not evidence of installed audio production commands, an audio catalogue browser or game music playback. The existing [audio/feedback procedure](../production-workflows/audio-and-feedback.md) and [finishing recipe](../production-workflows/art-flows/production.md#audio) supply useful requirements, not completed audio integration.

## 2. Supported requests and results

| Request                                                                     | Expected result                                                                                                                                            |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Three pieces for exploring an ancient forest; intimate but curious.”       | Three labeled music candidates, exact inputs and playable previews; proposed tags and a recommendation with reasons.                                       |
| “Use A's rhythmic feel, B's instruments and the restraint after 1:20 in C.” | A brief giving each reference a distinct job; links/timestamps retained, audio uploaded only when permitted and supported.                                 |
| “Make A happier, but keep the opening melody.”                              | A child of the exact A revision with the melody protected in the brief; report any audible drift instead of claiming preservation from the prompt.         |
| “Redo them all with more bass.”                                             | Resolve the current candidate group once, retain its exact members, make the requested edit to each and report partial failures individually.              |
| “I like A and B. Give me three variations of each.”                         | Six new candidates, with three children of A and three of B. Neither parent is overwritten or silently replaced.                                           |
| “The second impact sounds hollow; fix only that one.”                       | One new take of that exact effect; the rest of the family stays selected.                                                                                  |
| “A is right. Make it higher quality.”                                       | Finish the selected recording where possible; separate cleanup/mix repair from any new performance or recomposition that needs another listening decision. |
| “Also put this in melancholy.”                                              | Show and apply the catalogue change to that recording's approved tags; no audio generation and no automatic new gameplay trigger.                          |
| “Publish these, but don't use them yet.”                                    | Preserve permitted masters and publish accepted library records; game selections remain unchanged.                                                         |
| “Use this for fire, and those five for sword hitting plate.”                | Reviewable world-owned bindings to supported actual events, then implementation and qualification only when that continuation is authorized.               |
| “Play this intelligently.”                                                  | Include the recording in explicitly approved context pools, using the first selector described below; explain uncovered contexts.                          |

The final three rows are distinct actions. Selecting a favorite does not itself install it, and preservation is not approval for public distribution. Once Mike explicitly authorizes the relevant action, do not ask for the same permission again.

### Asset roles

Support instrumental music cues, complete songs including intentional vocals, short musical accents, one-shot effects, continuous source loops and environmental ambience. A variation family groups interchangeable recordings of the same acoustic event. A musical family groups related themes or arrangements; it does not imply that they can be layered synchronously.

The agent infers the role, duration, perspective and stopping point from the request and existing context. Missing routine details use the [procedure defaults](../production-workflows/audio-production.md#2-resolve-the-brief-and-batch). Ask only when a consequential choice cannot be resolved. “For the game” describes intended use; “put it in the game” requests integration.

## 3. Reference and creative control

Accept multiple reference links, files, prior candidates and descriptive notes. Each has a role: instrumentation, rhythm, texture, emotional progression, structure, a particular passage, an owned motif to preserve, or an example to avoid. Conflicting reference instructions are resolved before dependent generation. A commercial recording supplied for inspiration is not an owned source to reproduce.

Spotify and YouTube links are useful reference records; automatic download, audio extraction or model conditioning is not promised. Record what was actually inspected. If the agent cannot hear the reference through an authorized route, it says so and uses Mike's notes or asks for the missing musical property. A manually supplied file still needs appropriate provider-input rights. The [provider notes](../production-workflows/audio-tools.md) distinguish listening references from conditioning inputs.

For an owned edit source, state what must remain recognizable and what may change. “Happier” can mean rhythm, harmony, instrumentation or performance; infer the least disruptive interpretation from feedback and state it before work. When several substantially different interpretations remain, present the choice. “More bass” is not an instruction to regenerate the whole song when a mix operation suffices.

An exploratory candidate is not deliberately degraded. A provider's faster/cheaper generation mode may be used when it produces useful decisions, but the workflow must not imply that a later quality switch will reproduce the same composition. Keep the favored draft as a usable source even if polishing an alternate fails.

## 4. Iteration, listening and finishing

Give every candidate a stable human-readable alias within its study and an exact revision behind it. Resolve “A” against the current displayed revision; a resumed study shows the mapping before paid work. Child revisions retain their parent and operation. Rejected candidates remain identifiable and cannot become an input merely because they are convenient. “Throw this away” normally means reject from selection; explicit deletion follows the existing asset rules.

The listening surface offers a stable ordered list with play/pause, seek, duration, title/alias, parent, current status, short description and review notes updated from feedback. Full recordings remain accessible. Comparable preview gain reduces loudness bias without overwriting masters. One foreground audition plays at a time unless the task explicitly compares a transition or scene mix. Keyboard use and text summaries support review; descriptions are not substitutes for hearing.

Feedback can target an entire batch, named assets, one passage or one production property. The agent records the resolved targets, operation and protected features. It executes a finite batch, returns the results and awaits further creative direction rather than generating indefinitely. A failure in one member does not erase successful siblings or automatically spend on replacements.

Finishing produces the useful artifacts for the selected purpose: clean masters, browser playback exports, trustworthy loop/entry/exit information, balanced variants, and any actually needed editable sources. It checks clicks, clipping, cut tails, unwanted speech/layers, repetitions and the intended sound. A louder or higher-sample-rate export is not automatically better. Do not invent missing original stems, MIDI, notation or perfect reproducibility.

Mike's acceptance owns aesthetic preference unless delegated. The agent owns technical inspection and states its limits. If it cannot listen, technical statistics do not justify a listening pass. In-play acceptance additionally examines fit, masking, repetition, transitions and audio-off understanding. Retain a loved piece for a different role when its background use fails.

## 5. Tags, library and musical identity

Auto-tag the actual output, not merely the generation prompt. Distinguish measured facts, machine suggestions and Mike's approved interpretation. Missing or ambiguous instruments, tempo/key and mood remain unknown or tentative. Avoid false confidence percentages and compulsory key/tempo labels for rubato or nonmusical effects.

The library shows existing tag definitions, aliases, similar approved entries, family membership and useful coverage gaps. Use several independent facets: mood, energy, tension, prominence, genre, instrumentation, vocals, intended use and acoustic source/material where relevant. A song can be warm and melancholy together. Genres and moods are authored collection/world vocabulary, not universal engine enums. Correcting metadata creates a new catalogue selection without regenerating audio or changing its identity.

Keep descriptive character separate from approved playback suitability. “Melancholy” does not mean “always play during grief.” Store unsuitable uses and reasons where consequential, such as “too prominent under conversation.” Manual corrections win over subsequent auto-tag suggestions. Reanalysis must show a proposed difference and retain the approved tags unless the user accepts a change.

Distinguish a composition/song from an arrangement and a recorded asset. Preserve recognizable relationships such as one theme in calm, tense and performance arrangements. A nearby genre or similar tempo alone does not establish that two generated melodies are the same composition. Only explicitly identified relationships are recorded.

Search and tag comparison use catalogue metadata; they do not decode all audio or load the entire catalogue into a model prompt. Browse rejected drafts separately from accepted library entries. A large library is allowed, with paged inspection and finite work per operation rather than a fixed lifetime quota.

## 6. Publication and optional game integration

Reuse [asset storage](../asset-workflow.md) for private sources, review studies and runtime delivery. Retain exact source/export relationships, provider/model, submitted prompts, meaningful settings, human changes and entitlement evidence. Keep credentials and private job details out of public manifests. Archive meaningful outputs during production; never leave an expiring provider URL as the only copy of a selected result.

The initial rights target is commercial official browser gameplay, necessary editing and delivery, authorized collaborators, and ordinary monetized gameplay videos/streams. Internal jukebox access means playing approved assets through the game, not distributing a sample pack. Wider rights are recorded when available, not presumed or purchased as a prerequisite. Browser-accessible delivery must match the actual supplier agreement; obfuscation is not a rights solution. The exact acquisition decides eligibility.

Installing a recording is a small reviewable change to world-owned data, backed by a selected exact asset release. Show the proposed use, which existing binding it changes, affected family and fallback. A natural-language request compiles to supported typed bindings; it is not executable prose, generated code or a prompt sent on every action.

### Effects and ambience

Bind effects to actual permitted events with the relevant known material/action facts. Select among coherent variants without immediate repetition when alternatives exist. A swing, contact, damage and death are different facts; missing a target cannot play a successful strike merely because an animation reached its contact pose.

Continuous source audio follows the actual source lifecycle: begin, update, stop, replacement and loss of permitted perception. A fire loop does not grant a character hearing evidence. Environmental beds must not introduce intelligible speech, identifiable threats or meaningful work sounds unsupported by the scene. Spatial precision must never exceed the listener's permitted evidence.

### Initial automatic music

Use authored context pools selected from permitted scene evidence, with history-aware variety, clean transitions and silence when suitable. Start with broad supported situations, such as ordinary exploration, known danger, active conflict and recovery, whose exact meanings/tuning belong to the selected world. Permit an authored direct assignment for a particular known place/person or deliberate moment, using the same selector and lifecycle.

Music should not restart for every blow or jump between tracks on every context change. Finish a suitable phrase or use the approved transition where possible, interrupt more promptly for a materially changed situation, and preserve room for conversation. Selection is per listening client; it must not scan every NPC or ask a paid model to interpret each event.

The initial mechanism does not infer a fight's hidden motive, diagnose personality from prose, or read private backstories. A requested “psychopath attacks” rule can only be installed if a supported permitted fact can express it; otherwise explain the missing capability and offer a rule based on observed conduct. An emotional disclosure may eventually supply an approved semantic music hint, but arbitrary conversation interpretation is a separate extension, not a keyword detector or a reason to expose hidden state. The [technical design](audio-production-tech-design.md#9-integration-contract-and-initial-selection) defines the first supported mapping and its extension boundary.

## 7. Future musician and jukebox compatibility

Preserve the full opportunity in the [Arts repertoire](../repertoires/arts-leisure.md): learn songs, perform solo or with others, share access to a jukebox entry, teach NPC musicians, attract willing listeners, dance/sing/clap/tip, book gigs, travel with troupes and develop different instrument roles. Preferences and attendance should belong to actual people, not guaranteed rewards triggered by a playback file.

The production contribution is a stable song identity, an arrangement's instrument/skill-role description, and its fixed recording. These are descriptive authoring inputs until the performance mechanic admits them. Jukebox access, learning, teaching, payment and reputation are gameplay effects with their own owners; audio publication grants none of them.

Optional rhythm/minigames per instrument, item-assisted performance, mood influence, higher-level multi-instrument play and adaptive ensemble parts remain repertoire possibilities. The earlier male/female vocal requirement is an unselected world-rule question, not an audio eligibility rule; recordings can describe vocal range/timbre without imposing character gender. No progression, economy, relationship, vocal or minigame policy is implemented or fully designed by this pipeline.

Background score is not a physical sound heard by NPCs. An actual musician performance must later use the existing action/hearing semantics; muting the player's speaker does not change what a character mechanically perceives. Shared fixed playback does not require sample-accurate synchronization in the first performance idea.

## 8. Delivery sequence and acceptance

Use [AUD tasks](../maintainers/audio-production.md) for dependencies and completion evidence. Each stage ends with an inspectable result:

1. **Procedure and capability qualification:** settle current access/terms, execute a small candidate → meaningful revision → export trial, and identify a usable route. Quality preference belongs to Mike. A failed trial reports its result; it does not require endless provider comparisons.
2. **Repeatable production:** run records, focused and batch edits, recovery, finishing, listening handoff, tagging, library retrieval and preservation work end to end. No game server is required for ordinary production.
3. **Representative assets:** a small musical family and coherent effect/ambience families expose real strengths and shortcomings. Expand based on accepted results and actual coverage gaps, not a track-count quota.
4. **Optional integration:** install exact bindings, initial selection/transitions, audio controls and resource ownership; qualify a real playable sequence and muted mode. This is a distinct implementation continuation, not implied by a study.

Required production acceptance covers every request class in §2, including one exact-source revision, a six-child A/B branch, a tag correction, an unknown provider submission recovered without resubmission, retrieval on another session, and one deliberately unavailable input/permission. Reuse actual trial outputs for several checks; do not multiply paid calls solely to fill a matrix. Fixture/static evidence may establish record handling but not musical quality or provider editing fidelity.

Required integration acceptance covers actual event binding, no false impact on a miss, material variation, source-stop behavior, changing context without rapid music churn, loading/permission failure, disconnect/reconnect, browser activation/suspension, and no private-fact disclosure. Listen with ordinary effects and conversation, on headphones and modest speakers, including repeated exposure and audio off. Distinguish required correctness passes, performance measurements and human preference decisions. Automated suites remain subject to the current verification pause.

## 9. Decisions, remaining uncertainties and exclusions

No unanswered product decision blocks this design. Reversible operational defaults are selected in the procedure and [limits inventory](../limits/audio-production.md); they are starting values, not measured optima.

Implementation must establish provider access, current contract eligibility, actual revision fidelity, export utility, listening preference, auto-tag usefulness and cost per accepted asset. Those are qualification tasks with explicit failure outcomes, not undisclosed design gaps. Unknown reference input rights block only that source/operation; use an independent abstract brief when suitable.

Excluded from this first delivery: runtime generation, a self-hosted model service, generalized procedural composition, synchronized stems, a DAW replacement, a new asset database, universal genre/trait rules, mass automatic soundtrack generation, standalone music distribution, and the musician career's gameplay implementation. Rich conversation/motive-aware scoring and musician progression retain separate design needs. No legacy format adapters, save migration or old-code support are proposed; existing art/audio files and external rights remain protected by their owners.

## Maintained records

- Implementation and qualification: [Music and sound production](../maintainers/audio-production.md).
- Limits and constraints: [Audio production and playback](../limits/audio-production.md), with shared asset/spending limits linked there.
- Mechanism and module plan: [Technical design](audio-production-tech-design.md).
- Execution: [Audio procedure](../production-workflows/audio-production.md), [provider notes](../production-workflows/audio-tools.md), [shared process](../production-workflows/production-process.md).
- Bundled-world content: [Audio direction](../worlds/base/audio-direction.md).
- Repertoire coverage and scope: [Application review](audio-production-repertoire-review.md).
