/* Shared, dependency-free renderer for the Open Legend title atlas. */
(() => {
  'use strict';
  const W=1000,H=500,TITLE='OPEN LEGEND';
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const hash=n=>{const q=Math.sin(n*127.1+311.7)*43758.5453123;return q-Math.floor(q)};
  const color=(hex,a=1)=>{
    let s=hex.replace('#','');if(s.length===3)s=[...s].map(c=>c+c).join('');
    return `rgba(${parseInt(s.slice(0,2),16)},${parseInt(s.slice(2,4),16)},${parseInt(s.slice(4,6),16)},${clamp(a)})`;
  };
  function title(ctx,o={}){
    const size=o.size??84,spacing=o.tracking??9;
    ctx.save();
    ctx.font=`400 ${size}px ${o.font||'Georgia'}, 'Times New Roman', serif`;
    ctx.textAlign='left';ctx.textBaseline='middle';
    const glyphs=[...TITLE],widths=glyphs.map(ch=>ctx.measureText(ch).width);
    const width=widths.reduce((a,b)=>a+b,0)+(glyphs.length-1)*spacing;
    ctx.translate(o.x??500,o.y??260);
    ctx.scale(Math.min(1,810/width)*(o.scaleX??1),o.scaleY??1);
    ctx.globalAlpha*=clamp(o.alpha??1);
    if(o.composite)ctx.globalCompositeOperation=o.composite;
    if(o.blur)ctx.filter=`blur(${o.blur}px)`;
    if(o.glow){ctx.shadowBlur=o.glow;ctx.shadowColor=o.glowColor||o.fill||'#fff';}
    let x=-width/2;
    ctx.fillStyle=o.fill??'#eee8d5';ctx.strokeStyle=o.stroke||'transparent';ctx.lineWidth=o.strokeWidth??1;
    for(let i=0;i<glyphs.length;i++){
      if(o.fill!==null)ctx.fillText(glyphs[i],x,0);
      if(o.stroke)ctx.strokeText(glyphs[i],x,0);
      x+=widths[i]+spacing;
    }
    ctx.restore();
  }
  const mask=document.createElement('canvas');mask.width=W;mask.height=H;
  const mc=mask.getContext('2d',{willReadFrequently:true});title(mc,{fill:'#fff'});
  let maskData;const points=new Map(),particleCache=new Map();
  function glyphPoints(step=6){
    if(!points.has(step)){
      maskData ||= mc.getImageData(0,0,W,H).data;
      const out=[];
      for(let y=175;y<335;y+=step)for(let x=75;x<925;x+=step){
        const a=maskData[(Math.floor(y)*W+Math.floor(x))*4+3]/255;
        if(a>.1)out.push({x,y,a,seed:hash(x*13.7+y*19.3)});
      }
      points.set(step,out);
    }
    return points.get(step);
  }
  function particles(count,seed=1){
    const key=count+':'+seed;
    if(!particleCache.has(key))particleCache.set(key,Array.from({length:count},(_,i)=>({x:hash(seed+i*7.13),y:hash(seed*2.17+i*11.71),s:hash(seed*3.41+i*5.83),p:hash(seed*4.31+i*9.13)*Math.PI*2,v:hash(seed*6.17+i*15.31)})));
    return particleCache.get(key);
  }
  function createAPI(){
    let scratch,sc;
    return {
      text:title,cache:Object.create(null),hash,clamp,color,particles,glyphPoints,
      smooth:(a,b,x)=>{const p=clamp((x-a)/(b-a));return p*p*(3-2*p)},
      mix:(a,b,p)=>a+(b-a)*p,
      background(ctx,inner,outer){ctx.save();const g=ctx.createRadialGradient(500,235,10,500,250,590);g.addColorStop(0,inner);g.addColorStop(1,outer);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()},
      glow(ctx,x,y,r,c,a=1){if(r<=0||a<=0)return;ctx.save();const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color(c,a));g.addColorStop(.25,color(c,a*.6));g.addColorStop(1,color(c,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore()},
      maskFill(ctx,draw,o={}){
        if(!scratch){scratch=document.createElement('canvas');scratch.width=W;scratch.height=H;sc=scratch.getContext('2d')}
        sc.setTransform(1,0,0,1,0,0);sc.clearRect(0,0,W,H);sc.save();
        sc.globalAlpha=1;sc.globalCompositeOperation='source-over';sc.filter='none';sc.shadowBlur=0;
        draw(sc);
        sc.restore();sc.save();sc.globalCompositeOperation='destination-in';sc.drawImage(mask,0,0);sc.restore();
        ctx.save();ctx.globalAlpha*=clamp(o.alpha??1);
        if(o.blur)ctx.filter=`blur(${o.blur}px)`;
        if(o.glow){ctx.shadowBlur=o.glow;ctx.shadowColor=o.glowColor||'#fff'}
        ctx.drawImage(scratch,0,0);ctx.restore();
      }
    };
  }
  window.TitleEngine={createAPI};
})();
