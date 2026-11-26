import { useCallback, useEffect, useRef, useState } from 'react';
import { getScoped, post, postPrivateRead } from '../api';

type Stage = {
  attemptId: string;
  jobId: string;
  stage: string;
  model: string;
  input: string | null;
  editable: boolean;
  editableText?: string;
};
type RunMode = 'one-response' | 'advance-time' | 'run-for' | 'until-stopped';
type Decision = {
  mode: 'held' | 'running';
  prepared: Stage | null;
  run?: { reason?: string | null } | null;
};
type Run = {
  id: string;
  label: string;
  jobId: string;
  loadId?: string;
  originId?: string;
  status: string;
  stage?: string;
  dispatched?: boolean;
  received?: boolean;
  applied?: boolean;
};
type RunPage = { runs: Run[]; next: number | null; currentLoadId: string | null };
type Pair = {
  sameCheckpoint: boolean;
  independentRestores: boolean;
  sameStimulus: boolean;
  left: Run;
  right: Run;
};
const describe = (reason: unknown) =>
  reason instanceof Error ? reason.message : 'The request could not be confirmed.';
function useOperation() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const perform = useCallback(async (work: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      await work();
    } catch (reason) {
      setMessage(describe(reason));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, []);
  return { busy, message, perform };
}
async function send<T>(path: string, body: unknown): Promise<T> {
  const result = await post<T & { ok: boolean; message?: string }>(path, body);
  if (result.ok === false) throw new Error(result.message ?? 'The server refused the operation.');
  return result;
}

function AutonomousParticipants({
  people,
  control,
}: {
  people: { id: string; name: string }[];
  control: boolean;
}) {
  const [selection, setSelection] = useState<{ eligible: string[]; revision: string }>();
  const { busy, message, perform } = useOperation();
  const contacts = JSON.stringify(people.map((person) => person.id));
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const next = await postPrivateRead<{
        ok: boolean;
        message?: string;
        eligible: string[];
        revision: string;
      }>('/api/cognition-lab/decisions/participants', { contacts: JSON.parse(contacts) }, signal);
      if (!next.ok) throw new Error(next.message ?? 'The participant selection changed.');
      if (!signal?.aborted) setSelection(next);
    },
    [contacts],
  );
  useEffect(() => {
    const controller = new AbortController();
    setSelection(undefined);
    void perform(() => refresh(controller.signal));
    return () => controller.abort();
  }, [perform, refresh]);
  return (
    <fieldset>
      <legend>People who may start decisions</legend>
      {people.map((person) => (
        <label key={person.id}>
          <input
            type="checkbox"
            checked={selection?.eligible.includes(person.id) ?? false}
            disabled={!control || busy || !selection}
            onChange={(event) => {
              const eligible = event.currentTarget.checked;
              void perform(async () => {
                try {
                  await send('/api/cognition-lab/decisions/participants/edit', {
                    contact: person.id,
                    eligible,
                    revision: selection?.revision,
                  });
                } finally {
                  await refresh();
                }
              });
            }}
          />{' '}
          {person.name}
        </label>
      ))}
      {(!selection || message) && (
        <button type="button" disabled={busy} onClick={() => void perform(() => refresh())}>
          Refresh participants
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </fieldset>
  );
}

export function DecisionControls({
  control,
  people,
  selectedJob,
}: {
  control: boolean;
  people: { id: string; name: string }[];
  selectedJob?: string;
}) {
  const [mode, setMode] = useState<RunMode>('one-response');
  const [autonomy, setAutonomy] = useState('focal');
  const [focal, setFocal] = useState('');
  const [simSeconds, setSimSeconds] = useState(60);
  const [calls, setCalls] = useState(20);
  const [wallSeconds, setWallSeconds] = useState(180);
  const [state, setState] = useState<Decision>();
  const [edit, setEdit] = useState<string | null>(null);
  const { busy, message, perform } = useOperation();
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const next = await getScoped<Decision>('/api/cognition-lab/decisions', signal);
    if (!signal?.aborted) setState(next);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void perform(() => refresh(controller.signal));
    return () => controller.abort();
  }, [perform, refresh]);
  const prepared = state?.prepared;
  useEffect(() => setEdit(null), [prepared?.attemptId]);
  async function act(action: 'hold' | 'step' | 'resume' | 'cancel') {
    await perform(async () => {
      await send('/api/cognition-lab/decisions/control', {
        action,
        ...(action === 'resume'
          ? {
              run: {
                mode,
                autonomy,
                ...(focal ? { focalActorId: focal } : {}),
                ...(mode === 'one-response' && (prepared?.jobId ?? selectedJob)
                  ? { jobId: prepared?.jobId ?? selectedJob }
                  : {}),
                simulatedSeconds: simSeconds,
                maxCalls: calls,
                wallSeconds,
              },
            }
          : {}),
        ...(prepared ? { attemptId: prepared.attemptId } : {}),
        ...(edit !== null && action === 'step' ? { stateOverride: edit } : {}),
      });
      setEdit(null);
      await refresh();
    });
  }
  return (
    <div>
      <div className="lab-toolbar">
        <button disabled={busy} onClick={() => void perform(() => refresh())}>
          Inspect next request
        </button>
        {state && (
          <button
            disabled={!control || busy || edit !== null}
            onClick={() => void act(state.mode === 'held' ? 'resume' : 'hold')}
          >
            {state.mode === 'held' ? 'Start interval' : 'Hold before next call'}
          </button>
        )}
      </div>
      <details>
        <summary>Run policy</summary>
        <fieldset disabled={busy || !control || state?.mode === 'running'}>
          <legend>Stop condition</legend>
          <label>
            Run until{' '}
            <select
              value={mode}
              onChange={(e) => {
                const value = e.target.value as RunMode;
                setMode(value);
                setSimSeconds(value === 'advance-time' ? 5 : 60);
              }}
            >
              <option value="one-response">One response</option>
              <option value="advance-time">Advance time</option>
              <option value="run-for">Run for a duration</option>
              <option value="until-stopped">Manual stop or limit</option>
            </select>
          </label>
          <label>
            Wait for person{' '}
            <select value={focal} onChange={(e) => setFocal(e.target.value)}>
              <option value="">Current directed decision</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Autonomous participants{' '}
            <select value={autonomy} onChange={(e) => setAutonomy(e.target.value)}>
              <option value="off">None</option>
              <option value="focal">Focal person</option>
              <option value="selected">Selected participants</option>
              <option value="all">All eligible people</option>
            </select>
          </label>
          {autonomy === 'selected' && <AutonomousParticipants people={people} control={control} />}
          <label>
            Simulated seconds{' '}
            <input
              type="number"
              min={1}
              value={simSeconds}
              onChange={(e) => setSimSeconds(e.target.valueAsNumber)}
            />
          </label>
          <label>
            Maximum model calls{' '}
            <input
              type="number"
              min={1}
              value={calls}
              onChange={(e) => setCalls(e.target.valueAsNumber)}
            />
          </label>
          <label>
            Active wall seconds{' '}
            <input
              type="number"
              min={1}
              value={wallSeconds}
              onChange={(e) => setWallSeconds(e.target.valueAsNumber)}
            />
          </label>
        </fieldset>
      </details>
      {state?.run?.reason && <p role="status">Interval stopped: {state.run.reason}</p>}
      {state && (
        <p>
          {state.mode === 'held'
            ? 'Holding before model calls.'
            : 'Model calls can run within the Lab allowance.'}
        </p>
      )}
      {prepared ? (
        <>
          <p>
            <strong>{prepared.stage}</strong> · {prepared.model}
          </p>
          {prepared.input !== null && (
            <details open>
              <summary>Recorded request input</summary>
              <pre>{prepared.input}</pre>
            </details>
          )}
          {prepared.editable && (
            <label>
              <input
                type="checkbox"
                checked={edit !== null}
                onChange={(e) => setEdit(e.target.checked ? (prepared.editableText ?? null) : null)}
              />{' '}
              Edit this call once
            </label>
          )}
          {edit !== null && (
            <textarea
              aria-label="Input for this call only"
              value={edit}
              onChange={(e) => setEdit(e.target.value)}
            />
          )}
          <div className="lab-toolbar">
            <button disabled={!control || busy} onClick={() => void act('step')}>
              Send this call
            </button>
            <button disabled={!control || busy} onClick={() => void act('cancel')}>
              Cancel this call
            </button>
          </div>
        </>
      ) : (
        state && <p>No prepared request is waiting.</p>
      )}
      {message && <p role="alert">{message}</p>}
    </div>
  );
}

type WorldGuide = {
  id: string;
  name: string;
  description: string;
  setup: string;
  changedFactor: string;
  observe: string;
  prerequisites: string[];
};

function ExperimentGuides() {
  const [guides, setGuides] = useState<WorldGuide[]>();
  const [error, setError] = useState('');
  const read = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => read.current?.abort(), []);
  return (
    <details onToggle={async (event) => {
      if (!event.currentTarget.open || guides || read.current) return;
      const controller = new AbortController();
      read.current = controller;
      try {
        setError('');
        setGuides(await getScoped<WorldGuide[]>('/api/cognition-lab/guides', controller.signal));
      } catch (problem) {
        if (!controller.signal.aborted) setError(String(problem));
      } finally { read.current = undefined; }
    }}>
      <summary>Experiment guides</summary>
      {error && <p role="alert">{error}</p>}
      {guides?.length === 0 && <p>This world has no experiment guides.</p>}
      {guides?.map((guide) => (
        <details key={guide.id}>
          <summary>{guide.name}</summary>
          <p>{guide.description}</p>
          <dl>
            <dt>Setup</dt><dd>{guide.setup}</dd>
            <dt>Change</dt><dd>{guide.changedFactor}</dd>
            <dt>Observe</dt><dd>{guide.observe}</dd>
            {guide.prerequisites.length > 0 && <><dt>Prerequisites</dt><dd>{guide.prerequisites.join(', ')}</dd></>}
          </dl>
        </details>
      ))}
    </details>
  );
}

export function RunLibrary({
  selectedJob,
  repeat,
}: {
  selectedJob?: string;
  repeat(runId: string, loadId: string, label: string): void;
}) {
  const [page, setPage] = useState<RunPage>();
  const [label, setLabel] = useState('');
  const loadId = page?.currentLoadId;
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [pair, setPair] = useState<Pair>();
  const [open, setOpen] = useState(false);
  const order = useRef<{ key: string; id: string } | undefined>(undefined);
  const { busy, message, perform } = useOperation();
  const refresh = useCallback(async (before?: number) => {
    const result = await getScoped<RunPage>(
      '/api/cognition-lab/runs' + (before === undefined ? '' : '?before=' + before),
    );
    setPage((prev) =>
      before !== undefined && prev ? { ...result, runs: [...prev.runs, ...result.runs] } : result,
    );
  }, []);
  useEffect(() => {
    if (open) void perform(() => refresh());
  }, [open, perform, refresh]);
  function retain() {
    if (!selectedJob || !label.trim()) return;
    const key = JSON.stringify([selectedJob, label, loadId]);
    if (order.current?.key !== key) order.current = { key, id: crypto.randomUUID() };
    const id = order.current.id;
    void perform(async () => {
      await send('/api/cognition-lab/runs', {
        id,
        jobId: selectedJob,
        label: label.trim(),
        ...(loadId ? { loadId } : {}),
      });
      order.current = undefined;
      setLabel('');
      await refresh();
    });
  }
  const selector = (value: string, set: (v: string) => void, name: string) => (
    <label>
      {name}{' '}
      <select
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setPair(undefined);
        }}
      >
        <option value="">Choose run</option>
        {page?.runs.map((run) => (
          <option key={run.id} value={run.id}>
            {run.label}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Run Library</summary>
      <ExperimentGuides />
      <p>
        {selectedJob
          ? 'Keep the selected decision for comparison.'
          : 'Choose a recorded decision in the inspector to keep it.'}
      </p>
      {selectedJob && (
        <RecordedStages
          key={selectedJob}
          run={{ jobId: selectedJob, label: 'Selected decision' }}
        />
      )}
      <label>
        Run name <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <button disabled={busy || !selectedJob || !label.trim()} onClick={retain}>
        Keep run
      </button>
      {page &&
        (page.runs.length ? (
          <>
            <ul>
              {page.runs.map((run) => (
                <li key={run.id}>
                  {run.label} · {run.status}
                  {page.currentLoadId && run.originId && run.loadId !== page.currentLoadId && (
                    <button onClick={() => repeat(run.id, page.currentLoadId!, run.label)}>
                      Repeat conversation
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {page.next !== null && (
              <button disabled={busy} onClick={() => void perform(() => refresh(page.next!))}>
                More runs
              </button>
            )}
            <div className="lab-toolbar">
              {selector(left, setLeft, 'First run')}
              {selector(right, setRight, 'Second run')}
              <button
                disabled={busy || !left || !right || left === right}
                onClick={() =>
                  void perform(async () =>
                    setPair(await send<Pair>('/api/cognition-lab/comparisons', { left, right })),
                  )
                }
              >
                Compare runs
              </button>
            </div>
          </>
        ) : (
          <p>No retained runs.</p>
        ))}
      {pair && (
        <>
          <p>
            {pair.independentRestores
              ? 'Verified independent restores of the same checkpoint.'
              : pair.sameCheckpoint
                ? 'The runs share a checkpoint. Independent restores have not been established.'
                : 'A common checkpoint has not been established.'}{' '}
            {pair.sameStimulus
              ? 'Both runs used the same submitted stimulus.'
              : 'The submitted stimuli differ.'}{' '}
            Inspect the recorded calls to compare what the characters actually received.
          </p>
          <table>
            <thead>
              <tr>
                <th>Evidence</th>
                <th>{pair.left.label}</th>
                <th>{pair.right.label}</th>
              </tr>
            </thead>
            <tbody>
              {(['status', 'stage', 'dispatched', 'received', 'applied'] as const).map((field) => (
                <tr key={field}>
                  <th>{field}</th>
                  {[pair.left, pair.right].map((run) => (
                    <td key={run.id}>{String(run[field] ?? 'Unrecorded')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="lab-evidence-pair">
            {[pair.left, pair.right].map((run) => (
              <RecordedStages key={run.id} run={run} />
            ))}
          </div>
        </>
      )}
      {message && <p role="alert">{message}</p>}
    </details>
  );
}

function RecordedStages({ run }: { run: Pick<Run, 'label' | 'jobId'> }) {
  const [stages, setStages] = useState<{ id: string; kind: string }[]>();
  const [capture, setCapture] = useState<string>();
  const [selectedStage, selectStage] = useState<string>();
  const { perform, busy, message } = useOperation();
  async function load() {
    const value = await postPrivateRead<{
      ok: boolean;
      message?: string;
      details?: { children: { id: string; kind: string }[] };
    }>('/api/god/trigger', { id: run.jobId });
    if (!value.ok || !value.details)
      throw new Error(value.message ?? 'The recorded decision is unavailable in this situation.');
    setStages(value.details.children);
  }
  async function inspect(id: string) {
    setCapture(undefined);
    selectStage(undefined);
    const value = await postPrivateRead<{
      ok: boolean;
      message?: string;
      details?: { capture: { status: string; input?: string; redacted?: boolean } };
    }>('/api/god/intelligence-stage', { id });
    if (!value.ok || !value.details) throw new Error(value.message ?? 'This stage is unavailable.');
    const record = value.details.capture;
    if (record.status === 'captured' && record.input && !record.redacted) selectStage(id);
    setCapture(
      record.status === 'captured'
        ? record.input
        : 'The recorded input is unavailable under current access and source restrictions.',
    );
  }
  return (
    <details
      onToggle={(e) => {
        if (e.currentTarget.open && !stages) void perform(load);
      }}
    >
      <summary>{run.label} · recorded calls</summary>
      {stages?.map((stage) => (
        <button
          key={stage.id}
          disabled={busy}
          onClick={() => void perform(() => inspect(stage.id))}
        >
          {stage.kind}
        </button>
      ))}
      {stages?.length === 0 && <p>No model calls recorded.</p>}
      {capture && <pre>{capture}</pre>}
      {selectedStage && <RequestComparison key={selectedStage} stageId={selectedStage} />}
      {message && <p role="status">{message}</p>}
    </details>
  );
}

type ComparisonResult = {
  comparisonId?: string;
  attemptId?: string;
  recordedAt?: string;
  status: string;
  output?: unknown;
};

function RequestComparison({ stageId }: { stageId: string }) {
  const [replacement, setReplacement] = useState('');
  const [result, setResult] = useState<ComparisonResult>();
  const { busy, message, perform } = useOperation();
  const pending = useRef<{ input: string; id: string } | undefined>(undefined);
  const compare = () =>
    void perform(async () => {
      if (pending.current?.input !== replacement)
        pending.current = { input: replacement, id: crypto.randomUUID() };
      const record = await send<ComparisonResult>('/api/cognition-lab/decisions/reruns', {
        stageId,
        requestId: pending.current.id,
        stateOverride: replacement || undefined,
      });
      setResult(record);
      if (record.status !== 'pending') pending.current = undefined;
    });
  const history = (before?: string) =>
    void perform(async () => {
      setResult(undefined);
      const record = await postPrivateRead<ComparisonResult & { ok: boolean; message?: string }>(
        '/api/cognition-lab/decisions/reruns/history',
        { stageId, before },
      );
      if (!record.ok) throw new Error(record.message ?? 'This comparison is unavailable.');
      setResult(record);
    });
  return (
    <details>
      <summary>Rerun this request</summary>
      <p>
        The server submits one model call and shows its output. The characters and world stay at
        their current state.
      </p>
      <label>
        Replacement prompt or judgment state (optional)
        <textarea
          value={replacement}
          onChange={(event) => {
            setReplacement(event.target.value);
            setResult(undefined);
          }}
        />
      </label>
      <button disabled={busy} onClick={compare}>
        {result?.status === 'pending' ? 'Check comparison' : 'Submit request comparison'}
      </button>
      <button disabled={busy} onClick={() => history()}>
        Latest saved comparison
      </button>
      {result?.comparisonId && (
        <button disabled={busy} onClick={() => history(result.comparisonId)}>
          Older comparison
        </button>
      )}
      {result && (
        <p role="status">
          {result.status === 'no-comparisons'
            ? 'No more saved comparisons.'
            : [result.recordedAt, result.status, result.attemptId].filter(Boolean).join(' · ')}
        </p>
      )}
      {result?.output != null && (
        <pre>
          {typeof result.output === 'string'
            ? result.output
            : JSON.stringify(result.output, null, 2)}
        </pre>
      )}
      {message && <p role="alert">{message}</p>}
    </details>
  );
}
