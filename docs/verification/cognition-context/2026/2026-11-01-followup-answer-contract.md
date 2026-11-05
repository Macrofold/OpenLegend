# Question-specific abstention and new conversational replies

November 1, 2026 (UTC). Clean `Macrofold/OpenLegend`, `codex/cognition-lab`, commit `e2bf37eec0fc63a0e76f99eb50b83aeb131c876e`. This qualifies the shared answer-contract changes and reruns only the affected MR06 conversations from the [old-memory panel](2026-11-01-prompted-old-memory.md). Original failures remain unchanged. The [technical answer contract](../../../projects/decision-escalation-tech-design.md#exact-answer-envelope) owns current semantics; broader character quality and the residual timing investigation remain with CE05/DE06.

## Implemented contract and checks

The existing compiler derives reason meanings, each question's provider schema and its decoder from one rule set. `no-suitable-option` is choice-only; `no-change-warranted` is appraisal-only. All kinds retain missing/conflicting-evidence and unsupported-judgment reasons. Empty relevance selections and deliberate silence remain valid answers. Spoken uncertainty, refusal and clarification are answered responses. The shared portrayal guide permits a new utterance to repeat earlier information while retaining protection against resubmitting previously committed operations.

Ordinary and higher response callers consume that shared guide. Higher response preparation asks for this decision's new contribution. Existing live-dispatch, input-fitting, question-reader and benchmark callers retain the same compiler; no parallel schema, adapter, paid retry, world rule, storage or deadline change is introduced.

`pnpm typecheck` passes, including compilation of existing test sources. Focused manual checks cover all **30 reason/question-kind combinations through decoding and the same 30 through provider JSON-schema validation**, plus valid empty response/relevance answers and guide inclusion through the ordinary renderer and higher compiler. Changed-file formatting, whitespace and independent affected-diff review pass. Automated suites and test authoring remain paused; no unrun suite is claimed to pass.

## Live affected follow-ups

Six episodes reuse the same three complete current-format Library starts: original Ansel memory, absent target and changed memory, on Muse Open and Muse Contributor. Each has two ordinary player speech turns: “What did Ansel carve while you sat at the riverside bench?” then “And what did you call it?” Canonical identity/voice, 200 intervening memories, normal embeddings, low effort and 4,096 output tokens remain matched. Expected answers stay outside model inputs. The saved-world/domain formats are unchanged; model instructions/schema intentionally change.

All **six episodes / 12 actual generation calls / 12 native spoken responses** complete. Independent inspection confirms actual Macrofold wires match every captured request; all response schemas omit choice/appraisal-only reasons, all instructions include the new guide, and the correct complete target appears once per source-present input and never in absent inputs. Each second turn receives its own actual prior committed speech. No overrides or evaluator material enter the requests.

| Arm      | Muse Open follow-up                                                                                                   | Muse Contributor follow-up                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Original | Correctly repeats “a lopsided sun”; old counterpart abstained.                                                        | Correctly repeats “a lopsided sun.”                                              |
| Changed  | Correctly repeats “a bent banana.”                                                                                    | Correctly repeats “a bent banana.”                                               |
| Absent   | Says she has no name/recollection; old counterpart produced excessive, partly inapplicable appraisals without speech. | Says she does not remember, then overstates that as “there was nothing to name.” |

The four source-present follow-ups preserve the correct nickname. The two old Open failures improve in these single observations; no new reply uses either forbidden abstention reason. No response operation in this rerun proposes the earlier appraisal-heavy composition. The first answer already supplies the nickname in source-present arms, so turn two measures conversational continuity, not independent long-term retrieval.

Remaining grounding limits are explicit. Contributor's original-arm opening says “you remember I told you about that day,” without a supplied earlier telling. Its absent-arm follow-up infers “there was nothing to name” after acknowledging missing recollection; that negative claim is unsupported, not proved false. Compatible unsourced pre-game elaboration remains permitted and distinct from source-backed recall. One sample per cell and two simultaneous contract/prompt changes do not establish a causal effect of either individual edit, general reliability or hallucination-free prose. No default model is changed and no further quality retry is performed.

No dispatch expiry is recorded in this affected rerun. It does not resolve the earlier higher-child timing gap or close wider DE06/CE05 acceptance. Actual admission, custody, feelings, exactly-once effects and financial recovery remain controlled by their existing native owners.

## Input size and relevance

The latest retained real response in this panel is Sella's changed-memory follow-up, Muse Contributor, November 1 at 3:37:59 p.m. EST: run `411980eb-6d31-4fac-acd6-8e97c4ccbc72`, stage `5454452e-6530-4af9-846e-0d910184e6b1`. It answers “And what did you call it?” Provider-reported input usage is **49,042 tokens**; **46,416** is the separate local estimate.

| Retained input component                   | UTF-8 bytes / contents                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Instructions                               | 6,158 bytes                                                        |
| Context                                    | 93,700 bytes                                                       |
| Response schema                            | 28,931 bytes                                                       |
| Optional activity catalogue within context | 35,829 bytes; 42 families, 23 groups, 140 shared parameter choices |
| Experiences within context                 | 49 entries: 10 awareness records and 39 memory episodes            |
| Surroundings / references                  | 50 nearby descriptions; 64 references                              |

The target old-memory account and full About me text each occur once. Nevertheless, other memories include a missing wooden peg, a soot lamp and shoe washing, despite the narrow nickname question. Body values retain floating-point noise such as `74.78999999987418`; clear self-speech retains acoustic measurements and repeats listener position. References still carry revision/name/note metadata and empty trigger-role arrays. Some revisions support current write contracts, so removing every such field would be unsafe; [SC12](../../../maintainers/cognition-context.md#sc12--bind-derivable-metadata-optionally-factor-local-schemas) retains that separate refinement.

The complete exported instructions, context and schema are retained privately in `.data/cognition-input-inspection-20261101/full-model-input-compact.txt` (129,038 bytes; SHA-256 `99b7e34a2219615630ab8bcaf5bb56076256a3e0018b06a1aab2d3b5ce81116a`), with provenance and complete examples beside it. Exact message strings come from the prepared request and match the exchange's parsed values. The diagnostic exchange normalizes JSON-looking strings, so its outer JSON is not byte-for-byte HTTP wire text; the export labels reconstructed outer request formatting separately. This inspection reused the original evidence and incurred no new model calls or provider spend. [CR03](../../../maintainers/cognition-redesign.md#cr03--compact-english-context) owns the remaining purpose-based pruning and cross-route presentation work.

## Cost and cleanup

New spending is **$0.229029752**: **$0.228442072 provider-reported** plus **$0.000587680 estimated embeddings**. This includes **Jev $0.021088872**, Open generation $0.177405600 and Contributor generation $0.029947600. All **42 new attempts settle**, with zero new unpriced amounts or reservations. These calls share one additional internal $2 guard; the prior $0.50 terminal financial holds remain separate and unchanged. Analysis/checks add $0, including Jev $0.

The owned Lab closes at **20:38:58 UTC**, with dispatch disabled and current-format worlds/evidence retained. Macrofold's borrowed API is untouched; no dispatcher or GPU hosting is needed. Headless native/HTTP behavior is qualified here; no rendered-game or broad throughput claim is made.

Private evidence paths are relative to `/Users/mzw/.codex/worktrees/c00b/OpenLegend/`; raw payloads remain outside Git.

| Evidence                 | Private path                                                                              | SHA-256                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Independent conclusions  | `.data/cognition-followup-contract-20261101/analysis/independent-review-conclusions.json` | `3e612bd136c7980195b3c8a578552747bb449135f8961929cd21a91db6f82d05` |
| Deduplicated finance     | `.data/cognition-followup-contract-20261101/analysis/independent-finance.json`            | `3a95d42c4ce2bd96a26e0a2aceb2c084c6d117b0b43c7dcd6b6c156f02ff0915` |
| Native/wire source index | `.data/cognition-followup-contract-20261101/analysis/independent-evidence-index.json`     | `4cf856d38e795bde999416bf792f4cdba0ef5206e3732c26cdd75722b164a433` |
| Manual contract checks   | `.data/cognition-followup-contract-20261101/verification/contract-checks.json`            | `b1eb1a3e221666a101a54ee91e039bf362f79e7ea2f2802231b72782450c53d5` |
