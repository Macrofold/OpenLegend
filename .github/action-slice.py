from pathlib import Path

def edit(path, old, new, count=1):
    p=Path(path); s=p.read_text()
    if old not in s:
        if new in s: return
        raise RuntimeError(f'Missing expected source in {path}: {old[:100]}')
    if s.count(old)!=count: raise RuntimeError(f'Ambiguous source in {path}: {old[:100]} ({s.count(old)})')
    p.write_text(s.replace(old,new))

def prepend(path, text):
    p=Path(path); s=p.read_text()
    if text not in s: p.write_text(text+s)

prepend('packages/domain/src/agency.ts',"import { validActionFulfillment, type ActionFulfillment } from './action-capabilities.js';\n")
edit('packages/domain/src/agency.ts',"    status: 'needs-interpretation';", """    status: 'needs-interpretation' | 'awaiting-confirmation';
    alternative?: {
      commands: Command[];
      fulfillment: ActionFulfillment;
      mode: 'enqueue' | 'replace';
      expectedPlan: number;
    };""")
edit('packages/domain/src/agency.ts',"attempt.status !== 'needs-interpretation'", "!['needs-interpretation', 'awaiting-confirmation'].includes(attempt.status)")
edit('packages/domain/src/agency.ts',"throw new Error('Invalid saved unlisted attempt.');", """throw new Error('Invalid saved unlisted attempt.');
      if (attempt.status === 'awaiting-confirmation') {
        const a = attempt.alternative;
        if (!a || !validActionFulfillment(a.fulfillment) || !['enqueue','replace'].includes(a.mode) || !Number.isSafeInteger(a.expectedPlan) || a.expectedPlan < 0 || !Array.isArray(a.commands) || !a.commands.length || a.commands.length > AGENCY_LIMITS.steps || a.commands.some(c => !isPlannedCommand(c) || c.actorId !== entity.id))
          throw new Error('Invalid saved action alternative.');
      }""")
edit('packages/domain/src/agency.ts',"    if (!entity.actor) continue;\n    const agency", """    if (!entity.actor) continue;
    const action = entity.actor.action;
    if (action?.type === 'follow' && (!action.follow || !isSafeRecordId(action.targetId) || !Number.isFinite(action.follow.distance) || action.follow.distance < 1.5 || action.follow.distance > 12 || !Number.isFinite(action.follow.nextRepathAt)))
      throw new Error('Invalid saved follow activity.');
    const agency""")
p=Path('packages/domain/src/agency.ts'); p.write_text(p.read_text()+'''

/** An uncertain relaxation has no execution authority until the owner chooses it.
 * docs/architecture.md#action-fulfillment-and-revision-approval
 */
export function proposeActionRevision(world: WorldState, actorId: string, id: string, commands: Command[], fulfillment: ActionFulfillment, mode: 'enqueue' | 'replace', expectedPlan: number): Outcome {
  if (!validActionFulfillment(fulfillment) || !commands.length || commands.length > AGENCY_LIMITS.steps || commands.some(c => !isPlannedCommand(c) || c.actorId !== actorId))
    return outcome(false, 'invalid-alternative', 'The revised action is not a supported native plan.');
  const held = deferAttempt(world, actorId, id, fulfillment.requested);
  if (!held.ok) return held;
  const actor = world.entities[actorId]!.actor!;
  const pending = actor.agency.attempts.find(a => a.normalized === normalizeAttempt(fulfillment.requested))!;
  if (pending.status !== 'awaiting-confirmation') {
    pending.status = 'awaiting-confirmation';
    pending.alternative = { commands: cloneValue(commands), fulfillment: cloneValue(fulfillment), mode, expectedPlan };
    actor.agency.revision++;
    appendMemory(world, actorId, { kind:'episode', source:'internal', summary:`A revised action needs my decision: ${fulfillment.executableDescription}. Not fulfilled: ${fulfillment.omitted.map(o => o.requirement).join('; ')}.`, entityIds:[actorId], importance:6 });
  }
  return outcome(false, 'needs-confirmation', `Accept revised action? ${fulfillment.executableDescription} Not fulfilled: ${fulfillment.omitted.map(o => o.requirement).join('; ')}`);
}

export function confirmActionRevision(world: WorldState, actorId: string, attemptId: string, id: string): Outcome {
  const actor = world.entities[actorId]!.actor!;
  const pending = actor.agency.attempts.find(a => a.id === attemptId && a.status === 'awaiting-confirmation');
  const alternative = pending?.alternative;
  if (!pending || !alternative) return outcome(false, 'attempt-unavailable', 'That revised action is no longer awaiting your decision.');
  if (pending.manifestRevision !== world.moduleManifest.revision || (alternative.mode === 'replace' && actor.planGeneration !== alternative.expectedPlan))
    return outcome(false, 'stale-alternative', 'Mechanics or current work changed. Submit a fresh action instead of accepting this old replacement.');
  const result = arrangePlan(actor, id, alternative.commands.map((c,index) => ({...c, actorId, id:`${id}:${index}`})), alternative.mode, actor.agency.plan?.revision ?? 0, null);
  if (result.ok) withdrawAttempt(actor, attemptId);
  return result;
}
''')
edit('packages/domain/src/types.ts',"| { type: 'withdraw-attempt'; attemptId: string }", "| { type: 'withdraw-attempt' | 'confirm-attempt'; attemptId: string }")
prepend('packages/domain/src/kernel.ts',"import { confirmActionRevision } from './agency.js';\n")
edit('packages/domain/src/kernel.ts',"    case 'withdraw-attempt': {", "    case 'confirm-attempt': {\n      result = confirmActionRevision(world, actor.id, command.attemptId, command.id);\n      break;\n    }\n    case 'withdraw-attempt': {")
prepend('packages/domain/src/response.ts',"import { bindNavigationInvocation, validActionFulfillment, type NavigationInvocation, type ActionFulfillment } from './action-capabilities.js';\nimport { proposeActionRevision } from './agency.js';\n")
edit('packages/domain/src/response.ts',"kind: 'known' | 'expression' | 'proposal';", "kind: 'known' | 'expression' | 'proposal' | 'invoke';\n    invocation?: NavigationInvocation | null;")
edit('packages/domain/src/response.ts',"export interface AttemptBinding {\n  description: string;", "export interface AttemptBinding {\n  fulfillment?: ActionFulfillment;\n  description: string;")
edit('packages/domain/src/response.ts',"['kind', 'actionId', 'verb', 'targetEntityId', 'description', 'mode']", "['kind', 'actionId', 'verb', 'targetEntityId', 'description', 'mode', ...(op.act.invocation !== undefined ? ['invocation'] : [])]")
edit('packages/domain/src/response.ts',"!['known', 'expression', 'proposal'].includes(op.act.kind)", "!['known', 'expression', 'proposal', 'invoke'].includes(op.act.kind)")
p=Path('packages/domain/src/response.ts'); s=p.read_text(); a=s.index('    const invalidActShape ='); b=s.index('    if (invalidActShape)',a)
s=s[:a]+'''    const invalidActShape = !!act && (
      (act.kind !== 'invoke' && act.invocation != null) ||
      (act.kind === 'invoke' && (!act.invocation || act.actionId || act.verb || act.targetEntityId || act.description)) ||
      (act.kind === 'known' && (!act.actionId || act.verb || act.targetEntityId || act.description)) ||
      (act.kind === 'expression' && (!act.verb || act.actionId || act.description)) ||
      (act.kind === 'proposal' && (!act.description || act.description.length > 500 || act.actionId || act.verb || (act.targetEntityId && !permitted.has(act.targetEntityId))))
    );
'''+s[b:]; p.write_text(s)
edit('packages/domain/src/response.ts',"    } else if (act?.kind === 'known' && !Object.hasOwn(actions, act.actionId!)) {", """    } else if (act?.kind === 'invoke') {
      const bound = bindNavigationInvocation(world, actorId, `${id}:${localId}`, act.invocation, entityIds);
      if ('ok' in bound) components[localId] = bound;
      else if (act.mode === 'replace' && input.entities[actorId]!.actor!.planGeneration !== expectedPlan)
        components[localId] = outcome(false, 'stale-plan', 'The current task changed.');
      else components[localId] = arrangePlan(world.entities[actorId]!.actor!, `${id}:${localId}`, [bound], act.mode, world.entities[actorId]!.actor!.agency.plan?.revision ?? 0, null);
    } else if (act?.kind === 'known' && !Object.hasOwn(actions, act.actionId!)) {""")
edit('packages/domain/src/response.ts',"'cancel', 'recover', 'withdraw-attempt'", "'cancel', 'recover', 'withdraw-attempt', 'confirm-attempt'",2)
edit('packages/domain/src/response.ts',"        const selected = matches[0]!.commands;\n        if (", """        const selected = matches[0]!.commands;
        const fulfillment = matches[0]!.fulfillment;
        if (fulfillment && !validActionFulfillment(fulfillment)) {
          components[localId] = outcome(false, 'invalid-fulfillment', 'The action fulfillment report is invalid.');
          continue;
        }
        if (fulfillment?.verdict === 'confirm') {
          components[localId] = proposeActionRevision(world, actorId, `${id}:${localId}`, selected.map((c,index) => ({...c,actorId,id:`${id}:${localId}:${index}`})), fulfillment, act.mode, expectedPlan);
          continue;
        }
        if (""")
edit('packages/domain/src/index.ts',"export * from './agency.js';", "export * from './agency.js';\nexport * from './action-capabilities.js';")
# Native command adapters share existing user authority; callers cannot select another actor.
edit('packages/protocol/src/index.ts',"    | 'follow'", "    | 'follow'\n    | 'confirm-attempt'\n    | 'withdraw-attempt'")
edit('packages/protocol/src/index.ts',"  distance?: number;", "  distance?: number;\n  attemptId?: string;")
edit('apps/server/src/world-service.ts',"      'follow',", "      'follow',\n      'confirm-attempt',\n      'withdraw-attempt',")
edit('apps/server/src/world-service.ts',"    distance: z.number().min(1.5).max(12).optional(),", "    distance: z.number().min(1.5).max(12).optional(),\n    attemptId: id.optional(),")
edit('apps/server/src/world-service.ts',"      case 'follow':", """      case 'confirm-attempt':
      case 'withdraw-attempt':
        if (!input.attemptId) return { ok: false, code: 'attempt', message: 'Choose a pending action.' };
        command = { ...envelope, type: input.type, attemptId: input.attemptId };
        break;
      case 'follow':""")
edit('apps/server/src/cognition.ts',"    case 'follow':", "    case 'confirm-attempt':\n    case 'withdraw-attempt':\n      return { ...base, type: input.type, attemptId: input.attemptId! };\n    case 'follow':")
edit('apps/server/src/action-descriptions.ts',"  follow:", "  'confirm-attempt': 'Accept the exact revised action and its disclosed omissions. Native prerequisites are rechecked before execution.',\n  'withdraw-attempt': 'Decline or withdraw a pending action; ongoing work is unchanged.',\n  follow:")
# The parser still uses the ordinary bounded response envelope, with explicit invocation arguments.
prepend('apps/server/src/cognition-contracts.ts',"export const NAVIGATION_INSTRUCTIONS = 'For movement not listed in suggestions use act.kind=invoke and invocation={family:move,x,z,surfaceId,targetEntityId:null,distance:null}; coordinates are world X/Z, not height. For ordinary visible following use invocation={family:follow,x:null,z:null,surfaceId:null,targetEntityId:exactReference,distance:null}. Other act fields are null. Follow stops on lost sight, cancellation or native interruption; it does not support stealth or sunset termination. Put a request with unsupported qualifiers in kind=proposal instead, preserving its text and optional targetEntityId, so fulfillment can be reviewed. Never silently drop a requirement by choosing a direct invocation. For any non-invoke act, invocation is null.';\n")
edit('apps/server/src/cognition-contracts.ts',"kind: z.enum(['known', 'expression', 'proposal']),", """kind: z.enum(['known', 'expression', 'proposal', 'invoke']),
        invocation: z.object({family:z.enum(['move','follow']),x:z.number().finite().nullable(),z:z.number().finite().nullable(),surfaceId:z.string().min(1).max(120).nullable(),targetEntityId:z.string().min(1).max(120).nullable(),distance:z.number().min(1.5).max(12).nullable()}).strict().nullable().optional(),""")
# The current schema remains a request-bound provider view; domain validates the exact references again.
edit('apps/server/src/decision-context.ts',"COGNITION_VERSION, RESPONSE_INSTRUCTIONS", "COGNITION_VERSION, RESPONSE_INSTRUCTIONS, NAVIGATION_INSTRUCTIONS")
edit('apps/server/src/decision-context.ts',"    stimulus,\n    intentActions:", "    stimulus,\n    navigation: NAVIGATION_INSTRUCTIONS,\n    currentPosition: observed.actor.position,\n    currentSupport: observed.actor.spatial.supportSurfaceId,\n    publicSurfaces: world.map.spatial.disclosure === 'public' ? world.map.spatial.surfaces.map(({id,name}) => ({id,name})) : [],\n    intentActions:",1)
# There are two context assemblies, with the refreshed one using current state.
edit('apps/server/src/decision-context.ts',"    stimulus,\n    intentActions:", "    stimulus,\n    navigation: NAVIGATION_INSTRUCTIONS,\n    currentPosition: currentObserved.actor.position,\n    currentSupport: currentObserved.actor.spatial.supportSurfaceId,\n    publicSurfaces: currentWorld.map.spatial.disclosure === 'public' ? currentWorld.map.spatial.surfaces.map(({id,name}) => ({id,name})) : [],\n    intentActions:",1)
# Extra metadata must actually reach the readable prompt, not sit in unused context fields.
edit('apps/server/src/decision-context.ts',"const prompt = readableDecisionContext(context, offered, false);", "const prompt = readableDecisionContext(context, offered, false) + `\\nNavigation: ${NAVIGATION_INSTRUCTIONS}\\nPosition/support: ${JSON.stringify({position:currentObserved.actor.position,support:currentObserved.actor.spatial.supportSurfaceId})}\\nPublic supports: ${JSON.stringify(context['publicSurfaces'])}`;")
# Pending alternatives are explicitly offered to the actor, not accepted on its behalf.
p=Path('apps/server/src/decision-context.ts'); s=p.read_text(); start=s.index('  const intentActions ='); end=s.index('  const planActions =',start)
s=s[:start]+'''  const intentActions = observed.actor.actor!.agency.attempts.flatMap((attempt, index) => [
    { id:`w${index}`, description:`Decline/withdraw pending intent: ${attempt.description}`, command:{type:'withdraw-attempt' as const,id:jobId,actorId,attemptId:attempt.id} },
    ...(attempt.alternative ? [{ id:`c${index}`, description:`Accept this revised action? ${attempt.alternative.fulfillment.executableDescription}. Not fulfilled: ${attempt.alternative.fulfillment.omitted.map(o => o.requirement).join('; ')}. ${attempt.alternative.fulfillment.reason}`, command:{type:'confirm-attempt' as const,id:jobId,actorId,attemptId:attempt.id} }] : [])
  ]);
'''+s[end:]; p.write_text(s)
with Path('docs/architecture.md').open('a') as f: f.write('''\n\n## Action fulfillment and revision approval\n\nParameterized `invoke` operations bind native move/follow arguments through one domain adapter. Explicit freeform proposals can retain a scoped target reference. A server-produced fulfillment report can require confirmation: the proposed command sequence and omissions then live in the actor's existing private pending-intent owner, without starting or replacing work. The actor may select an explicit accept or withdraw handle in a later ordinary decision; player accept/decline uses the same native command owner. Acceptance pins the stored alternative, rechecks manifest and replacement-work freshness, and queues ordinary native steps whose live prerequisites are checked at execution. This is not a new invention registry or a general workflow interpreter.\n''')
with Path('docs/maintainers/TODO.md').open('a') as f: f.write('''\n- Add deferred automated coverage for invocation field/target scope, coordinate/floor ambiguity, direct actor move/follow, exact pending-alternative acceptance, decline, stale replacement, manifest changes, save/load, and no physical mutation before confirmation. No tests are added by this implementation slice.\n''')
Path('/tmp/action-message').write_text('[skip ci] feat: bind native navigation and persist owner-approved action revisions')
