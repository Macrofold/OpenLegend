import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Icon, IconButton } from '../design-system/components';

export type MissedCaptions = { scope: string; count: number; incomplete: boolean };

/** Accumulates the caption overlay's missed-speech reports for the current caption scope.
 * The count lives only in this tab and is never sent anywhere. */
export function useMissedCaptions(enabled: boolean) {
  const [value, setValue] = useState<MissedCaptions | null>(null);
  // Turning captions off discards the count, as the caption overlay does.
  useEffect(() => {
    if (!enabled) setValue(null);
  }, [enabled]);
  const report = useCallback(
    (next: MissedCaptions) =>
      setValue((current) =>
        current?.scope === next.scope
          ? {
              scope: next.scope,
              count: current.count + next.count,
              incomplete: current.incomplete || next.incomplete,
            }
          : next,
      ),
    [],
  );
  const clear = useCallback(() => setValue(null), []);
  return useMemo(() => ({ value, report, clear }), [value, report, clear]);
}

/** Honest missed-caption notice: a lower bound of perceived speech from others that the
 * overlay could not show, with the durable Speech history as the recovery path. It never
 * contains speech text and never replays captions.
 * docs/hearing-and-speech.md#7-caption-component-and-lifetime */
export function CaptionGapNotice({
  missed,
  scope,
  enabled,
  onOpen,
  onDismiss,
}: {
  missed: MissedCaptions | null;
  scope: string;
  enabled: boolean;
  onOpen(): void;
  onDismiss(): void;
}) {
  const shown =
    enabled && !!missed && missed.scope === scope && (missed.count > 0 || missed.incomplete);
  const count = missed?.count ?? 0;
  const text =
    count > 0
      ? `${count > 99 ? '99+' : count} speech ${count === 1 ? 'caption wasn’t' : 'captions weren’t'} shown${
          missed?.incomplete ? ', possibly more' : ''
        }.`
      : 'Some speech may not have been captioned.';
  // Always mounted so HUD measurement keeps observing it; hidden while there is nothing to say.
  return (
    <>
      <div className="ol-caption-gap ol-card" hidden={!shown}>
        <Icon name="ui.speech" size={16} />
        <span>{text}</span>
        <Button size="sm" onPress={onOpen}>
          Read speech history
        </Button>
        <IconButton icon="ui.close" label="Dismiss missed-caption notice" onPress={onDismiss} />
      </div>
      {/* A persistent live region; one fixed sentence per appearance, so a growing count is
          not re-announced. */}
      <span className="ol-sr" role="status">
        {shown
          ? 'Some speech captions were not shown. Speech history keeps everything you perceived.'
          : ''}
      </span>
    </>
  );
}
