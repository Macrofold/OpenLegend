from pathlib import Path

def edit(path, old, new):
 p=Path(path);s=p.read_text()
 if old not in s: raise RuntimeError(f'Missing source {path}: {old[:100]}')
 if s.count(old)!=1: raise RuntimeError(f'Ambiguous source {path}: {old[:100]}')
 p.write_text(s.replace(old,new,1))

# Keep provider schemas independent of the interpreter that consumes them.
p=Path('apps/server/src/action-grounding.ts');s=p.read_text()
a=s.index('export const navigationInvocationSchema');b=s.index('interface GroundingPorts',a)
schema=s[a:b].replace('z.number().min(1.5).max(12)', 'z.number().min(FOLLOW_RULES.minimumDistance).max(FOLLOW_RULES.maximumDistance)')
s=s[:a]+s[b:]
s="import { navigationInvocationSchema } from './navigation-contracts.js';\n"+s
s=s.replace('  NAVIGATION_CAPABILITIES,', '  NAVIGATION_CAPABILITIES,\n  FOLLOW_RULES,')
p.write_text(s)
p=Path('apps/server/src/cognition-contracts.ts');s=p.read_text()
a=s.index('export const NAVIGATION_INSTRUCTIONS');b=s.index("import { z }",a)
instructions=s[a:b]
s=s[:a]+"export { NAVIGATION_INSTRUCTIONS } from './navigation-contracts.js';\n"+s[b:]
s=s.replace("from './action-grounding.js'", "from './navigation-contracts.js'")
s=s.replace('cognition-v11-action-invocations','cognition-v12-reviewed-actions')
p.write_text(s)
Path('apps/server/src/navigation-contracts.ts').write_text("import { z } from 'zod';\nimport { FOLLOW_RULES } from '@open-legend/domain';\n\n"+schema+instructions)
edit('packages/domain/src/action-capabilities.ts', "import { FOLLOW_RULES } from './follow.js';", "import { FOLLOW_RULES } from './follow.js';\nexport { FOLLOW_RULES } from './follow.js';")

p='apps/server/src/action-grounding.ts'
s=Path(p).read_text()
s=s.replace('const seen = new Set<string>();', 'const seen = new Map<string, string>();')
a=s.index('    if (\n      seen.has(normalized)');b=s.index('    try {',a)
s=s[:a]+'''    const priorOperation = seen.get(normalized);
    if (priorOperation) {
      const prior = additions.find((binding) => binding.operationId === priorOperation);
      if (prior?.fulfillment) additions.push({ ...prior, operationId: op.localId,
        description: text, fulfillment: { ...prior.fulfillment, requested: text } });
      continue; // Repeat the chosen invocation, not its paid interpretation.
    }
    if (actor.agency.attempts.some((pending) =>
      sameAttempt(pending, text, act.targetEntityId, act.mode) &&
      pending.manifestRevision === world.moduleManifest.revision &&
      (pending.status === 'awaiting-confirmation' || !ports.retryUnresolved))) continue;
    seen.set(normalized, op.localId);
'''+s[b:]
a=s.index('      const choices = bindings.filter');b=s.index('      const context = {',a)
s=s[:a]+'''      // Apply the explicit target before truncation; selection must survive dense scenes.
      const scoped = bindings.filter((binding) => binding.commands.length === 1 &&
        (!act.targetEntityId || binding.commands.some((command) =>
          ('targetId' in command && command.targetId === act.targetEntityId) ||
          ('heatId' in command && command.heatId === act.targetEntityId)))).slice(0, 48);
      const visible = act.targetEntityId
        ? [...observed.visibleEntities.filter((e) => e.id === act.targetEntityId),
           ...observed.visibleEntities.filter((e) => e.id !== act.targetEntityId)]
        : observed.visibleEntities;
      for (const target of visible.filter((e) => e.actor?.alive && e.id !== actorId &&
        (!act.targetEntityId || e.id === act.targetEntityId)).slice(0, 16)) {
        scoped.push({
          description: `Follow ${target.name} [${target.id}] at ordinary distance until cancelled, interrupted or lost from sight; no stealth or deadline.`,
          commands: [{ id: op.localId, actorId, type: 'follow', targetId: target.id,
            distance: FOLLOW_RULES.defaultDistance }],
        });
      }
'''+s[b:]
s=s.replace('entities: observed.visibleEntities.slice(0, 64)', 'entities: visible.slice(0, 64)')
s=s.replace('Only move/follow support generated parameters.', 'Only move/follow support generated parameters. Follow has no successful finite termination and cannot precede another step; do not promise unreachable continuation.')
a=s.index("      let verdict: ActionFulfillment['verdict']");b=s.index('      const nativeDescription',a)
oldreview=s[a:b];s=s[:a]+s[b:]
s=s.replace('command.distance ?? 3', 'command.distance ?? FOLLOW_RULES.defaultDistance')
a=s.index('      const fulfillment: ActionFulfillment = {', s.index('      const nativeDescription'))
s=s[:a]+'''      if (boundCommands.slice(0, -1).some((command) => command.type === 'follow')) {
        await ports.record('Action continuation unavailable', { text },
          { reason: 'Indefinite following cannot truthfully complete before another step.' });
        continue;
      }
      let verdict: ActionFulfillment['verdict'] =
        result.disposition === 'confirm' ? 'confirm' : result.omitted.length ? 'partial' : 'exact';
      let reason = result.reason;
      let omitted = result.omitted;
      // Review actual decoded behavior, including candidates that claim no omissions.
      // docs/architecture.md#action-fulfillment-and-revision-approval
      if (verdict !== 'confirm') {
        const review = await ports.judge({
          state: { ...context, proposed: result,
            native: { description: nativeDescription, commands: boundCommands } },
          questions: { fulfillment: {
            type: 'choice',
            instructions: policy +
              ' Compare every meaningful clause of the original request with the decoded native behavior, not the model\'s claims. Verify the omission report is complete. Removing a stop may lengthen activity. Uncertain or unreported differences require acceptance. Classification never grants new mechanics.',
            criteria: {
              exact: 'The actual native behavior fulfills the entire request; no requirement is omitted or merely claimed.',
              tolerable: 'Every unfulfilled requirement is explicitly documented in omitted, and all are tolerably nonessential for this actor in context.',
              ask: 'A difference is unreported, uncertain, or may materially change intent, risk, recipient, scope, method, duration or cost. Ask the initiator.',
              reject: 'The candidate contradicts the request or is not a useful supported revision.',
            },
          } },
        });
        await ports.record('Action fulfillment classification',
          { text, proposed: result, nativeDescription, commands: boundCommands }, review);
        const assessment = confident(review, 'fulfillment');
        if (assessment === 'reject') continue;
        const exact = assessment === 'exact' && omitted.length === 0;
        const partial = assessment === 'tolerable' && omitted.length > 0;
        if (!exact && !partial) {
          verdict = 'confirm';
          reason = 'Independent review did not establish full fulfillment or tolerable documented omissions. Accept only the displayed native behavior.';
          if (!omitted.length) omitted = [{ requirement: text,
            reason: 'Full fulfillment is unverified; the displayed native action is the proposed substitute.' }];
        }
      }
'''+s[a:]
s=s.replace('supported: result.supported,\n        omitted: result.omitted,\n        reason: result.reason,', "supported: [nativeDescription.slice(0, 500)],\n        omitted,\n        reason,")
# Literal apostrophe from Python source must be escaped for TS string.
s=s.replace("not the model's claims", 'not the model claims')
Path(p).write_text(s)

# Confirmation previews first-step admission before it can discard ongoing work.
p='packages/domain/src/kernel.ts'
edit(p,"    case 'confirm-attempt': {\n      result = confirmActionRevision(world, actor.id, command.attemptId, command.id);", "    case 'confirm-attempt': {\n      const first = component.agency.attempts.find((attempt) => attempt.id === command.attemptId)\n        ?.alternative?.commands[0];\n      if (first) {\n        // Disposable native admission, just like menu preview: no effects or RNG are published.\n        const preview = executeCommand(original, { ...first, actorId: actor.id, id: `${command.id}:preview` });\n        if (!preview.outcome.ok) return reject(preview.outcome.code, preview.outcome.message);\n      }\n      result = confirmActionRevision(world, actor.id, command.attemptId, command.id);")

# Projection replaces a second polling/read path and carries only the controlled actor's report.
p='packages/protocol/src/index.ts'
edit(p,'    inventory: InventoryItemView[];\n    actions: ActionOption[];', '    inventory: InventoryItemView[];\n    actionAttempts: PlayerActionAttempt[];\n    actions: ActionOption[];')
edit(p,'export interface PlayerActionAttempt {\n  id: string;', "export interface PlayerActionAttempt {\n  mode: 'enqueue' | 'replace';\n  id: string;")
p='apps/server/src/view.ts'
edit(p,'      actions: playerActions,', '''      actionAttempts: memo('player-action-attempts', [actor.agency.attempts], () =>
        actor.agency.attempts.map((attempt) => ({
          id: attempt.id, description: attempt.description, status: attempt.status, mode: attempt.mode,
          ...(attempt.alternative ? { fulfillment: attempt.alternative.fulfillment } : {}),
        }))),
      actions: playerActions,''')
p='apps/server/src/http.ts';s=Path(p).read_text();a=s.index("          case '/api/action-attempts': {");b=s.index("          case '/api/saves/list':",a);s=s[:a]+s[b:];Path(p).write_text(s)
p='apps/client/src/ui/panels.tsx'
edit(p,'<ActionAttempts view={view} connected={connected} />', '<ActionAttempts key={`${view.worldId}:${view.saveTimeline}:${view.player.id}`} view={view} connected={connected} />')

# Root source metadata only, not unrelated private data.
Path('docs/verification/action-review-context.txt').unlink(missing_ok=True)
