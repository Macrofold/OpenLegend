import { parentPort } from 'node:worker_threads';
import { evaluateGeometryBatch, type GeometryBatch } from '@open-legend/spatial';

if (!parentPort) throw new Error('Geometry execution requires a worker.');
let map: GeometryBatch['map'] | undefined;
let collisionReady: Promise<void> | undefined;
parentPort.on(
  'message',
  async (
    request: { id: number; map?: GeometryBatch['map'] } & (
      | { kind: 'sight'; queries: import('@open-legend/spatial').SightRay[] }
      | { kind: 'walking'; queries: import('@open-legend/spatial').WalkingSegment[] }
    ),
  ) => {
    try {
      if (request.map) map = request.map;
      if (!map || !request.queries.length || request.queries.length > 128)
        throw new Error('Invalid geometry batch.');
      // Sight alone needs no native collision setup. Walking shares the same
      // trusted body-query implementation as local execution, including walls.
      if (request.kind === 'walking')
        await (collisionReady ??= import('@open-legend/spatial/rapier').then((runtime) =>
          runtime.initializeCollisionRuntime(),
        ));
      parentPort!.postMessage({
        id: request.id,
        results: evaluateGeometryBatch({ ...request, map }),
      });
    } catch {
      parentPort!.postMessage({ id: request.id, error: 'Geometry preparation failed.' });
    }
  },
);
