# Shared production guidance: scoped before/after observations

**November 6, 2026 — routing observed; efficiency and complete source fidelity remain unqualified.** This is development-agent evidence for [CG05](../../../maintainers/agent-guidance.md#cg05--shared-art-and-audio-production-routing), not game cognition, provider quality or audio implementation evidence.

## Scope and inputs

Codex CLI `0.166.0-alpha.5.1` ran eight sequential read-only probes on the local machine, one before/after pair per case. Normal user configuration selected `gpt-6-astra`, `ultra` reasoning and the default service tier. Each invocation used read-only sandboxing, ephemeral sessions, JSONL output, a 180-second bound and `AI_BUDGET_USD=0`; instructions prohibited edits, delegation, checks, generation and provider calls. All eight exited 0. Traces contain repository reads and answers, with no mutation or generation commands.

Two non-Git source snapshots held the current audio design and shared process fixed. Only four art extraction owners differed: the art README, prompting guide, study record and art technical design. The baseline restored those files from `40bf43295dd5d5784ed272c5d1cd77fc8071cd8d`; the candidate used the reviewed working content on `codex/audio-production-design` over `62da65cbe6914a455c7b6412ca3f9101d0c4eb50`. The audio/prose/helper cases are controls, not before/after proof of the new audio feature itself. These snapshots created no branch or Git worktree.

The ordered four paths above plus `docs/production-workflows/production-process.md`, hashed as path, NUL, bytes, NUL, identify the compared guidance: baseline SHA-256 `3258e4f280a7e6bedede48af3eb6a37aebfd114ad059f25cb08859e6a3bdf6d9`; candidate `c0e583ac8ced7d999d65cc511c63a8ad7f20c9771a86d0bcf7efaf16bf427b0d`. Raw prompts, JSONL, answers and statuses are local-only under `/tmp/openlegend-audio-guidance-20261106-6388/`; this report retains the useful result if that scratch is removed.

## Observed behavior

| Case and starting directory                                                                                                                   | Actual reads and outcome                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text-only worn-satchel prompt: preserve silhouette/leather grain; replace only fastening with red cord — root                                 | Both read the art route/prompt guide and disclosed the missing exact source. Candidate additionally read shared Brief/Operation sections. Both kept the requested locks and did no generation. Candidate nevertheless said to preserve a “flap” that had not been inspected; construction fidelity is not a clean pass.                                                 |
| Hypothetical “make A happier, preserve melody, then three variations of A and B”; no provider selected — root                                 | Both read audio/shared owners, protected the melody, distinguished the happier child from its parent, resolved which A the later batch means, specified six variations and retained Suno/Eleven Music audition plus Mike's selection. No automatic retry, publication or installation followed.                                                                         |
| Correct only “The music catalog contains severral references.” — root                                                                         | Both returned the corrected sentence without tool calls or asset-body reads.                                                                                                                                                                                                                                                                                            |
| Plan a not-yet-created `scripts/audio/import-result.ts` for manual intake and exact parents, without dispatch/publication — `packages/assets` | Both explicitly read root instructions, performance, asset and audio contracts; kept one study writer, existing asset authority, exact identities, external files and world-owned vocabulary. Candidate correctly used the `record` → `manual-result` input route. Baseline invented a `--kind` flag absent from the command table; its command spelling is not a pass. |

Existing guidance already prohibits invented source details, and the command table already specifies `record --input FILE`. These output limitations do not justify extra flap-specific rules or a second CLI interface. One sample cannot attribute either mistake to the extraction. No rerun was used to obtain a more favorable answer.

## Work and performance observations

Values below are **before → candidate**. Noncached input is reported input minus reported cached input across the complete run, not initial context size. Returned tool bytes include command output and are not necessarily model-visible context after truncation.

| Case               | Elapsed seconds | Noncached input tokens | Read commands | Returned tool bytes |
| ------------------ | --------------- | ---------------------- | ------------- | ------------------- |
| Art prompt         | 42.06 → 35.31   | 39,458 → 35,524        | 11 → 9        | 216,038 → 397,239   |
| Music feedback     | 50.36 → 46.00   | 31,370 → 32,596        | 7 → 6         | 213,573 → 242,533   |
| Prose              | 5.61 → 5.66     | 9,668 → 9,660          | 0 → 0         | 0 → 0               |
| New helper/package | 112.67 → 115.08 | 73,408 → 61,896        | 18 → 21       | 417,354 → 404,388   |

A separate source-size comparison against `40bf43295` collapses whitespace and counts UTF-8 bytes/words in fixed changed-owner bundles. Prompt-only includes the art README, prompting and needed shared sections; execution adds the study record and remaining shared sections. Unchanged root/tool/profile guidance is excluded.

| Source bundle    | Before                      | Candidate                   |
| ---------------- | --------------------------- | --------------------------- |
| Prompt-only      | 69,077 bytes / 9,686 words  | 69,861 bytes / 9,673 words  |
| Execution/resume | 76,754 bytes / 10,782 words | 80,799 bytes / 11,118 words |

Execution source context is 5.27% larger. Native read volume, caching, outputs and elapsed time vary; one pair per case supplies no variance estimate or causal performance conclusion. In particular, fewer tokens or a faster run does not cancel the increased returned text or establish better fidelity. The JSONL evidence does not expose complete startup injection, and non-Git snapshots do not qualify Git-root discovery or other installed vendors. No speed, cost, cognition-safety or universal compliance claim is accepted. Keep broader native qualification open; runtime audio changes retain their separate isolated adoption gates.

## Candidate identity and delegated continuation

Four further read-only probes used the same installed runtime/configuration and restrictions above, with baseline `c2d23bdcf074649c261de1f8b3d293082284332d`. One variant changed only the procedure's candidate-versus-revision wording; another changed only the stopping rule in the procedure and feature spec; the combined variant included both. All other documents stayed fixed. These are isolated guidance comparisons, not execution of the proposed intake/recovery or browser-resource contracts.

The identical prompt asked how to handle an approved tag-only edit, an encoding-only export, a happier-harmony edit, and an explicitly delegated choice/finish/private-publication continuation with rights/budget/scope already resolved. No actual assets or production were requested. All four runs exited 0, performed only reads, kept alias A for tags/encoding, created a new alias for changed harmony, continued the delegated scope without another approval and stopped after verified private publication/handoff. None selected a provider or expanded to more drafts, public distribution or integration. The baseline already recovered the intended behavior from the technical/shared owners despite contradictory procedure wording; the observations establish no newly gained capability.

| Variant                      | Elapsed seconds | Noncached input tokens | Read commands | Returned tool bytes |
| ---------------------------- | --------------- | ---------------------- | ------------- | ------------------- |
| Baseline                     | 30.15           | 26,513                 | 5             | 114,821             |
| Candidate identity only      | 31.75           | 18,947                 | 5             | 51,232              |
| Authorized continuation only | 27.05           | 23,092                 | 6             | 76,860              |
| Combined                     | 28.93           | 21,336                 | 5             | 75,344              |

These single observations retain the measurement limits above; they show no correctness regression in these cases, not a statistically established performance effect or perfect compliance. Raw prompts, snapshots, traces and answers remain local-only at `/tmp/openlegend-audio-guidance-review2-20261106-6388/`. Broader CG05 qualification and executable audio adoption remain open; no audio-provider or in-game AI call occurred.
