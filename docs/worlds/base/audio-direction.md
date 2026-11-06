# Music and sound direction for the bundled world

**Selected production direction and initial playback target; audio assets and playback are not yet qualified or delivered.** The [audio feature specification](../../projects/audio-production-feature-spec.md) owns the workflow and [AUD](../../maintainers/audio-production.md) owns implementation/acceptance. These musical choices belong to this world, not the engine.

## Creative range and purpose

Explore broadly across genres, instrumentation and musical forms. The earlier intimate folk/chamber/electroacoustic proposal remains one useful candidate. It is not a style restriction or a prerequisite to audition other ideas. Sci-fi and EDM are unlikely fits for this particular world, not forbidden categories; judge an actual piece by its contribution. There is no reason to settle a stricter genre policy before listening.

Look for music worth hearing and a world worth inhabiting: wonder, warmth, humor, ordinary pleasure, danger, ambition, tenderness, cruelty, loss, relief and mixed feelings. Coherence can come from related themes, recurring textures and thoughtful selection without making every song sound alike. Expand recognizable families alongside unrelated new ideas when they fill a real need. Do not assume more novelty is always better or that sparse music is always more immersive.

Useful exploratory families from the earlier proposal remain available: home/belonging; wilderness/possibility; history/consequence. They are editorial briefs, not three exhaustive categories or a selected score. A simple melody may later reappear as an intimate arrangement, a tense version or a musician's performance. An asset does not gain that relationship merely from having similar instruments.

Ordinary background cues begin instrumental so they can coexist with conversation. Deliberate sung songs and prominent musical encounters are welcome when selected; they need their own brief and listening context. Humor can belong to a person and situation rather than a repeated joke sting. Quiet and withdrawal can be valuable, but sustained music is allowed when it remains welcome.

## Initial vocabulary

This is an extensible authored starting set, not a closed schema. The implementation places its values in the world's one audio-definition source; engine/protocol/UI/prompt consumers read them rather than restating them.

| Facet            | Initial useful examples and distinction                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mood             | Warm, hopeful, curious, playful, melancholy, lonely, tender, uneasy, ominous, determined, triumphant, relieved; several can coexist                          |
| Role/use         | Exploration, home, conversation background, known tension, conflict, aftermath, discovery, performance, musical accent; actual inclusion requires use review |
| Energy           | 0 still → 4 driving; unknown allowed; a quick rhythm is not automatically emotionally intense                                                                |
| Tension          | 0 settled → 4 highly unsettled; distinct from loudness and energy                                                                                            |
| Prominence       | 0 unobtrusive → 4 foreground; helps protect dialogue without declaring a song bad                                                                            |
| Genre/instrument | Add concrete terms used by the selected references/outputs; no mandatory folk label and no giant speculative genre tree                                      |
| Effects          | Authored source, action, known material, force/character, perspective and environment; match actual supported events                                         |

Use stable authored IDs behind editable names and aliases. For example “melancholic” can resolve to the same approved mood as “melancholy”; do not merge melancholy with grief automatically. Mood is an editorial interpretation of the recording, not a fact about a character. Tags such as “psychopath” are not automatic music-selection predicates or diagnoses.

## Initial selection policy

The mechanism and privacy boundary are in the [technical design](../../projects/audio-production-tech-design.md#9-integration-contract-and-initial-selection). The following are reversible starting values to implement and listen to, not measurements of optimal taste or current installed behavior:

- Priorities: explicit approved assignment 40, active perceived conflict 30, known danger 20, recovery 10, ordinary place/activity/exploration 0. A private threat or hidden trait supplies no eligible context.
- Ordinary compatible music holds for at least 30 seconds before a nonurgent change. A newly perceived urgent conflict can bypass the hold; repeated attacks keep the current conflict selection.
- After conflict ends, allow a 10-second recovery grace before returning to ordinary context. If actual permitted conflict recurs, cancel the recovery transition. This is presentation pacing, not a change to native combat state.
- Use a two-second crossfade when no nearer reviewed transition is suitable. An approved exit marker may delay an ordinary transition by up to eight seconds; urgent changes use at most two seconds. The outgoing cue can end naturally when appropriate.
- After an ordinary cue ends, choose a 20–60-second silence gap; conflict may use related consecutive cues without that gap. Direct assignments/performance requests can specify a deliberate different gap. No genre or mood requires perpetual playback.
- Keep recent recording/family avoidance in the shared selector. Empty approved pools fall back to an explicitly approved broader pool or silence, never an invented source or generation call.

These values live together in the selected world profile, with [AUL limits](../../limits/audio-production.md) identifying their status. Listen in context before changing defaults. They must not leak into generic browser or server constants.

## Truthful sound and meaningful moments

Use coherent variation families for actual material contacts and activities. Ordinary useful distinctions include movement over supported surfaces, blade/armor contact, mining impacts, handling objects and fire. A source request does not establish that its physical emitter already exists; [physical sound](physical-sound.md) and its implementation owner retain that work.

Separate noninformative environmental texture from meaningful calls, impacts or speech. A forest bed must not announce an absent predator or invisible worker. Background music does not produce mechanical hearing. A real musician's performance later needs its actual action/audience owner.

Score the player's permitted experience. Do not reveal an unobserved attacker, secret personality, private memory or hidden fight motive through a distinctive theme. An emotional disclosure can inspire future scoring only through an explicitly scoped interpretation of what was actually disclosed. A familiar theme may evoke the player's own association without the system claiming to know their feelings.

## Production and expansion

Automation serves quality. Begin with a small useful audition, including a recognizable idea transformed and one coherent sound family; the [procedure](../../production-workflows/audio-production.md) owns defaults and steps. Accept AI, editing, recorded/stock ingredients and specialist work according to fit, control and the actual rights.

The earlier eight-minute identity package and composer-pilot budgets are historical planning examples, not current quotas, approved purchases or requirements to commission a human comparison. Build as much useful music and effects as the accepted quality, actual coverage and task budget justify. Keep recognition, quiet, contrasting feelings and ordinary pleasure alongside action intensity.

For the future musician idea, a fixed song can have authored performance roles such as vocals, strings and drums, with actual skill/instrument requirements designed by the gameplay owner. The audio pipeline preserves song/arrangement/recording identity and notes; it neither creates learning/reputation effects nor requires synchronized parts.

## Maintained records

- Workflow: [Audio production](../../production-workflows/audio-production.md).
- Delivery and listening: [AUD](../../maintainers/audio-production.md).
- Design: [Feature](../../projects/audio-production-feature-spec.md) and [technical](../../projects/audio-production-tech-design.md).
- Limits: [Audio production/playback](../../limits/audio-production.md).
- Evidence: [Sourcing research](../../research/audio/README.md) and [player appreciation](../../research/player-music-appreciation/README.md); evidence does not select a universally preferred style.
