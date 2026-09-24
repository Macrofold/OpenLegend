import {chromium} from '@playwright/test';import fs from 'node:fs';
const out=process.env.OBS_OUT,base='http://127.0.0.1:'+process.env.PORT;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1024,height:768}});const errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/review.html');await page.waitForFunction(()=>window.review?.ready,{},{timeout:60000});
 const post=async(url,body)=>await page.evaluate(async({url,body})=>{const state=await(await fetch('/api/state')).json();const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-OL-Generation':state.historyEpoch.split(':')[0]},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};},{url,body});
 const control=await post('/api/control',{paused:false,clientId:'review',presenceSequence:1});
 let seq=1;const presence=setInterval(()=>void post('/api/presence',{visible:true,clientId:'review',sequence:++seq}),2000);
 await page.waitForTimeout(4000);await page.evaluate(()=>window.review.start());await page.waitForTimeout(15000);
 const stress=await page.evaluate(()=>window.review.stop());
 await post('/api/control',{paused:true});clearInterval(presence);
 const aspects=[];
 for(const projection of ['orthographic','perspective'])for(const pitch of [.45,.88,1.15]){await page.evaluate(({pitch,projection})=>window.review.pose(1.0,pitch,projection),{pitch,projection});await page.waitForTimeout(350);aspects.push(await page.evaluate(()=>window.review.aspect()));}
 await page.screenshot({path:out+'/pitched.png'});
 const prefs=await page.evaluate(()=>window.review.preferences('nearby'));await page.waitForTimeout(500);await page.screenshot({path:out+'/reveal.png'});
 const rebuilds=[];for(let i=0;i<3;i++){rebuilds.push(await page.evaluate(()=>window.review.rebuild()));await page.waitForTimeout(1000);}
 fs.writeFileSync(out+'/browser.json',JSON.stringify({control,stress,aspects,prefs,rebuilds,errors},null,2));
}catch(e){fs.writeFileSync(out+'/browser-failure.json',JSON.stringify({error:String(e),errors}));throw e;}finally{await browser.close();}
