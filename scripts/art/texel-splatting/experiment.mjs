// Standalone E07 adapter. The pinned MIT renderer is fetched by run.mjs, never
// imported into the application or used to create a second playable world.
import { uploadTriangles } from '/upstream/src/bvh.ts';
import { createLBVH, dispatchLBVH } from '/upstream/src/lbvh.ts';
import { computeVertexAABB } from '/upstream/src/lighting.ts';
import { createSplat } from '/upstream/src/splat.ts';
import { createDirect } from '/upstream/demo/direct.ts';
import { lookAt, multiply, perspective } from '/upstream/src/math.ts';
import { createSky, sampleGradient, uploadSky, uploadSkyScene } from '/upstream/src/sky.ts';

const geometry = await (await fetch('/geometry.json')).json();
const adapter = await navigator.gpu?.requestAdapter();
if (!adapter) throw new Error('E07 requires a hardware WebGPU adapter.');
const timestamps = adapter.features.has('timestamp-query');
const gpu = await adapter.requestDevice({
  requiredFeatures: timestamps ? ['timestamp-query'] : [],
});
const errors = [];
gpu.addEventListener('uncapturederror', (event) => errors.push(event.error.message));
const allocations = [];
let recording;
const query = timestamps ? gpu.createQuerySet({ type: 'timestamp', count: 128 }) : undefined;
const resolved = gpu.createBuffer({
  size: 1024,
  usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
});
const readback = gpu.createBuffer({
  size: 1024,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});
function track(resource, kind, bytes, description) {
  const allocation = { kind, bytes, description, live: true };
  allocations.push(allocation);
  const destroy = resource.destroy.bind(resource);
  resource.destroy = () => {
    allocation.live = false;
    destroy();
  };
  return resource;
}
function memory() {
  const result = { textureBytes: 0, bufferBytes: 2048, resources: 2 };
  for (const item of allocations)
    if (item.live) {
      result[item.kind === 'texture' ? 'textureBytes' : 'bufferBytes'] += item.bytes;
      result.resources++;
    }
  return result;
}
// Instrument pass boundaries without changing capture, shading or splat code.
const device = new Proxy(gpu, {
  get(target, name) {
    if (name === 'createTexture')
      return (descriptor) => {
        const size = descriptor.size;
        const dims = Array.isArray(size)
          ? size
          : [size.width, size.height ?? 1, size.depthOrArrayLayers ?? 1];
        if (
          !['rgba8unorm', 'r32float', 'r32uint', 'depth24plus', 'depth32float'].includes(
            descriptor.format,
          )
        )
          throw new Error(`Uncounted texture format: ${descriptor.format}`);
        return track(
          target.createTexture(descriptor),
          'texture',
          dims[0] * (dims[1] ?? 1) * (dims[2] ?? 1) * 4,
          { size: dims, format: descriptor.format },
        );
      };
    if (name === 'createBuffer')
      return (descriptor) => track(target.createBuffer(descriptor), 'buffer', descriptor.size, {});
    if (name === 'createCommandEncoder')
      return (...args) => {
        const encoder = target.createCommandEncoder(...args);
        return new Proxy(encoder, {
          get(object, method) {
            if (method === 'beginRenderPass' || method === 'beginComputePass')
              return (descriptor = {}) => {
                if (recording && query) {
                  const index = recording.passes.length * 2;
                  if (index + 1 >= 128) throw new Error('Too many measured GPU passes.');
                  const kind =
                    method === 'beginComputePass'
                      ? (['shade', 'edge mask', 'cull'][recording.computes++] ?? 'compute')
                      : descriptor.colorAttachments?.length === 4
                        ? 'capture'
                        : recording.mode === 'direct'
                          ? 'direct'
                          : 'draw';
                  recording.passes.push({ kind, index });
                  descriptor = {
                    ...descriptor,
                    timestampWrites: {
                      querySet: query,
                      beginningOfPassWriteIndex: index,
                      endOfPassWriteIndex: index + 1,
                    },
                  };
                }
                return object[method](descriptor);
              };
            return typeof object[method] === 'function'
              ? object[method].bind(object)
              : object[method];
          },
        });
      };
    return typeof target[name] === 'function' ? target[name].bind(target) : target[name];
  },
});
const started = performance.now();
const vertices = [],
  indices = [];
for (const mesh of geometry.meshes) {
  const base = vertices.length / 6;
  for (let i = 0; i < mesh.positions.length; i += 3)
    vertices.push(...mesh.positions.slice(i, i + 3), ...mesh.normals.slice(i, i + 3));
  for (const index of mesh.indices) indices.push(base + index);
}
if (!vertices.length || vertices.length / 6 > 65535)
  throw new Error('E07 requires 1–65535 static vertices.');
const vertexData = new Float32Array(vertices),
  indexData = new Uint16Array(indices);
const upload = (data, usage) => {
  const buffer = device.createBuffer({
    size: Math.max(4, Math.ceil(data.byteLength / 4) * 4),
    usage: usage | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
};
const vertexBuffer = upload(vertexData, GPUBufferUsage.VERTEX);
const indexBuffer = upload(indexData, GPUBufferUsage.INDEX);
const emptyVertex = upload(new Float32Array(6), GPUBufferUsage.VERTEX);
const emptyIndex = upload(new Uint16Array(2), GPUBufferUsage.INDEX);
const triangles = uploadTriangles(device, vertexData, indexData);
const bvh = await createLBVH(device, triangles.triAABBBuffer, triangles.count);
const initial = device.createCommandEncoder();
dispatchLBVH(bvh, initial, device);
device.queue.submit([initial.finish()]);
await device.queue.onSubmittedWorkDone();
const sky = createSky(device, 'rgba8unorm');
const uniforms = device.createBuffer({
  size: 128,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const lightBuffer = device.createBuffer({
  size: 2048,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const orbBuffers = Array.from({ length: 4 }, () =>
  device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }),
);
const bounds = computeVertexAABB(vertexData, 6);
const emptyBounds = { min: [1000, 1000, 1000], max: [1001, 1001, 1001] };
const config = {
  device,
  vertexBuffer: emptyVertex,
  indexBuffer: emptyIndex,
  indexCount: 0,
  stoneVertexBuffer: vertexBuffer,
  stoneIndexBuffer: indexBuffer,
  stoneIndexCount: indices.length,
  orbVertexBuffer: emptyVertex,
  orbIndexBuffer: emptyIndex,
  orbIndexCount: 0,
  orbBuffers,
  meshAABBs: { grass: emptyBounds, stones: bounds, orbs: emptyBounds },
  area: 1,
  height: 0,
  baseR: 0.5,
  baseG: 0.5,
  baseB: 0.5,
  density: 0,
  rootL: 1,
  tipL: 1,
  hueFreq: 0,
  hueVar: 0,
  nodeBuffer: bvh.treeNodes,
  triBuffer: triangles.triBuffer,
  triIdBuffer: bvh.sortedIds,
  lightBuffer,
  skyBuffer: sky.skyBuffer,
  sceneBuffer: sky.sceneBuffer,
};
const layout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' },
    },
    ...[1, 2, 3].map((binding) => ({
      binding,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: 'read-only-storage' },
    })),
    ...[4, 5].map((binding) => ({
      binding,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' },
    })),
  ],
});
const group = device.createBindGroup({
  layout,
  entries: [
    uniforms,
    bvh.treeNodes,
    triangles.triBuffer,
    bvh.sortedIds,
    lightBuffer,
    sky.skyBuffer,
  ].map((buffer, binding) => ({ binding, resource: { buffer } })),
});
const width = 640,
  height = 360;
const probeSize = Number(new URLSearchParams(location.search).get('probe'));
// Match the central cubemap face's approximate angular density at a 60° view.
const directHeight = Math.round((probeSize * Math.tan(Math.PI / 6)) / 9) * 9;
const directWidth = (directHeight * 16) / 9;
const texture = (format, w = width, h = height) =>
  device.createTexture({
    size: [w, h],
    format,
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
  });
const color = texture('rgba8unorm'),
  depth = texture('depth32float');
const colorView = color.createView(),
  depthView = depth.createView();
const commonMemory = memory();
const direct = createDirect({ ...config, sceneBindGroupLayout: layout, sceneBindGroup: group });
const directColor = texture('rgba8unorm', directWidth, directHeight),
  directDepth = texture('depth32float', directWidth, directHeight);
const directPoster = texture('rgba8unorm', directWidth, directHeight);
const directColorView = directColor.createView(),
  directDepthView = directDepth.createView(),
  directPosterView = directPoster.createView();
direct.resize(directWidth, directHeight, directColorView, directPosterView);
const directMemory = memory();
const splat = createSplat(config);
const splatMemory = memory();
const canvas = document.querySelector('canvas');
canvas.width = 1280;
canvas.height = 720;
const context = canvas.getContext('webgpu');
const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device: gpu, format, alphaMode: 'opaque' });
const blitShader = device.createShaderModule({
  code: `
@group(0) @binding(0) var image: texture_2d<f32>;
struct V { @builtin(position) p: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32)-> V {
 let p=array(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i]; var v:V;
 v.p=vec4f(p,0,1); v.uv=p*vec2f(0.5,-0.5)+0.5; return v;
}
@fragment fn fs(v:V)->@location(0) vec4f {return textureLoad(image,vec2i(v.uv*vec2f(textureDimensions(image))),0);}`,
});
const blit = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module: blitShader, entryPoint: 'vs' },
  fragment: { module: blitShader, entryPoint: 'fs', targets: [{ format }] },
});
const blitGroup = device.createBindGroup({
  layout: blit.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: colorView }],
});
const directBlitGroup = device.createBindGroup({
  layout: blit.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: directColorView }],
});
await device.queue.onSubmittedWorkDone();
const coldPreparationMs = performance.now() - started;
async function frame({
  mode = 'splat',
  eye = geometry.camera.position,
  target = geometry.camera.target,
  time = 0,
  elevation = 42,
  fov = 60,
} = {}) {
  const begin = performance.now();
  const forward = target.map((v, i) => v - eye[i]);
  const length = Math.hypot(...forward);
  for (let i = 0; i < 3; i++) forward[i] /= length;
  const view = lookAt(...eye, ...target, 0, 1, 0);
  const matrix = multiply(perspective(fov, width / height, 0.1, 200), view);
  const angle = (elevation * Math.PI) / 180,
    sunDir = [Math.cos(angle) * 0.6, Math.sin(angle), Math.cos(angle) * 0.8];
  const lighting = sampleGradient(elevation),
    s = lighting.sunColor,
    a = lighting.ambientColor;
  const sunColor = [s.r, s.g, s.b].map((v) => v * lighting.sunIntensity);
  const ambient = [a.r, a.g, a.b].map((v) => v * lighting.ambientIntensity);
  const uniformData = new Float32Array(32);
  uniformData.set(matrix);
  uniformData.set(sunDir, 16);
  uniformData[19] = 1;
  uniformData.set(sunColor, 20);
  uniformData.set(ambient, 24);
  uniformData.set(eye, 28);
  device.queue.writeBuffer(uniforms, 0, uniformData);
  uploadSky(device, sky.skyBuffer, lighting, 36, elevation);
  const world = new Float32Array([
    view[0],
    view[4],
    view[8],
    0,
    view[1],
    view[5],
    view[9],
    0,
    view[2],
    view[6],
    view[10],
    0,
    ...eye,
    1,
  ]);
  uploadSkyScene(
    device,
    sky.sceneBuffer,
    world,
    sunDir.map((v) => -v),
    sunColor,
    lighting.zenith,
    mode === 'direct' ? directWidth : width,
    mode === 'direct' ? directHeight : height,
    fov,
  );
  recording = { mode, passes: [], computes: 0 };
  const encoder = device.createCommandEncoder();
  if (mode === 'splat')
    splat.encode(
      encoder,
      {
        cameraPos: eye,
        cameraFwd: forward,
        sunDir,
        sunColor,
        ambient,
        shadowFade: 1,
        pointLightCount: 0,
        time,
      },
      colorView,
      depthView,
      matrix,
    );
  else direct.encode(encoder, sky.encode, directColorView, directDepthView, directPosterView);
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0, 0, 0, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });
  pass.setPipeline(blit);
  pass.setBindGroup(0, mode === 'direct' ? directBlitGroup : blitGroup);
  pass.draw(3);
  pass.end();
  const passes = recording.passes;
  recording = undefined;
  if (query) {
    encoder.resolveQuerySet(query, 0, passes.length * 2, resolved, 0);
    encoder.copyBufferToBuffer(resolved, 0, readback, 0, passes.length * 16);
  }
  const encodedMs = performance.now() - begin;
  device.queue.submit([encoder.finish()]);
  await device.queue.onSubmittedWorkDone();
  const completeMs = performance.now() - begin;
  const gpuMs = {};
  const gpuStageSpanMs = {};
  let gpuSpanMs;
  if (query) {
    await readback.mapAsync(GPUMapMode.READ);
    const values = new BigUint64Array(readback.getMappedRange());
    const ranges = {};
    for (const item of passes) {
      gpuMs[item.kind] =
        (gpuMs[item.kind] ?? 0) + Number(values[item.index + 1] - values[item.index]) / 1e6;
      const start = values[item.index],
        end = values[item.index + 1];
      const range = ranges[item.kind];
      ranges[item.kind] = range
        ? [start < range[0] ? start : range[0], end > range[1] ? end : range[1]]
        : [start, end];
    }
    for (const [kind, range] of Object.entries(ranges))
      gpuStageSpanMs[kind] = Number(range[1] - range[0]) / 1e6;
    gpuSpanMs = Number(values[passes.length * 2 - 1] - values[0]) / 1e6;
    readback.unmap();
  }
  return {
    encodedMs,
    completeMs,
    gpuMs,
    gpuStageSpanMs,
    gpuSpanMs,
    passCounts: passes.reduce(
      (counts, item) => ({ ...counts, [item.kind]: (counts[item.kind] ?? 0) + 1 }),
      {},
    ),
  };
}
const experiment = {
  frame,
  geometry: {
    source: geometry.source,
    names: geometry.meshes.map((m) => m.name),
    vertices: vertices.length / 6,
    triangles: indices.length / 3,
    bounds,
    camera: geometry.camera,
  },
  errors,
  memory: { common: commonMemory, withDirect: directMemory, withSplat: splatMemory },
  allocations,
  coldPreparationMs,
  adapter: {
    vendor: adapter.info.vendor,
    architecture: adapter.info.architecture,
    device: adapter.info.device,
    description: adapter.info.description,
    features: [...adapter.features],
  },
  settings: {
    width,
    height,
    directWidth,
    directHeight,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    probeSize,
  },
  destroy() {
    direct.destroy();
    splat.destroy();
    for (const item of allocations) item.live = false;
    gpu.destroy();
    return { deviceDestroyed: true };
  },
};
await frame();
window.e07 = experiment;
document.querySelector('output').textContent =
  'E07 ready: neutral static geometry, not production art.';
