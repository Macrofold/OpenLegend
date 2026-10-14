import { isAssemblyPlacement } from '@open-legend/domain';
import { z } from 'zod';
import {
  isSafeRecordId,
  assemblyShapes,
  assemblySite,
  materialExposureView,
  localPoint,
  rectangularBounds,
  type WorldState,
} from '@open-legend/domain';
import type { AssemblyView } from '@open-legend/protocol';
const id = z.string().refine(isSafeRecordId);
export const constructionPlanSchema = z
  .object({
    familyId: id,
    arrangementId: id,
    rootId: id.optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
    site: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        z: z.number().finite(),
        surfaceId: id,
      })
      .strict(),
    orientation: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    operation: z.enum(['build', 'extend', 'replace', 'lower', 'dismantle', 'resume', 'reclaim']),
    postIds: z.array(id).max(6),
    coverId: id.optional(),
    bindingIds: z.array(id).max(4),
    outgoingId: id.optional(),
    destinationId: id.optional(),
    keepCovered: z.boolean().optional(),
  })
  .strict();
export function assemblyView(
  world: WorldState,
  id: string,
  editor = false,
): AssemblyView | undefined {
  const root = world.entities[id],
    component = root?.assembly,
    site = root && assemblySite(root);
  if (!component || component.retired || !site) return;
  const geometry = assemblyShapes(world, root);
  const presentation = world.assemblyFamilies![component.family.id]!.presentation;
  return {
    presentation: { postColor: presentation.postColor, coverColor: presentation.coverColor },
    familyId: component.family.id,
    arrangementId: component.arrangementId,
    revision: component.revision,
    heading: root.spatial.heading,
    site,
    parts: Object.values(component.parts).map((part) => {
      const condition = editor && materialExposureView(world, part.itemId);
      return {
        id: part.itemId,
        name: world.entities[part.itemId]?.name ?? '',
        role: part.role,
        slot: part.slot,
        bay: part.bay,
        ...(condition ? { condition: condition.label } : {}),
      };
    }),
    shapes: [
      ...Object.values(component.parts)
        .filter((p) => p.role === 'binding')
        .flatMap((part) => {
          const material = world.entities[part.itemId],
            placement = material?.placement,
            family = world.assemblyFamilies![component.family.id]!;
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
        }),
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
