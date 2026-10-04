import * as pc from 'playcanvas';

// Only scenery can be made see-through. Every winning world fragment writes
// its class, so an object behind a person cannot inherit a wall's earlier mark.
// docs/world-presentation.md#local-read-through
export const sceneryStencil = new pc.StencilParameters({
  ref: 1,
  zpass: pc.STENCILOP_REPLACE,
});
export const ordinaryStencil = new pc.StencilParameters({
  ref: 0,
  zpass: pc.STENCILOP_REPLACE,
});
export const personStencil = new pc.StencilParameters({
  ref: 2,
  zpass: pc.STENCILOP_REPLACE,
});
export const readThroughStencil = new pc.StencilParameters({
  func: pc.FUNC_EQUAL,
  ref: 1,
  writeMask: 0,
});
export const outsidePeopleStencil = new pc.StencilParameters({
  func: pc.FUNC_NOTEQUAL,
  ref: 2,
  readMask: 2,
  writeMask: 0,
});
export const characterReadThroughStencil = new pc.StencilParameters({
  func: pc.FUNC_EQUAL,
  ref: 3,
  readMask: 1,
  writeMask: 2,
  zpass: pc.STENCILOP_REPLACE,
});

export function setVisibilityStencil(material: pc.Material, stencil: pc.StencilParameters): void {
  material.stencilFront = material.stencilBack = stencil;
}
