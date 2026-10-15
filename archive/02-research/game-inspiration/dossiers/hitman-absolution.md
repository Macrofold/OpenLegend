# Hitman: Absolution — a crowd is not a population of equally deep minds

**Coverage: crowd simulation, locomotion and AI scale only. Reviewed October 14, 2026.** Topic-only research, not a full-game dossier. These findings concern Absolution's developer presentations in 2012–2013; they are not automatically the architecture of the later World of Assassination games.

[Topic synthesis](../synthesis/characters-companions-and-relationships.md) · [Halo 2](halo-2.md)

## Verified source scope

IO Interactive's 2012 session description reports crowds of 1,200 characters at 30 frames per second on that generation's consoles, with individual interaction and response as requirements. It identifies both algorithmic and gameplay-driven tradeoffs. The accessible abstract does not disclose enough detail to certify the exact update schedule, memory layout or identity persistence. [HI1]

Michael Buttner's 2013 developer session describes using reinforcement learning for crowd locomotion: organizing animation clips and choosing them in response to higher-level goals, including path following. This is learned movement control, not evidence that the crowd's motives, memories or social decisions are learned. Only the published session descriptions were read; the full videos were not viewed. [HI2]

## What the population number does and does not mean

This is a useful counterexample to comparing systems by entity count alone. A crowd can react individually and contribute to play without each member supporting conversation, long-term obligations, private autobiographical memory or open-ended planning.

For OpenLegend, a performance report should name the work performed by each counted person. Distinguish rendered bodies, moving agents, native activity executors, characters eligible for cognition and characters actually making model-backed decisions. Frame rate is not the same measurement as decisions per second or simulated time advanced per real second.

Those distinctions also prevent an unfair comparison in the other direction: a small language-agent demonstration can show much richer interpretation while leaving physical interaction, animation and large-population scheduling largely untested.

## Transfer hypotheses

**Use learned control where the decision really is low-level.** A locomotion policy might eventually improve natural movement without choosing whether a person should leave a friend behind. The policy's training objective and observation scope would still need to match the authored body and environment. A result for one character rig or movement domain is not a general mind.

**Reduce representation cost independently from personal continuity.** Less frequent animation or a cheaper distant body representation need not erase a character's identity, possessions or accepted commitments. Conversely, replacing individuals with an anonymous aggregate is a behavioral approximation even if it looks unchanged from a distance.

**Protect the moment of interaction.** A hypothetical observer walking into a crowd should not discover that an apparently persistent person has contradictory possessions or a fabricated earlier conversation. Transitioning to more detailed simulation requires a compatible account of what actually happened at the cheaper level. Where detail was not simulated, it should remain unknown or explicitly abstract rather than retroactively asserted as precise history.

## Alternatives and costs

A smaller populated space may support more meaningful people than a large crowd with shallow interaction. A creator may deliberately choose anonymous crowd ambience, but that is a world and product promise, not a universal optimization rule. For the ambition of individually cognitive characters, prioritize reducing repeated work and retaining valid intentions before declaring most people semantically interchangeable.

The evidence would justify a stronger implementation recommendation only after inspecting the actual technical material or a reproducible implementation. It does not currently support importing an exact Hitman scheduling algorithm or advertising an equivalent OpenLegend population target.

## Sources

**HI1.** Kasper Fauerby, IO Interactive, *Crowds in Hitman: Absolution*, GDC 2012. [Official session description](https://www.gdcvault.com/play/1015315/Crowds-in-Hitman).

**HI2.** Michael Buttner, IO Interactive / Square Enix, *Reinforcement Learning Based Character Locomotion in Hitman: Absolution*, GDC 2013. [Official session description](https://www.gdcvault.com/play/1018827/Reinforcement-Learning-Based-Character-Locomotion).

Evidence confidence is high for the stated presentation scope, limited for inaccessible implementation detail, and unmeasured for transfer to OpenLegend. No full-game or runtime completion is claimed.
