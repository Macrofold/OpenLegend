import { useEffect, useRef, useState } from 'react';
import type {
  ActionOption,
  RecipeView,
  WorldAgentSessionSummary,
  WorldAgentSessionCursor,
} from '@open-legend/protocol';
import { Button, EmptyState, Tag } from '../design-system/components';
import { post } from '../api';
import { readLocal, writeLocal } from './storage';
import { Inventions } from './inventions';
import { WorldInspection } from './world-inspection';
import { WorldAgentSession } from './world-agent-session';

type Props = {
  worldId: string;
  actorId: string;
  godMode?: boolean;
  saveTimeline?: string;
  inventionSeed: { id: string; text: string } | null;
  invent(text: string): void;
  visible: boolean;
  recipes: RecipeView[];
  command(action: ActionOption): void;
  connected: boolean;
};
export function WorldAgent(props: Props) {
  // A restore changes authority and model context. Retained old sessions stay explicitly historical.
  return <WorldAgentPanel key={`${props.worldId}:${props.saveTimeline}`} {...props} />;
}
function WorldAgentPanel(props: Props) {
  const {
    worldId,
    actorId,
    godMode,
    saveTimeline,
    inventionSeed,
    visible,
    recipes,
    command,
    connected,
  } = props;
  const selectionKey = `open-legend:authoring-selection:${worldId}:${saveTimeline}`;
  const [active, setActive] = useState(() =>
    readLocal(
      selectionKey,
      '',
      (v): v is string => typeof v === 'string' && /^[\w-]{1,100}$/.test(v),
    ),
  );
  const [sessions, setSessions] = useState<WorldAgentSessionSummary[]>([]);
  const [before, setBefore] = useState<WorldAgentSessionCursor | null>(null);
  const [inspecting, setInspecting] = useState(false),
    [shortcut, setShortcut] = useState(false);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const alive = useRef(true),
    listing = useRef(false);
  const seedSeen = useRef<string | undefined>(undefined);
  const [seedTarget, setSeedTarget] = useState<string>();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    writeLocal(selectionKey, active);
  }, [selectionKey, active]);
  async function list(next?: WorldAgentSessionCursor) {
    if (!godMode || !connected || listing.current) return;
    listing.current = true;
    setBusy(true);
    try {
      const r = await post<{
        ok: boolean;
        message?: string;
        data: { sessions: WorldAgentSessionSummary[]; next: WorldAgentSessionCursor | null };
      }>(
        '/api/world-agent/session/list',
        { worldId, ...(next ? { before: next } : {}) },
        AbortSignal.timeout(15000),
      );
      if (!r.ok) throw new Error(r.message ?? 'Could not read conversations.');
      if (!alive.current) return;
      setSessions((previous) => {
        const map = new Map((next ? previous : []).map((s) => [s.sessionId, s]));
        for (const s of r.data.sessions) map.set(s.sessionId, s);
        return [...map.values()];
      });
      setBefore(r.data.next);
      setError('');
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not read conversations.');
    } finally {
      listing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (visible) void list();
  }, [visible, connected, godMode]);
  useEffect(() => {
    if (inventionSeed && seedSeen.current !== inventionSeed.id) {
      seedSeen.current = inventionSeed.id;
      const id = active || crypto.randomUUID();
      setActive(id);
      setSeedTarget(id);
      setShortcut(!godMode);
    }
  }, [inventionSeed, godMode]);
  const [legacy] = useState(() =>
    readLocal<{ title: string; messages: { text: string }[] }[]>(
      `open-legend:world-agent:${worldId}`,
      [],
      (v): v is { title: string; messages: { text: string }[] }[] =>
        Array.isArray(v) &&
        v.every(
          (t) =>
            t &&
            typeof t.title === 'string' &&
            Array.isArray(t.messages) &&
            t.messages.every(
              (m: unknown) =>
                !!m && typeof m === 'object' && 'text' in m && typeof m.text === 'string',
            ),
        ),
    ),
  );
  function create() {
    setActive(crypto.randomUUID());
    setSeedTarget(undefined);
    setShortcut(false);
  }
  return (
    <div className="ol-agent">
      {godMode ? (
        <>
          <div className="ol-agent-tools">
            <Tag>World-owner agent</Tag>
            <Button size="sm" variant="quiet" onPress={() => setInspecting((v) => !v)}>
              {inspecting ? 'Close inspection' : 'Inspect world relationships'}
            </Button>
          </div>
          {inspecting && <WorldInspection actorId={actorId} />}
          <div className="ol-agent-tools">
            <label>
              Conversation{' '}
              <select
                aria-label="World Agent conversation"
                value={active}
                onChange={(e) => setActive(e.target.value)}
              >
                {!active && <option value="">Choose a conversation</option>}
                {active && !sessions.some((s) => s.sessionId === active) && (
                  <option value={active}>New conversation</option>
                )}
                {sessions.map((s) => (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.title}
                    {!s.available ? ' (history)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" variant="quiet" onPress={create}>
              New
            </Button>
            <Button size="sm" variant="quiet" disabled={busy} onPress={() => void list()}>
              Refresh list
            </Button>
            {before && (
              <Button size="sm" variant="quiet" disabled={busy} onPress={() => void list(before)}>
                Earlier conversations
              </Button>
            )}
          </div>
          {active ? (
            <WorldAgentSession
              key={`${worldId}:${saveTimeline}:${active}`}
              worldId={worldId}
              sessionId={active}
              connected={connected}
              visible={visible}
              seed={seedTarget === active ? inventionSeed : null}
              onCreated={() => void list()}
            />
          ) : (
            <EmptyState title="Investigate and create in one conversation">
              <Button onPress={create}>New conversation</Button>
            </EmptyState>
          )}
          {error && <p role="alert">{error}</p>}
        </>
      ) : (
        <p>
          World-level authoring requires the current owner mode. Native recipe invention remains
          available below.
        </p>
      )}
      <Button size="sm" variant="quiet" onPress={() => setShortcut((v) => !v)}>
        {shortcut ? 'Close native recipe shortcut' : 'Native recipe shortcut'}
      </Button>
      {shortcut && (
        <Inventions
          worldId={worldId}
          seed={godMode ? null : inventionSeed}
          visible={visible}
          recipes={recipes}
          command={command}
          connected={connected}
        />
      )}
      {!!legacy.length && (
        <details>
          <summary>Earlier local transcripts (read only)</summary>
          <p className="ol-caption">
            These predate funded tool sessions. They are not reused as privileged agent context.
          </p>
          {legacy.map((t, i) => (
            <details key={i}>
              <summary>{t.title}</summary>
              {t.messages.map((m, j) => (
                <p key={j}>{m.text}</p>
              ))}
            </details>
          ))}
        </details>
      )}
    </div>
  );
}
