import type { Bounds3, FinitePanel, SurfacePoint } from '@open-legend/spatial';
import type { WorldState } from './types.js';
import { entityGet } from './entity-collection.js';
import { isAssemblyPlacement } from './spatial-state.js';
import {
  assemblyShapes,
  assemblySite,
  localPoint,
  rectangularBounds,
} from './assembly-geometry.js';
import { materialExposureView } from './material-exposure.js';
import { boundaryIntegrityState, boundaryMaterialWorkQuery } from './boundary-assemblies.js';
import { pointVisionQuery } from './perception.js';
import { selectedAssemblyPresentation } from './world-composition.js';
import { canonicalJson } from './events.js';
import { validPerceivedPoint } from './perception-values.js';

/** Received outward construction facts; item references remain internal until the
 * scoped public projection binds them to this exact observed root. */
export interface ObservedAssemblyShape extends Bounds3 {
  id: string;
  role:
    | 'post'
    | 'gate-post'
    | 'cover'
    | 'binding'
    | 'hearth'
    | 'panel'
    | 'access-panel'
    | 'gate'
    | 'first-rail'
    | 'second-rail';
  geometry?: 'cylinder';
  panel?: FinitePanel;
}
interface ObservedAssemblyBase {
  presentation: { postColor: string; coverColor: string; coverOpacity: number };
  familyId: string;
  revision: number;
  heading: number;
  site: SurfacePoint;
  shapes: ObservedAssemblyShape[];
}
interface ObservedAssemblyPart {
  id: string;
  name: string;
  slot: string;
  condition?: string;
}
export type ObservedAssembly = ObservedAssemblyBase &
  (
    | {
        implementation: 'four-corner-flexible-bays';
        arrangementId: string;
        parts: Array<ObservedAssemblyPart & { role: 'post' | 'cover' | 'binding'; bay: number }>;
      }
    | {
        implementation: 'grounded-panel-boundary';
        materialRevision: string;
        parts: Array<
          ObservedAssemblyPart & {
            role:
              | 'post'
              | 'gate-post'
              | 'panel'
              | 'access-panel'
              | 'gate'
              | 'first-rail'
              | 'second-rail'
              | 'binding';
          }
        >;
      }
  );

/** One owner supplies editor presentation and the actual sensory receipt. Callers
 * detach retained values at their existing immutable evidence boundary. */
export function assemblyPresentation(
  world: WorldState,
  id: string,
  editor = false,
  observerId?: string,
): ObservedAssembly | undefined {
  const root = entityGet(world.entities, id),
    component = root?.assembly,
    site = root && assemblySite(root);
  if (!component || component.retired || !site) return;
  const geometry = assemblyShapes(world, root);
  const physicalParts = new Set(geometry.posts.map((part) => part.id));
  const family = world.assemblyFamilies![component.family.id]!;
  const common = {
    presentation: selectedAssemblyPresentation(world, family),
    familyId: component.family.id,
    revision: component.revision,
    heading: root.spatial.heading,
    site,
  };
  const bindings: ObservedAssemblyShape[] = Object.values(component.parts)
    .filter((p) => p.role === 'binding' && !physicalParts.has(p.itemId))
    .flatMap((part) => {
      const material = entityGet(world.entities, part.itemId),
        placement = material?.placement;
      if (!isAssemblyPlacement(placement)) return [];
      const point = localPoint(
        site,
        root.spatial.heading,
        placement.local.x,
        placement.local.z,
        placement.local.y,
      );
      return [
        {
          id: part.itemId,
          role: 'binding' as const,
          ...rectangularBounds(
            point,
            root.spatial.heading,
            family.presentation.bindingSize,
            family.presentation.bindingSize,
            family.presentation.bindingSize / 2,
            family.presentation.bindingSize / 2,
          ),
        },
      ];
    });
  if (component.implementation === 'grounded-panel-boundary') {
    const parts = Object.values(component.parts).map((part) => ({
      id: part.itemId,
      name: entityGet(world.entities, part.itemId)?.name ?? '',
      role: part.role,
      slot: part.slot,
    }));
    const value: ObservedAssembly = {
      ...common,
      implementation: component.implementation,
      materialRevision: canonicalJson([]),
      parts,
      // Each aperture/lap piece keeps its actual item identity. The renderer and
      // picking consume the same finite pieces as physics, never their filled union.
      shapes: [
        ...bindings,
        ...geometry.posts.flatMap((solid) => {
          const part = component.parts[solid.id];
          return part
            ? (solid.boxes ?? [solid.bounds]).map((bounds) => ({
                id: solid.id,
                role: part.role,
                ...bounds,
              }))
            : [];
        }),
      ],
    };
    return observerId ? receiveAssemblyConditions(world, id, value, observerId) : value;
  }
  return {
    ...common,
    implementation: component.implementation,
    arrangementId: component.arrangementId,
    parts: Object.values(component.parts).map((part) => {
      const condition = editor && materialExposureView(world, part.itemId);
      return {
        id: part.itemId,
        name: entityGet(world.entities, part.itemId)?.name ?? '',
        role: part.role,
        slot: part.slot,
        bay: part.bay,
        ...(condition ? { condition: condition.label } : {}),
      };
    }),
    shapes: [
      ...bindings,
      ...geometry.posts.map((post) => ({ id: post.id, role: 'post' as const, ...post.bounds })),
      ...geometry.panels.map((panel) => ({
        id: panel.id,
        role: 'cover' as const,
        ...panel.bounds,
        panel: panel.panel,
      })),
    ],
  };
}

/** Geometry/material names are target-independent and shared by the native sight
 * frame. Only face-visible condition is prepared for the actual receiver. */
export function receiveAssemblyConditions(
  world: WorldState,
  rootId: string,
  value: ObservedAssembly,
  observerId: string,
): ObservedAssembly {
  if (value.implementation !== 'grounded-panel-boundary') return value;
  const family = world.assemblyFamilies?.[value.familyId],
    observer = entityGet(world.entities, observerId);
  if (family?.implementation !== value.implementation || !observer) return value;
  const visible = pointVisionQuery(world, observer),
    faces = boundaryMaterialWorkQuery(world, rootId, observerId),
    revisions: Array<[string, number]> = [],
    display = family.presentation.condition;
  if (!display) return value;
  const parts = value.parts.map((part) => {
    const state = faces(part.id).some((face) => visible(face.point))
      ? boundaryIntegrityState(world, rootId, part.id)
      : undefined;
    if (!state) return part;
    revisions.push([part.id, state.revision]);
    return {
      ...part,
      condition:
        state.value >= state.maximum
          ? display.intact
          : state.value <= state.maximum * display.nearlyBrokenFraction
            ? display.nearlyBroken
            : display.damaged,
    };
  });
  return { ...value, materialRevision: canonicalJson(revisions), parts };
}

/** Historical parts may have disappeared; validate received values without joining
 * today's world or requiring the original materials to remain live. */
export function validateObservedAssembly(value: ObservedAssembly): void {
  const fail = () => {
    throw new Error('Invalid observed assembly.');
  };
  if (
    !value ||
    !['four-corner-flexible-bays', 'grounded-panel-boundary'].includes(value.implementation) ||
    typeof value.familyId !== 'string' ||
    !value.familyId ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !Number.isFinite(value.heading) ||
    !validPerceivedPoint(value.site) ||
    typeof value.site.surfaceId !== 'string' ||
    !value.presentation ||
    typeof value.presentation.postColor !== 'string' ||
    typeof value.presentation.coverColor !== 'string' ||
    !Number.isFinite(value.presentation.coverOpacity) ||
    value.presentation.coverOpacity < 0 ||
    value.presentation.coverOpacity > 1 ||
    !Array.isArray(value.parts) ||
    !Array.isArray(value.shapes)
  )
    fail();
  const roles =
    value.implementation === 'four-corner-flexible-bays'
      ? ['post', 'cover', 'binding']
      : [
          'post',
          'gate-post',
          'panel',
          'access-panel',
          'gate',
          'first-rail',
          'second-rail',
          'binding',
        ];
  if (
    value.implementation === 'four-corner-flexible-bays'
      ? typeof value.arrangementId !== 'string'
      : typeof value.materialRevision !== 'string'
  )
    fail();
  const ids = new Set<string>();
  for (const part of value.parts) {
    if (
      !part ||
      typeof part.id !== 'string' ||
      !part.id ||
      ids.has(part.id) ||
      typeof part.name !== 'string' ||
      typeof part.slot !== 'string' ||
      !roles.includes(part.role) ||
      (part.condition !== undefined && typeof part.condition !== 'string') ||
      (value.implementation === 'four-corner-flexible-bays' &&
        (!('bay' in part) || !Number.isSafeInteger(part.bay) || part.bay < 0))
    )
      fail();
    ids.add(part.id);
  }
  for (const shape of value.shapes) {
    if (
      !shape ||
      !ids.has(shape.id) ||
      !roles.includes(shape.role) ||
      !validPerceivedPoint(shape.min) ||
      !validPerceivedPoint(shape.max) ||
      shape.min.x > shape.max.x ||
      shape.min.y > shape.max.y ||
      shape.min.z > shape.max.z ||
      (shape.geometry !== undefined && shape.geometry !== 'cylinder')
    )
      fail();
    if (
      shape.panel &&
      (!Array.isArray(shape.panel.corners) ||
        shape.panel.corners.length !== 4 ||
        shape.panel.corners.some((point) => !validPerceivedPoint(point)) ||
        !Number.isFinite(shape.panel.thickness) ||
        shape.panel.thickness <= 0)
    )
      fail();
  }
}
