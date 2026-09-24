import policy from './config/status-effects.generated.json' with { type: 'json' };
import type { StatusEffectPolicy } from '../../status-effects.js';

// YAML is compiled outside the pure domain; generation validates the authored policy.
// docs/status-effects.md#configuration
export const DEFAULT_STATUS_EFFECT_POLICY = policy as StatusEffectPolicy;
