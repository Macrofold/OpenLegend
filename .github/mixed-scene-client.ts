import * as pc from 'playcanvas';
import { WildernessScene } from './src/scene';
const canvas = document.querySelector('canvas')!;
const report: any = { polls: [], setView: [], update: [], frames: [], draws: [], errors: [] };
let scene: any, view: any, measuring = false, orbit = false, last = 0;
const callbacks = { select() {}, move() {}, hover() {} };
scene = new WildernessScene(canvas, callbacks);
const update = scene.update.bind(scene);
scene.update = (dt: number) => { const t = performance.now(); update(dt); if(measuring) report.update.push(performance.now()-t); };
async function poll() {
  try {
    const t = performance.now();
    const response = await fetch('/api/state');
    view = await response.json();
    if(!response.ok) throw new Error(JSON.stringify(view));
    if(measuring) report.polls.push(performance.now()-t);
    const start=performance.now(); scene.setView(view);
    if(measuring) report.setView.push(performance.now()-start);
    (window as any).review.ready = canvas.dataset.ready==='true';
  } catch(e) { report.errors.push(String(e)); }
  setTimeout(poll, 100);
}
function frame(t:number) {
  if(measuring && last){report.frames.push(t-last);report.draws.push({...scene.app.stats.drawCalls});}
  if(orbit)scene.cameraCommand({type:'orbit',yaw:Math.min(t-last,100)*0.0002,pitch:0});
  last=t;requestAnimationFrame(frame);
}
function resources(){
 const layer=scene.app.scene.layers.getLayerById(pc.LAYERID_WORLD);
 return {cards:scene.cards.size,actors:scene.actors.size,observed:[...scene.actors.values()].filter((e:any)=>e.observed).length,
 colorMeshes:layer.meshInstances.length,shadowCasters:layer.shadowCasters.length,
 shadowOnlyInColor:layer.meshInstances.filter((m:any)=>m.node.name==='Shadow-only body').length,
 textures:scene.textures.length,materials:scene.materials.length,lights:scene.presentation.lights.filter((e:any)=>e.enabled).length,
 reveal:[...scene.actors.values()].filter((e:any)=>e.reveal.strength>0.01).length,
 memory:(performance as any).memory?.usedJSHeapSize};
}
(window as any).review = {
 ready:false,report,
 freeze(){orbit=false;measuring=false;scene.app.autoRender=false;},
 start(){report.frames=[];report.update=[];report.draws=[];report.polls=[];report.setView=[];measuring=true;orbit=true;},
 stop(){measuring=false;orbit=false;return {report,resources:resources(),simTime:view.clock};},
 pose(yaw:number,pitch:number,projection:string){
  const c=scene.cameraState();if(c.projection!==projection)scene.cameraCommand({type:'projection'});
  scene.cameraCommand({type:'orbit',yaw:yaw-c.yaw,pitch:pitch-c.pitch});
 },
 aspect(){
  const e=scene.actors.get(view.player.id),m=e.sprite.getWorldTransform(),c=scene.camera.camera;
  const pts=[[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5]].map(p=>c.worldToScreen(m.transformPoint(new pc.Vec3(...p))));
  return {yaw:scene.cameraState().yaw,pitch:scene.cameraState().pitch,projection:scene.cameraState().projection,
   ratio:(Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x)))/(Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y))),
   expected:e.width/e.height,anchor:scene.screenPosition(view.player.id),resources:resources()};
 },
 async preferences(mode:string){const r=await fetch('/api/profile/preferences',{method:'POST',headers:{'Content-Type':'application/json','X-OL-Generation':view.historyEpoch.split(':')[0]},body:JSON.stringify({revealMode:mode,revealRadius:12,revealStrength:.9})});return {status:r.status,body:await r.json()};},
 rebuild(){scene.setView({...view,saveTimeline:crypto.randomUUID()});return resources();}
};
void poll();requestAnimationFrame(frame);
