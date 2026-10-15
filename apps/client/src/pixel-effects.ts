import * as pc from 'playcanvas';

class EffectsPass extends pc.RenderPass {
  constructor(device: pc.GraphicsDevice, private readonly draw:()=>void, private readonly prepare:()=>void){super(device);}
  override frameUpdate():void{super.frameUpdate();this.prepare();}
  override execute():void{this.draw();}
}

/** Comparison-only fire capture. The same source cards supply color and depth;
 * composition tests that depth against the actual world before read-through.
 * docs/projects/3d-pixel-art-first-scene-plan.md#implementation-responsibilities */
export class PixelEffects {
  private readonly layer = new pc.Layer({name:'Art effects capture'});
  private readonly output = new pc.Layer({name:'Art effects composite'});
  private readonly sources = new Map<pc.RenderComponent,number[]>();
  private readonly color: pc.Texture;
  private readonly depth: pc.Texture;
  private readonly target: pc.RenderTarget;
  private readonly pass: EffectsPass;
  private readonly quad: pc.MeshInstance;
  private readonly material: pc.ShaderMaterial;
  private buffered=false;
  constructor(private readonly app:pc.Application,private readonly camera:pc.Entity){
    const d=app.graphicsDevice;
    const texture=(name:string,format:number)=>new pc.Texture(d,{name,width:Math.max(1,Math.round(d.width/2)),height:Math.max(1,Math.round(d.height/2)),format,mipmaps:false,minFilter:pc.FILTER_NEAREST,magFilter:pc.FILTER_NEAREST,addressU:pc.ADDRESS_CLAMP_TO_EDGE,addressV:pc.ADDRESS_CLAMP_TO_EDGE});
    this.color=texture('Art effects color',pc.PIXELFORMAT_RGBA16F);this.depth=texture('Art effects depth',pc.PIXELFORMAT_DEPTH);
    this.target=new pc.RenderTarget({colorBuffer:this.color,depthBuffer:this.depth,samples:1});
    app.scene.layers.insert(this.layer,0);
    const immediate=app.scene.layers.getLayerById(pc.LAYERID_IMMEDIATE)!;
    app.scene.layers.insert(this.output,app.scene.layers.getOpaqueIndex(immediate));
    camera.camera!.layers=[...camera.camera!.layers,this.output.id];
    this.pass=new EffectsPass(d,()=>this.render(),()=>{
      const w=Math.max(1,Math.round(d.width/2)),h=Math.max(1,Math.round(d.height/2));
      if(w!==this.color.width||h!==this.color.height)this.target.resize(w,h);
      app.renderer.culler.requestMeshInstanceCull(camera.camera!.camera,this.layer);
    });
    this.pass.init(this.target);this.pass.setClearColor(new pc.Color(0,0,0,0));this.pass.setClearDepth(1);
    camera.camera!.camera.beforePasses.push(this.pass);
    const mesh=new pc.Mesh(d);mesh.setPositions([-1,-1,0,1,-1,0,1,1,0,-1,1,0]);mesh.setIndices([0,1,2,0,2,3]);mesh.update();
    this.material=new pc.ShaderMaterial({uniqueName:'Depth-aware art effects',attributes:{aPosition:pc.SEMANTIC_POSITION},vertexGLSL:`attribute vec3 aPosition; varying vec2 effectUV; void main(){effectUV=aPosition.xy*.5+.5;gl_Position=vec4(aPosition,1.0);}`,fragmentGLSL:`precision highp float; varying vec2 effectUV; uniform sampler2D effectColor;uniform sampler2D effectDepth;void main(){vec4 c=texture2D(effectColor,effectUV);float depth=texture2D(effectDepth,effectUV).r;if(c.a<.01||depth>=1.0)discard;gl_FragDepth=depth;gl_FragColor=c;}`});
    this.material.cull=pc.CULLFACE_NONE;this.material.depthWrite=false;this.material.blendType=pc.BLEND_NORMAL_PREMULTIPLIED;
    this.material.setParameter('effectColor',this.color);this.material.setParameter('effectDepth',this.depth);
    this.quad=new pc.MeshInstance(mesh,this.material,new pc.GraphNode('Art effects image'));this.quad.cull=false;this.quad.castShadow=false;
    this.output.addMeshInstances([this.quad],true);this.setBuffered(false);
  }
  add(component:pc.RenderComponent):void{if(this.sources.has(component))return;this.sources.set(component,[...component.layers]);if(this.buffered)component.layers=[this.layer.id];}
  remove(component:pc.RenderComponent):void{const original=this.sources.get(component);if(!original)return;if(component.entity.render===component)component.layers=original;this.sources.delete(component);}
  setBuffered(value:boolean):void{
    this.buffered=value;for(const[component,original]of this.sources)component.layers=value?[this.layer.id]:original;
    this.pass.enabled=value&&this.sources.size>0;this.quad.visible=this.pass.enabled;
  }
  private render():void{
    const c=this.camera.camera!,gamma=c.gammaCorrection,tone=c.toneMapping;
    c.gammaCorrection=pc.GAMMA_NONE;c.toneMapping=pc.TONEMAP_NONE;
    try{this.app.renderer.renderForwardLayer(c.camera,this.target,this.layer,false,pc.SHADER_FORWARD);this.app.renderer.renderForwardLayer(c.camera,this.target,this.layer,true,pc.SHADER_FORWARD);}
    finally{c.gammaCorrection=gamma;c.toneMapping=tone;}
  }
  diagnostics(){return{buffered:this.buffered,sources:this.sources.size,resolution:[this.color.width,this.color.height],enabled:this.pass.enabled};}
  destroy():void{
    for(const component of [...this.sources.keys()])this.remove(component);
    const passes=this.camera.camera!.camera.beforePasses,index=passes.indexOf(this.pass);if(index>=0)passes.splice(index,1);
    this.camera.camera!.layers=this.camera.camera!.layers.filter(id=>id!==this.output.id);
    this.output.removeMeshInstances([this.quad]);this.quad.destroy();this.material.destroy();this.pass.destroy();this.target.destroy();this.color.destroy();this.depth.destroy();
    this.app.scene.layers.remove(this.layer);this.app.scene.layers.remove(this.output);
  }
}
