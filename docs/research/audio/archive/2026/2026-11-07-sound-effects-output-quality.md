# Sound-effects output quality: ElevenLabs, OpenArt and Suno

**Evidence snapshot: November 7, 2026.** This records published listening comparisons, firsthand reports and official product descriptions. No audio was generated or personally auditioned for this investigation. The [audio synthesis](../../README.md) owns the broader sourcing recommendation; the [music comparison](2026-11-07-ai-music-output-quality.md) answers a separate quality question. Rights and delivery remain with the [earlier provider record](2026-11-04-ai-audio.md).

## Findings

No strong current, independent, three-way listening comparison was identified. **ElevenLabs Sound Effects v3 is a practical first audition for standalone effects, not a demonstrated quality winner.** OpenArt depends on its selected underlying model and access route. Suno Sounds is a real effects product and a useful candidate for stylized or musical material; the evidence does not establish that it is universally worse at realistic effects.

That audition order is a research judgment about promising sources. It does not replace Open Legend's foundation of curated recordings, editing and selective original sounds, or require a comparison after a satisfactory source is found. Music rankings cannot be transferred to sound effects.

## Products and versions are different comparisons

| Product                  | What was established                                                                                                                                             | Quality interpretation                                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ElevenLabs Sound Effects | Separate from Eleven Music. The November 2 changelog says SFX v3 is available to every workspace and is the default in ElevenCreative.                           | Most direct comparative evidence still tests v2. Vendor claims for v3 do not establish a lead over other providers.                                                                    |
| OpenArt                  | Its audio hub separates text-based Create Sound Effects from video-oriented Add Sound Effect. Indexed pricing names Eleven Sound Effects v2, MMAudio and Mirelo. | OpenArt is a platform, not one SFX model. The indexed v2 listing does not prove that v3 is unavailable through every account or route.                                                 |
| Suno Sounds              | An experimental effects tool with one-shot and loop modes, including BPM/key controls and support for ambience, Foley and animal sounds.                         | It deserves an actual effects audition; treating Suno as music-only is incorrect. The help page acknowledges that ambience can turn into music and loops can become full arrangements. |

Sources: [Eleven v3 changelog][eleven-changelog], [OpenArt audio hub][openart-audio], [OpenArt indexed model table][openart-models] and [Suno Sounds help][suno-sounds]. OpenArt's indexed entries and anonymous pages were inspected, not authenticated generation.

OpenArt's inspected [MMAudio interface][openart-mmaudio] requires a video upload and does not pin the model version. An external benchmark of **MMAudio v2 text-to-audio** therefore does not validate that interface. Its canonical [Mirelo SFX 2.0 page][openart-mirelo] explicitly says **“COMING SOON”** despite present-tense promotional copy. A generic Mirelo entry does not establish current access to version 2.0.

## Published listening evidence

### North Noir: useful counterevidence to a universal winner

[North Noir's October 25–27 study][northnoir] contains 119 clips across 15 routes and eight prompts, rated by one human with anonymous, shuffled labels. Selected means on the listener's 1–10 scale:

| Tested route                 | Mean rating |
| ---------------------------- | ----------: |
| MMAudio v2 text-to-audio     |       7.375 |
| Mirelo SFX 2.0 text-to-audio |       7.375 |
| ElevenLabs Sound Effects v2  |       6.375 |

The full study's leader was Stable Audio Open at 7.5; this is not a reason to expand our shortlist automatically. Each selected route had eight clips, covering effects such as a door, rain, footsteps and a sword draw.

**Limits:** one listener, one output per route/prompt, no loudness matching, rerolls or mastering, and different native formats/durations. There was no Suno, Eleven v3 or OpenArt-interface test. The article's percentages are rescaled ratings, not correctness or win rates. This challenges an easy claim that Eleven always wins; it cannot rank today's three products or establish repeatable production quality.

### Eleven v3 versus v2: small, mixed early evidence

[Sonetho's November 4 comparison][sonetho] listened to six clips: three prompts, one output per model/prompt. The author preferred v3's handling of a changing crowd scene and a street performance; both models struggled with a gong/chimes/whistle sequence. The article discloses an affiliate relationship. It is human listening evidence, but too small to establish a general success rate.

[AI for Mortals' 19-generation comparison][mortals] provides further examples and reports better handling of several events alongside uneven detail, omitted layers and variable loudness. Its evaluations use **Gemini 2.5 Pro**, not a blind human panel. Those observations must not be presented as listener consensus.

### Direct Suno–Eleven examples and community reports

[RAO Music's October 15 article][rao] supplies a shared city-ambience prompt and playable examples generated October 14. It used Suno **V6_MINI through Kie**, producing about 13 seconds, versus Eleven v2 at 15 seconds with different settings. The outputs were not loudness-normalized and the site sells access to both. This is a useful sample pair, not a current flagship comparison or an overall SFX ranking.

Indexed community reports included [noise and usability complaints][community-noise], [few satisfactory generations for game use][community-yield], and [positive recommendations for unusual effects][community-positive]. These were self-selected anecdotes; some were accessible only through indexed excerpts. They establish neither representative acceptance rates nor a stable winner.

## Official claims and unresolved documentation

ElevenLabs claims that v3 follows multi-part prompts more closely, sounds more natural and reduces high-frequency artifacts. These are [vendor claims][eleven-changelog]; the small independent studies above provide only partial support.

Official loop descriptions conflict: the [November 2 changelog][eleven-changelog] and [capability guide][eleven-capabilities] describe v3 looping, while the [same-date developer article][eleven-developer] says looping works only with v2. The [API reference][eleven-api] also still defaults to v2 unless a model is specified. Verify the selected route when it matters to an asset; advertised loop support does not prove a seamless result. This discrepancy does not require a new integration task.

The [capability guide][eleven-capabilities] warns that exact repetition counts are unreliable. A convincing four-footstep recording is not a reliable contract for four gameplay contacts. Suno's documented tendency to add musical material similarly makes separated, independently usable output a listening question rather than a guaranteed feature.

## What to carry into Open Legend

The opportunity is a recognizable, satisfying soundscape, not merely a better generation score:

- **Choose for the actual event.** A contact should have a convincing onset, material and weight. For independently timed contacts, select or edit reusable one-shots rather than depending on an inseparable sequence. A video soundtrack can fit a fixed clip without being a useful gameplay asset.
- **Build a coherent family.** A few related variants can make repeated actions feel tactile without changing their meaning. Concentrate original design on exposed signature sounds; generating more unrelated files does not establish a distinctive world.
- **Keep useful layers separate.** Background texture, meaningful actions and music have different timing and mixing needs. Reject or edit unwanted speech, extra events, musical beds and tails that cannot be controlled. Ambience must not imply an unauthorized nearby action or threat.
- **Judge the accepted result in play.** Clarity, repeat listening, fatigue and contribution to the scene matter alongside isolated fidelity. Include selection and cleanup effort when deciding whether generation saves work.

These are applications of the existing [sound direction](../../openlegend-direction.md#sound-effects-use-recordings-as-ingredients) and [feedback production workflow](../../../../production-workflows/audio-and-feedback.md), not extra acceptance gates. [AUD03](../../../../maintainers/audio-production.md#aud03--produce-one-representative-soundscape) already owns the representative soundscape; the wider [AUD01–AUD04 route](../../../../maintainers/audio-production.md) covers audition, rights/source handoff and selected playback needs. The evidence identifies no new player capability requiring a separate design document or backlog item.

[eleven-changelog]: https://elevenlabs.io/docs/changelog/2026/11/2
[eleven-capabilities]: https://elevenlabs.io/docs/overview/capabilities/sound-effects
[eleven-developer]: https://elevenlabs.io/blog/sfx-v3-for-developers
[eleven-api]: https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert
[openart-audio]: https://openart.ai/suite/audio
[openart-models]: https://openart.ai/pricing?id=sFJbxBE5nvQEt0ulRrHV
[openart-mmaudio]: https://openart.ai/suite/add-sound-effect/mmaudio
[openart-mirelo]: https://openart.ai/ai-model/mirelo-sfx-2-0/
[suno-sounds]: https://help.suno.com/en/articles/10625537
[northnoir]: https://northnoir.com/blog/sound-effects-models-ranked
[sonetho]: https://sonetho.com/en/post/81
[mortals]: https://www.aiformortals.co/blog/elevenlabs-sfx-v3
[rao]: https://www.raomusic.com/blog/elevenlabs-vs-suno
[community-noise]: https://www.reddit.com/r/ElevenLabs/comments/1xg27az/sound_effects_section_now_worse/
[community-yield]: https://www.reddit.com/r/aigamedev/comments/1xp9bcy/what_is_the_best_ai_for_sound_effects/
[community-positive]: https://www.reddit.com/r/aigamedev/comments/1xq9g8p/sound/
