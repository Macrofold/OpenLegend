import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  CognitionLabAction,
  CognitionLabEvent,
  CognitionLabJson,
  CognitionLabPage,
  CognitionLabReceipt,
  CognitionLabStimulus,
  CognitionLabWorkspace,
} from '@open-legend/protocol';
import { Button, SelectField } from '../design-system/components';
import { ActorPicker } from './actor-picker';
import { currentScope, expected, labRead } from './api';
import {
  LabEmpty,
  LabError,
  LabIconButton,
  LabModal,
  LabPane,
  LabSearch,
  LabTabs,
  LabTextEditor,
  LabUpdates,
} from './controls';
import { readableStatus, type LabExecute } from './types';
import { useLabPage } from './use-lab-read';

type ComposerMode = 'say' | 'act' | 'event';
interface ComposerDraft {
  text: string;
  revision: number;
  action?: CognitionLabAction;
}

export function LabTimeline({
  workspace,
  execute,
  busy,
  refresh,
  selectRecord,
  active = true,
  connectionMessage,
}: {
  workspace: CognitionLabWorkspace;
  execute: LabExecute;
  busy: boolean;
  refresh: number;
  selectRecord(runId: string, rootId?: string, stageId?: string): void;
  active?: boolean;
  connectionMessage?: string;
}) {
  const scope = currentScope(workspace);
  const [mode, setMode] = useState<ComposerMode>('say');
  const [actorId, setActorId] = useState(workspace.defaults.actorId);
  const [targetId, setTargetId] = useState(workspace.defaults.targetId);
  const [volume, setVolume] = useState(workspace.defaults.volume);
  const [drafts, setDrafts] = useState<Record<string, ComposerDraft>>({});
  const draftSequence = useRef(0);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [follow, setFollow] = useState(true);
  const [perspective, setPerspective] = useState('scenario');
  const [observerId, setObserverId] = useState(workspace.defaults.inspectedActorId);
  const [prepare, setPrepare] = useState(false);
  const [stagePurpose, setStagePurpose] = useState('nextDecision');
  const [actionPicker, setActionPicker] = useState(false);
  const [details, setDetails] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const timelineAnchor = useRef(0);
  const restoreTimelineAnchor = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const key = JSON.stringify([scope, mode, actorId, targetId]);
  const draft: ComposerDraft = drafts[key] ?? { text: '', revision: 0 };
  const action = draft.action;
  const events = useLabPage(
    active && (perspective === 'scenario' || observerId)
      ? JSON.stringify([scope, workspace.disclosureRevision, query, kind, perspective, observerId])
      : undefined,
    (cursor, signal) =>
      labRead<CognitionLabPage<CognitionLabEvent>>(
        '/events',
        {
          query,
          kind: kind === 'all' ? undefined : kind,
          actorId: perspective === 'scenario' ? undefined : observerId,
          cursor,
          limit: 50,
        },
        signal,
      ),
    refresh,
    query ? 150 : 0,
  );
  useLayoutEffect(() => {
    if (details || !active) return;
    if (restoreTimelineAnchor.current && end.current?.parentElement) {
      end.current.parentElement.scrollTop = timelineAnchor.current;
      restoreTimelineAnchor.current = false;
    } else if (follow && events.value?.items.length && end.current?.parentElement)
      end.current.parentElement.scrollTop = 0;
  }, [events.value, follow, details]);
  const openDetails = () => {
    timelineAnchor.current = end.current?.parentElement?.scrollTop ?? 0;
    restoreTimelineAnchor.current = true;
    setDetails(true);
  };
  const setText = (text: string) => {
    const revision = ++draftSequence.current;
    setDrafts((previous) => ({ ...previous, [key]: { ...previous[key], text, revision } }));
  };
  const setAction = (action: CognitionLabAction) => {
    const revision = ++draftSequence.current;
    // The native binding and text are one draft. A prior submission cannot clear
    // an action chosen while its original acknowledgement is still outstanding.
    // docs/projects/cognition-lab-feature-spec.md#11-common-state-and-recovery-rules
    setDrafts((previous) => ({
      ...previous,
      [key]: { text: previous[key]?.text ?? '', revision, action },
    }));
  };
  const stimulus = (): CognitionLabStimulus | undefined => {
    setError('');
    if (mode !== 'event' && !actorId) {
      setError('Choose who speaks or acts.');
      return;
    }
    if (mode === 'say') {
      if (!draft.text.trim()) {
        setError('Write something to say.');
        return;
      }
      return { kind: 'say', actorId: actorId ?? '', targetId, text: draft.text, volume };
    }
    if (mode === 'act') {
      if (!draft.text.trim() && !action) {
        setError('Describe an action or choose an installed action.');
        return;
      }
      return {
        kind: 'act',
        actorId: actorId ?? '',
        text: draft.text || action?.label || '',
        command: action?.command,
      };
    }
    try {
      const event = JSON.parse(draft.text) as CognitionLabJson;
      return { kind: 'event', actorId, event };
    } catch {
      setError('Enter a valid supported event intention. Your draft is unchanged.');
    }
  };
  const submit = async (hold = false) => {
    if (connectionMessage) {
      setError(connectionMessage);
      return;
    }
    const source = stimulus();
    if (!source) return;
    const sent = { key, revision: draft.revision };
    const receipt = await execute({
      kind: hold ? 'prepareAndHold' : 'submitStimulus',
      expected: expected(workspace),
      stimulus: source,
      policy: workspace.settings.policy,
      ...(hold ? { stagePurpose } : {}),
    });
    if (!mounted.current) return;
    if (receipt?.sourceAccepted) {
      setDrafts((previous) =>
        previous[sent.key]?.revision === sent.revision
          ? { ...previous, [sent.key]: { text: '', revision: ++draftSequence.current } }
          : previous,
      );
    }
    if (receipt && !receipt.ok) setError(receipt.message);
    if (receipt?.ok || receipt?.sourceAccepted) {
      setPrepare(false);
    }
  };
  const unavailable = !!connectionMessage || (!workspace.provider.available && mode !== 'event');
  const composer = (
    <div className="cl-composer">
      <div className="cl-composer-controls">
        <LabTabs
          label="Stimulus kind"
          options={[
            { id: 'say', label: 'Say' },
            { id: 'act', label: 'Act' },
            { id: 'event', label: 'Event' },
          ]}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError('');
          }}
        />
        <ActorPicker
          revision={workspace.scenarioRevision}
          label="Speaker or actor"
          scope={scope}
          value={actorId}
          onChange={setActorId}
        />
        {mode === 'say' ? (
          <ActorPicker
            revision={workspace.scenarioRevision}
            label="Addressee"
            scope={scope}
            value={targetId}
            onChange={setTargetId}
            optional
          />
        ) : (
          <Button size="sm" onPress={openDetails}>
            Details
          </Button>
        )}
      </div>
      <div className="cl-composer-controls">
        {mode === 'say' && (
          <LabIconButton icon="ui.more" label="Edit full speech draft" onPress={openDetails} />
        )}
        {mode === 'say' && (
          <label className="cl-inline">
            Volume{' '}
            <select
              className="cl-input"
              aria-label="Speech volume"
              value={volume}
              onChange={(event) => setVolume(event.target.value)}
            >
              {workspace.speechVolumes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === 'act' && (
          <Button size="sm" onPress={() => setActionPicker(true)}>
            {action ? action.label : 'Choose installed action'}
          </Button>
        )}
        {mode === 'event' && (
          <span className="cl-hint">Native event intention · admission checks apply</span>
        )}
        <span className="cl-spacer" />
        <LabIconButton
          icon="ui.edit"
          label="Edit next model input"
          disabled={busy || unavailable}
          onPress={() => setPrepare(true)}
        />
        <Button
          size="sm"
          variant="primary"
          busy={busy}
          disabled={unavailable}
          onPress={() => void submit()}
        >
          Submit
        </Button>
      </div>
      <textarea
        ref={input}
        aria-label={
          mode === 'say'
            ? 'Words to say'
            : mode === 'act'
              ? 'Action request'
              : 'Supported event intention JSON'
        }
        placeholder={
          mode === 'say'
            ? 'Say something…'
            : mode === 'act'
              ? 'Describe what to try…'
              : 'Enter a supported native event intention…'
        }
        value={draft.text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            (event.metaKey || event.ctrlKey) &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            if (!busy && !unavailable) void submit();
          }
        }}
        autoFocus
      />
    </div>
  );
  return (
    <>
      <div className="cl-timeline-stack">
        <LabPane
          title="Events and experiments"
          description={
            perspective === 'scenario'
              ? 'Committed Lab events, including types hidden by the player Events panel, plus experiment inputs, decisions and edits. Your access and selected filters still apply.'
              : 'This person’s acquired events, using the same display filters and personal wording as the player Events panel.'
          }
          toolbar={
            details ? (
              <>
                <Button size="sm" onPress={() => setDetails(false)}>
                  Back to timeline
                </Button>
                <strong>
                  {mode === 'say'
                    ? 'Speech draft'
                    : mode === 'act'
                      ? 'Action request details'
                      : 'Native event intention'}
                </strong>
              </>
            ) : (
              <>
                <LabSearch label="Search events" value={query} onChange={setQuery} />
                <LabUpdates
                  available={events.updatesAvailable}
                  refresh={events.refreshPage}
                  label="Refresh events"
                />
                <LabIconButton
                  icon="ui.follow"
                  label={follow ? 'Following latest events' : 'Jump to latest events'}
                  pressed={follow}
                  onPress={() => setFollow(!follow)}
                />
              </>
            )
          }
          navigation={
            !details && (
              <div className="cl-timeline-filters">
                <LabTabs
                  label="Event filters"
                  value={kind}
                  onChange={setKind}
                  options={[
                    { id: 'all', label: 'All' },
                    { id: 'speech', label: 'Speech' },
                    { id: 'action', label: 'Actions' },
                    { id: 'thought', label: 'Thoughts', disabled: true },
                    { id: 'technical', label: 'Processing', disabled: perspective === 'person' },
                  ]}
                />
                <label className="cl-inline cl-perspective">
                  View{' '}
                  <select
                    className="cl-input"
                    value={perspective}
                    onChange={(event) => {
                      const next = event.target.value;
                      setPerspective(next);
                      if (next === 'person' && kind === 'technical') setKind('all');
                    }}
                  >
                    <option value="scenario">Scenario events</option>
                    <option value="person">What this person perceived</option>
                  </select>
                </label>
                {perspective === 'person' && (
                  <ActorPicker
                    revision={workspace.scenarioRevision}
                    label="Observer"
                    scope={scope}
                    value={observerId}
                    onChange={setObserverId}
                  />
                )}
              </div>
            )
          }
          pending={!details && events.pending}
        >
          {!details && (
            <p className="cl-hint">
              Thoughts are stored with memories and are not currently listed in this timeline.
              Processing is available in Scenario events.
            </p>
          )}
          {details ? (
            <div className="cl-details-editor">
              <p className="cl-hint">
                {mode === 'say'
                  ? 'Only Submit sends these words.'
                  : mode === 'act'
                    ? 'The selected installed action keeps its exact native binding. Freeform text uses ordinary interpretation and admission.'
                    : 'This is a supported event intention. The native owner determines whether it changes scenario reality or supplies personal experience; arbitrary world properties are not editable.'}
              </p>
              {mode === 'act' && action && (
                <p className="cl-hint">
                  Selected action: {action.label}. {action.reason ?? action.description}
                </p>
              )}
              <LabTextEditor
                label={
                  mode === 'say'
                    ? 'Full speech draft'
                    : mode === 'act'
                      ? 'Full action request'
                      : 'Full event intention JSON'
                }
                value={draft.text}
                onChange={setText}
              />
            </div>
          ) : (
            <>
              <LabError message={events.error} />
              {events.value?.nextCursor && (
                <Button size="sm" onPress={events.loadMore} busy={events.paging}>
                  More events
                </Button>
              )}
              {events.value?.items.length ? (
                <ol className="cl-list">
                  {events.value.items.map((event) =>
                    typeof event.kind !== 'string' || typeof event.status !== 'string' ? (
                      <li key={event.id} className="cl-record">
                        <LabError message="This recorded event has no captured type or status. Refresh its record before using it." />
                        <p className="cl-prose">
                          {typeof event.text === 'string'
                            ? event.text
                            : 'Captured content unavailable.'}
                        </p>
                      </li>
                    ) : (
                      <li key={event.id} className="cl-record">
                        <button
                          className="cl-record-action"
                          onClick={() => {
                            if (event.runId) selectRecord(event.runId, event.rootId, event.stageId);
                            setFollow(false);
                          }}
                        >
                          <div className="cl-record-heading">
                            <strong>{event.actorName ?? 'Scenario'}</strong>
                            <small>
                              {readableStatus(event.kind)} · {readableStatus(event.status)}
                            </small>
                            <time title={`Game time ${event.gameTime}`}>
                              {event.gameTime.toLocaleString()}
                            </time>
                          </div>
                          <p className="cl-prose">{event.text}</p>
                          {event.operatorAuthored && (
                            <span className="cl-badge">Authored intervention</span>
                          )}
                        </button>
                      </li>
                    ),
                  )}
                </ol>
              ) : !events.pending && !events.error ? (
                <LabEmpty
                  title={
                    perspective === 'person' && !observerId
                      ? 'Choose an observer.'
                      : query
                        ? 'No matching events.'
                        : 'No lab events yet.'
                  }
                >
                  Choose a person, write a sentence and Submit.
                </LabEmpty>
              ) : null}
              <div ref={end} />
            </>
          )}
        </LabPane>
        {(error || unavailable) && (
          <div className="cl-composer-notice">
            <LabError message={error} />
            {unavailable && (
              <p className="cl-hint">
                {connectionMessage ??
                  workspace.provider.message ??
                  'A model service is unavailable. Your words remain editable.'}
              </p>
            )}
          </div>
        )}
        {composer}
      </div>
      {prepare && (
        <LabModal
          title="Prepare one real model call"
          close={() => setPrepare(false)}
          footer={
            <>
              <Button size="sm" onPress={() => setPrepare(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                busy={busy}
                disabled={unavailable}
                onPress={() => void submit(true)}
              >
                Prepare and hold
              </Button>
            </>
          }
        >
          <div className="cl-stack">
            <p>
              This submits the source once and runs ordinary preparation until the selected call is
              ready. Earlier required model work may incur cost. Opening this sheet sends nothing.
            </p>
            <p>Only Submit this input once in the held-call editor uses an override.</p>
            <label className="cl-field">
              Stage purpose
              <select
                value={stagePurpose}
                onChange={(event) => setStagePurpose(event.target.value)}
              >
                <option value="nextDecision">Focal response decision or generation</option>
                <option value="judge">Judgment</option>
                <option value="generate">Generation</option>
                <option value="embed">Embedding</option>
                <option value="reflection">Reflection</option>
              </select>
            </label>
            <LabError message={error} />
          </div>
        </LabModal>
      )}
      {actionPicker && actorId && (
        <ActionPicker
          actorId={actorId}
          scope={scope}
          selected={action}
          choose={(choice) => {
            setAction(choice);
            setActionPicker(false);
          }}
          close={() => setActionPicker(false)}
        />
      )}
    </>
  );
}

function ActionPicker({
  actorId,
  scope,
  selected,
  choose,
  close,
}: {
  actorId: string;
  scope: string;
  selected?: CognitionLabAction;
  choose(action: CognitionLabAction): void;
  close(): void;
}) {
  const [query, setQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(true);
  const page = useLabPage(
    JSON.stringify([scope, actorId, query, availableOnly]),
    (cursor, signal) =>
      labRead<CognitionLabPage<CognitionLabAction>>(
        '/actions',
        { actorId, query, cursor, limit: 50, available: availableOnly ? 'true' : undefined },
        signal,
      ),
    0,
    query ? 150 : 0,
  );
  return (
    <LabModal
      title="Installed actions"
      close={close}
      pending={page.pending}
      footer={
        <Button size="sm" onPress={close}>
          Cancel
        </Button>
      }
    >
      <div className="cl-stack">
        <LabSearch label="Search installed actions" value={query} onChange={setQuery} />
        <LabTabs
          label="Action availability"
          value={availableOnly ? 'available' : 'all'}
          onChange={(id) => setAvailableOnly(id === 'available')}
          options={[
            { id: 'available', label: 'Available' },
            { id: 'all', label: 'All installed' },
          ]}
        />
        <LabError message={page.error} />
        <ul className="cl-list">
          {page.value?.items.map((item) => (
            <li key={item.id} className="cl-record" data-selected={selected?.id === item.id}>
              <Button
                size="sm"
                variant="quiet"
                aria-disabled={!item.available}
                onPress={() => item.available && choose(item)}
              >
                {item.label}
              </Button>
              {item.description && <p>{item.description}</p>}
              {!item.available && (
                <p className="cl-hint">{item.reason ?? 'This action is currently unavailable.'}</p>
              )}
            </li>
          ))}
        </ul>
        {page.value?.nextCursor && (
          <Button size="sm" onPress={page.loadMore}>
            More actions
          </Button>
        )}
        {!page.pending && !page.value?.items.length && !page.error && (
          <LabEmpty title="No matching installed actions." />
        )}
      </div>
    </LabModal>
  );
}
