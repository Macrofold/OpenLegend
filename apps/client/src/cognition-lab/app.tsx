import { CreatePerson } from './create-person';
import { useEffect, useRef, useState } from 'react';
import type { GameView } from '@open-legend/protocol';
import { changeTabControl, post, setWorldPaused } from '../api';
import { Mind, Diagnostics, type DiagnosticSelection } from '../ui/diagnostics';
import { WorldClockProvider } from '../ui/event-time';
import { GameSavesPanel } from '../ui/game-saves';
import { PersonMemoryEditor } from '../ui/god-tools';
import { WorldComposer, type WorldIntent } from '../ui/world-composer';
import { WorldEvents } from '../ui/world-events';
import { useLabWorld } from './world';
import { ModelSettings } from './model-settings';
import { PrepareLab } from './prepare';
import { ScenarioEditor } from './scenario-editor';
import { ModelFields } from './model-fields';
import { NpcStimulus } from './npc-stimulus';
import { DecisionControls, RunLibrary } from './experiments';
import '../design-system/tokens/tokens.css';
import '../design-system/components.css';
import './workspace.css';

export function CognitionLabApp() {
  const { view, current, refresh, error, unavailable, signedOut } = useLabWorld();
  return (
    <main className="cognition-workspace">
      <header>
        <h1>Cognition Lab</h1>
        <a href="/">Open game</a>
        <button onClick={refresh}>Refresh Lab</button>
      </header>
      {error && <p role="alert">{error}</p>}
      {view ? (
        <WorldClockProvider clock={view.clock}>
          <Workspace
            key={JSON.stringify([view.worldId, view.saveTimeline, view.access?.scope])}
            view={view}
            current={current}
            refresh={refresh}
          />
        </WorldClockProvider>
      ) : unavailable ? (
        <PrepareLab refresh={refresh} />
      ) : signedOut ? (
        <p>
          <a href="/auth/login?returnTo=/cognition">Sign in to Open Legend</a>
          {' to enter the Lab.'}
        </p>
      ) : error ? null : (
        <p role="status">Opening the Lab world…</p>
      )}
    </main>
  );
}

function Workspace({
  view,
  current,
  refresh,
}: {
  view: GameView;
  current: boolean;
  refresh(): void;
}) {
  const firstResident = view.entities.find((e) => e.kind === 'actor' && e.id !== view.player.id);
  const [person, setPerson] = useState(firstResident?.id ?? view.player.id);
  const [intent, setIntent] = useState<WorldIntent | null>(() => ({
    mode: 'speak',
    targetId: firstResident?.id,
    label: firstResident?.name,
  }));
  const [holdNext, setHoldNext] = useState(false);
  const [speaker, setSpeaker] = useState(view.player.id);
  const [submittedJob, setSubmittedJob] = useState<string>();
  const [repeat, setRepeat] = useState<{ runId: string; loadId: string; label: string }>();
  const [selection, setSelection] = useState<DiagnosticSelection | null>(null);
  const [editing, setEditing] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState('');
  const [mindDirty, setMindDirty] = useState(false);
  const [scenarioDirty, setScenarioDirty] = useState(false);
  const [modelFieldsDirty, setModelFieldsDirty] = useState(false);
  const [useApplied, setUseApplied] = useState(false);
  const dirty = mindDirty || scenarioDirty || modelFieldsDirty;
  useEffect(() => {
    if (!dirty) setUseApplied(false);
  }, [dirty]);
  const scope = view.access?.scope ?? '';
  const control = current && !!view.access?.controlling;
  const canRun = control && (!dirty || useApplied);
  const people = [
    view.player,
    ...view.entities.filter((entity) => entity.kind === 'actor' && entity.id !== view.player.id),
  ];
  const actor = people.find((actor) => actor.id === person);
  async function change(operation: () => Promise<{ ok: boolean; message?: string }>) {
    if (pending.current || !current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await operation();
      if (!result.ok) throw new Error(result.message || 'The Lab did not accept that change.');
      refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The change could not be confirmed.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function acceptedJob(id?: string, terminal = false) {
    setSubmittedJob(id);
    if (!id || terminal || holdNext) return;
    try {
      const result = await post('/api/cognition-lab/decisions/control', {
        action: 'resume',
        run: { mode: 'one-response', jobId: id, autonomy: 'off' },
      });
      if (!result.ok) throw new Error(result.message);
    } catch (e) {
      setMessage(
        'The stimulus was accepted. ' +
          (e instanceof Error ? e.message : 'Check its decision before continuing.'),
      );
    }
  }
  function address(id: string, label: string) {
    setSpeaker(view.player.id);
    setIntent({ mode: 'speak', targetId: id, label });
  }
  return (
    <>
      <div className="lab-toolbar">
        <strong>{view.presentation.worldName}</strong>
        <span>{view.clock.paused ? 'Time paused' : 'Time running'}</span>
        <button
          disabled={!current || busy}
          onClick={() =>
            void change(() =>
              changeTabControl(
                view,
                control ? 'release' : view.access?.controlledElsewhere ? 'replace' : 'acquire',
              ),
            )
          }
        >
          {control
            ? 'Release Lab control'
            : view.access?.controlledElsewhere
              ? 'Take Lab control from other tab'
              : 'Take Lab control'}
        </button>
        <CreatePerson view={view} current={current} refresh={refresh} />
        <span>Character {view.player.participation === 'inactive' ? 'outside the scene' : view.player.participation === 'exiting' ? 'leaving the scene' : 'in the scene'}</span>
        <button disabled={!control || !current || busy || !view.player.alive || view.player.participationRevision === undefined}
          onClick={() => void change(() => post('/api/cognition-lab/scene/participation', {
            expectedRevision: view.player.participationRevision, present: view.player.participation !== 'active',
          }))}>
          {view.player.participation === 'active' ? 'Leave scene' : 'Enter scene'}
        </button>
        <button
          disabled={!control || busy}
          onClick={() => void change(() => setWorldPaused(!view.clock.paused))}
        >
          {view.clock.paused ? 'Resume time' : 'Pause time'}
        </button>
      </div>
      {message && <p role="alert">{message}</p>}
      {dirty && <p role="status">
        Unapplied edits in {[scenarioDirty && 'the character editor', modelFieldsDirty && 'model fields', mindDirty && 'the mind editor'].filter(Boolean).join(', ')}.{' '}
        <label><input type="checkbox" checked={useApplied} onChange={e => setUseApplied(e.target.checked)} /> Use the currently applied values for runs and checkpoints while these drafts are open.</label>
      </p>}
      <div className="lab-panes">
        <section>
          <h2>Current character</h2>
          <label>
            Inspect person{' '}
            <select
              disabled={dirty}
              value={actor?.id ?? ''}
              onChange={(event) => setPerson(event.target.value)}
            >
              {!actor && <option value="">Outside view</option>}
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {actor && (
            <>
              {'description' in actor && <p>{actor.description}</p>}
              {view.access?.canEditPersonMemory && (
                <button disabled={!control} onClick={(event) => setEditing(event.currentTarget)}>
                  Edit memories
                </button>
              )}
              <ScenarioEditor
                key={JSON.stringify(['scenario', person, view.historyEpoch])}
                actorId={person}
                people={people}
                control={control}
                onDirtyChange={setScenarioDirty}
              />
              {actor.id !== view.player.id && (
                <ModelFields
                  key={JSON.stringify(['fields', person, view.historyEpoch])}
                  actor={actor}
                  people={people.filter((p) => p.id !== view.player.id)}
                  objects={view.entities.filter((e) => e.kind !== 'actor')}
                  control={control}
                  onDirtyChange={setModelFieldsDirty}
                />
              )}
              <Mind
                key={person}
                actorId={person}
                owned={person === view.player.id}
                readOnly={!control}
                canEditKnowledge={control && !!view.access?.canEditPersonMemory}
                readScope={scope}
                memoryScope={JSON.stringify([scope, view.historyEpoch])}
                evidenceEpoch={view.historyEpoch}
                onDirtyChange={setMindDirty}
              />
            </>
          )}
          {editing && actor && (
            <PersonMemoryEditor actorId={person} opener={editing} close={() => setEditing(null)} />
          )}
        </section>
        <section>
          <h2>Events and experiments</h2>
          <div className="lab-toolbar">
            <label>
              Act or speak as{' '}
              <select
                value={speaker}
                onChange={(e) => {
                  setSpeaker(e.target.value);
                  setRepeat(undefined);
                  setIntent({ mode: intent?.mode ?? 'speak' });
                }}
              >
                {people.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={!control} onClick={() => setIntent({ mode: 'speak' })}>
              Say
            </button>
            <button
              disabled={!control}
              onClick={() => {
                setRepeat(undefined);
                setIntent({ mode: 'act' });
              }}
            >
              Act
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={holdNext}
              onChange={(e) => setHoldNext(e.target.checked)}
            />{' '}
            Hold before the next model call
          </label>
          {repeat && (
            <p>
              Repeating {repeat.label}. Use the original words, addressee and volume.{' '}
              <button onClick={() => setRepeat(undefined)}>Leave repeat mode</button>
            </p>
          )}
          {speaker === view.player.id ? (
            <WorldComposer
              repeat={repeat}
              onAcceptedJob={(id, terminal) => void acceptedJob(id, terminal)}
              view={view}
              connected={canRun}
              visible={!!intent}
              intent={intent}
              close={() => {
                setIntent(null);
                setRepeat(undefined);
              }}
              setup={() =>
                setMessage('Check the Lab provider settings and spending allowance on this server.')
              }
              clearRecipient={() => setIntent(intent && { mode: intent.mode })}
              changeAddressee={(targetId, label) => setIntent({ mode: 'speak', targetId, label })}
              chooseTarget={(id) =>
                setIntent({
                  mode: 'act',
                  targetId: id || undefined,
                  label: view.entities.find((entity) => entity.id === id)?.name,
                })
              }
            />
          ) : (
            intent && (
              <NpcStimulus
                key={JSON.stringify([speaker, intent.mode])}
                actorId={speaker}
                people={people.filter((p) => p.id !== view.player.id)}
                mode={intent.mode}
                control={canRun}
                accepted={(jobId) => {
                  void acceptedJob(jobId);
                  refresh();
                }}
              />
            )
          )}
          <WorldEvents
            scope={scope}
            revision={view.worldEventsRevision}
            view={view}
            addressPerson={address}
          />
          {view.checkpoint && (
            <details>
              <summary>Scenario checkpoints</summary>
              <fieldset disabled={!canRun}><GameSavesPanel context={view.checkpoint} /></fieldset>
            </details>
          )}
          <RunLibrary
            key={JSON.stringify(['runs', view.historyEpoch])}
            selectedJob={selection?.id}
            repeat={(runId, loadId, label) => {
              setSpeaker(view.player.id);
              setRepeat({ runId, loadId, label });
              setIntent({ mode: 'speak' });
            }}
          />
        </section>
        <section>
          <h2>Decision inspector</h2>
          <DecisionControls
            key={JSON.stringify(['decisions', view.historyEpoch])}
            control={canRun}
            people={people.filter((p) => p.id !== view.player.id)}
            selectedJob={submittedJob}
          />
          <ModelSettings writable={control} />
          {view.access?.canInspectIntelligence && (
            <Diagnostics
              worldId={view.worldId}
              selection={selection}
              onSelect={setSelection}
              readScope={scope}
            />
          )}
        </section>
      </div>
    </>
  );
}
