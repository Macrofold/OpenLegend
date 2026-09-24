from pathlib import Path
import re

def edit(path, old, new):
    p=Path(path); s=p.read_text()
    if old not in s:
        if new in s: return
        raise RuntimeError(f'Missing exact source in {path}: {old[:100]}')
    if s.count(old)!=1: raise RuntimeError(f'Ambiguous source in {path}: {old[:100]}')
    p.write_text(s.replace(old,new,1))

p='packages/domain/src/agency.ts'
edit(p,"import { finitePoint }", "import { FOLLOW_RULES } from './follow.js';\nimport { finitePoint }")
edit(p,"    normalized: string;\n    manifestRevision: number;", "    normalized: string;\n    targetEntityId: string | null;\n    mode: 'enqueue' | 'replace';\n    manifestRevision: number;")
edit(p,"    if (mode === 'replace' && actor.action) {\n      actor.action = null;\n      actor.planGeneration++;\n    }", "    if (mode === 'replace' && actor.action) actor.action = null;")
edit(p,"  agency.revision++;\n  return {\n    ...outcome(true, 'queued'", "  agency.revision++;\n  // Queued edits are new execution intent too, even before any physical step starts.\n  // docs/architecture.md#action-fulfillment-and-revision-approval\n  actor.planGeneration++;\n  return {\n    ...outcome(true, 'queued'")
edit(p,"  plan.status = 'cancelled';\n  plan.revision++;\n  actor.agency.revision++;", "  plan.status = 'cancelled';\n  plan.revision++;\n  actor.agency.revision++;\n  actor.planGeneration++;")
edit(p,"        action.follow.distance < 1.5 ||\n        action.follow.distance > 12 ||\n        !Number.isFinite(action.follow.nextRepathAt)", "        action.follow.distance < FOLLOW_RULES.minimumDistance ||\n        action.follow.distance > FOLLOW_RULES.maximumDistance ||\n        !Number.isFinite(action.follow.nextRepathAt) ||\n        action.follow.nextRepathAt < 0 ||\n        (action.follow.lastObservedPosition !== undefined &&\n          !finitePoint(action.follow.lastObservedPosition))")
edit(p,"        typeof attempt.normalized !== 'string' ||\n        attempt.normalized.length > 1000 ||", "        typeof attempt.normalized !== 'string' ||\n        attempt.normalized !== normalizeAttempt(attempt.description) ||\n        !(attempt.targetEntityId === null || isSafeRecordId(attempt.targetEntityId)) ||\n        !['enqueue', 'replace'].includes(attempt.mode) ||")
edit(p,"          !validActionFulfillment(a.fulfillment) ||", "          !validActionFulfillment(a.fulfillment) ||\n          a.fulfillment.verdict !== 'confirm' ||\n          a.fulfillment.requested !== attempt.description ||\n          a.mode !== attempt.mode ||")
edit(p,"          a.commands.length > AGENCY_LIMITS.steps ||\n          a.commands.some", "          a.commands.length > AGENCY_LIMITS.steps ||\n          !validOutputReferences(a.commands) ||\n          a.commands.some")
edit(p,"export function resolveAttempt(actor: ActorComponent, description: string): void {\n  const matching = actor.agency.attempts.filter(\n    (attempt) => attempt.normalized === normalizeAttempt(description),\n  );", "export function sameAttempt(\n  attempt: ActorAgency['attempts'][number],\n  description: string,\n  targetEntityId: string | null = null,\n  mode: 'enqueue' | 'replace' = 'enqueue',\n): boolean {\n  return attempt.normalized === normalizeAttempt(description) &&\n    attempt.targetEntityId === targetEntityId && attempt.mode === mode;\n}\n\nexport function resolveAttempt(\n  actor: ActorComponent, description: string,\n  targetEntityId: string | null = null,\n  mode: 'enqueue' | 'replace' = 'enqueue',\n): void {\n  const matching = actor.agency.attempts.filter(\n    (attempt) => sameAttempt(attempt, description, targetEntityId, mode),\n  );")
edit(p,"  description: string,\n): Outcome {\n  if (!isSafeRecordId(id) || !description.trim() || description.length > 500)", "  description: string,\n  targetEntityId: string | null = null,\n  mode: 'enqueue' | 'replace' = 'enqueue',\n): Outcome {\n  if (!isSafeRecordId(id) || typeof description !== 'string' || !description.trim() || description.length > 500 ||\n    !(targetEntityId === null || isSafeRecordId(targetEntityId)) || !['enqueue', 'replace'].includes(mode))")
edit(p,"      attempt.normalized === normalized &&\n      attempt.manifestRevision === world.moduleManifest.revision,", "      sameAttempt(attempt, description, targetEntityId, mode) &&\n      attempt.manifestRevision === world.moduleManifest.revision,")
edit(p,"  actor.agency.attempts.push({\n    id,\n    description: description.trim(),\n    normalized,", "  if (actor.agency.attempts.some((attempt) => attempt.id === id))\n    return outcome(false, 'attempt-conflict', 'This attempt identity belongs to different intent.');\n  actor.agency.attempts.push({\n    id,\n    description: description.trim(),\n    normalized,\n    targetEntityId,\n    mode,")
edit(p,"(Number.isFinite(command.distance) && command.distance >= 1.5 && command.distance <= 12)", "(Number.isFinite(command.distance) && command.distance >= FOLLOW_RULES.minimumDistance && command.distance <= FOLLOW_RULES.maximumDistance)")
edit(p,"  expectedPlan: number,\n): Outcome {\n  if (\n    !validActionFulfillment(fulfillment) ||", "  expectedPlan: number,\n  targetEntityId: string | null = null,\n): Outcome {\n  if (\n    !validActionFulfillment(fulfillment) ||\n    fulfillment.verdict !== 'confirm' ||\n    !['enqueue', 'replace'].includes(mode) ||\n    !Number.isSafeInteger(expectedPlan) || expectedPlan < 0 ||\n    !validOutputReferences(commands) ||")
edit(p,"const held = deferAttempt(world, actorId, id, fulfillment.requested);", "const held = deferAttempt(world, actorId, id, fulfillment.requested, targetEntityId, mode);")
edit(p,"      a.normalized === normalizeAttempt(fulfillment.requested) &&\n      a.manifestRevision", "      sameAttempt(a, fulfillment.requested, targetEntityId, mode) &&\n      a.manifestRevision")
edit(p,"  const actor = world.entities[actorId]!.actor!;\n  const pending = actor.agency.attempts.find(\n    (a) => a.id === attemptId", "  const actor = Object.hasOwn(world.entities, actorId) ? world.entities[actorId]?.actor : undefined;\n  if (!actor?.alive || actor.incapacitated || actor.rest?.asleep)\n    return outcome(false, 'actor-unavailable', 'The actor must be awake and able to approve new work.');\n  const pending = actor.agency.attempts.find(\n    (a) => a.id === attemptId")

p='packages/domain/src/response.ts'
edit(p,"export interface AttemptBinding {\n  fulfillment?: ActionFulfillment;", "export interface AttemptBinding {\n  /** Only resolved request-local operations carry these pins; offered descriptions are not authority. */\n  operationId?: string;\n  manifestRevision?: number;\n  fulfillment?: ActionFulfillment;")
edit(p,"      const normalize = (text: string) => normalizeAttempt(text).replace(/[.!?]+$/u, '');\n      const matches = attemptBindings.filter(\n        (binding) => normalize(binding.description) === normalize(act.description!),\n      );", "      const matches = attemptBindings.filter(\n        (binding) => binding.operationId === localId && binding.description === act.description,\n      );")
edit(p,"        const selected = matches[0]!.commands;", "        const binding = matches[0]!;\n        if (binding.manifestRevision !== world.moduleManifest.revision) {\n          components[localId] = outcome(false, 'stale-mechanics', 'Mechanics changed after this action was interpreted.');\n          continue;\n        }\n        const selected = binding.commands;")
edit(p,"        if (fulfillment && !validActionFulfillment(fulfillment)) {", "        if (!fulfillment || !validActionFulfillment(fulfillment) || fulfillment.requested !== act.description) {")
edit(p,"        if (fulfillment?.verdict === 'confirm') {\n          components[localId]", "        if (fulfillment.verdict === 'confirm') {\n          if (act.mode === 'replace' && input.entities[actorId]!.actor!.planGeneration !== expectedPlan) {\n            components[localId] = outcome(false, 'stale-plan', 'The current native task changed.');\n            continue;\n          }\n          components[localId]")
edit(p,"            act.mode,\n            expectedPlan,\n          );", "            act.mode,\n            component.planGeneration,\n            act.targetEntityId,\n          );")
edit(p,"resolveAttempt(world.entities[actorId]!.actor!, act.description!);", "resolveAttempt(world.entities[actorId]!.actor!, act.description!, act.targetEntityId, act.mode);")
edit(p,"components[localId] = deferAttempt(world, actorId, `${id}:${localId}`, act.description!);", "components[localId] = deferAttempt(world, actorId, `${id}:${localId}`, act.description!, act.targetEntityId, act.mode);")
edit(p,"  normalizeAttempt,\n", "")

p='apps/server/src/action-grounding.ts'
edit(p,"  normalizeAttempt,\n", "  normalizeAttempt,\n  sameAttempt,\n")
edit(p,"  record(kind: string, input: unknown, output: unknown): Promise<void>;", "  record(kind: string, input: unknown, output: unknown): Promise<void>;\n  signal?: AbortSignal;\n  /** Explicit player resubmission may retry unavailable grounding; NPC retries remain bounded. */\n  retryUnresolved?: boolean;")
edit(p,"const normalize = (text: string) => normalizeAttempt(text).replace(/[.!?]+$/u, '');", "const normalize = normalizeAttempt;")
edit(p,"  targetId?: string | null,\n): NavigationInvocation | undefined", "  targetId?: string | null,\n  visibleEntities?: NonNullable<ReturnType<typeof observeActor>>['visibleEntities'],\n): NavigationInvocation | undefined")
edit(p,"  const visible =\n    observeActor(world, actorId)?.visibleEntities.filter(\n      (e) => e.actor?.alive && e.id !== actorId,\n    ) ?? [];", "  const visible = (visibleEntities ?? observeActor(world, actorId)?.visibleEntities ?? [])\n    .filter((e) => e.actor?.alive && e.id !== actorId);")
edit(p,"  if (!observed) return bindings;", "  if (!observed) return [];")
edit(p,"    const normalized = normalize(text);", "    ports.signal?.throwIfAborted();\n    const normalized = JSON.stringify([normalize(text), act.targetEntityId, act.mode]);")
edit(p,"          normalize(a.description) === normalized &&\n          a.manifestRevision === world.moduleManifest.revision,", "          sameAttempt(a, text, act.targetEntityId, act.mode) &&\n          a.manifestRevision === world.moduleManifest.revision &&\n          (a.status === 'awaiting-confirmation' || !ports.retryUnresolved),")
edit(p,"    if (bindings.some((b) => normalize(b.description) === normalized)) continue;", "    try {")
edit(p,"const exact = exactNavigation(text, world, actorId, act.targetEntityId);", "const exact = exactNavigation(text, world, actorId, act.targetEntityId, observed.visibleEntities);")
# Every resolved binding is operation-scoped, never an executable label match.
s=Path(p).read_text().replace("additions.push({ description: text,", "additions.push({ operationId: op.localId, manifestRevision: world.moduleManifest.revision, description: text,")
s=s.replace("  return [...bindings, ...additions];", "  return additions;")
# Catch per operation: a later unavailable semantic stage must not erase earlier bound operations.
pos=s.rfind("  }\n  return additions;")
if pos<0: raise RuntimeError('grounding loop end missing')
s=s[:pos]+"    } catch (error) {\n      ports.signal?.throwIfAborted();\n      await ports.record('Action grounding unavailable', { text, operationId: op.localId },\n        { reason: error instanceof Error ? error.message.slice(0, 1000) : 'Unavailable', retry: 'explicit only' });\n    }\n"+s[pos:]
Path(p).write_text(s)

# Schema changes deliberately reject earlier development snapshots. Keep historical helper type variants.
p=Path('packages/domain/src/types.ts'); s=p.read_text(); begin=s.index('export interface WorldState')
a=s[:begin]; b=s[begin:]
b,n=re.subn(r'(schemaVersion:\s*)([^;]+)(;)', lambda m:m[1]+m[2].rstrip()+' | 11'+m[3], b, count=1)
if n!=1:raise RuntimeError('world schema not found')
p.write_text(a+b)
edit('packages/domain/src/data.ts','schemaVersion: 10,','schemaVersion: 11,')
edit('packages/domain/src/world-modules.ts','world.schemaVersion !== 10','world.schemaVersion !== 11')
edit('apps/server/src/game-saves.ts',"development-2026-09-24-actions1", "development-2026-09-24-actions2")
edit('apps/server/src/game-saves.ts','payload.state.world.schemaVersion !== 10','payload.state.world.schemaVersion !== 11')

p='apps/server/src/ai-director.ts'
s=Path(p).read_text()
# Inspect later, but eliminate all raw candidate fallbacks for proposal admission.
s,n=re.subn(r'(let attemptBindings\s*:\s*AttemptBinding\[\]\s*=\s*)[^;]+;', r'\1[];', s)
if n!=1: raise RuntimeError(f'Expected one attemptBindings initialization, got {n}')
s=s.replace("const resolved = await groundActionAttempts(world, actorId, response, bindings, {", "const resolved = await groundActionAttempts(world, actorId, response, bindings, {\n      signal: run.controller.signal,\n      retryUnresolved: run.job.kind === 'action',")
Path(p).write_text(s)

# Targeted source context for the next review slice; removed before closeout.
requests={
 'apps/server/src/http.ts':["case '/api/action-attempt'", "case '/api/action-attempts'"],
 'apps/server/src/world-service.ts':['actionAttempts'],
 'apps/server/src/ai-director.ts':['let attemptBindings','groundAttempts(','thoughtWork.refresh'],
 'packages/protocol/src/index.ts':['interface PlayerActionAttempt'],
 'apps/server/src/view.ts':['jobs:','function projectPatch'],
}
out=[]
for path, terms in requests.items():
 lines=Path(path).read_text().splitlines();shown=set()
 for i,line in enumerate(lines):
  if any(t in line for t in terms) and i not in shown:
   out.append(f'### {path}:{i+1}')
   for k in range(max(0,i-3), min(len(lines),i+35)):
    out.append(f'{k+1}: {lines[k]}');shown.add(k)
Path('docs/verification/action-review-context.txt').write_text('\n'.join(out)+'\n')
