import { writeFileSync } from 'node:fs';
import { createWorld, PLAYER_ID, NPC_ID, commitActorResponse } from '../packages/domain/src/index.ts';
import { groundActionAttempts } from '../apps/server/src/action-grounding.ts';
const world=createWorld(73),text='Follow Ada without being noticed';
const response={operations:[{localId:'review',requiresAccepted:[],talk:null,think:null,goal:null,plan:null,act:{kind:'proposal',actionId:null,verb:null,description:text,targetEntityId:NPC_ID,mode:'enqueue'}}]};
let classifications=0,generations=0,review;
const bindings=await groundActionAttempts(world,PLAYER_ID,response,[],{
 judge:async(request)=>{classifications++;const key=request.questions.route?'route':'fulfillment';const choice=key==='route'?'interpret':'ask';if(key==='fulfillment')review=request.state;return{answers:{[key]:{choice,probabilities:{[choice]:1},confidence:1}}}},
 generate:async()=>{generations++;return{disposition:'execute',revised:'Follow unseen',supported:[text],omitted:[],reason:'Optimistic fixture claim',steps:[{actionId:null,invocation:{family:'follow',x:null,z:null,surfaceId:null,targetEntityId:NPC_ID,distance:null}}]}},
 record:async()=>{},
});
const result=commitActorResponse(world,'review-closeout',PLAYER_ID,response,{},[PLAYER_ID,NPC_ID],0,bindings);
const report={scope:'No-network closeout runtime exercise with injected outputs; not live model evidence.',run:process.env.GITHUB_RUN_ID,paidModelCalls:0,classifications,generations,reviewBytes:Buffer.byteLength(JSON.stringify(review)),containsDecodedCommands:!!review?.native?.commands,containsDiscardedChoices:Object.hasOwn(review??{},'choices'),verdict:bindings[0]?.fulfillment?.verdict,pending:result.world.entities[PLAYER_ID].actor.agency.attempts[0]?.status,physicalAction:result.world.entities[PLAYER_ID].actor.action};
console.log(JSON.stringify(report,null,2));writeFileSync('docs/verification/action-review-closeout.json',JSON.stringify(report,null,2)+'\n');
