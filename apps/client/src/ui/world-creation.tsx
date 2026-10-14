import { useEffect, useRef, useState } from 'react';
import type {
  WorldAgentExactDraftView,
  WorldAgentWorkResult,
  WorldCreationOpeningChoice,
} from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { getScoped, post, privateDraftScope } from '../api';
import { readLocal, writeLocal } from './storage';
import { holdActionFocus } from './action-focus';
import { authoringKey } from './world-agent-identity';
import './world-creation.css';

type Selection = { openingId: string; operationId: string };
const retainedSelection = (value: unknown): value is Selection | null =>
  value === null ||
  (!!value &&
    typeof value === 'object' &&
    'openingId' in value &&
    typeof value.openingId === 'string' &&
    'operationId' in value &&
    typeof value.operationId === 'string');

/** Choosing a supplied opening retains a draft through the current authoring owner. */
export function WorldCreationSelector({
  worldId,
  sessionId,
  connected,
  visible,
  mutationReason,
  ensureSession,
  onSelected,
}: {
  worldId: string;
  sessionId: string;
  connected: boolean;
  visible: boolean;
  mutationReason?: string | null;
  ensureSession(): Promise<void>;
  onSelected(draft: WorldAgentExactDraftView): void;
}) {
  const key = authoringKey('opening-selection', worldId, privateDraftScope(), sessionId);
  const [choices, setChoices] = useState<WorldCreationOpeningChoice[]>();
  const [retained, setRetained] = useState(() =>
    readLocal<Selection | null>(key, null, retainedSelection),
  );
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const alive = useRef(true);
  const working = useRef(false);
  const section = useRef<HTMLElement>(null);
  const restoreRefreshFocus = useRef(() => {});
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!visible || !connected) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void getScoped<WorldAgentWorkResult<WorldCreationOpeningChoice[]>>(
      '/api/world-agent/creation/openings',
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result.ok || !result.data)
          throw new Error(result.message ?? 'Prepared openings are unavailable.');
        setChoices(result.data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setChoices(undefined);
          setError(
            failure instanceof Error ? failure.message : 'Prepared openings are unavailable.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          restoreRefreshFocus.current();
        }
      });
    return () => controller.abort();
  }, [visible, connected, reload]);
  async function select(openingId: string, retry = false) {
    if (working.current || !connected || mutationReason || (!retry && retained)) return;
    const selection = retry ? retained : { openingId, operationId: crypto.randomUUID() };
    if (!selection) return;
    working.current = true;
    const restoreFocus = holdActionFocus(section.current);
    setBusy(true);
    setError('');
    writeLocal(key, selection);
    setRetained(selection);
    try {
      await ensureSession();
      const result = await post<WorldAgentWorkResult<WorldAgentExactDraftView>>(
        '/api/world-agent/creation/draft',
        { worldId, sessionId, ...selection },
      );
      if (!alive.current) return;
      if (!result.ok || !result.data) {
        if (result.status !== 'unavailable') {
          writeLocal(key, null);
          setRetained(null);
        }
        throw new Error(result.message ?? 'The opening could not be retained.');
      }
      writeLocal(key, null);
      setRetained(null);
      onSelected(result.data);
    } catch (failure) {
      if (alive.current)
        setError(
          failure instanceof Error ? failure.message : 'The original selection needs confirmation.',
        );
    } finally {
      working.current = false;
      if (alive.current) {
        setBusy(false);
        restoreFocus();
      }
    }
  }
  const reason = !connected ? 'Reconnect before preparing an opening.' : mutationReason;
  return (
    <section
      ref={section}
      tabIndex={-1}
      className="ol-world-creation"
      hidden={!visible}
      aria-label="Create a world"
    >
      <h3>Choose a playable beginning</h3>
      <p>
        These supplied openings need no generation. Inspect and edit the retained proposal before
        choosing where to start it.
      </p>
      {reason && <p role="status">{reason}</p>}
      {loading && <p role="status">Reading supported openings…</p>}
      {choices?.length === 0 && <p>No supported prepared opening is currently available.</p>}
      <div className="ol-world-creation-choices">
        {choices?.map((choice) => (
          <article key={choice.id}>
            <h4>{choice.label}</h4>
            <p>{choice.description}</p>
            <Button
              disabled={!!reason || busy || loading || !!retained}
              busy={busy}
              onPress={() => void select(choice.id)}
            >
              Prepare {choice.label}
            </Button>
          </article>
        ))}
      </div>
      {retained && (
        <div role="status">
          <p>The original selection needs confirmation. It has not started a world.</p>
          <Button
            disabled={!!reason || busy}
            busy={busy}
            onPress={() => void select(retained.openingId, true)}
          >
            Check original selection
          </Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <Button
        size="sm"
        variant="quiet"
        disabled={loading || busy || !connected}
        onPress={() => {
          restoreRefreshFocus.current = holdActionFocus(section.current);
          setReload((value) => value + 1);
        }}
      >
        Refresh supported openings
      </Button>
    </section>
  );
}
