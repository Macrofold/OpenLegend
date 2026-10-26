import { expect,it } from 'vitest';
import { createWorld,PLAYER_ID } from './worlds/base/world.js';
import { editKnowledge,knowledgeDocument } from './knowledge.js';

it('preserves the complete prior knowledge document when its next revision cannot be represented',()=>{
  const world=createWorld(174);
  const initial=knowledgeDocument(world,PLAYER_ID,null);
  expect(editKnowledge(world,PLAYER_ID,{subjectId:null,expectedRevision:initial?.revision??0,text:'An independently retained understanding.'},[]).ok).toBe(true);
  const document=knowledgeDocument(world,PLAYER_ID,null)!;
  document.revision=Number.MAX_SAFE_INTEGER;
  const before=JSON.stringify(world);
  expect(editKnowledge(world,PLAYER_ID,{subjectId:null,expectedRevision:Number.MAX_SAFE_INTEGER,text:'Replacement text.'},[]).code).toBe('knowledge-revision-exhausted');
  expect(JSON.stringify(world)).toBe(before);
  expect(editKnowledge(world,PLAYER_ID,{subjectId:null,expectedRevision:Number.MAX_SAFE_INTEGER,text:document.text},[]).code).toBe('knowledge-unchanged');
  expect(JSON.stringify(world)).toBe(before);
});
