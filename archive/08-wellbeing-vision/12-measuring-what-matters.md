# Measuring what matters

Status: **open ideation** · 2026-09-28 · part of the [Wellbeing Vision](README.md). A proposed measurement approach, not an accepted analytics plan.

Whatever a team measures becomes the product. If Open Legend tracks daily actives and hours, it will slowly become a game that optimises for them, whatever its intentions. So the wellbeing vision needs its own instruments — and a way to keep even good metrics from being gamed.

---

## 1. Why this can't be left to engagement data

- **What feels good isn't what brings people back.** In a 2026 preprint pairing 11,000 daily reports with play logs, satisfying players' psychological needs tracked how play *felt* but had "weak or null associations with short-term gaming behavior, including subsequent play, session length, and return latency" ([Ballou et al.](https://nickballou.com/publication/2026-ballou-et-al-all-bang/)). Engagement metrics can't tell you whether play is good for people.
- **Manipulation raises engagement.** In experiments, manipulative goodbyes raised post-goodbye engagement up to 14× — while the coercive and needy tactics also raised intent to quit and negative word of mouth ([De Freitas et al. 2025](https://arxiv.org/abs/2508.19258)). An engagement dashboard would have called that a win.
- **Hard times drive play.** Social strain, work stress, illness and grief increase gaming. Rising hours can mean a player's life got worse.
- **Goodhart's law.** Meta's 2018 "meaningful social interactions" metric, meant to be healthier, rewarded comments and reshares and made feeds angrier.
- **The science has moved to open, telemetry-based, pre-registered studies.** Oxford's researchers pair publisher logs with surveys and even sample mood inside games. Open Legend, with first-party telemetry and an open engine, is unusually well placed to do this properly.

---

## 2. Proposed north stars

Four measures, each chosen because it is hard to improve by manipulating people.

| North star | What it measures | How |
|---|---|---|
| **Worth-it rate** | Whether time in the world felt well spent | A sampled, skippable one-tap question at session end: "Was this time well spent?" |
| **Human connection** | Whether the world creates relationships between people | New two-way human ties per active player per quarter (mutual friend, repeated co-play, mutual "I enjoyed playing with you"); share of sessions with human co-play; friendships still active at 30 and 90 days |
| **Good endings** | Whether sessions end well | Share of sessions ended by the player at a natural stopping point, with a positive exit mood |
| **Flourishing trend** | Whether lives are going better over months | Opt-in panel using validated scales (below), compared with national baselines from the Global Flourishing Study |

**Time played is a guardrail, never a goal.** No team goal, bonus or dashboard headline should reward it.

---

## 3. Guardrails (things that must not get worse)

- Share of players averaging more than three hours a day — the point beyond which benefits diminished in the Japanese console-lottery study ([Egami et al. 2024](https://www.nature.com/articles/s41562-024-01948-y)).
- Share of play between midnight and 6 a.m. local time; sessions that run past a player's own bedtime setting.
- "I felt I *had* to play" — pressure predicts lower wellbeing.
- Regret rate ("I wish I'd spent that time differently").
- Ratio of human-to-human to human-to-resident interaction, per player; alert when resident time rises while human co-play falls.
- Overrides of self-set limits (Ulysses mode).
- Farewell-manipulation rate in audits: target **0%**.
- Sycophancy rate under emotional distress; crisis-response quality in red-team tests.
- Spending concentration (whether revenue depends on a small group of heavy spenders).
- Share of players in the world-bounded envelope who are, in fact, minors (age-assurance quality).

---

## 4. Instruments

| Instrument | What it is | Notes |
|---|---|---|
| **In-game experience sampling** | Short, skippable mood and experience prompts during play | The PowerWash Simulator research edition prompted "at most six times per hour," at least five minutes apart, all skippable; 162,325 reports showed small mood uplift ([Vuorre et al. 2024](https://www.ox.ac.uk/news/2024-09-25-new-study-reveals-positive-mood-changes-during-video-game-play)) |
| **Basic needs in games** | Satisfaction *and* frustration of autonomy, competence and relatedness | The BANGS scale measures both ([Ballou et al. 2024](https://www.sciencedirect.com/science/article/pii/S1071581924000739)) |
| **WHO-5** | Five-item wellbeing index | Short, widely used |
| **UCLA-3** | Three-item loneliness scale | Short, widely used |
| **Secure Flourish** | VanderWeele's 12 items (0–10) across happiness, health, meaning, character, relationships and financial stability | Benchmarks against the 22-country Global Flourishing Study |
| **Gaming life fit / perceived value** | "Is Open Legend a good part of your life right now?" | Predicted wellbeing in Oxford's Nintendo study where hours didn't |
| **Post-gaming return** | How cleanly players transition back to real life | A 2026 construct that appeared to buffer escapism's harms ([Strojny & Strojny](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2026.1735108/full)) |
| **Sleep items** | Intended vs actual bedtime on play nights | Bedtime delay is the most common harm |
| **Connection items** | Hours with people in person this week; someone to count on | Aligns with WHO's proposed Social Connection Index |
| **Bridge follow-through** | Opt-in "I did it" on Tollbooth Notes, bridges and real-world cards | Honour system; count opportunities offered, not people pushed |

---

## 5. A research programme

1. **Pre-register** the main outcomes before launch, with academic partners — for example Oxford's games-and-wellbeing group, the Harvard Human Flourishing Program, or social-prescribing researchers.
2. **Run bridge features as randomised rollouts.** Forecasters could not predict which of 54 gym nudges would work in a *Nature* megastudy; only 8% persisted after four weeks ([Milkman et al. 2021](https://www.nature.com/articles/s41586-021-04128-4)). Test many small variants, with wellbeing guardrails on every A/B test.
3. **Measure at 6 weeks, 3, 6 and 12 months.** Novelty fades (Pokémon GO's step boost vanished by week six); long-term effects are what matter.
4. **Publish null results.** Commissioned impact reports are common in this space; honest ones are rare.
5. **Share de-identified data** in the spirit of Oxford's public *Open Play* dataset, with consent and privacy review.
6. **Assess wellbeing impact for major features** using IEEE 7010 (a published recommended practice for assessing AI systems' impact on human wellbeing) and value-sensitive-design stakeholder mapping — including *indirect* stakeholders such as players' partners and children, and real people who appear in journals.
7. **Publish an annual Wellbeing and Connection Report**: north stars, guardrails, farewell and crisis audits, crisis-referral counts (which some states will require anyway), and what changed as a result.

---

## 6. Evidence labels for features

Tag every wellbeing-oriented mechanic with the strength of its evidence, and never market a weak one as a benefit.

| Label | Meaning | Example |
|---|---|---|
| **A** | Replicated trials or meta-analyses | Implementation intentions; debriefing in simulation training |
| **B** | At least one good trial or strong longitudinal data | Rehearsal of job interviews; gratitude visits; community gardening |
| **C** | Large observational or self-report evidence | parkrun belonging; shared meals and life satisfaction |
| **D** | Precedent, tradition or plausible idea | The Return Rite; kestrel moments; the Long Rest |

Many of the most beautiful ideas in this folder are D. That's fine for ideation; it isn't fine for marketing.

---

## 7. How not to measure

- Never show players a wellbeing score, rank or streak. Measurement serves the team and the science, not a new scoreboard for the player's life.
- Never tie compensation to time spent, sessions or retention.
- Keep research data consented, minimal and separable from identity.
- Measure *opportunities offered* (introductions offered, bridges shown) rather than people pushed; let players' own choices be the outcome.
- Don't tune residents on thumbs-up ratings alone — that is how one major model became sycophantic in 2025.

---

## 8. A starter kit for the first playable

Cheap enough to add now, useful from day one:

1. A skippable "Was this worth it?" tap at session end, plus an optional one-word exit mood.
2. A one-question monthly check: "Is Open Legend a good part of your life right now?"
3. Bedtime delay: an optional bedtime setting and a count of sessions that ran past it.
4. "Who did you play with?" logged automatically (alone / with residents / with people).
5. A farewell audit on Ada and every other resident persona before each model or prompt change.

---

**Related:** [money and mission](13-money-and-mission.md) · [guardrails and law](11-guardrails-risks-and-law.md) · [questions and first experiments](14-questions-and-first-experiments.md). Evidence: [games and wellbeing brief](research/01-games-wellbeing-science.md), [humane design brief](research/06-humane-design-ethics.md), [community and behaviour-change brief](research/07-community-civic-behavior.md).
