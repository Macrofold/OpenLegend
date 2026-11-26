import type { RecipeCandidate } from '../../types.js';
import pouch from './config/woven-pouch-method.json' with { type: 'json' };

/** Shared authored method for the full camp and selected playable openings. */
export const BASE_WOVEN_CONTAINER_METHOD: RecipeCandidate = pouch;
