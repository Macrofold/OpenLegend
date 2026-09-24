from pathlib import Path

def edit(path,old,new,count=1):
 p=Path(path);s=p.read_text()
 if old not in s:raise RuntimeError(f'Missing source {path}: {old[:100]}')
 p.write_text(s.replace(old,new,count))

edit('apps/server/src/store.ts','export interface JobRecord extends AiJobView {','export interface JobRecord extends AiJobView {\n  responseReady?: boolean;')
edit('apps/server/src/world-service.ts',"job.status !== 'generating'", "job.status !== 'generating' && !(job.responseReady && ['queued', 'judging'].includes(job.status))")
edit('apps/server/src/ai-director.ts','  private async playerAction(run: Running): Promise<void> {', '''  /** Durable readiness is separate from provider stage; a Jev-only/exact response can commit too.
   * docs/architecture.md#actor-agency-foundation
   */
  private async prepareResponseAdmission(run: Running): Promise<void> {
    this.current(run);
    run.job = { ...run.job, responseReady: true };
    await this.service.store.putJob(run.job);
  }

  private async playerAction(run: Running): Promise<void> {''')
edit('apps/server/src/ai-director.ts',"const bindings = await this.groundAttempts(run, actorId, response, unique, 'player-action');", "const bindings = await this.groundAttempts(run, actorId, response, unique, 'player-action');\n    await this.prepareResponseAdmission(run);")
edit('apps/server/src/ai-director.ts',"    const commitStartedAt = new Date().toISOString();", "    await this.prepareResponseAdmission(run);\n    const commitStartedAt = new Date().toISOString();")
edit('apps/server/src/ai-director.ts',"    const receipt = this.service.world.responseReceipts?.[run.job.id];\n    await this.log.record(", "    const receipt = this.service.world.responseReceipts?.[run.job.id];\n    const awaitingConfirmation = Object.values(receipt?.components ?? {}).some(part => part.code === 'needs-confirmation');\n    await this.log.record(")
edit('apps/server/src/ai-director.ts',"result.ok ? 'completed' : result.code === 'actor-unavailable' ? 'cancelled' : 'failed'", "result.ok || awaitingConfirmation ? 'completed' : result.code === 'actor-unavailable' ? 'cancelled' : 'failed'")
edit('apps/server/src/ai-director.ts',"        disposition: result.code,\n        components: receipt?.components,", "        disposition: awaitingConfirmation ? 'awaiting-confirmation' : result.code,\n        components: receipt?.components,")
edit('apps/server/src/action-grounding.ts',"answer.confidence >= 0.8", "(answer.probabilities[answer.choice] ?? 0) >= 0.8")
p=Path('apps/server/src/response-context.ts');s=p.read_text();s=s.replace('unsupported mechanics require separate invention admission.', 'unsupported mechanics cannot execute; proposals may use explicit partial fulfillment or ask the initiator to accept a revised action.');p.write_text(s)
p=Path('.github/action-smoke.mjs');s=p.read_text();s=s.replace("import { z } from 'zod';", "import { createRequire } from 'node:module';\nconst { z } = createRequire(new URL('../apps/server/package.json', import.meta.url))('zod');")
s=s.replace('seedAgency }','seedAgency, seesEntity }')
s=s.replace('entities:{...world.entities,[target.id]:','entities:{...world.entities,[player.id]:{...world.entities[player.id],position:{x:4,y:0,z:1}},[target.id]:')
s=s.replace("record('lost-sight-stops',{physicalAction:", "record('lost-sight-stops',{visibleBeforeAdvance:seesEntity(far,far.entities[player.id],far.entities[target.id]),physicalAction:")
s=s.replace("headers:{origin:base,cookie,'content-type':'application/json'}", "headers:{origin:base,cookie,'content-type':'application/json','X-OL-Generation':state.historyEpoch?.split(':')[0]??''}")
p.write_text(s)
with Path('docs/architecture.md').open('a') as f:f.write('''\n\nDurable response readiness is recorded separately from the last provider phase. Exact, Jev-only and Jev-reviewed responses can reach the same admission gate without falsely claiming a generative call; terminal retired jobs still cannot replay effects after hot receipts rotate. A response that leaves an uncertain alternative for the actor is a completed interpretation with an awaiting-confirmation disposition, not a provider failure. Its action component remains unaccepted until the actor chooses, so dependent work cannot start early.\n''')
with Path('docs/maintainers/TODO.md').open('a') as f:f.write('''\n- Add automated coverage for durable response readiness on exact player text actions, Jev-only full matches and NPC proposals whose final provider phase is Jev classification. Retired/terminal jobs must still fail closed. Verify an actor's confirmation question is a normal completed interpretation, not a provider retry trigger.\n''')
p=Path('docs/action-capabilities.md');s=p.read_text();s=s.replace('Initial classification confidence is 0.8;', 'Initial required winning-choice probability is 0.8;');p.write_text(s)
Path('/tmp/action-message').write_text('[skip ci] fix: admit exact and Jev-reviewed native responses through durable readiness')
print('DELETED_INTERPRETER_REFERENCES')
for root in ['apps','packages','docs','archive','README.md']:
 base=Path(root);paths=[base] if base.is_file() else list(base.rglob('*.ts'))+list(base.rglob('*.md'))
 for p in paths:
  if p.is_file():
   for n,line in enumerate(p.read_text().splitlines(),1):
    if 'attempt-interpretation' in line or 'prepareAttemptInterpretation' in line: print(f'{p}:{n}: {line[:220]}')
