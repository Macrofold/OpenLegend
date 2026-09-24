from pathlib import Path

def edit(path,old,new,count=1):
 p=Path(path);s=p.read_text()
 if old not in s:
  if new in s:return
  raise RuntimeError(f'Missing source {path}: {old[:120]}')
 if s.count(old)<count:raise RuntimeError(f'Ambiguous count {path}')
 p.write_text(s.replace(old,new,count))
def prepend(path,text):
 p=Path(path);s=p.read_text()
 if text not in s:p.write_text(text+s)

# Move prompt metadata into the renderer so refreshed shortlists cannot discard it.
edit('apps/server/src/response-context.ts',"    `## Current time\\n${context['now']}`,", "    `## Native navigation\\n${context['navigation'] ?? ''}\\nPosition: ${JSON.stringify(context['currentPosition'])}; support: ${context['currentSupport']}\\nPublic supports: ${JSON.stringify(context['publicSurfaces'] ?? [])}`,\n    `## Current time\\n${context['now']}`,")
edit('apps/server/src/response-context.ts',"known|expression|proposal", "known|expression|proposal|invoke")
edit('apps/server/src/response-context.ts',"for proposal, fill description (max 500).", "for proposal, fill description (max 500) and optionally targetEntityId. For invoke use the Native navigation contract and invocation field; other fields stay null.")
edit('apps/server/src/response-context.ts',"Use a known action handle to withdraw an unresolved intent.", "Use a known action handle to accept the exact revised action or withdraw an unresolved intent; never accept on behalf of another actor.")
p=Path('apps/server/src/decision-context.ts');s=p.read_text();a=s.index('  const prompt =\n') if '  const prompt =\n' in s else s.index('  const prompt = readableDecisionContext(context, offered, false)');b=s.index('  const bytes =',a);s=s[:a]+"  const prompt = readableDecisionContext(context, offered, false);\n"+s[b:];p.write_text(s)
# New private follow cursor must not appear in another actor's observation.
edit('packages/domain/src/kernel.ts',"if (copy.actor?.action) delete copy.actor.action.destination;", "if (copy.actor?.action) { delete copy.actor.action.destination; delete copy.actor.action.follow; }")
# Stored job kind uses existing durable job/ledger ownership.
edit('packages/protocol/src/index.ts',"kind: 'chat' | 'invention' | 'thought';", "kind: 'chat' | 'invention' | 'thought' | 'action';")
p=Path('packages/protocol/src/index.ts');p.write_text(p.read_text()+'''

export interface PlayerActionAttempt {
 id:string;
 description:string;
 status:'needs-interpretation'|'awaiting-confirmation';
 fulfillment?:{requested:string;executableDescription:string;verdict:'exact'|'partial'|'confirm';supported:string[];omitted:{requirement:string;reason:string}[];reason:string};
}
''')
edit('apps/server/src/store.ts',"    text: string;\n    npcId?: string;", "    text: string;\n    action?: { mode:'enqueue'|'replace'; targetId?:string; expectedPlan:number; timelineId:string };\n    npcId?: string;")
prepend('apps/server/src/ai-director.ts',"import { groundActionAttempts } from './action-grounding.js';\nimport { actionResponse } from './action-response.js';\nimport { npcCandidates, planningCandidates } from './context.js';\nimport { domainCommand } from './cognition.js';\nimport type { ActorResponse, AttemptBinding } from '@open-legend/domain';\n")
p=Path('apps/server/src/ai-director.ts');s=p.read_text();s=s.replace("import { prepareAttemptInterpretation } from './attempt-interpretation.js';\n",'');p.write_text(s)
# Reuse durable provider accounting and the ordinary response commit for both initiators.
insert='''  async submitAction(id:string, text:string, mode:'enqueue'|'replace', targetId?:string): Promise<ApiResult> {
    return this.admission(async()=>{
      const actorId=this.service.controlledEntityId;
      const actor=this.service.world.entities[actorId]?.actor;
      if(!text.trim()||text.length>500||!['enqueue','replace'].includes(mode)) return {ok:false,code:'invalid-action',message:'Supply an action of 1–500 characters.'};
      const fingerprint=digest({kind:'action',world:this.service.world.id,timeline:this.service.timelineId,actorId,text,mode,targetId});
      const previous=await this.service.store.getJob(id);
      if(previous)return previous.kind==='action'&&previous.fingerprint===fingerprint ? {ok:true,code:'duplicate',message:previous.message,jobId:id} : {ok:false,code:'idempotency-conflict',message:'This request identity was already used.'};
      if(this.service.paused)return {ok:false,code:'paused',message:'Resume before attempting an action.'};
      if(!actor?.alive||actor.incapacitated||actor.rest?.asleep)return {ok:false,code:'actor-unavailable',message:'Your character cannot act now.'};
      if(targetId&&!this.service.observe(actorId)?.visibleEntities.some(e=>e.id===targetId))return {ok:false,code:'target',message:'The selected target is no longer perceived.'};
      if(this.running||this.stopped)return {ok:false,code:'busy',message:'Another intelligence request is in progress; try again after it finishes.'};
      this.maintenance.cancel();
      const job:JobRecord={id,kind:'action',fingerprint,status:'queued',message:'Resolving your action.',createdAt:this.now(),diagnosticTriggerType:'Player action request',request:{text,npcId:actorId,action:{mode,targetId,expectedPlan:actor.planGeneration,timelineId:this.service.timelineId}}};
      await this.begin(job);
      return {ok:true,code:'queued',message:job.message,jobId:id};
    });
  }

  private async groundAttempts(run:Running, actorId:string, response:ActorResponse, bindings:AttemptBinding[], operation:string):Promise<AttemptBinding[]> {
    const world=this.service.world;
    const manifest=world.moduleManifest.revision;
    let serial=0;
    const resolved=await groundActionAttempts(world,actorId,response,bindings,{
      judge:request=>this.call(run,'jev',`${operation}:classify:${serial++}`,requestId=>this.client.judge({...request,requestId,signal:run.controller.signal})),
      generate:request=>this.generate<unknown>(run,{...request,task:'native_attempt_interpretation',actorScope:actorId,execution:'fast',model:this.service.config.macrofoldKey?this.service.config.macrofoldMiniModel:this.service.config.miniModel,reasoningEffort:'low',maxOutputTokens:2200},`${operation}:interpret:${serial++}`),
      record:(kind,input,output)=>this.log.record(`${run.job.id}:${operation}:report:${serial++}`,kind,input,output),
    });
    this.current(run);
    if(this.service.world.moduleManifest.revision!==manifest)throw new Error('Mechanics changed during action interpretation; submit a fresh action.');
    return resolved;
  }

  private async playerAction(run:Running):Promise<void> {
    const actorId=run.job.request.npcId!;
    const request=run.job.request.action!;
    if(request.timelineId!==this.service.timelineId)throw new StopJob('stale','The action belongs to an earlier timeline.');
    const response=actionResponse({kind:'proposal',description:run.job.request.text,actionId:null,verb:null,targetEntityId:request.targetId??null,mode:request.mode});
    const choices=[...npcCandidates(this.service,actorId),...planningCandidates(this.service,actorId)].flatMap(c=>c.command?[{description:c.description,commands:[domainCommand(c.command,actorId,run.job.id)]}]:[]);
    const unique=[...new Map(choices.map(c=>[JSON.stringify(c),c])).values()];
    const bindings=await this.groundAttempts(run,actorId,response,unique,'player-action');
    await this.awaitResume(run,true);
    this.current(run);
    const observed=this.service.observe(actorId);
    const refs=[actorId,...(observed?.visibleEntities.map(e=>e.id)??[])];
    const result=await this.service.transition(world=>commitActorResponse(world,run.job.id,actorId,response,{},refs,request.expectedPlan,bindings),undefined,run.job.id);
    const component=this.service.world.responseReceipts?.[run.job.id]?.components['action'];
    const fulfillment=bindings.find(b=>b.description===run.job.request.text)?.fulfillment;
    const message=component?.code==='needs-confirmation' ? component.message : fulfillment?.verdict==='partial' ? `${component?.message??result.message} Not fulfilled: ${fulfillment.omitted.map(o=>o.requirement).join('; ')}.` : component?.message??result.message;
    await this.update(run,'completed',message,{outcome:component??result,fulfillment});
  }

'''
edit('apps/server/src/ai-director.ts',"  async submitInteractive(",insert+"  async submitInteractive(")
edit('apps/server/src/ai-director.ts',"    if (run.job.kind === 'invention') return await this.invent(run);", "    if (run.job.kind === 'action') return await this.playerAction(run);\n    if (run.job.kind === 'invention') return await this.invent(run);")
edit('apps/server/src/ai-director.ts',"    const resident =\n", "    if (run.job.kind === 'action' && (actor.actor.incapacitated || actor.actor.rest?.asleep || run.job.request.action?.timelineId !== this.service.timelineId)) throw new StopJob('stale', 'The actor or action timeline changed.');\n    const resident =\n")
p=Path('apps/server/src/ai-director.ts');s=p.read_text();a=s.index('    let attemptBindings = prepared.attemptBindings;');b=s.index('    run.responseWatch = undefined;',a)
s=s[:a]+'''    let attemptBindings = prepared.attemptBindings;
    if (nativeReply.operations.some(op=>op.act?.kind==='proposal')) {
      try { attemptBindings=await this.groundAttempts(run,actorId,nativeReply,attemptBindings,`attempt:${attempt}`); }
      catch(error) {
        if(run.controller.signal.aborted||run.cancelReason||run.supersession)throw error;
        await this.log.record(`${run.job.id}:attempt:${attempt}:interpretation-deferred`,'Action interpretation deferred',{}, {reason:error instanceof Error?error.message:'Unavailable'});
      }
      this.current(run);
      if(await retryForUrgentAwareness())return;
    }
'''+s[b:];p.write_text(s)
# Native contexts and player menus use the same follow command, without depending on manual-work anatomy.
p=Path('apps/server/src/context.ts');s=p.read_text();anchor="  const activeId = service.world.conversations?.active[actorId];";i=s.index(anchor);s=s[:i]+'''  for (const target of observed.visibleEntities.filter(e=>e.actor?.alive&&e.id!==actorId).slice(0,16)) {
    const command:CommandInput={type:'follow',targetId:target.id};
    if(service.previewCommand(command,actorId).ok)actions.push({id:`follow:${target.id}`,description:`Follow ${target.name} while visible; no stealth or automatic sunset stop.`,command});
  }
'''+s[i:];p.write_text(s)
edit('apps/server/src/action-catalogue.ts',"  const missing = (", "  if (selected?.actor?.alive && selected.id !== service.controlledEntityId) add(`follow:${selected.id}`, `Follow ${selected.name}`, 'Movement', { type:'follow', targetId:selected.id }, ['follow','accompany'], selected.id);\n  const missing = (")
# POST read is intentionally player-scoped and exposes no queued command payloads/private NPC state.
edit('apps/server/src/http.ts',"        switch (url.pathname) {", """        switch (url.pathname) {
          case '/api/action-attempt': {
            const value=z.object({requestId:requestIdSchema,text:z.string().trim().min(1).max(500),targetId:requestIdSchema.optional(),mode:z.enum(['enqueue','replace'])}).strict().parse(body);
            return send(response,200,await director.submitAction(value.requestId,value.text,value.mode,value.targetId));
          }
          case '/api/action-attempts': {
            const value=z.object({requestId:requestIdSchema.nullable()}).strict().parse(body);
            const actorId=service.controlledEntityId;
            const job=value.requestId?await store.getJob(value.requestId):undefined;
            const permitted=job?.kind==='action'&&job.request.npcId===actorId&&job.request.action?.timelineId===service.timelineId;
            return send(response,200,{ok:true,attempts:service.world.entities[actorId]!.actor!.agency.attempts.map(a=>({id:a.id,description:a.description,status:a.status,...(a.alternative?{fulfillment:a.alternative.fulfillment}:{})})),...(permitted?{job:{status:job.status,message:job.message,result:job.result}}:{})});
          }""")
prepend('apps/client/src/ui/panels.tsx',"import { ActionAttempts } from './action-attempts';\n")
edit('apps/client/src/ui/panels.tsx',"      <Section title=\"Condition\">", "      <ActionAttempts view={view} connected={connected} />\n      <Section title=\"Condition\">")
# Avoid publishing another independent interpretation entrypoint. Old module is retained only if tests import it; runtime no longer uses it.
with Path('docs/architecture.md').open('a') as f:f.write('''\n\n## Jev-first action grounding\n\nCharacter → Take an action submits an explicit player intention through the existing durable intelligence job and response owner. Exact complete coordinate forms and unqualified visible-target follow requests bind without inference. Other requests first ask Jev to select a complete matching native handle or classify the need for interpretation. Only unresolved parameterization/composition/partial fulfillment uses a bounded generative call. A further Jev judgment can accept clearly tolerable omissions; uncertain changes are stored for explicit player/actor approval. The same pipeline resolves NPC proposals. Intelligence traces retain the original request, scoped alternatives, classification, proposed native bindings and fulfillment reports; no fabricated action result or model reasoning transcript is recorded.\n\nThe first adapter parameterizes move/follow and composes the existing concrete native bindings. Invention remains an external integration boundary; unavailable mechanics produce unresolved intent, not an automatic invention or engine change. UI partial messages and pending accept/decline controls are separate from the ordinary conversation composer.\n''')
with Path('docs/maintainers/TODO.md').open('a') as f:f.write('''\n- Add deferred tests for Jev exact-match routing versus generative partial grounding, conservative approval on uncertainty, player/actor confirmation parity, exact coordinate fast paths, name ambiguity, lost target scope, negation/quotes, missing qualifiers, failing prerequisite sequences, provider failure without replay, and player request transport identity. Add browser coverage for Take an action draft/revision controls and stale-timeline responses. These suites were not written/run in this task.\n''')
Path('/tmp/action-message').write_text('[skip ci] feat: route Jev-first action requests with explicit revision approval')
