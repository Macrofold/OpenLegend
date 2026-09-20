const test = require('node:test');
const assert = require('node:assert/strict');
const {mkdtemp, readFile, writeFile, rm} = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {FeedbackStore} = require('./feedback-storage.js');
const atlas = 'Open Legend art atlas v1';
const entry = note => ({rating:'like', aspects:['Lighting'], note});
const documentText = preferences => JSON.stringify({atlas, preferences});

function handle(initial = '') {
  return {
    name:'feedback.json', text:initial, permission:'granted', writes:0, requests:0,
    async getFile() { return {text:async()=>this.text}; },
    async queryPermission() { return this.permission; },
    async requestPermission() { this.requests++; return this.permission; },
    async createWritable() {
      const target=this; let buffer;
      return {
        async write(text) { if(target.fail)throw new Error('Disk full'); buffer=text; },
        async close() { if(target.beforeClose)await target.beforeClose(); target.text=buffer; target.writes++; },
        async abort() { target.aborted=true; }
      };
    }
  };
}
function setup(options={}) {
  const file=options.file||handle(), timers=new Map(), states=[], caches=[];
  let serial=0, remembered=options.remembered, pickCount=0;
  const store=new FeedbackStore({
    preferences:options.preferences||{},
    pickFile:options.unsupported?null:async()=>{pickCount++; if(options.cancel)throw Object.assign(new Error(),{name:'AbortError'}); return file;},
    handles:{load:async()=>remembered,save:async value=>{remembered=value;}},
    schedule:(fn,delay)=>{const id=++serial;timers.set(id,{fn,delay});return id;},
    unschedule:id=>timers.delete(id),
    persist:value=>caches.push(JSON.parse(JSON.stringify(value))),
    onStatus:value=>states.push(value),
    now:()=> '2026-09-19T12:00:00.000Z'
  });
  return {store,file,timers,states,caches,picks:()=>pickCount,remembered:()=>remembered};
}

test('first Save preserves existing browser notes, uses the chosen file, and later saves reuse it',async()=>{
  const h=setup({preferences:{G01:entry('Existing Octopath feedback')}});
  await h.store.restore();
  await h.store.saveNow();
  assert.equal(JSON.parse(h.file.text).preferences.G01.note,'Existing Octopath feedback');
  h.store.changed('G01',entry('Updated lighting preference'));
  await h.store.saveNow();
  assert.equal(h.picks(),1);
  assert.equal(h.remembered(),h.file);
  assert.equal(JSON.parse(h.file.text).preferences.G01.note,'Updated lighting preference');
  assert.equal(h.store.dirty,false);
});

test('continuous typing keeps the original two-second timer and writes the latest note',async()=>{
  const h=setup();await h.store.restore();await h.store.saveNow();
  h.store.changed('G01',entry('First words'));
  const token=h.store.timer;
  h.store.changed('G01',entry('First words and more'));
  assert.equal(h.store.timer,token);
  assert.equal(h.timers.get(token).delay,2000);
  h.timers.get(token).fn();await h.store.flush();
  assert.equal(JSON.parse(h.file.text).preferences.G01.note,'First words and more');
  assert.equal(h.store.dirty,false);
});

test('reload reconnects a remembered file without opening a picker or discarding newer file notes',async()=>{
  const file=handle(documentText({G01:{...entry('Newer file feedback'),updatedAt:'2026-09-19T11:00:00Z'},G02:entry('Keep other references')}));
  const h=setup({file,remembered:file,preferences:{G01:{...entry('Old cache'),updatedAt:'2026-09-18T11:00:00Z'},G08:entry('Browser-only entry')}});
  await h.store.restore();
  const p=JSON.parse(file.text).preferences;
  assert.equal(p.G01.note,'Newer file feedback');
  assert.equal(p.G02.note,'Keep other references');
  assert.equal(p.G08.note,'Browser-only entry');
  assert.equal(h.picks(),0);
});

test('page load never prompts for permission; explicit Save can resume access',async()=>{
  const file=handle();file.permission='prompt';
  const h=setup({file,remembered:file,preferences:{G01:entry('Pending')}});
  await h.store.restore();
  assert.equal(file.requests,0);assert.equal(file.writes,0);
  file.requestPermission=async()=>{file.requests++;file.permission='granted';return 'granted';};
  await h.store.saveNow();
  assert.equal(file.requests,1);assert.equal(file.writes,1);
});

test('revoked permission pauses autosave and keeps all changes',async()=>{
  const h=setup();await h.store.restore();await h.store.saveNow();
  const before=h.file.text;h.file.permission='denied';
  h.store.changed('G01',entry('Unsaved but retained'));
  await h.store.flush();
  assert.equal(h.file.text,before);assert.equal(h.file.requests,0);
  assert.equal(h.store.dirty,true);assert.equal(h.store.allowed,false);
  assert.equal(h.caches.at(-1).G01.note,'Unsaved but retained');
  assert.equal(h.states.at(-1).kind,'error');
});

test('edits during an in-flight write stay pending and are written next without overlapping streams',async()=>{
  const h=setup();await h.store.restore();await h.store.saveNow();
  h.store.changed('G01',entry('First snapshot'));
  let release,entered;
  const atClose=new Promise(resolve=>entered=resolve);
  h.file.beforeClose=()=>{entered();return new Promise(resolve=>release=resolve);};
  const saving=h.store.flush();await atClose;
  h.store.changed('G01',entry('Typed while saving'));
  release();await saving;
  assert.equal(h.store.dirty,true);
  assert.equal(JSON.parse(h.file.text).preferences.G01.note,'First snapshot');
  h.file.beforeClose=null;await h.store.flush();
  assert.equal(JSON.parse(h.file.text).preferences.G01.note,'Typed while saving');
  assert.equal(h.store.dirty,false);
});

test('failed writes never claim Saved and are retryable without losing notes',async()=>{
  const h=setup();await h.store.restore();await h.store.saveNow();
  const before=h.file.text;h.file.fail=true;
  h.store.changed('G01',entry('Do not lose this'));await h.store.flush();
  assert.equal(h.file.text,before);assert.equal(h.file.aborted,true);
  assert.equal(h.states.at(-1).kind,'error');assert.equal(h.store.dirty,true);
  h.file.fail=false;await h.store.saveNow();
  assert.equal(JSON.parse(h.file.text).preferences.G01.note,'Do not lose this');
  assert.equal(h.states.at(-1).kind,'saved');
});

test('canceled picker and unsupported browsers do not download or discard anything',async()=>{
  for(const config of [{cancel:true},{unsupported:true}]){
    const h=setup({...config,preferences:{G01:entry('Keep me')}});
    await h.store.restore();await h.store.saveNow();
    assert.equal(h.file.writes,0);assert.equal(h.store.preferences.G01.note,'Keep me');
    assert.equal(h.states.at(-1).busy,false);
  }
});

test('unrelated or malformed selected files are never overwritten',async()=>{
  for(const text of ['<html>the board</html>',JSON.stringify({title:'Reference catalog',entries:[]}),documentText({G01:{note:42}})]){
    const file=handle(text),h=setup({file,preferences:{G01:entry('Keep me')}});
    await h.store.restore();await h.store.saveNow();
    assert.equal(file.text,text);assert.equal(file.writes,0);
    assert.equal(h.store.preferences.G01.note,'Keep me');
    assert.equal(h.states.at(-1).kind,'error');
  }
});

test('clearing a rating and note persists the cleared entry across reload',async()=>{
  const h=setup({preferences:{G01:entry('Old choice')}});await h.store.restore();await h.store.saveNow();
  h.store.changed('G01',{rating:'',aspects:[],note:''});await h.store.flush();
  const next=setup({file:h.file,remembered:h.file});await next.store.restore();
  assert.equal(next.store.preferences.G01.note,'');assert.equal(next.store.preferences.G01.rating,'');
});

test('writer creates a readable feedback.json next to an HTML file on disk',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'open-legend-feedback-'));
  try{
    await writeFile(path.join(directory,'index.html'),'Test fixture');
    const filename=path.join(directory,'feedback.json');
    const file=handle();
    file.createWritable=async()=>{let pending;return {write:async text=>{pending=text;},close:async()=>{await writeFile(filename,pending);file.text=pending;},abort:async()=>{}};};
    const h=setup({file,preferences:{G01:entry('Warmer campfire; less blur. 🌲')}});
    await h.store.restore();await h.store.saveNow();
    assert.equal(JSON.parse(await readFile(filename,'utf8')).preferences.G01.note,'Warmer campfire; less blur. 🌲');
    assert.equal(await readFile(path.join(directory,'index.html'),'utf8'),'Test fixture');
  }finally{await rm(directory,{recursive:true,force:true});}
});
