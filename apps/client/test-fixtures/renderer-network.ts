import * as pc from 'playcanvas';
import { BundledModels, destroyModelApplication } from '../src/bundled-models';
import { assetUrl } from '../src/asset-files';
import { assetNetwork } from '../src/browser-network';

export const fixtureUrl = assetUrl('apps/client/src/props/network-qualification.glb');

function application(canvas: HTMLCanvasElement) {
  return new pc.Application(canvas, { graphicsDeviceOptions: { antialias: false } });
}
function mesh(resource: pc.ContainerResource) {
  const node = resource.instantiateRenderEntity();
  const render = node.findComponent('render') as pc.RenderComponent;
  return { node, mesh: render.meshInstances[0]!.mesh };
}
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Real PlayCanvas parser/registry/GPU resources. Only transport completion and
 * cleanup ordering are controlled; no parser or graphics API is substituted. */
export async function qualifyRendererNetwork(canvas: HTMLCanvasElement, bytes: number[]) {
  const original = window.fetch.bind(window);
  let release!: () => void;
  let started!: () => void;
  const first = new Promise<void>((resolve) => {
    started = resolve;
  });
  let requests = 0;
  window.fetch = (input, init) => {
    if (String(input) !== fixtureUrl) return original(input, init);
    requests++;
    if (requests !== 1) return Promise.resolve(new Response(new Uint8Array(bytes)));
    return new Promise<Response>((resolve) => {
      release = () => resolve(new Response(new Uint8Array(bytes)));
      started();
    });
  };
  const old = application(canvas);
  const oldRegistry = old.assets;
  const oldModels = new BundledModels(old);
  let accepted = false;
  const late = oldModels.load('Late old download', fixtureUrl).then(
    () => {
      accepted = true;
    },
    () => {},
  );
  let successor: pc.Application | undefined;
  let successorModels: BundledModels | undefined;
  let parserApp: pc.Application | undefined;
  let parserModels: BundledModels | undefined;
  let finalApp: pc.Application | undefined;
  let finalModels: BundledModels | undefined;
  let releaseCleanup: (() => void) | undefined;
  try {
    await first;
    destroyModelApplication(old, [oldModels.destroy()]);
    successor = application(canvas);
    successorModels = new BundledModels(successor);
    const replacement = mesh(await successorModels.load('Download successor', fixtureUrl));
    successor.root.addChild(replacement.node);
    release();
    await late;
    for (let attempts = 0; assetNetwork.snapshot().occupied && attempts < 60; attempts++)
      await frame();
    const download = {
      accepted,
      oldAssets: oldRegistry.list().length,
      successorCurrent: pc.AppBase.getApplication(canvas.id) === successor,
      successorVertices: replacement.mesh.vertexBuffer.numVertices,
      owner: assetNetwork.snapshot(),
    };
    destroyModelApplication(successor, [successorModels.destroy()]);
    successor = undefined;
    successorModels = undefined;

    parserApp = application(canvas);
    const parserRegistry = parserApp.assets;
    parserModels = new BundledModels(parserApp);
    const cleanupGate = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const parserDestroyed = new Promise<void>((resolve) => parserApp!.once('destroy', resolve));
    let parsingCleanup: Promise<void> | undefined;
    let successorReady!: Promise<pc.ContainerResource & { animations: pc.Asset[] }>;
    parserRegistry.once('add', () => {
      // Retire while the actual parser owns the admitted bytes. The extra
      // local cleanup gate makes the successor's GPU allocation precede old
      // application destruction, independently of host decoder speed.
      parsingCleanup = parserModels!.destroy();
      destroyModelApplication(parserApp!, [parsingCleanup, cleanupGate]);
      finalApp = application(canvas);
      finalModels = new BundledModels(finalApp);
      successorReady = finalModels.load('Parser successor', fixtureUrl);
    });
    let oldParserAccepted = false;
    await parserModels.load('Retired actual parser', fixtureUrl).then(
      () => {
        oldParserAccepted = true;
      },
      () => {},
    );
    const final = mesh(await successorReady);
    finalApp!.root.addChild(final.node);
    releaseCleanup!();
    await parserDestroyed;
    await frame();
    const parser = {
      accepted: oldParserAccepted,
      cleanupWasAwaited: parsingCleanup instanceof Promise,
      oldAssets: parserRegistry.list().length,
      successorCurrent: pc.AppBase.getApplication(canvas.id) === finalApp,
      successorVertices: final.mesh.vertexBuffer.numVertices,
      successorIndices: final.mesh.indexBuffer[0]!.numIndices,
      successorAssets: finalApp!.assets.list().length,
      owner: assetNetwork.snapshot(),
    };
    const finalRegistry = finalApp!.assets;
    destroyModelApplication(finalApp!, [finalModels!.destroy()]);
    finalApp = undefined;
    finalModels = undefined;
    const retired = {
      vertexBufferReleased: final.mesh.vertexBuffer === null,
      indicesReleased: final.mesh.indexBuffer.length === 0,
      registryReleased: finalRegistry.list().length === 0,
    };
    return { download, parser, retired, requests };
  } finally {
    window.fetch = original;
    release?.();
    releaseCleanup?.();
    if (old.root) destroyModelApplication(old, [oldModels.destroy()]);
    if (successor) destroyModelApplication(successor, [successorModels?.destroy()]);
    if (parserApp?.root && !finalApp) destroyModelApplication(parserApp, [parserModels?.destroy()]);
    if (finalApp) destroyModelApplication(finalApp, [finalModels?.destroy()]);
  }
}
