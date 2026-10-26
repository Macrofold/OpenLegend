import { describe, expect, it } from 'vitest';
import { BoundsIndex, type BoundsQueryCursor } from './bounds-index.js';
const index=(count:number)=>new BoundsIndex(Array.from({length:count},(_,i)=>({value:i,bounds:{min:{x:i,y:0,z:0},max:{x:i+1,y:1,z:1}}})));
describe('bounded immutable spatial reads',()=>{
  it('covers every entry once even when detail and visits are exhausted',()=>{
    const tree=index(300), cover=tree.cover(10,17);
    expect(cover.rows.reduce((sum,row)=>sum+row.count,0)).toBe(300);
    expect(cover.rows.length).toBeLessThanOrEqual(10);
    expect(cover.visited).toBeLessThanOrEqual(17);
  });
  it('makes progress with a one-visit page and returns each matching entry exactly once',()=>{
    const tree=index(50), values:number[]=[];let cursor:BoundsQueryCursor|undefined;
    for(let i=0;i<200;i++) {
      const page=tree.query(b=>b.max.x>=10 && b.min.x<=20,1,cursor);
      expect(page.visited).toBeLessThanOrEqual(1);values.push(...page.values);cursor=page.cursor;
      if(page.status==='complete')break;
    }
    expect(cursor).toBeUndefined();
    expect(values).toEqual(Array.from({length:12},(_,i)=>i+9));
    expect(new Set(values).size).toBe(values.length);
  });
});
