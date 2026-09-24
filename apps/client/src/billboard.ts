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
    uniform vec3 ol_spriteFoot;
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
    vec4 bodyClip = matrix_viewProjection * vec4(upright, 1.0);
    gl_Position.z = bodyClip.z / max(bodyClip.w, 0.0001) * gl_Position.w;
    vPositionW = upright;
    #ifdef LINEAR_DEPTH
      vLinearDepth = -(matrix_view * vec4(upright, 1.0)).z;
    #endif
  `,
  );
  material.update();
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
