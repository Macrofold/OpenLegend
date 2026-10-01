# Incomplete integration recovery checkpoint

This directory preserves the three surviving, previously unpublished JSON files from the interrupted invention production-data integration. It is recovery material, not executable implementation, a completed rebase, or acceptance evidence for the current branch. Runtime code and branch ancestry are unchanged by this checkpoint.

At the time of this historical checkpoint, the working branch was `feature/invention-repertoire-foundation`. Its head before the checkpoint was `271ac5738a1afe5dca0f53b2dc1a89a5e7c11b93`.

## Retained records

- `published-map.json`: 68 original-to-replayed commit mappings. The prior publication checkpoint is `94d0b274c171ce33a0117f7ec2c325bc5e5ba789` on `rebase/invention-production-integration`, based on `da02629d9f0a29a9e24473ff2ab995977a79be1a`. This file does not mean those commits are ancestors of the working branch.
- `current-replay-conflicts.json`: 42 historical file-version conflicts from the comparison against `f015b2a9712ff87589dc04e72046c4e483dcab67`. These are not 42 confirmed runtime bugs, and that commit is a historical comparison input, not a claim about current main.
- `evidence/native-evidence-v3/report.json`: the retained synthetic 10,000-record SQLite observation report. It is an unrerun historical output. Its `invalid` private-graph result is not a successful privacy check. Without the matching source and harness, its timings and results cannot qualify this branch.

JSON values and ordering are retained; formatting is compacted and a final newline is added. The existing `../replay.json` contains the earlier 105-commit reconstruction plan. The September 2026 integration preserves this data-only manifest as provenance. The obsolete reconstruction scripts and feature-only export/preparation workflows were removed after the owner selected an ancestry-preserving merge; no reconstruction or CI-skip path remains.

## Missing source

The previous pass reported additional uncommitted SQL-backed World Agent reader and integration fixes in `/mnt/data/openlegend-integration/rebased-source/`. That directory was absent in the continuation environment. The retained source ZIPs contain committed repository history and dependency exports, not those working-tree edits; a Library/conversation search did not locate another copy. The missing edits have therefore NOT been pushed, recovered, or reconstructed from memory. The retained observation report is not a substitute for their source.

Do not force the partial staging history onto the working branch or describe this checkpoint as a clean integration. The existing integration scope and verification requirements remain in [the integration plan](../../docs/projects/invention-production-integration.md); its focused canonical owners retain implementation and acceptance work. Main, the backup branch, and the staging branch are untouched by this checkpoint.
