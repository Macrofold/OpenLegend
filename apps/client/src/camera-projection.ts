import * as pc from 'playcanvas';

/** Camera commands can precede PlayCanvas's prerender view-cache refresh. */
export function currentCameraProjection(camera: pc.CameraComponent): pc.Mat4 {
  return new pc.Mat4().mul2(
    camera.projectionMatrix,
    camera.entity.getWorldTransform().clone().invert(),
  );
}
