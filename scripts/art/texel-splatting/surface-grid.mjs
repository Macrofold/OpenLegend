// Separate alternative: exact triangle coverage with a plane-aligned material/
// lighting sample grid. This is NOT cubemap splatting or a permanent cube model.
import { BVH_WGSL } from '/upstream/src/bvh.ts';
import {
  LIGHTING_WGSL,
  POINT_LIGHT_WGSL,
  STONE_COLOR_WGSL,
  UNIFORMS_WGSL,
} from '/upstream/src/lighting.ts';
import { OKLAB_WGSL, PATH_WGSL } from '/upstream/src/oklab.ts';
import { SKY_STRUCT_WGSL } from '/upstream/src/sky.ts';

export function createSurfaceGrid(config, layout, group, width, height) {
  const { device } = config;
  const module = device.createShaderModule({
    code: `
${UNIFORMS_WGSL}
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> bvhNodes: array<BVHNode>;
@group(0) @binding(2) var<storage, read> bvhTris: array<BVHTri>;
@group(0) @binding(3) var<storage, read> bvhTriIds: array<u32>;
${POINT_LIGHT_WGSL}
@group(0) @binding(4) var<uniform> pointLights: array<PointLight, 64>;
${SKY_STRUCT_WGSL}
@group(0) @binding(5) var<uniform> sky: Sky;
${BVH_WGSL}
${OKLAB_WGSL}
${PATH_WGSL}
${STONE_COLOR_WGSL}
${LIGHTING_WGSL}
struct V { @builtin(position) pos: vec4f, @location(0) world: vec3f, @location(1) normal: vec3f }
@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f)->V {
 var v:V; v.pos=u.viewProj*vec4f(p,1); v.world=p; v.normal=n; return v;
}
@fragment fn fs(v:V)->@location(0) vec4f {
 let n=normalize(v.normal); let a=abs(n); let cell=.12;
 var axis=2u; if(a.x>=a.y && a.x>=a.z){axis=0u;} else if(a.y>=a.z){axis=1u;}
 // Project the world lattice onto the original face plane, retaining that
 // plane's actual offset. Geometry/depth never moves to a sample center.
 var center=(floor(v.world/cell)+.5)*cell;
 center[axis]=v.world[axis];
 center[axis]-=dot(n,center-v.world)/n[axis];
 let color=stoneColor(center);
 let lit=computeLighting(center,n,color,u.sunDir,u.shadowFade,u.sunColor,u.ambient,0.,0u);
 return vec4f(posterize(lit),1);
}`,
  });
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
    vertex: {
      module,
      entryPoint: 'vs',
      buffers: [
        {
          arrayStride: 24,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x3' },
          ],
        },
      ],
    },
    fragment: { module, entryPoint: 'fs', targets: [{ format: 'rgba8unorm' }] },
    // Same winding as the ordinary raster control. MSAA covers triangle edges;
    // it cannot filter small internal texel boundaries or guarantee no shimmer.
    primitive: { topology: 'triangle-list', cullMode: 'back', frontFace: 'ccw' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: 4 },
  });
  const color = device.createTexture({
    size: [width, height],
    sampleCount: 4,
    format: 'rgba8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const depth = device.createTexture({
    size: [width, height],
    sampleCount: 4,
    format: 'depth32float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const colorView = color.createView(),
    depthView = depth.createView();
  return {
    encode(encoder, resolveTarget) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: colorView,
            resolveTarget,
            clearValue: [0, 0, 0, 1],
            loadOp: 'clear',
            storeOp: 'discard',
          },
        ],
        depthStencilAttachment: {
          view: depthView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'discard',
        },
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.setVertexBuffer(0, config.stoneVertexBuffer);
      pass.setIndexBuffer(config.stoneIndexBuffer, 'uint16');
      pass.drawIndexed(config.stoneIndexCount);
      pass.end();
    },
    destroy() {
      color.destroy();
      depth.destroy();
    },
  };
}
