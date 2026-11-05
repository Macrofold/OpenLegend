import { useId, useState } from 'react';
import type {
  CognitionLabActor,
  CognitionLabPage,
  CognitionLabSettings,
  CognitionLabWorkspace,
} from '@open-legend/protocol';
import { Button, SelectField } from '../design-system/components';
import { ActorPicker, useLabActor } from './actor-picker';
import { currentScope, expected, labRead } from './api';
import { LabError, LabModal, LabNumberInput, LabSearch, LabTabs, LabUpdates } from './controls';
import { bytesLabel, type LabExecute } from './types';
import { useLabPage } from './use-lab-read';

const modelLabels: Record<string, string> = {
  judgment: 'Immediate decisions',
  higherDecision: 'Higher decisions and dialogue',
  responseFast: 'Fast dialogue',
  responseComplex: 'Complex dialogue',
  summary: 'Conversation summaries',
  reflection: 'Reflection',
};

export function LabSettings({
  workspace,
  draft,
  change,
  apply,
  discard,
  busy,
  close,
  open,
  nativePause,
  maintenance,
  execute,
}: {
  workspace: CognitionLabWorkspace;
  draft: CognitionLabSettings;
  change(settings: CognitionLabSettings): void;
  apply(): Promise<boolean>;
  discard(): void;
  busy: boolean;
  close(): void;
  open: boolean;
  nativePause(paused: boolean): void;
  maintenance(actorId: string): void;
  execute: LabExecute;
}) {
  const [tab, setTab] = useState('policy');
  const [numberText, setNumberText] = useState<Record<string, string>>({});
  const [participantDraft, setParticipantDraft] = useState<string[]>();
  const [maintenanceActorId, setMaintenanceActorId] = useState(
    workspace.settings.policy.focalActorId,
  );
  const scope = currentScope(workspace);
  const setPolicy = (patch: Partial<CognitionLabSettings['policy']>) =>
    change({ ...draft, policy: { ...draft.policy, ...patch } });
  const dirty = JSON.stringify(draft) !== JSON.stringify(workspace.settings);
  const numberDraft = (key: string) => ({
    text: numberText[key],
    draft: (text: string) => setNumberText((previous) => ({ ...previous, [key]: text })),
  });
  if (!open) return null;
  return (
    <LabModal
      title="Lab settings"
      close={close}
      toolbar={
        <LabTabs
          label="Settings groups"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'policy', label: 'Run policy' },
            { id: 'participants', label: 'Physical presence' },
            { id: 'models', label: 'Models and output' },
            { id: 'storage', label: 'Retained storage' },
            { id: 'capabilities', label: 'Installed capabilities' },
          ]}
        />
      }
      footer={
        <>
          <span className="cl-hint">
            {dirty ? 'Draft · applies to the next explicit interval' : 'Current applied settings'}
          </span>
          <span className="cl-spacer" />
          <Button
            size="sm"
            onPress={() => {
              setNumberText({});
              discard();
            }}
            disabled={!dirty || busy}
          >
            Discard changes
          </Button>
          <Button size="sm" onPress={close}>
            Close
          </Button>
          <Button
            size="sm"
            variant="primary"
            busy={busy}
            disabled={!dirty}
            onPress={() => {
              void apply().then((ok) => {
                if (ok) {
                  setNumberText({});
                  close();
                }
              });
            }}
          >
            Apply settings
          </Button>
        </>
      }
    >
      <div className="cl-stack">
        {tab === 'policy' ? (
          <>
            <p>
              Applied settings take effect at the next response or execution interval. Applying
              starts no work and renews no current allowance.
            </p>
            <label className="cl-field">
              Stop condition
              <select
                value={draft.policy.mode}
                onChange={(event) =>
                  setPolicy({
                    mode: event.target.value as typeof draft.policy.mode,
                    ...(event.target.value === 'untilCondition'
                      ? {
                          stopCondition: draft.policy.stopCondition ?? {
                            kind: 'nextDecision',
                            id: draft.policy.focalActorId ?? '',
                          },
                        }
                      : {}),
                  })
                }
              >
                <option value="oneResponse">One response</option>
                <option value="forDuration">Run for a duration</option>
                <option value="untilCondition">Until selected condition</option>
                <option value="continuous">Until stopped, within guards</option>
              </select>
            </label>
            <ActorPicker
              revision={workspace.scenarioRevision}
              label="Wait for person"
              scope={scope}
              value={draft.policy.focalActorId}
              onChange={(id) => setPolicy({ focalActorId: id })}
            />
            {draft.policy.mode === 'untilCondition' && (
              <>
                <label className="cl-field">
                  Selected condition
                  <select
                    value={draft.policy.stopCondition?.kind ?? 'nextDecision'}
                    onChange={(event) =>
                      setPolicy({
                        stopCondition:
                          event.target.value === 'nextEvent' || event.target.value === 'nextStage'
                            ? { kind: event.target.value }
                            : {
                                kind: event.target.value as 'nextDecision' | 'actionOutcome',
                                id:
                                  event.target.value === 'nextDecision'
                                    ? (draft.policy.focalActorId ?? '')
                                    : '',
                              },
                      })
                    }
                  >
                    <option value="nextDecision">Next decision</option>
                    <option value="actionOutcome">Selected native action outcome</option>
                    <option value="nextEvent">Next committed native event</option>
                    <option value="nextStage">Next prepared native stage</option>
                  </select>
                </label>
                <label className="cl-field">
                  {draft.policy.stopCondition?.kind === 'actionOutcome'
                    ? 'Exact native action identifier'
                    : draft.policy.stopCondition?.kind === 'nextEvent'
                      ? 'Exact event type, optional'
                      : draft.policy.stopCondition?.kind === 'nextStage'
                        ? 'Exact stage purpose, optional'
                        : 'Observed person identifier'}
                  <input
                    value={draft.policy.stopCondition?.id ?? ''}
                    onChange={(event) =>
                      setPolicy({
                        stopCondition: {
                          kind: draft.policy.stopCondition?.kind ?? 'nextDecision',
                          id: event.target.value,
                        },
                      })
                    }
                  />
                  <span className="cl-hint">
                    {draft.policy.stopCondition?.kind === 'nextEvent'
                      ? 'Leave empty for the next committed event, or use an exact recorded event type.'
                      : draft.policy.stopCondition?.kind === 'nextStage'
                        ? 'Leave empty for the next prepared stage, or use an exact recorded purpose. The selected focal person still applies.'
                        : 'Use an actual recorded native action or person. This chooses when observation stops; it does not execute an action.'}
                  </span>
                </label>
              </>
            )}
            <NumberSetting
              label="Simulation duration / guard"
              unit="seconds"
              value={draft.policy.durationSeconds}
              {...numberDraft('duration')}
              minimum={0.001}
              change={(value) => setPolicy({ durationSeconds: value })}
            />
            <NumberSetting
              label="New model calls per explicit interval"
              value={draft.policy.maximumCalls}
              {...numberDraft('calls')}
              minimum={0}
              step={1}
              change={(value) => setPolicy({ maximumCalls: value })}
            />
            <NumberSetting
              label="Active wall-clock guard"
              unit="seconds, excluding operator holds"
              value={draft.policy.activeWallSeconds}
              {...numberDraft('wall')}
              minimum={0.001}
              change={(value) => setPolicy({ activeWallSeconds: value })}
            />
            <div className="cl-field">
              <span className="cl-field-label">Autonomous participants</span>
              <ActorPicker
                revision={workspace.scenarioRevision}
                label="Add autonomous person"
                scope={scope}
                onChange={(id) =>
                  id &&
                  setPolicy({
                    autonomousActorIds: [...new Set([...draft.policy.autonomousActorIds, id])],
                  })
                }
              />
              <div className="cl-inline">
                {draft.policy.autonomousActorIds.map((id) => (
                  <AutonomousParticipant
                    key={id}
                    actorId={id}
                    scope={scope}
                    revision={workspace.scenarioRevision}
                    remove={() =>
                      setPolicy({
                        autonomousActorIds: draft.policy.autonomousActorIds.filter(
                          (other) => other !== id,
                        ),
                      })
                    }
                  />
                ))}
              </div>
              <p className="cl-hint">
                Limiting autonomy is a recorded intervention. Inspecting or speaking as a person
                does not change this set.
              </p>
            </div>
          </>
        ) : tab === 'participants' ? (
          <PhysicalParticipants
            workspace={workspace}
            execute={execute}
            busy={busy}
            draft={participantDraft}
            change={setParticipantDraft}
          />
        ) : tab === 'models' ? (
          <>
            <p>
              These are configured model identities for supported native stages. This form accepts
              no endpoint, API key or execution permission.
            </p>
            <p className="cl-hint">
              Higher decisions can also produce dialogue after an immediate decision defers. Fast
              and complex dialogue use their separately selected models. Higher decisions keep their
              fixed effort and output limit.
            </p>
            {Object.entries(draft.models).map(([purpose, model]) => (
              <SelectField
                key={purpose}
                label={modelLabels[purpose] ?? purpose}
                placement="bottom start"
                options={(workspace.modelChoices[purpose] ?? []).map((id) => ({ id, label: id }))}
                value={model}
                onChange={(value) =>
                  change({ ...draft, models: { ...draft.models, [purpose]: value } })
                }
              />
            ))}
            {!Object.keys(draft.models).length && (
              <p className="cl-hint">No configurable model routes are installed.</p>
            )}
            <label className="cl-field">
              Effort
              <select
                value={draft.effort ?? ''}
                onChange={(event) => change({ ...draft, effort: event.target.value || undefined })}
              >
                <option value="">Native route default</option>
                {workspace.effortChoices.map((effort) => (
                  <option key={effort} value={effort}>
                    {effort}
                  </option>
                ))}
              </select>
            </label>
            <NumberSetting
              label="Output token ceiling"
              value={draft.maxOutputTokens ?? 0}
              {...numberDraft('output')}
              minimum={0}
              step={1}
              change={(value) =>
                change({ ...draft, maxOutputTokens: value === 0 ? undefined : value })
              }
            />
            <p className="cl-hint">
              Effort and output controls apply where the selected stage supports them. Zero uses the
              native allowance. An explicit ceiling can raise or lower it within the selected
              route's limits.
            </p>
          </>
        ) : tab === 'storage' ? (
          <>
            <p>
              Retained logical lab data: {bytesLabel(workspace.storage.usedBytes)} used,{' '}
              {bytesLabel(workspace.storage.reservedBytes)} reserved. Native database indexes and
              the world's complete history have separate ownership.
            </p>
            <NumberSetting
              label="Lab data allowance"
              unit="bytes"
              value={draft.storageAllowanceBytes}
              {...numberDraft('storage')}
              minimum={1}
              step={1}
              change={(value) => change({ ...draft, storageAllowanceBytes: value })}
            />
            <Button
              size="sm"
              busy={busy}
              disabled={
                !Number.isSafeInteger(draft.storageAllowanceBytes) ||
                draft.storageAllowanceBytes <= workspace.settings.storageAllowanceBytes
              }
              onPress={() => {
                void execute({
                  kind: 'applySettings',
                  expected: expected(workspace),
                  settings: { storageAllowanceBytes: draft.storageAllowanceBytes },
                });
              }}
            >
              Increase storage allowance only
            </Button>
            <p className="cl-hint">
              This applies only the larger storage allowance. Other setting drafts remain local. Use
              it to recover when retained storage is full.
            </p>
            <NumberSetting
              label="Evidence allowance per run"
              unit="bytes"
              value={draft.runCaptureAllowanceBytes}
              {...numberDraft('capture')}
              minimum={1}
              step={1}
              change={(value) => change({ ...draft, runCaptureAllowanceBytes: value })}
            />
            <p className="cl-hint">
              Saved work is retained until deliberately removed. Raising an allowance changes local
              retention admission; it grants no paid model budget.
            </p>
          </>
        ) : (
          <>
            {workspace.capabilities.map((capability) => (
              <section key={capability.id} className="cl-section">
                <div className="cl-inline">
                  <h3>{capability.label}</h3>
                  <span className="cl-badge">
                    {capability.available ? 'Installed' : 'Unavailable'}
                  </span>
                </div>
                {capability.reason && <p className="cl-hint">{capability.reason}</p>}
                {capability.id === 'manualPause' && capability.available && (
                  <div className="cl-inline">
                    <Button
                      size="sm"
                      disabled={busy || workspace.nativePaused}
                      onPress={() => nativePause(true)}
                    >
                      Native manual pause
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy || !workspace.nativePaused}
                      onPress={() => nativePause(false)}
                    >
                      Native manual resume
                    </Button>
                  </div>
                )}
                {capability.id === 'maintenance' && capability.available && (
                  <div className="cl-stack">
                    <ActorPicker
                      revision={workspace.scenarioRevision}
                      label="Person for maintenance"
                      scope={scope}
                      value={maintenanceActorId}
                      onChange={setMaintenanceActorId}
                    />
                    <p className="cl-hint">
                      This explicitly runs the installed native reflection work for the selected
                      person, within the applied run allowance. It may incur model cost.
                    </p>
                    <Button
                      size="sm"
                      disabled={busy || !maintenanceActorId}
                      onPress={() => maintenanceActorId && maintenance(maintenanceActorId)}
                    >
                      Request native maintenance
                    </Button>
                  </div>
                )}
              </section>
            ))}
            {!workspace.capabilities.length && (
              <p>No additional capability information is available.</p>
            )}
          </>
        )}
      </div>
    </LabModal>
  );
}

function AutonomousParticipant({
  actorId,
  scope,
  revision,
  remove,
}: {
  actorId: string;
  scope: string;
  revision: number;
  remove(): void;
}) {
  const person = useLabActor(scope, actorId, revision);
  const name = person.actor?.name ?? (person.pending ? 'Selected person' : 'Unavailable person');
  return (
    <Button
      size="sm"
      variant="quiet"
      aria-label={`Remove ${name} from autonomous participants`}
      onPress={remove}
    >
      {name} <span aria-hidden="true">×</span>
    </Button>
  );
}

function PhysicalParticipants({
  workspace,
  execute,
  busy,
  draft,
  change,
}: {
  workspace: CognitionLabWorkspace;
  execute: LabExecute;
  busy: boolean;
  draft?: string[];
  change(value: string[] | undefined): void;
}) {
  const [query, setQuery] = useState('');
  const ownedActorId = workspace.defaults.actorId;
  const appliedActorIds = workspace.participantActorIds.filter((id) => id === ownedActorId);
  const actorIds = (draft ?? appliedActorIds).filter((id) => id === ownedActorId);
  const actors = useLabPage(
    JSON.stringify([currentScope(workspace), 'physicalParticipants', query]),
    (cursor, signal) =>
      labRead<CognitionLabPage<CognitionLabActor>>('/actors', { query, cursor, limit: 50 }, signal),
    workspace.scenarioRevision,
    query ? 150 : 0,
  );
  const dirty =
    JSON.stringify([...actorIds].sort()) !== JSON.stringify([...appliedActorIds].sort());
  return (
    <section className="cl-stack">
      <p>
        These human-bound people remain physically present while the lab runs. Inspection, the
        speaker, the response focus and autonomy are independent. Changing this set is a recorded
        intervention and changes no account or long-lived control.
      </p>
      <p className="cl-hint">
        Change your controlled person's presence here. Other people's presence is unchanged.
      </p>
      <LabSearch label="Find permitted physical participants" value={query} onChange={setQuery} />
      <LabUpdates
        available={actors.updatesAvailable}
        refresh={actors.refreshPage}
        label="Refresh people"
      />
      <LabError message={actors.error} />
      {(actors.value?.items ?? [])
        .filter((actor) => actor.controlled)
        .map((actor) => (
          <label key={actor.id} className="cl-inline">
            <input
              type="checkbox"
              checked={actorIds.includes(actor.id)}
              disabled={busy}
              onChange={(event) =>
                change(
                  event.target.checked
                    ? [...new Set([...actorIds, actor.id])]
                    : actorIds.filter((id) => id !== actor.id),
                )
              }
            />
            {actor.name} <span className="cl-hint">{actor.participation ?? 'Active'}</span>
          </label>
        ))}
      {actors.value?.nextCursor && (
        <Button size="sm" onPress={actors.loadMore}>
          More people
        </Button>
      )}
      {actorIds
        .filter((id) => !actors.value?.items.some((actor) => actor.id === id))
        .map((id) => (
          <div key={id} className="cl-inline">
            <span>{id} · selected physical participant</span>
            <Button
              size="sm"
              variant="quiet"
              disabled={busy}
              onPress={() => change(actorIds.filter((other) => other !== id))}
            >
              Remove from presence set
            </Button>
          </div>
        ))}
      {!actors.pending && !actors.value?.items.some((actor) => actor.controlled) && (
        <p className="cl-hint">
          No permitted human-bound person appears in this page. Search or page for the person bound
          to your current lab authority.
        </p>
      )}
      <div className="cl-inline">
        <Button size="sm" disabled={!dirty || busy} onPress={() => change(undefined)}>
          Discard presence changes
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!dirty}
          busy={busy}
          onPress={() => {
            void execute({ kind: 'setParticipants', expected: expected(workspace), actorIds }).then(
              (result) => {
                if (result?.ok) change(undefined);
              },
            );
          }}
        >
          Apply physical presence
        </Button>
      </div>
    </section>
  );
}

function NumberSetting({
  label,
  unit,
  value,
  minimum,
  step = 'any',
  change,
  text,
  draft,
}: {
  label: string;
  unit?: string;
  value: number;
  minimum?: number;
  step?: number | 'any';
  change(value: number): void;
  text?: string;
  draft(text: string): void;
}) {
  const id = useId();
  return (
    <div className="cl-field">
      <label htmlFor={id}>{label}</label>
      <LabNumberInput
        id={id}
        label={label}
        minimum={minimum}
        step={step === 'any' ? 1 : step}
        value={text ?? String(value)}
        onChange={(text) => {
          draft(text);
          const next = Number(text);
          change(text.trim() && Number.isFinite(next) ? next : Number.NaN);
        }}
      />
      {text !== undefined && (!text.trim() || !Number.isFinite(Number(text))) && (
        <span className="cl-hint">Complete this number before applying.</span>
      )}
      {unit && <span className="cl-hint">{unit}</span>}
    </div>
  );
}
