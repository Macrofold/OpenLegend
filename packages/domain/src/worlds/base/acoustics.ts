import type { AcousticPolicy } from '../../acoustics.js';

export const DEFAULT_ACOUSTICS: AcousticPolicy = {
  id: 'wilderness:air',
  version: 1,
  reference: 'air-spl-20uPa',
  sourceLevelDbSplAt1m: { whisper: 40, normal: 60, shout: 75 },
  backgroundLevelDbSpl: 28,
  thresholdsDb: { detect: 0, partial: 6, clear: 12 },
};
