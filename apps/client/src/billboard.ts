import * as pc from 'playcanvas';

const configured = new WeakSet<pc.StandardMaterial>();
/** The image faces the camera; its depth and illumination use an upright virtual body.
 * Vertex depth (rather than fragment-depth writes) retains normal depth testing without
 * foreshortening the artwork or putting a whole character behind a low crate.
 * docs/world-presentation.md#motion-and-depth
 */
export function configureBillboard(material: pc.StandardMaterial): void {
  if (configured.has(material)) return;
  configured.add(material);
  material.shaderChunks.glsl.set(
    'litUserDeclarationVS',
    `
    #ifdef OL_INSTANCED_SPRITE
      varying vec3 ol_spriteFoot;
      varying vec2 ol_spriteSize;
    #else
      uniform vec3 ol_spriteFoot;
    #endif
    uniform vec3 ol_cameraRight;
    uniform vec3 ol_cameraUp;
  `,
  );
  material.shaderChunks.glsl.set(
    'litUserMainEndVS',
    `
    vec3 offset = vPositionW - ol_spriteFoot;
    vec3 upright = ol_spriteFoot + ol_cameraRight * dot(offset, ol_cameraRight);
    upright.y += dot(offset, ol_cameraUp);
    vec3 cameraBack = cross(ol_cameraRight, ol_cameraUp);
    float depth = dot(offset, cameraBack);
    upright += normalize(cross(ol_cameraRight, vec3(0.0, 1.0, 0.0))) * depth;
    vec4 bodyClip = matrix_viewProjection * vec4(upright, 1.0);
    #ifdef SHADOW_PASS
      // Cast the upright artwork and its relief using the same body as receivers.
      gl_Position = bodyClip;
    #else
      // Keep the exact 2D silhouette even in perspective: the relief adds body
      // depth, but its front image remains the display and picking surface.
      gl_Position = matrix_viewProjection * vec4(vPositionW - cameraBack * depth, 1.0);
      gl_Position.z = bodyClip.z / max(bodyClip.w, 0.0001) * gl_Position.w;
    #endif
    vPositionW = upright;
    #ifdef LINEAR_DEPTH
      vLinearDepth = -(matrix_view * vec4(upright, 1.0)).z;
    #endif
  `,
  );
  material.update();
}

/** Static decorative cards share one draw and derive camera orientation on the GPU.
 * The buffer contains immutable foot/size transforms, not rotating scene nodes.
 * Only non-pickable, non-casting scenery uses this path; entity scope stays separate.
 * docs/world-presentation.md#continuous-shadows
 */
export function instanceBillboards(
  device: pc.GraphicsDevice,
  material: pc.StandardMaterial,
  transforms: Float32Array,
  bottomPadding: number,
): { instance: pc.MeshInstance; buffer: pc.VertexBuffer } {
  configureBillboard(material);
  material.setDefine('OL_INSTANCED_SPRITE', true);
  // Overriding the instance transform requires explicit attribute semantics.
  material.setAttribute('instance_line1', pc.SEMANTIC_ATTR11);
  material.setAttribute('instance_line2', pc.SEMANTIC_ATTR12);
  material.setAttribute('instance_line3', pc.SEMANTIC_ATTR14);
  material.setAttribute('instance_line4', pc.SEMANTIC_ATTR15);
  material.setParameter('ol_bottomPadding', bottomPadding);
  material.shaderChunks.glsl.set(
    'transformInstancingVS',
    `
    attribute vec4 instance_line1;
    attribute vec4 instance_line2;
    attribute vec4 instance_line3;
    attribute vec4 instance_line4;
    uniform float ol_bottomPadding;
    mat4 getModelMatrix() {
      vec3 back = cross(ol_cameraRight, ol_cameraUp);
      vec3 center = instance_line4.xyz + ol_cameraUp * instance_line3.z * (0.5 - ol_bottomPadding);
      return mat4(vec4(ol_cameraRight * instance_line1.x, 0.0),
                  vec4(back * instance_line2.y, 0.0),
                  vec4(-ol_cameraUp * instance_line3.z, 0.0), vec4(center, 1.0));
    }
  `,
  );
  material.shaderChunks.glsl.set(
    'litUserMainStartVS',
    `ol_spriteFoot = instance_line4.xyz;
     ol_spriteSize = vec2(instance_line1.x, instance_line3.z);`,
  );
  material.update();
  const mesh = pc.Mesh.fromGeometry(
    device,
    new pc.PlaneGeometry({ widthSegments: 1, lengthSegments: 1 }),
  );
  const instance = new pc.MeshInstance(mesh, material);
  const buffer = new pc.VertexBuffer(
    device,
    pc.VertexFormat.getDefaultInstancingFormat(device),
    transforms.length / 16,
    { data: transforms, usage: pc.BUFFER_STATIC },
  );
  // One conservative bound covers all camera orientations. This trades per-tuft
  // culling for a few hundred cheap triangles and no per-tuft draw/transform work.
  const min = new pc.Vec3(Infinity, Infinity, Infinity);
  const max = new pc.Vec3(-Infinity, -Infinity, -Infinity);
  for (let i = 0; i < transforms.length; i += 16) {
    const radius = transforms[i]! + transforms[i + 10]!;
    for (const [axis, offset] of [
      ['x', 12],
      ['y', 13],
      ['z', 14],
    ] as const) {
      min[axis] = Math.min(min[axis], transforms[i + offset]! - radius);
      max[axis] = Math.max(max[axis], transforms[i + offset]! + radius);
    }
  }
  const bounds = new pc.BoundingBox();
  bounds.setMinMax(min, max);
  instance.setCustomAabb(bounds);
  instance.setInstancing(buffer, true);
  instance.castShadow = false;
  return { instance, buffer };
}

/** Transparent padding shared across frames keeps contact stable during animation.
 * Side margins become the bottom edge when the displayed art lies horizontally.
 * This is derived asset data, not authored anatomy or a physical collision shape. */
export function spritePadding(images: readonly ImageData[]): {
  bottom: number;
  left: number;
  right: number;
} {
  let bottom = 1,
    left = 1,
    right = 1;
  for (const image of images) {
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (image.data[(y * image.width + x) * 4 + 3]! < 24) continue;
        bottom = Math.min(bottom, (image.height - y - 1) / image.height);
        left = Math.min(left, x / image.width);
        right = Math.min(right, (image.width - x - 1) / image.width);
      }
    }
  }
  return bottom === 1 ? { bottom: 0, left: 0, right: 0 } : { bottom, left, right };
}

/** The inverse of the visual placement, also used for picking/reveal feathering. */
export function billboardBodyPoint(
  point: pc.Vec3,
  foot: pc.Vec3,
  right: pc.Vec3,
  up: pc.Vec3,
): pc.Vec3 {
  const offset = new pc.Vec3().sub2(point, foot);
  return new pc.Vec3()
    .copy(right)
    .mulScalar(offset.dot(right))
    .add(foot)
    .add(new pc.Vec3(0, offset.dot(up), 0));
}

const boundsInverse = new pc.Mat4();
const boundsPoint = new pc.Vec3();
const boundsOffset = new pc.Vec3();
const boundsMin = new pc.Vec3();
const boundsMax = new pc.Vec3();
const boundsBack = new pc.Vec3();
const boundsOutward = new pc.Vec3();
/** Culling must enclose the visible card and its shader-adjusted upright body.
 * Update only with card orientation/pose, reusing the instance-owned bounds. */
export function updateBillboardBounds(
  card: pc.Entity,
  foot: pc.Vec3,
  right: pc.Vec3,
  up: pc.Vec3,
  depth = 0,
): void {
  const transform = card.getWorldTransform();
  boundsInverse.copy(transform).invert();
  boundsBack.cross(right, up);
  boundsOutward.cross(right, pc.Vec3.UP).normalize();
  boundsMin.set(-0.5, -depth, -0.5);
  boundsMax.set(0.5, 0, 0.5);
  for (let x = -0.5; x <= 0.5; x++)
    for (let z = -0.5; z <= 0.5; z++) {
      for (let face = 0; face < (depth ? 2 : 1); face++) {
        const y = -depth * face;
        transform.transformPoint(boundsPoint.set(x, y, z), boundsPoint);
        boundsOffset.sub2(boundsPoint, foot);
        const height = boundsOffset.dot(up);
        const relief = boundsOffset.dot(boundsBack);
        boundsPoint.copy(right).mulScalar(boundsOffset.dot(right)).add(foot);
        boundsPoint.y += height;
        boundsPoint.addScaled(boundsOutward, relief);
        boundsInverse.transformPoint(boundsPoint, boundsPoint);
        boundsMin.min(boundsPoint);
        boundsMax.max(boundsPoint);
      }
    }
  const render = card.render!;
  const bounds = render.customAabb ?? new pc.BoundingBox();
  bounds.setMinMax(boundsMin, boundsMax);
  render.customAabb = bounds;
}

/** A changed depth must participate in the same camera-depth comparison as solid geometry.
 * Perspective rays are not parallel to camera.forward, so use view depth, not ray distance.
 */
export function cameraDepthFraction(
  point: pc.Vec3,
  from: pc.Vec3,
  to: pc.Vec3,
  forward: pc.Vec3,
): number {
  return new pc.Vec3().sub2(point, from).dot(forward) / new pc.Vec3().sub2(to, from).dot(forward);
}
