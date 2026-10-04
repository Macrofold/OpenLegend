# Production deployment — implementation playbook

| Status      | Current progress                                                                                                            | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | Existing entrypoints are documented; cloud packaging, the release coordinator and hosted qualification are not implemented. | 2026-10-04   |

**Design only, researched 2 October 2026.** This is the execution companion to the [technical design](production-deployment-tech-design.md), not deployed infrastructure. The Dockerfile, CDK application, deployment workflows, release-specific write gate and asset publisher described below still need implementation. The [existing maintenance controls](completed/multiplayer-entry-maintenance.md) already pause ordinary play and preserve their notice across restart; they are the integration owner, not a missing feature to recreate. Commands are reviewed examples, not evidence that they ran. [PD01–PD12](../maintainers/production-deployment.md) owns tasks and acceptance; this document owns the deployment procedure, not another checklist.

## 1. Build the smallest complete deployment

Deliver one native-only staging world first, then actual Auth0 login, the CDN asset consumer, recovery and separately authorized live AI. Keep the current application together initially. Separate responsibilities before introducing separate services.

The proposed implementation adds these artifacts:

- A root `Dockerfile` and `.dockerignore`: reproducible application image, no credentials, private saves, local caches or research artwork.
- An `infra/` TypeScript CDK application: a foundation stack for networking, registry, storage, database and secrets; a runtime stack for the world service and its load balancer. Assets can share the foundation initially. Do not create a VPC or database instance per player/world.
- A protected build/release workflow and a separately authorized asset-publication workflow. Reuse `.github/workflows/check.yml`; do not replace its checks with deployment success.
- A narrow operator release command implementing the phases below, with a durable release record. Do not build a generic workflow platform or an administration dashboard before the first safe release.

**Current packaging facts matter.** At the reviewed revision, `pnpm run build` generates configuration, type-checks with `tsc --noEmit`, and builds the browser into `dist/client`. It does **not** produce a compiled server. `pnpm start` regenerates configuration and executes `apps/server/src/main.ts` through `tsx`. A Docker recipe that copies only `dist/` and runs `node dist/server.js` will not run this application. See [package scripts](../../package.json), [client output](../../apps/client/vite.config.ts) and [server entry](../../apps/server/src/main.ts).

Initially retain the verified Node/tsx execution path. Build with the pinned pnpm version and frozen lockfile; generate authored configuration during the image build, retain the server/workspace modules, required runtime data, spatial/WASM resources, fallback art and licenses, and use an exec-form Node entrypoint. The intended launch command after build-time generation is:

```sh
node --import tsx apps/server/src/main.ts --production
```

Qualify that command in the actual image before bypassing `pnpm start`. Do not prune dependencies merely because they are labeled development-only: current startup generation and workspace loading must first be accounted for. A compiled-server build is a later packaging improvement, not a launch prerequisite. Use a pinned supported Node base-image digest and one explicitly tested architecture; compare ARM only after native/WASM dependency checks. Do not upgrade application dependencies in a deployment-only change.

Run non-root, forward SIGTERM to Node, and preserve the existing shutdown handler. Make the root filesystem read-only only after removing runtime source generation; allow narrowly scoped temporary and save-directory writes. Verify EFS access-point UID/GID permissions. Bound CPU, memory, ephemeral disk and log volume using the staging workload, not guessed players-per-core.

## 2. Provision and configure once

Use separate production/nonproduction AWS accounts and Auth0 tenants. The initial managed environment is private Fargate tasks, RDS and EFS across two availability zones, with public HTTPS only at the ALB/CDN. One world task is still one availability failure domain even when the network and database span zones.

CDK owns infrastructure, service configuration and task definitions. The release pipeline supplies an explicit approved image digest and desired world count to the runtime stack. Persist that release input and reuse it for future infrastructure deployments; never let a routine CDK deployment reset the application to a hard-coded old image. Console changes are emergency operations that must be reconciled back into the reviewed configuration.

Implement separate IAM roles for image publishing, infrastructure deployment, task startup and runtime access. Restrict `iam:PassRole`; the game role must not administer the database, provision fleets or alter arbitrary S3 content. Backup/restore jobs use separate operator roles. Use GitHub OIDC rather than stored AWS access keys, and restrict both the token audience and the repository/environment subject. Fork pull requests receive no deployment credentials. [C01]

Set exact Auth0 issuer/callback/logout origins, secure cookies and application public origin. Inject database/provider credentials from Secrets Manager; do not bake them into the image or pass them in logged commands. Verify database TLS and trusted CA configuration. A private subnet alone is not encryption or least privilege. Measure NAT, VPC endpoint, cross-AZ, ALB, public IPv4 and log costs; provider calls still need a deliberately configured outbound path.

Apply deletion protection/retention to production data resources and inspect CloudFormation replacements before approval. Configure encrypted backups and recovery access outside ordinary game credentials. An infrastructure destroy command is never the routine way to reset staging or recover production.

### Bootstrap and image commands

The following assumes the proposed `infra/` application and Dockerfile have been implemented. Stack/context names are an interface to create, not existing repository commands. Use an authorized AWS CLI v2 session, Docker Buildx, pinned CDK/pnpm and values from the approved environment. Bootstrap changes the account and incurs infrastructure obligations; it is an operator action. [C02] [C03]

```sh
set -euo pipefail
: "${AWS_REGION:?Set the approved region}"
: "${AWS_ACCOUNT_ID:?Set the approved account}"
: "${ECR_REPOSITORY:?Set the provisioned repository name}"
: "${RELEASE_SHA:?Set the checked source commit}"
: "${FOUNDATION_STACK:?Set the CDK foundation stack name}"

# Check that credentials resolve to the intended account before any write.
test "$(aws sts get-caller-identity --query Account --output text)" = "$AWS_ACCOUNT_ID"
pnpm --dir infra exec cdk bootstrap "aws://$AWS_ACCOUNT_ID/$AWS_REGION"
pnpm --dir infra exec cdk diff "$FOUNDATION_STACK"
# Review the diff, permissions, retention and cost before approving deployment.
pnpm --dir infra exec cdk deploy "$FOUNDATION_STACK" --require-approval broadening

REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
REPOSITORY_URI="$REGISTRY/$ECR_REPOSITORY"
aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$REGISTRY"
docker buildx build --platform linux/amd64 \
  --tag "$REPOSITORY_URI:$RELEASE_SHA" --push .
DIGEST="$(aws ecr describe-images --repository-name "$ECR_REPOSITORY" \
  --image-ids imageTag="$RELEASE_SHA" --query 'imageDetails[0].imageDigest' --output text)"
[[ "$DIGEST" == sha256:* ]]
RELEASE_IMAGE="$REPOSITORY_URI@$DIGEST"
```

Build only from the checked, clean source revision; use immutable ECR tags and retain the image digest, build provenance, dependency inventory and scan result in the release record. CI should build once and promote that digest, not rebuild after staging approval. Environment secrets remain runtime inputs. A source SHA label alone does not prove which bytes were deployed.

## 3. Replace a world, not a stateless web replica

**Launch policy: a short announced maintenance interval for the affected world.** Use ordinary ECS with explicit lifecycle control, not Express Mode's mandatory canary request splitting. A stateless login/catalog service may later use ECS-native blue/green, linear or canary deployment. A world canary is a complete disposable or consenting world on the new version, not five percent of commands sent to a second writer of the same world. [C04]

Implement these release phases under PD04 before using the command fragments:

1. **Prepare.** Serialize releases for the world. Record the old/new image and task-definition identifiers, world/timeline, owner generation, durable head, content/schema/protocol versions, operator and recovery manifest. Confirm destination capacity and database compatibility. Existing no-legacy-support policy remains unchanged; an incompatible version blocks release rather than triggering a save conversion or reset.
2. **Close and drain.** Reuse maintenance state outside gameplay rewind, then activate a release-specific write gate through the same authoritative mutation owner. Ordinary maintenance deliberately permits creator editing; it is not a quiescence barrier. For deployment, also stop creator/world-authoring Apply, in-flight continuations and any other state-changing caller before capturing the final boundary. Only separately authorized release-control and necessary drain/accounting operations may proceed. Stop new admissions, notify connected players, and settle or durably record pending work. Preserve uncertain AI attempt identities and charges. A cancelled workflow must not clear the maintenance gate or redispatch paid work.
3. **Stop and fence.** Scale the old service to zero, wait for every old task to stop and confirm no pending/replacement task remains. Disable service autoscaling/rebalancing for this initial single-world procedure. Database ownership generations still fence stale commits. With shared mutable EFS save paths, a successor also needs explicit confirmation that the old file writer has stopped; a lease does not revoke an NFS mount. If that cannot be established, keep the world unavailable.
4. **Capture and install.** With the server stopped, produce and verify the current operational backup into a new destination, including PostgreSQL records, retained files and content pins. Run only approved current-format preparation. Register the new immutable task definition while desired count remains zero.
5. **Start closed.** Start one successor, grant its new ownership generation only after the previous phase, load the committed world and validate its dependencies. Automatic ECS replacement must obey the same startup/write gate; a replacement process is not automatically authorized to mutate files or advance the world.
6. **Verify and reopen.** Confirm the actual task definition/image, unique owner and expected durable state. Exercise an authorized native command, private-view denial, reconnect and asset fallback. Then reopen admissions and observe the rollout. Failure leaves maintenance in place; use a compatible code rollback or an explicit recovery procedure, not a blind database rewind.

A scheduler setting such as `minimumHealthyPercent=0, maximumPercent=100` is a useful stop-before-start guard for a one-task rolling service, **not a substitute for ownership fencing**. Default overlapping web rollouts are inappropriate. ECS task protection does not survive every failure. Shutdown, image pull, world load and health-check grace periods need measured budgets; Fargate's stop timeout is bounded, so a killed process must recover without relying on a final successful save. [C05]

### Release command fragments

This example deliberately uses CDK for task-definition changes so the release path and infrastructure path do not become competing configuration owners. Implement the context keys `releaseImage` and `worldDesiredCount` in the runtime stack. Keep all unrelated infrastructure changes out of this release. The phases above are required even when these CLI commands succeed.

```sh
: "${CLUSTER:?Set the cluster name}"
: "${SERVICE:?Set the world service name}"
: "${RUNTIME_STACK:?Set the runtime stack name}"
: "${OLD_IMAGE:?Set the exact currently approved image digest URI}"
: "${RELEASE_IMAGE:?Set the staged image digest URI}"

# Only after the application's durable maintenance/drain phase has succeeded.
OLD_TASKS="$(aws ecs list-tasks --cluster "$CLUSTER" --service-name "$SERVICE" \
  --desired-status RUNNING --query taskArns --output text)"
pnpm --dir infra exec cdk deploy "$RUNTIME_STACK" \
  -c releaseImage="$OLD_IMAGE" -c worldDesiredCount=0 --require-approval broadening
if [[ -n "$OLD_TASKS" && "$OLD_TASKS" != None ]]; then
  read -r -a OLD_TASK_ARRAY <<< "$OLD_TASKS"
  aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "${OLD_TASK_ARRAY[@]}"
fi
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE"
aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}'
```

Verify zero desired/running/pending counts and enumerate tasks again, including any task that appeared during draining. Inspect failed waiter/API results; never continue after a timeout by assuming termination. This fragment covers the initial single-service world, not arbitrary task counts or regional fleet evacuation. [C05] [C06]

The existing offline backup entry point can run in an authorized one-off operator task with database access and the correct EFS mount. It refuses an existing destination. Keep its output in protected storage and record verification before continuing:

```sh
# Existing repository command; the game server must already be stopped.
: "${NEW_BACKUP_DIRECTORY:?Set a new protected backup destination}"
node --import tsx scripts/backup-world.ts "$NEW_BACKUP_DIRECTORY"
```

See [the actual backup command](../../scripts/backup-world.ts). The ECS operator-task definition, scheduling and remote backup upload are still PD06 implementation work. Do not invent a running backup service merely from the availability of this local command.

```sh
# After backup/compatibility checks; keep the application maintenance gate closed.
pnpm --dir infra exec cdk diff "$RUNTIME_STACK" \
  -c releaseImage="$RELEASE_IMAGE" -c worldDesiredCount=0
pnpm --dir infra exec cdk deploy "$RUNTIME_STACK" \
  -c releaseImage="$RELEASE_IMAGE" -c worldDesiredCount=0 --require-approval broadening
pnpm --dir infra exec cdk deploy "$RUNTIME_STACK" \
  -c releaseImage="$RELEASE_IMAGE" -c worldDesiredCount=1 --require-approval broadening
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE"
aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" \
  --query 'services[0].{taskDefinition:taskDefinition,deployments:deployments,events:events[:5]}'
```

A stable service can be the **old** version after a rollback. Compare running tasks' definition and image digest against the approved release, then perform application checks. Store the final image/count inputs for subsequent CDK operations. `aws ecs update-service --desired-count 0` is an emergency containment mechanism, not a second routine release owner; record and reconcile any such change. [C05] [C07]

### Health and connection behavior

Add distinct minimal liveness and readiness endpoints. Liveness must not depend on a model provider or Auth0 being online. Readiness covers initialized world state, current write authority, required storage/content and the intended serving phase. Optional art can use its approved fallback. Public diagnostics must not reveal private world contents or credentials.

**Enforce maintenance/authority in the application even when readiness is false.** Reuse the existing gameplay maintenance gate, and qualify the stronger release gate against creator editing and already-admitted continuations as well as ordinary player commands. ALB can route to unhealthy targets when all targets are unhealthy; a failing health check is not an access-control barrier. Existing streams also need command admission checks and bounded shutdown. Configure SSE heartbeats, proxy buffering, idle timeout and jittered reconnect; test slow/background/mobile browsers and old cursors. [C08]

## 4. CI/CD that an operator can understand

Retain one release record from source to deployment: source commit, image digest, configuration schema, database/extension versions, world-module/content pins, approved model/prompt policy, task definition, backup boundary and checks. Secrets are references, never copied into this record.

**Pull requests:** run the existing checks with disposable PostgreSQL and no paid AI; validate the Docker build, CDK synthesis/diff and changed configuration. Keep third-party actions pinned to reviewed commit SHAs. Do not give untrusted PR code cloud credentials or use a privileged `pull_request_target` job to build it.

**Trusted build:** after required checks, build/push the immutable image, scan it, record provenance and retention, then deploy that digest to a disposable native-only staging world. Auth0 end-to-end, graphics and live AI qualification are separate checks, not inferred from unit tests or a healthy task.

**Production promotion:** use a protected GitHub environment with required approval and a manually selected qualified release. Obtain short-lived OIDC credentials only in the deployment job. Serialize by environment/world with `cancel-in-progress: false`; still persist phases because runner loss or an operator cancellation can interrupt the job. Every retry reads the release phase and actual world/cloud state before performing a write. Do not automatically rerun a partly completed paid or destructive operation. [C01] [C09]

**Rollback:** retain old images and compatible content. Cancel admission to the new release, drain it and use the same stopped-world procedure with a compatible old image. Schema, content and outstanding AI job compatibility must be established; application rollback does not undo an incompatible database change or a financial charge. Never enable automatic database restoration on a failed deployment.

**Routine operation:** use CloudWatch logs/alarms and restricted sampled OpenTelemetry traces first, with one operator view linking release, world health, joins, storage, AI and cost. For example, `aws logs tail "$LOG_GROUP" --since 30m` can inspect an authorized log group. ECS Exec is restricted break-glass access, not the deployment process; an interactive shell cannot replace durable configuration. Alerts need an owner and a containment/recovery instruction.

**Version gap to close:** current CI runs `pgvector/pgvector:pg16`; the proposed production database is PostgreSQL 18 with a supported pgvector release. Add qualification on the exact selected production major/extension before launch. A passing PG16 workflow is not that evidence. This is environment qualification, not permission to add legacy-save compatibility.

## 5. Publish assets independently

Start with curated mercenary delivery, not a complete AI art factory. The [art contract](../invention-art-pipeline.md) retains semantic validation, rights, fallbacks and save pins. This sequence supplies its production storage and tooling.

**Curated publication:** retain source/provenance privately, produce a bounded runtime bundle, inspect it with pinned glTF Transform and Khronos validation, test the actual PlayCanvas loader, upload immutable bytes, verify checksums, then atomically publish the authorized metadata/binding. Never publish the database pointer before its dependencies exist. Reuse textures/rigs; measure download, decode, upload-to-GPU and steady VRAM separately. An optimized file is not automatically a correctly rigged or mechanically faithful character.

A minimal upload primitive for one already-approved public GLB is below. The bucket remains origin-private behind CloudFront OAC; the public cache policy is appropriate only for content approved for public distribution. Restricted content needs its own viewer authorization/cache policy. This is **not** the missing manifest/rights publisher. [C10]

```sh
: "${ASSET_BUCKET:?Set the approved runtime asset bucket}"
: "${ASSET_FILE:?Set the validated GLB path}"
HASH="$(shasum -a 256 "$ASSET_FILE" | awk '{print $1}')"
aws s3api put-object --bucket "$ASSET_BUCKET" \
  --key "runtime/sha256/$HASH.glb" --body "$ASSET_FILE" \
  --content-type model/gltf-binary --checksum-algorithm SHA256 \
  --if-none-match '*' --cache-control 'public,max-age=31536000,immutable'
```

On an existing-key response, verify the stored SHA-256 and metadata before treating it as an idempotent success; an ETag is not universally the file's SHA-256. Other failures remain failures. Publish a new manifest revision through expected-version checks. Do not use `s3 sync --delete` on the live library. A bad new asset rolls back its binding, not the game database. Preserve every dependency pinned by retained saves, active worlds or released packs.

**Generated publication:** add private quarantine and an asynchronous conversion/review worker only after the curated path passes. Use a small source queue with durable job/attempt IDs; do not run Blender, untrusted decoders or arbitrary asset fetches inside the simulation process. Disable executable/scripted asset behavior and arbitrary external references; bound compressed/decoded size, CPU, memory, output count and elapsed work. A model-supplied URL must not reach internal services or cloud metadata. Reconcile unknown provider completion before another paid attempt.

Evaluate a current OpenAI image API and Gemini image API against the same permitted briefs, references and in-game acceptance scenes. Their official guides are integration leads, not a quality ranking or a promise of production-ready 3D rigs. Pin the selected model/toolchain and evaluate identity preservation, silhouettes, transparency, camera directions, equipment alignment, latency, cost and rights. Prefer existing family assets or authored 3D sources for coherent animation; retain an adequate native fallback while optional generation runs. Do not make image generation a prerequisite for the first hosted release. [C11] [C12]

**Client/release qualification:** test a fresh browser, cache hit, interrupted/corrupt download, expired authorization, withdrawn asset, version change during load, context loss and low-memory mobile devices. Include decoder/WASM compatibility and CORS/CSP settings. Keep browser source maps private to diagnostics. A downloaded secret cannot be recalled; manifests and prefetching must not reveal hidden actors or human-private content. Technical deduplication never grants cross-world asset rights.

## 6. Enable AI without making it the world clock

Use the existing Macrofold/provider boundary. First qualify native-only hosting and explicit AI-unavailable UI; then configure the authorized Worker and run a small separately funded live cohort. Treat Worker allocation/idle cost, model calls, embeddings, tool work and image generation as distinct expenses counted once.

Add global and per-world/account admission, weighted fairness, concurrency and queue-age limits before public AI. Schedule interactive dialogue separately from reflection, embeddings and art, without starving required autonomous behavior. Native mechanics and valid native plans continue without waiting for inference. Durable attempts preserve model/prompt/input-policy revisions, publication authority, cancellation and uncertain usage; model changes canary on a bounded cohort, never by silently regenerating historical outcomes.

Define three different controls: stop new paid admissions, cancel known active attempts where supported, and operator-managed reduction of reserved/idle compute. The first does not accomplish the other two. Provider outage or missing usage is not permission for automatic paid fallback. Never treat a per-agent allowance as a fleet-wide bill cap.

Measure context preparation, queue wait, time to first useful output, full completion, accepted effect, failure/staleness rate and cost per quality-passing interaction. Only then compare managed APIs/reserved capacity with rented vLLM. Include KV cache, concurrent sequences, spare capacity, network locality and on-call work. Serving metrics help diagnose queueing and cache pressure; tokens/second alone cannot qualify the player experience. No owned GPU, multi-node inference cluster or permanent process per NPC is required for launch. [C13]

## 7. Expand without multiplying control-plane objects forever

First add a durable world directory and a narrow join path: authenticate → check current grants → choose the world's home cell → reserve qualified capacity → wake/load the world if needed → return an authorized route → bootstrap permitted state. Admission failure leaves the player at a safe existing location or an explicit waiting screen; it does not create a duplicate character/world. Existing worlds must not depend on global discovery being available for every native step; current authorization and revocation rules still apply.

A service/target group per world is understandable for the first small cohort, not a million-world architecture. Before cloud object quotas or idle cost dominate, introduce cell-local gateways, bounded worker pools and placement records rather than more ALB rules per player. Account for task launch rates, Fargate/EC2 quotas, subnet IPs/ENIs, load-balancer targets/rules, database connections and provider/Auth0 quotas. Scale and prewarm for join bursts; autoscaling cannot instantaneously rescue an overloaded owner. [C14]

Place by measured CPU/event-loop tails, loaded bytes, dirty records, sensory fanout, stream bandwidth and AI queue demand. Preserve warm/spare capacity for failure and updates. The cost model must include unattended worlds. Active-working-set and shared-database-cohort changes require the existing repository/isolation work; today's separate-world databases cannot safely share one URL merely because a router exists.

Replicate a **qualified cell**, not a capacity claim. Estimate required cells from measured safe per-cell capacity plus failure reserve and workload skew, then test the busiest world and scene separately. A fleet serving many independent worlds does not prove 10,000 people can interact in one shared region. Inside a hot world, remove unnecessary work, bound working sets and only then split regional authority with explicit crossing and conserved-resource protocols. Keep consequential writes local to their owner; a global database or edge router does not remove intercontinental latency.

The comparative stack choices and promotion triggers remain in the [technical design](production-deployment-tech-design.md). No framework rewrite, mandatory Kubernetes, globally synchronous economy, silent NPC cloning, witness sampling or changed simulation clock is introduced by this playbook.

## 8. Close the non-server release gaps

**Disaster recovery:** distinguish gameplay rewind from database point-in-time restoration. Operational grants, erasures and billing may be outside gameplay saves yet still be rewound by restoring the entire database. Restore into isolation, reconcile current control/privacy ledgers and external financial/provider receipts to a verified boundary, and reopen only after authority is current. Unknown latest revocations or financial outcomes require fail-closed reconciliation, not blanket restoration of old sessions. Exercise lost owner, lost database, damaged files, missing content, uncertain AI and failed restore separately.

**Security and abuse:** qualify server-side command authority/resource conservation, request and upload bounds, costly-authoring abuse, human-private projections, account recovery and audited operator tools. WAF and DDoS mitigation do not supply game authorization or prevent application-level spend abuse. Implement support/report/mute/block/ban behavior before public social play; operators need least-privilege access and a real incident contact.

**Product and rights:** make first-run onboarding, world availability, failed joins, maintenance, AI-unavailable behavior and missing art understandable. Review asset/source licenses, in-game attribution, AGPL obligations, UGC takedowns, privacy/retention, age policy, launch territories and deletion/export with appropriate counsel. Do not claim compliance from using Auth0 or a managed cloud. Payments, creator payouts and voice remain disabled until their separate gates pass.

**Operations:** test delivery/recovery email, credential rotation, a bad client/model/asset release, reconnect storms, capacity refusal, runaway spend and a fresh-environment restore. Select journey objectives and monthly budgets before measuring acceptance; log sampling and bounded labels prevent telemetry from becoming the largest database. Publish what happens to people, possessions and time during an outage; do not promise continuously progressing unattended worlds before their lifecycle contract is implemented.

## Maintained records

- Implementation and verification gates: [PD delivery](../maintainers/production-deployment.md), with existing D5/D6, MP, SL, PF, MW and art owners retained.
- Limits and constraints: [Deployment inventory](../limits/production-deployment.md).
- Related requirements and decisions: [Feature specification](production-deployment-feature-spec.md) and [technical design](production-deployment-tech-design.md).

## Primary references

Checked 2 October 2026. CLI examples require the future repository integration described above; external commands being documented does not establish application readiness.

[C01]: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
[C02]: https://docs.aws.amazon.com/cdk/v2/guide/cli.html
[C03]: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
[C04]: https://aws.amazon.com/blogs/containers/extending-amazon-ecs-express-mode-to-build-an-optimal-container-environment/
[C05]: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
[C06]: https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/tasks-stopped.html
[C07]: https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html
[C08]: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
[C09]: https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/amazon-elastic-container-service
[C10]: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object.html
[C11]: https://developers.openai.com/api/docs/guides/image-generation
[C12]: https://ai.google.dev/gemini-api/docs/image-generation
[C13]: https://docs.vllm.ai/en/stable/usage/metrics/
[C14]: https://docs.aws.amazon.com/general/latest/gr/ecs-service.html
