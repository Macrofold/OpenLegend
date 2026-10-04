# Validation purpose audit — October 3, 2026

[Project scope](../projects/completed/validation-purpose-audit.md) · [Provider contract](../ai-providers.md#provider-behavior-and-limits) · [Coding rule](../../AGENTS.md#validate-only-for-a-concrete-purpose)

## Coverage and method

The production source scan covered 387 TypeScript, TSX and MJS files under `apps/`,
`packages/` and `scripts/` at `b50ec6ce`: 227 app files, 142 package files and 18
scripts. The initial inventory contained 809 validation/assertion/parsing references
in 131 files; this includes ordinary JSON parsing and invalidation names, not 809
independent validators. Additional scans covered inline rejection, numeric bounds,
mathematical consistency and equality assertions. Test sources were excluded from
the production inventory and inspected separately for changed expectations.

Candidate checks were assessed through their producers and consumers, distinguishing
provider decisions, generated executable proposals, world mutations, persisted data,
permissions, asynchronous freshness, billing, geometry and presentation. This is a
repository-wide source scan with focused consumer tracing, not a line-by-line proof
that every conceivable guard is necessary or every runtime path is correct. No
unresolved demonstrated harmful check remains from this audit.

## Removed checks and changed consumption

| Finding                                                                                           | Consequence and change                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jev probabilities had to sum to one within 0.005                                                  | The supplied successful response totaled 0.99 and lost the entire three-question batch. Totals are no longer asserted or normalized.                                                                                                                  |
| Jev's named choice had to match its highest score within 0.005                                    | Usable scores could be rejected. Choice now selects the highest offered raw score; exact ties use the first offered choice. The provider's named choice is not needed.                                                                                |
| A provider rating had to match an average recomputed from its probabilities                       | This asserted provider consistency rather than interpreting the supplied rating. The provider's rating is retained.                                                                                                                                   |
| Finite decision values had to fall within the provider's conventional ranges                      | Numeric comparison does not require asserting that the provider obeyed those ranges. Finite choice scores, confidence, ratings and Noul values are passed through unchanged.                                                                          |
| Rating labels had to echo the request word for word                                               | Supplied rubric labels are already authoritative. The returned legend is built from them without rejecting different or missing echoes.                                                                                                               |
| Answer and probability maps had to contain exactly the requested keys                             | Extra unrelated metadata cannot affect selection and is ignored. Required requested answers and offered numeric scores remain checked.                                                                                                                |
| Early speech preview parsed the same operation against a narrower schema and then its base schema | The narrower schema already supplies the typed result. It is parsed once, retaining permitted addressees, speech capability, independent-operation and dependency restrictions.                                                                       |
| Caption lifetime helpers asserted finite clocks and durations on trusted internal calls           | Their current caller samples `performance.now()`, uses its own accumulated clock and computes bounded reading duration from an already checked preference. Three repeated assertions are removed; preference parsing remains at the storage boundary. |

## Retained checks with concrete consequences

- **Decision values:** missing requested answers, wrong answer types and nonnumeric or
  nonfinite required values cannot feed meaningful numeric comparison. The provider's
  usual ranges describe its conventions, not local rejection criteria. Application
  thresholds and explicit abstention choices are unchanged.
- **Permissions and asynchronous freshness:** HTTP/tool input, current access, control,
  world generation, scoped references and revision checks prevent unauthorized effects,
  private disclosure and applying stale work after waits. Later rechecks have changed
  state to examine; they are not repeats over an unchanged trusted value.
- **Generated proposals:** JSON structure alone cannot prove supported world behavior,
  available inputs or authorized execution. Domain admission and final mechanical
  checks remain separate from AI transport parsing. Caller-side Zod parsing can also
  trim text or enforce constraints not expressible in the provider's JSON schema.
- **Save/load and recovery:** current-format, checksums, reference integrity and record
  counts protect restoration and prevent partial/corrupt state from replacing a world.
  The protected development-save policy was not changed.
- **Spending and provider completion:** safe amounts, usage subsets, Run identity,
  completed outcomes and billing attribution protect real financial obligations.
  Those consistency checks cannot be removed merely because provider scores are usable.
- **Native world and geometry:** finite stock, reservation quantities, installed
  definitions, valid action conditions, support/collision and bounded recursive work
  protect deterministic execution and resource conservation. These are actual rules
  or computational requirements, not attempts to grade provider judgments.
- **Embeddings and local preferences:** dimension, finite/nonzero vector and index
  checks protect database/cosine operations and text-to-vector association. Saved
  preferences and asynchronous UI identity checks protect rendering and prevent stale
  replies from entering another character's interface.
- **Verification scripts:** argument bounds, explicit zero AI budgets and disposable
  database ownership guard real command-line input and prevent accidental live work.

## Verification

- `pnpm exec vitest run packages/ai/src/client.test.ts`: **26 passed**. Existing cases
  now distinguish unusable data from usable non-unit totals, conflicting named choices,
  rating averages, label echoes and conventional ranges. No new automated test file was authored.
- A single local ad-hoc replay exercised the supplied three-question record through
  `decodeJudge`, the direct AI client and the server's Macrofold backend, using injected
  transports and an in-memory operation journal. All three choices returned `retain`,
  their original scores were unchanged, and the recorded billing evidence remained
  $0.000114. That historical fixture charge is not new spending.
- The same scenario covered conflicting/missing named choices, exact and all-zero ties,
  ignored extra keys, finite scores outside conventional ranges, missing/nonfinite/nonnumeric required scores, a rating without an
  echoed legend, and preview rejection of unpermitted addressees, dependencies, mixed
  operations and disabled speech. Caption sampling covered pause/resume, first activation,
  remaining fraction, expiry and zero duration.
- `pnpm typecheck`, `pnpm build`, changed-file pinned Prettier, `pnpm guidance:check`
  and `git diff --check`: **passed**. The build reports PlayCanvas browser-externalized
  worker imports and a large client bundle; guidance reports advisory size warnings.
  No dependency or build-configuration change was made. Full affected-diff review
  found no unresolved in-scope issue; the protected save-policy text was compared
  against the base and is unchanged.

No live provider call, browser/server startup, database operation or change to the main
checkout was made for verification. Task provider cost: **$0**. This establishes decoding
and pure timing behavior, not live model quality, visual/browser qualification,
full CI or installed-agent instruction compliance. Existing broader acceptance remains
with its owners.
