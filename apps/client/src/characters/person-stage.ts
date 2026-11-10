import * as pc from 'playcanvas';
import { ArtMaterials, candidateArt } from '../art-treatment';
import { destroyModelApplication } from '../bundled-models';

/** The same inspection lighting and resource ownership for editor and comparison.
 * Characters, fitting and motion remain in PersonActors. */
export function createPersonStage(canvas: HTMLCanvasElement) {
  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: { antialias: true, alpha: false },
  });
  app.graphicsDevice.maxPixelRatio = 1;
  app.autoRender = false;
  app.scene.ambientLight = new pc.Color(0.32, 0.35, 0.37);
  const cameraEntity = new pc.Entity('Appearance camera', app);
  cameraEntity.addComponent('camera', {
    projection: pc.PROJECTION_ORTHOGRAPHIC,
    clearColor: new pc.Color(0.12, 0.18, 0.16),
    nearClip: 0.01,
    farClip: 40,
  });
  app.root.addChild(cameraEntity);
  const camera = cameraEntity.camera;
  if (!camera) throw new Error('Appearance camera could not be prepared.');

  const frame = new pc.CameraFrame(app, camera);
  frame.rendering.toneMapping = pc.TONEMAP_ACES;
  frame.rendering.samples = 4;
  frame.update();
  const sun = new pc.Entity('Appearance daylight', app);
  sun.addComponent('light', {
    type: 'directional',
    color: new pc.Color(1, 0.97, 0.88),
    intensity: 1.45,
    castShadows: true,
    shadowType: pc.SHADOW_PCF3,
    shadowResolution: 1024,
    shadowDistance: 12,
    normalOffsetBias: 0.02,
  });
  sun.setEulerAngles(42, -28, 0);
  app.root.addChild(sun);
  const fill = new pc.Entity('Appearance sky fill', app);
  fill.addComponent('light', {
    type: 'directional',
    color: new pc.Color(0.68, 0.79, 1),
    intensity: 0.5,
  });
  fill.setEulerAngles(25, 140, 0);
  app.root.addChild(fill);
  const art = new ArtMaterials(app.graphicsDevice);
  art.update(candidateArt);
  const floorMaterial = new pc.StandardMaterial();
  floorMaterial.diffuse = new pc.Color(0.19, 0.22, 0.18);
  floorMaterial.gloss = 0;
  floorMaterial.update();
  const floor = new pc.Entity('Appearance ground', app);
  floor.addComponent('render', {
    type: 'plane',
    material: floorMaterial,
    castShadows: false,
  });
  floor.setLocalScale(20, 1, 20);
  floor.setLocalPosition(0, -0.005, 0);
  app.root.addChild(floor);
  return {
    app,
    camera: cameraEntity,
    cameraComponent: camera,
    sun,
    fill,
    art,
    destroy() {
      frame.destroy();
      floorMaterial.destroy();
      destroyModelApplication(app, []);
    },
  };
}
