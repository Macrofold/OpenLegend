# Repeatable Cognition Lab episodes

A campaign freezes its complete list of experiments. Each selected episode restores one native Lab checkpoint, submits its declared stimuli through the signed player or creator controls, and retains the Rust job receipts. Use a dedicated Lab. Each restore replaces that Lab’s active timeline. The game runs separately.

## Declare and freeze

Create a manual or starting-scenario checkpoint in the Lab. Use its UUID and the exact authored profile names of NPCs visible to the signed creator. Keep study files and results in a private directory outside Git.

An episode file such as `greeting.json` contains:

```json
{
  "id": "greeting",
  "checkpoint": "00000000-0000-4000-8000-000000000001",
  "setupSeconds": 30,
  "limits": { "simulatedSeconds": 180, "wallSeconds": 90, "maxCalls": 6 },
  "stimuli": [{ "kind": "say", "target": "Ada", "text": "Are you free to talk?" }]
}
```

Replace the example UUID and name with your checkpoint and character. The optional setup advances the native clock by the declared simulated seconds while holding every provider call. Allow enough time for normal perception to identify nearby people. A missing or ambiguous profile stops the episode. Omit `actor` for the signed player’s directed speech. An NPC speaker uses `actor` and may select a different `focal` NPC. For a descriptive NPC action use `kind: "act"`, `actor`, `focal` and `text`. Optional `settings` accepts the same `fastModel`, `complexModel` and `outputTokens` as the Lab. The native server checks each choice.

A campaign declaration supplies `sourceRevision` (the full Git SHA used to build the nominated host), `expectedPositions` and `episodes` (paths relative to the declaration). A separately launched host’s source revision is operator-supplied. The runner verifies episode contents and the live server’s checkpoint and restore receipts.

```sh
pnpm cognition:campaign plan --input ./study/declaration.json --output ./study/plan
pnpm cognition:campaign run --index ./study/plan/matrix-index.json --origin http://127.0.0.1:3000 --output ./study/prepared
pnpm cognition:campaign run --index ./study/plan/matrix-index.json --origin http://127.0.0.1:3000 --output ./study/executed --execute
pnpm cognition:campaign aggregate --index ./study/plan/matrix-index.json --collected ./study/executed --output ./study/summary
```

Use repeated `--select ID` on the plan to execute a subset while keeping every position in the summary. Changed declarations or selections need a fresh plan directory. Each run directory is exclusive. Repeating a completed invocation skips its completed positions. An interrupted position retains its original checkpoint, load, stimulus, job and retention IDs as available. Inspect those original operations in the Lab before explicitly allocating a fresh experiment directory.

## What the results show

Preparation records the digest of the actual held request and cancels before dispatch. Execution enables one complete native response per stimulus with background autonomy off and one shared episode allowance for simulated time, wall time and model calls. Read `outcome.applied`, `outcome.received`, `outcome.dispatched` and the interval stop reason to distinguish effects, provider work and refusals. A completed preparation can have a cancelled native job. Raw inputs and outputs stay behind the signed stage reader. Each episode records its own restore ID. The aggregate retains missing and unselected positions.

The CLI authenticates through the configured local sign-in on an explicit loopback origin or accepts the signed-in session token for the nominated HTTPS host in `OPEN_LEGEND_LAB_SESSION`. Supply it through a private environment and keep it out of declarations, logs and worker inputs.

## Managed workers

The worker planner uses the same frozen episode index. Each worker opens a separate Rust server and two fresh PostgreSQL databases. Declare `source: "opening"` to use the reviewed opening or `source: "game"` to copy the signed, paused game from the backup. The worker creates the declared checkpoint UUID in its own Lab before restoring it. Private checkpoints from an existing Lab stay under their original source permissions.

A worker declaration contains the following fields:

- `taskId`, `cloudAllocationId`, `concurrency`, `deadlineSeconds` and the per-job `timeoutSeconds` from the managed worker plan.
- `sourceHash`, the source archive SHA-256 from the pinned native executable’s toolchain record.
- `runtime`, `release` and `backup`. Each has a local `root`, an explicit list of relative `paths` and the input bundle’s `sha256` manifest digest. Use the verified native runtime, reviewed release (including its opening) and stopped native backup from the worker procedure.
- `mode: "prepare"` for zero provider calls. For execution, use `mode: "execute"` and `paid: { "limitMicroUsd": 1000000, "lanes": ["judge", "generate"] }` with the actual funded lane IDs. The numeric example permits up to one dollar **per selected job**. The episode’s `limits.maxCalls` also enters the worker grant. Funding, provider credentials and task-wide limits belong to the shared service. These files contain no token.

```sh
pnpm cognition:campaign workers --index ./study/plan/matrix-index.json --input ./study/worker.json --output ./study/worker-plan
pnpm verify:worker plan ./study/worker-plan/campaign.json
pnpm verify:worker run ./study/worker-plan/campaign.json
pnpm verify:worker collect CAMPAIGN_ID ./study/collected
pnpm cognition:campaign aggregate --index ./study/plan/matrix-index.json --collected ./study/collected --output ./study/worker-summary
```

Planning packages the reviewed files locally. Worker execution requires its normal capacity and funding. The supervisor’s job, case, source and original attempt ID bind each Rust receipt to its central spending record. A lost result stays uncertain; its original service attempt can be inspected without authorizing another request. The native worker supports its single granted judgment lane and up to two granted generation lanes for fast and complex decisions. The worker provides source revision, source archive hash and executable hash with the completed episode. The shared execution endpoint must use HTTPS.

The separate request-format study compiles four output-format variants of a frozen generation request and submits them through its original funded worker. Its source and procedure are in `response-format.ts` on main. It does not make gameplay claims. Ordinary lab request comparisons use the source-authorized stage in the Lab.
