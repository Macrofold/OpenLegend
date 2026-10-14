import { useEffect, useId, useRef, useState } from 'react';
import type { WorldAgentWorkResult, WorldCreationTargetView } from '@open-legend/protocol';
import { getScoped } from '../api';
import { Button } from '../design-system/components';
import { holdActionFocus } from './action-focus';
import { WorldCreationTargetDetails } from './world-creation-target-details';
import './world-creation.css';

export function WorldCreationTargets({
  sessionId,
  connected,
  selectedId,
  onSelect,
  onEligible,
}: {
  sessionId: string;
  connected: boolean;
  selectedId: string;
  onSelect(id: string): void;
  onEligible(target: WorldCreationTargetView | undefined): void;
}) {
  const [targets, setTargets] = useState<WorldCreationTargetView[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const eligibleCallback = useRef(onEligible);
  const section = useRef<HTMLElement>(null);
  const hostLabel = useId();
  const restoreFocus = useRef(() => {});
  eligibleCallback.current = onEligible;
  useEffect(() => {
    const controller = new AbortController();
    setTargets(undefined);
    eligibleCallback.current(undefined);
    if (!connected) return;
    setLoading(true);
    setError('');
    void getScoped<WorldAgentWorkResult<WorldCreationTargetView[]>>(
      `/api/world-agent/creation/targets?${new URLSearchParams({ sessionId })}`,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result.ok || !result.data)
          throw new Error(result.message ?? 'Prepared hosts are unavailable.');
        setTargets(result.data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Prepared hosts are unavailable.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          restoreFocus.current();
        }
      });
    return () => controller.abort();
  }, [sessionId, connected, reload]);
  const target = targets?.find((entry) => entry.id === selectedId);
  useEffect(() => {
    eligibleCallback.current(
      (target?.status === 'available' || target?.status === 'unchecked') && connected
        ? target
        : undefined,
    );
    return () => eligibleCallback.current(undefined);
  }, [target, connected]);
  return (
    <section
      ref={section}
      tabIndex={-1}
      className="ol-world-creation-targets"
      aria-label="Choose a prepared host"
    >
      <h4>Where this world will start</h4>
      <p>
        Only hosts prepared by the operator are offered. Starting this opening cannot replace an
        existing world.
      </p>
      {loading && <p role="status">Reading permitted hosts…</p>}
      {!connected && <p role="status">Reconnect to check prepared hosts.</p>}
      {targets?.length === 0 && (
        <p>No permitted prepared host is available. Your opening remains saved.</p>
      )}
      <label>
        <span id={hostLabel}>Prepared host</span>
        <select
          aria-labelledby={hostLabel}
          value={selectedId}
          disabled={loading || !connected || !targets}
          onChange={(event) => onSelect(event.target.value)}
        >
          <option value="">Choose a host</option>
          {selectedId && !target && (
            <option value={selectedId}>Previously selected host unavailable</option>
          )}
          {targets?.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
              {entry.status === 'unchecked'
                ? ' (check before review)'
                : entry.status !== 'available'
                  ? ` (${entry.status})`
                  : ''}
            </option>
          ))}
        </select>
      </label>
      {target && (
        <>
          <p>{target.operatingProfile}</p>
          <p>
            {target.controlAccountId ? (
              <>
                The first character will be linked to account {target.controlAccountId}. Signing in
                and entering remain separate.
              </>
            ) : (
              'The target account and character binding will be checked before review.'
            )}
          </p>
          <WorldCreationTargetDetails target={target} />
          {target.status !== 'available' && (
            <p role="status">
              {target.reason ??
                (target.status === 'unchecked'
                  ? 'Prepare exact review will check this host for the selected opening.'
                  : 'This host cannot currently receive the opening.')}
            </p>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <Button
        size="sm"
        variant="quiet"
        disabled={loading || !connected}
        onPress={() => {
          restoreFocus.current = holdActionFocus(section.current);
          setReload((value) => value + 1);
        }}
      >
        Check hosts again
      </Button>
    </section>
  );
}
