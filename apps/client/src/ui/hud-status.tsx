import type { GameView } from '@open-legend/protocol';
import { aiSetupReason } from '../ai-readiness';
import { Button } from '../design-system/components';

export function EvasionCooldown({ evasion }: { evasion: GameView['player']['evasion'] }) {
  if (!evasion || evasion.readyIn <= 0) return null;
  return (
    <p className="ol-caption">
      {evasion.label}: ready in {Math.ceil(evasion.readyIn)} game seconds
    </p>
  );
}

export function AiConnectionNotice({ ai, open }: { ai: GameView['ai']; open(): void }) {
  const needsSetup = !!aiSetupReason(ai);
  if (!needsSetup && !ai.jobs.some((job) => job.status === 'failed')) return null;
  return (
    <Button id="aiLabel" size="sm" variant="quiet" onPress={open}>
      {needsSetup ? 'AI needs setup' : 'AI request failed'}
    </Button>
  );
}
