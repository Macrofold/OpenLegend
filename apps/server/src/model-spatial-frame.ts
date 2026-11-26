import type { headingFrame, Position } from '@open-legend/domain';

/** One owned frame per decision, shared by presentation and fixed-point movement.
 * Native evidence keeps its original world coordinates and acquisition frame. */
export interface ModelSpatialFrame {
  position: Position;
  axes: ReturnType<typeof headingFrame>;
  support: string | null;
}

export function modelSpatialVector(frame: ModelSpatialFrame, vector: Position) {
  return {
    right: vector.x * frame.axes.right.x + vector.z * frame.axes.right.z,
    above: vector.y,
    forward: vector.x * frame.axes.forward.x + vector.z * frame.axes.forward.z,
  };
}
export function modelSpatialPoint(frame: ModelSpatialFrame, point: Position) {
  return modelSpatialVector(frame, {
    x: point.x - frame.position.x,
    y: point.y - frame.position.y,
    z: point.z - frame.position.z,
  });
}
export function worldPointFromModel(frame: ModelSpatialFrame, right: number, forward: number) {
  return {
    x: frame.position.x + right * frame.axes.right.x + forward * frame.axes.forward.x,
    z: frame.position.z + right * frame.axes.right.z + forward * frame.axes.forward.z,
  };
}
