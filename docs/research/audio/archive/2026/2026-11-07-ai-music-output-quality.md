# AI music output quality: Suno, Eleven Music and OpenArt

**Evidence snapshot: November 7, 2026.** This compares published listening evaluations, firsthand reviews and community reports. No audio was generated or personally auditioned for this investigation. Recommendations are research judgments, not a selected provider, accepted soundtrack or production commitment.

The [audio research synthesis](../../README.md) owns the broader sourcing recommendation. The [earlier AI audio record](2026-11-04-ai-audio.md) covers provider eligibility, exports and licensing; this quality comparison does not revalidate those terms or compare production costs.

## Findings

Suno has the strongest comparative evidence for overall listener preference among these candidates, for both instrumentals and songs with vocals. That does not establish an uncontested lead in audio cleanliness, realistic instruments or emotional character. OpenArt deserves serious consideration because it offers Google's Lyria models; it is not an independent music model. Eleven Music can produce appealing detail and follow precise cue requirements, but the current evidence is weaker for calling it the best-sounding of these three.

The research recommendation for Open Legend is to consider **Suno and Lyria 3 Pro as the first two musical auditions within this comparison**, with Eleven Music as an alternative for tightly specified cues. This is an inference from the evidence below, not a completed game-music evaluation or a replacement for the existing [music direction and bounded audition](../../openlegend-direction.md#where-ai-should-fit). Stable Audio and composer/direct-artist routes were outside this three-way quality question.

## Model identity and version scope

| Product being discussed    | Model relevant to this comparison                                | Interpretation                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Suno                       | Suno v6                                                          | Distinguish the flagship from v6-mini and v6-wild. Older praise or criticism of v4/v5/v5.5 does not establish v6 quality.                |
| Eleven Music / ElevenMusic | Eleven Music v2.5                                                | The model appears through different ElevenLabs products; interface and plan differences are separate from the model's listening results. |
| OpenArt music generation   | Google Lyria 3, with Lyria 3 Pro and Lyria 3 Clip Preview listed | Evaluate the chosen model. Pro's benchmark results do not establish Clip's quality or validate the whole OpenArt workflow.               |

Sources: [Suno v6 announcement][suno-v6], [Eleven v2.5 announcement][eleven-v25], [OpenArt music page][openart-music] and [OpenArt's indexed model/pricing table][openart-models]. OpenArt's model entries were available in the search index; the anonymous creation page also displayed a Lyria 3 Clip selector. This was not an authenticated generation test. Reviews of videos made from uploaded Suno songs do not evaluate OpenArt's music synthesis.

## What “quality” means in these reports

| Dimension        | What it tells us                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Musical appeal   | Whether the melody, arrangement, pacing and development make the piece enjoyable and memorable.                                |
| Audio fidelity   | Whether instruments and voices sound natural, clearly separated and free of distracting distortion or other artifacts.         |
| Fit to the brief | Whether the output follows instrumentation, mood, structure, duration and vocal restrictions.                                  |
| Use in the game  | Whether the piece supports a scene, remains pleasant across repetitions and works alongside effects, dialogue and transitions. |

A cleaner recording can contain a weaker composition; a compelling piece can still have conspicuous artifacts. Broad listener-preference scores combine several judgments and do not isolate each dimension.

## Published listening evidence

### Blind preference: Artificial Analysis

The AA-Music-Instrumental v1.1 and AA-Music-Vocal v1.1 boards use blind comparisons by validated private evaluators listening to outputs from the same prompt. Selected rows retrieved November 7:

| Model             | Instrumental Elo | Reported 95% interval | Vocal-song Elo | Reported 95% interval |
| ----------------- | ---------------: | --------------------- | -------------: | --------------------- |
| Suno v6           |            1,148 | 1,126–1,170           |          1,144 | 1,126–1,162           |
| Lyria 3 Pro       |            1,080 | 1,059–1,101           |          1,048 | 1,030–1,066           |
| Eleven Music v2.5 |            1,001 | 980–1,022             |          1,016 | 998–1,034             |

Sources: [instrumental board][aa-instrumental] and [vocal board][aa-vocal]. Higher Elo means more frequent …1133 tokens truncated…dation favors Suno as the starting point for musical appeal and Lyria Pro as a serious challenger for sound character; Eleven remains relevant when exact cue structure or timing matters. None has been established as best for that specific emotional target.

Useful listening criteria are:

- **Melody:** a phrase worth remembering and hearing again.
- **Instrument realism:** exposed guitar, piano, strings and woodwinds remain convincing.
- **Emotional fit:** sadness, warmth and possibility coexist without becoming uniformly cheerful or excessively mournful.
- **Repeat listening:** the arrangement remains engaging without becoming intrusive, monotonous or tiring.

These are interpretation criteria for this research, not new acceptance gates or assigned work. The existing [audio production owner](../../../../production-workflows/audio-and-feedback.md) and [music direction](../../openlegend-direction.md) retain their scope. No provider, soundtrack asset or production workflow is selected here.

## Source register and access limits

All sources below were retrieved or inspected through their indexed content on November 7, 2026. Dates identify the cited evidence, not a promise that a live page will retain the same result.

| Source                                                                            | Evidence and access                                                                                                     |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [Artificial Analysis instrumental board][aa-instrumental]                         | Primary external evaluation; current v1.1 rows and methodology description read.                                        |
| [Artificial Analysis vocal board][aa-vocal]                                       | Primary external evaluation; current v1.1 embedded table read.                                                          |
| [OpenArt music generator][openart-music]                                          | Official identification of Lyria 3 as the underlying engine.                                                            |
| [OpenArt model/pricing table][openart-models] and [creation page][openart-create] | Official indexed Pro/Clip entries and anonymous interface; no authenticated model execution. Prices were not evaluated. |
| [Suno v6 announcement][suno-v6]                                                   | September 9, 2026; official model identity and variant distinctions.                                                    |
| [Eleven v2.5 announcement][eleven-v25]                                            | September 11, updated September 20, 2026; official model identity and internal comparison.                              |
| [Song Tested][song-tested]                                                        | October 17, 2026; small reviewer listening test with audio examples and affiliate disclosure.                           |
| [TakeBench][takebench]                                                            | October 27 generation session; October 28 article; audio examples, measurements and explicit test limits.               |
| [MusicRadar][musicradar]                                                          | September 17, 2026; reporting of community reaction, not a controlled listening test.                                   |
| [Suno community thread][suno-community]                                           | Firsthand, conflicting v6 experiences and linked examples; self-selected participants.                                  |
| [Lyria community thread][lyria-community]                                         | Older firsthand impressions, including Suno v5.5 comparison; not an OpenArt-specific test.                              |
| [DataCamp][datacamp]                                                              | Indexed excerpt only; lower-weight supporting opinion because full-page access failed.                                  |

[suno-v6]: https://suno.com/blog/introducing-v6
[eleven-v25]: https://elevenlabs.io/blog/music-v2-5-model
[openart-music]: https://openart.ai/features/ai-music-generator/
[openart-models]: https://openart.ai/pricing?id=sFJbxBE5nvQEt0ulRrHV
[openart-create]: https://openart.ai/suite/create-music/lyria-3-pro-preview
[aa-instrumental]: https://artificialanalysis.ai/music/leaderboard/instrumental?tab=leaderboard
[aa-vocal]: https://artificialanalysis.ai/embed/music-generation-leaderboard/leaderboard/vocals
[song-tested]: https://songtested.com/reviews/elevenlabs-music/
[takebench]: https://takebench.com/compare/suno-vs-elevenlabs/
[musicradar]: https://www.musicradar.com/music-tech/im-cancelling-my-subscription-suno-users-slam-its-v6-update-as-muffled-generic-soulless-garbage
[suno-community]: https://www.reddit.com/r/SunoAI/comments/1wbu7fw/suno_v6_lets_share_what_actually_works/
[lyria-community]: https://www.reddit.com/r/aiMusic/comments/1ssfgxo/my_honest_experience_with_lyria_3_pro/
[datacamp]: https://www.datacamp.com/blog/best-free-ai-music-generators
