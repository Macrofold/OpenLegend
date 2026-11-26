(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const families={
    all:{label:'All studies',heading:'All the possibilities',color:'#dfc38c'},
    winter:{label:'Winter',heading:'The kingdom of winter',color:'#9bdae9'},
    dark:{label:'Dark fantasy',heading:'Something stirs in the dark',color:'#c6a7cc'},
    royal:{label:'Royal',heading:'Forged for a throne',color:'#e0bd7c'},
    mythic:{label:'High fantasy',heading:'The age of legends',color:'#cbd59a'},
    arcane:{label:'Arcane',heading:'Let the magic loose',color:'#b9a7f5'},
    celestial:{label:'Celestial',heading:'Written in the heavens',color:'#a9bedf'},
    original:{label:'The originals',heading:'Where it all began',color:'#baa887'}
  };
  const order=Object.keys(families);
  const newEntries=[...window.EFFECT_PACKS].sort((a,b)=>order.indexOf(a.family)-order.indexOf(b.family)).map((e,i)=>({...e,number:i+13}));
  const originals=window.ORIGINAL_CARDS.map(([number,name,tag,stage,word,description,renderer])=>({id:'original-'+number,number:Number(number),name,family:'original',description,stage,word,renderer,mood:'Original collection',original:true})).sort((a,b)=>a.number-b.number);
  const entries=[...newEntries,...originals];
  const gallery=$('gallery'),dialog=$('focus'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let favorites=new Set();try{favorites=new Set(JSON.parse(localStorage.getItem('open-legend-title-favorites')||'[]').filter(id=>entries.some(e=>e.id===id)))}catch{}
  let family='all',favoriteOnly=false,playing=!reduced.matches,optedIn=false,clock=1.2,lastTime=performance.now(),lastDraw=0,focusState=null,focusEntry=null,focusStarted=0;
  const states=[];
  function setFavoriteButton(button,entry){const active=favorites.has(entry.id);button.textContent=active?'★':'☆';button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',(active?'Remove ':'Add ')+entry.name+(active?' from favorites':' to favorites'))}
  function changeFavorite(entry){
    if(favorites.has(entry.id))favorites.delete(entry.id);else favorites.add(entry.id);
    try{localStorage.setItem('open-legend-title-favorites',JSON.stringify([...favorites]))}catch{}
    for(const s of states)setFavoriteButton(s.favorite,s.entry);
    if(focusEntry)setFavoriteButton($('focus-favorite'),focusEntry);
    $('favorite-count').textContent=favorites.size;filter();
  }
  function stageFor(entry){
    const wrap=document.createElement('div');wrap.className='stage-wrap';
    const stage=document.createElement('div');stage.className='stage '+(entry.original?entry.stage:'new-stage');stage.setAttribute('role','img');stage.setAttribute('aria-label',entry.name+': '+entry.description);wrap.append(stage);
    let canvas=null;
    if(entry.original){
      const word=document.createElement('div');word.className='word '+entry.word;word.dataset.text='OPEN LEGEND';word.setAttribute('aria-hidden','true');
      if(entry.word==='reveal')Array.from('OPEN LEGEND').forEach((ch,i)=>{if(ch===' ')word.append(document.createTextNode(' '));else{const span=document.createElement('span');span.textContent=ch;span.style.setProperty('--i',i);word.append(span)}});else word.textContent='OPEN LEGEND';stage.append(word);
      if(entry.stage==='sunlightstage'||entry.stage==='moonstage'){const v=document.createElement('div');v.className=entry.stage==='sunlightstage'?'shadows':'shadow';stage.append(v)}
      if(entry.renderer){canvas=document.createElement('canvas');canvas.className='canvas';stage.append(canvas)}
    }else{canvas=document.createElement('canvas');stage.append(canvas)}
    if(canvas)canvas.setAttribute('aria-hidden','true');
    return {entry,wrap,stage,canvas,ctx:canvas?.getContext('2d'),api:entry.original?null:TitleEngine.createAPI(),visible:false,dirty:true,w:0,h:0,bw:0,bh:0,failed:false};
  }
  const observer=new IntersectionObserver(changes=>{for(const e of changes){const s=states.find(s=>s.stage===e.target);if(s){s.visible=e.isIntersecting;s.stage.classList.toggle('onscreen',s.visible);if(s.visible)s.dirty=true;else release(s)}}},{rootMargin:'100px'});
  // Release large transient canvases when cards are far off screen; geometry is reconstructed lazily.
  function release(s){if(!s.canvas||s===focusState)return;if(s.canvas.width>1){s.canvas.width=1;s.canvas.height=1;s.bw=0;s.bh=0;s.dirty=true}if(!s.entry.original)s.api=TitleEngine.createAPI()}
  for(const entry of entries){
    const s=stageFor(entry),card=document.createElement('article');card.className='card';card.dataset.effect=entry.id;card.style.setProperty('--family-color',families[entry.family].color);s.card=card;
    const open=document.createElement('button');open.className='preview-open';open.setAttribute('aria-label','Enlarge '+entry.name);const label=document.createElement('span');label.textContent='Enlarge';open.append(label);open.addEventListener('click',()=>openFocus(entry));s.wrap.append(open);
    const info=document.createElement('div');info.className='card-info';
    const kicker=document.createElement('div');kicker.className='card-kicker';const familyName=document.createElement('span');familyName.textContent=families[entry.family].label;const number=document.createElement('span');number.className='effect-number';number.textContent='#'+String(entry.number).padStart(2,'0');kicker.append(familyName,number);
    const titleRow=document.createElement('div');titleRow.className='title-row';const h=document.createElement('h3');h.textContent=entry.name;const favorite=document.createElement('button');favorite.className='favorite';setFavoriteButton(favorite,entry);favorite.addEventListener('click',()=>changeFavorite(entry));s.favorite=favorite;titleRow.append(h,favorite);
    const p=document.createElement('p');p.className='description';p.textContent=entry.description;const mood=document.createElement('p');mood.className='mood';mood.textContent=entry.mood;info.append(kicker,titleRow,p,mood);card.append(s.wrap,info);gallery.append(card);states.push(s);observer.observe(s.stage);
  }
  for(const [key,data]of Object.entries(families)){
    const b=document.createElement('button');b.className='filter';b.dataset.family=key;b.setAttribute('aria-pressed',String(key==='all'));b.append(document.createTextNode(data.label));const count=document.createElement('span');count.className='count';count.textContent=key==='all'?entries.length:entries.filter(e=>e.family===key).length;b.append(count);b.addEventListener('click',()=>{family=key;filter();b.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'})});$('filters').append(b);
  }
  function visibleEntries(){return entries.filter(e=>(family==='all'||e.family===family)&&(!favoriteOnly||favorites.has(e.id)))}
  function filter(){
    const list=visibleEntries();const ids=new Set(list.map(e=>e.id));
    for(const s of states){s.card.hidden=!ids.has(s.entry.id);if(s.card.hidden){s.visible=false;s.stage.classList.remove('onscreen');release(s)}else s.dirty=true}
    for(const b of $('filters').children)b.setAttribute('aria-pressed',String(b.dataset.family===family));
    $('section-heading').textContent=favoriteOnly?'Your favorites':families[family].heading;
    $('result-count').textContent=list.length+' '+(list.length===1?'study':'studies')+' · tap to enlarge';
    $('empty').hidden=list.length>0;$('favorites-only').setAttribute('aria-pressed',String(favoriteOnly));
    if(!list.length&&favorites.size){$('empty').querySelector('h3').textContent='No favorites in this category.';$('empty').querySelector('p').textContent='Choose another category, or show all studies to explore more.'}else{$('empty').querySelector('h3').textContent='A place for your favorites.';$('empty').querySelector('p').textContent='Tap the star beside an effect to keep it here. Your picks stay in this browser.'}
  }
  function playbackUI(){
    document.body.classList.toggle('paused',!playing);document.body.classList.toggle('motion-opt-in',optedIn);
    $('toggle').textContent=playing?'Pause animations':'Play animations';$('focus-toggle').textContent=playing?'Pause':'Play';
    $('motion-status').textContent=playing?'Playing · tap a preview to enlarge':reduced.matches&&!optedIn?'Reduce Motion is on. Tap Play animations to preview.':'Paused · tap Play animations to continue';
  }
  function toggle(){playing=!playing;if(playing)optedIn=true;lastTime=performance.now();playbackUI()}
  function restart(focusOnly=false){
    optedIn=true;playing=true;if(focusOnly){focusStarted=clock}else{clock=0;focusStarted=0;for(const s of states)s.dirty=true}
    const root=focusOnly?dialog:document.body;root.classList.add('reset');void root.offsetWidth;root.classList.remove('reset');lastTime=performance.now();playbackUI();if(focusState)focusState.dirty=true;
  }
  function openFocus(entry){
    if(focusState){focusState.canvas&&(focusState.canvas.width=1);focusState=null}
    focusEntry=entry;focusState=stageFor(entry);focusState.visible=true;focusState.stage.classList.add('onscreen');focusStarted=clock;
    $('focus-stage').replaceChildren(focusState.wrap);$('focus-title').textContent=entry.name;$('focus-description').textContent=entry.description;$('focus-label').textContent='#'+String(entry.number).padStart(2,'0')+' · '+families[entry.family].label+' · '+(entry.duration?entry.duration+' sec cycle':'Original collection');setFavoriteButton($('focus-favorite'),entry);
    document.body.classList.add('focus-open');document.body.style.overflow='hidden';if(!dialog.open)dialog.showModal();
    render(focusState,1.2);focusState.dirty=false;
  }
  function closeFocus(){dialog.close()}
  dialog.addEventListener('close',()=>{document.body.classList.remove('focus-open');document.body.style.overflow='';if(focusState?.canvas)focusState.canvas.width=1;focusState=null;focusEntry=null;for(const s of states)if(s.visible)s.dirty=true});
  function pageFocus(direction){const list=visibleEntries();if(!list.length)return;const i=list.findIndex(e=>e.id===focusEntry?.id);openFocus(list[(i+direction+list.length)%list.length])}
  $('toggle').addEventListener('click',toggle);$('focus-toggle').addEventListener('click',toggle);$('replay').addEventListener('click',()=>restart());$('focus-replay').addEventListener('click',()=>restart(true));$('close-focus').addEventListener('click',closeFocus);$('previous').addEventListener('click',()=>pageFocus(-1));$('next').addEventListener('click',()=>pageFocus(1));$('focus-favorite').addEventListener('click',()=>focusEntry&&changeFavorite(focusEntry));$('favorites-only').addEventListener('click',()=>{favoriteOnly=!favoriteOnly;filter()});$('show-all').addEventListener('click',()=>{favoriteOnly=false;family='all';filter()});
  dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();pageFocus(1)}else if(e.key==='ArrowLeft'){e.preventDefault();pageFocus(-1)}});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeFocus()}});
  reduced.addEventListener('change',()=>{if(reduced.matches&&!optedIn)playing=false;playbackUI()});
  const resize=new ResizeObserver(es=>{for(const e of es){const s=states.find(s=>s.stage===e.target);if(s)s.dirty=true;if(focusState?.stage===e.target)focusState.dirty=true}});states.forEach(s=>resize.observe(s.stage));
  window.addEventListener('resize',()=>{if(focusState)focusState.dirty=true});
  document.addEventListener('visibilitychange',()=>{lastTime=performance.now()});
  function render(s,t){
    if(!s.canvas||s.failed)return;
    const r=s.stage.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height);if(w<2||h<2)return;
    const dpr=Math.min(devicePixelRatio||1,1.5),bw=Math.round(w*dpr),bh=Math.round(h*dpr);
    if(s.bw!==bw||s.bh!==bh){s.canvas.width=bw;s.canvas.height=bh;s.bw=bw;s.bh=bh;s.w=w;s.h=h}
    const ctx=s.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,bw,bh);ctx.save();
    try{
      if(s.entry.original){ctx.scale(bw/w,bh/h);window.ORIGINAL_RENDERERS[s.entry.renderer](s.canvas,t,w,h)}
      else{
        // Cover the preview with the designed background while keeping title proportions intact.
        ctx.fillStyle='#080c10';ctx.fillRect(0,0,bw,bh);const scale=Math.max(bw/1000,bh/500);ctx.translate((bw-1000*scale)/2,(bh-500*scale)/2);ctx.scale(scale,scale);
        s.entry.render(ctx,1000,500,t,s.api);
      }
    }catch(error){s.failed=true;s.stage.dataset.renderError=String(error);console.error('Title effect:',s.entry.id,error)}finally{ctx.restore()}
  }
  function tick(now){
    const dt=Math.min((now-lastTime)/1000,.1);lastTime=now;if(playing&&!document.hidden)clock+=dt;
    if(!document.hidden&&now-lastDraw>=1000/30){
      lastDraw=now;if(dialog.open&&focusState){if(playing||focusState.dirty){render(focusState,clock-focusStarted+1.2);focusState.dirty=false}}
      else for(const s of states)if(!s.card.hidden&&s.visible&&(playing||s.dirty)){render(s,clock+s.entry.number*.13);s.dirty=false}
    }
    requestAnimationFrame(tick);
  }
  $('favorite-count').textContent=favorites.size;playbackUI();requestAnimationFrame(tick);
})();
