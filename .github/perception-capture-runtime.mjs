import fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as D from '../packages/domain/src/index.ts';
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
let world=D.createWorld(73);D.migrateCognition(world);world=D.freezeWorld(world);
const trace=[];
for(let i=0;i<200;i++){
  if(i===50)world=D.freezeWorld(D.updateWorld(world,w=>{const target=Object.values(w.entities).find(e=>e.resource);target.name='Changed source';}));
  const next=D.advanceWorld(world,1);world=D.freezeWorld(next.world);trace.push(digest(next));
}
const path='/tmp/perception-capture-oracle.json';
if(process.argv[2]==='before')fs.writeFileSync(path,JSON.stringify(trace));
else if(JSON.stringify(trace)!==fs.readFileSync(path,'utf8'))throw Error('Per-entity capture changed native transitions');
console.log(JSON.stringify({variant:process.argv[2],steps:200,lastDigest:trace.at(-1)}));
