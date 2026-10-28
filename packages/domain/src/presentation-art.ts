import { hasRecordFields, isSafeRecordId } from './records.js';
import type { WorldState } from './types.js';

/** Authored illustration, independent of the body's native appearance or identity. */
export interface PortraitArt {
  path: string;
  headPath?: string;
  figurePath?: string;
}

/** A permitted item's authored illustration, independent of its semantic icon. */
export interface ItemArt {
  path: string;
  detailPath?: string;
}

export function itemIllustration(world: WorldState, definitionId: string): ItemArt | undefined {
  const items = world.presentation?.itemArt;
  return items && Object.hasOwn(items, definitionId) ? items[definitionId] : undefined;
}

/** Presentation may name only a repository asset path, never a URL or filesystem path.
 * Asset delivery separately checks the exact selected release and current permission. */
export function isPresentationArtPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 4096 &&
    !value.includes('\\') &&
    !/[\u0000-\u001f\u007f]/.test(value) &&
    value.split('/').every((part) => part !== '' && part !== '.' && part !== '..') &&
    !/^[A-Za-z]:/.test(value)
  );
}

export function validatePortraitArt(world: WorldState): void {
  const portraits = world.presentation?.portraits;
  if (portraits === undefined) return;
  if (!portraits || typeof portraits !== 'object' || Array.isArray(portraits))
    throw new Error('Invalid authored portrait artwork.');
  for (const [appearance, art] of Object.entries(portraits))
    if (
      !isSafeRecordId(appearance) ||
      !hasRecordFields(art, ['path'], ['headPath', 'figurePath']) ||
      !isPresentationArtPath(art.path) ||
      (art.headPath !== undefined && !isPresentationArtPath(art.headPath)) ||
      (art.figurePath !== undefined && !isPresentationArtPath(art.figurePath))
    )
      throw new Error('Invalid authored portrait artwork.');
}

export function validateItemArt(world: WorldState): void {
  const items = world.presentation?.itemArt;
  if (items === undefined) return;
  if (!items || typeof items !== 'object' || Array.isArray(items))
    throw new Error('Invalid authored item artwork.');
  for (const [definitionId, art] of Object.entries(items))
    if (
      !isSafeRecordId(definitionId) ||
      !hasRecordFields(art, ['path'], ['detailPath']) ||
      !isPresentationArtPath(art.path) ||
      (art.detailPath !== undefined && !isPresentationArtPath(art.detailPath))
    )
      throw new Error('Invalid authored item artwork.');
}
