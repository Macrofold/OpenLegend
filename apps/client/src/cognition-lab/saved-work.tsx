import { useId, useState } from 'react';
import { COGNITION_LAB_MAX_COMPARISON_VARIANTS } from '@open-legend/protocol';
import type {
  CognitionLabPage,
  CognitionLabRecipe,
  CognitionLabSaved,
  CognitionLabWorkspace,
} from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { ActorPicker } from './actor-picker';
import { currentScope, expected, labExportUrl, labRead } from './api';
import { LabEmpty, LabError, LabModal, LabSearch, LabTabs, LabUpdates } from './controls';
import { RecordPicker } from './record-picker';
import {
  bytesLabel,
  draftEdit,
  draftGroup,
  instantLabel,
  type LabDraft,
  type LabExecute,
} from './types';
import { useLabPage } from './use-lab-read';

export function Library({
  workspace,
  execute,
  busy,
  refresh,
  inspectRun,
  inspectComparison,
  saveScenario,
  importWork,
  close,
}: {
  workspace: CognitionLabWorkspace;
  execute: LabExecute;
  busy: boolean;
  refresh: number;
  inspectRun(runId: string): void;
  inspectComparison(runIds: string[]): void;
  saveScenario(): void;
  importWork(): void;
  close(): void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('scenario');
  const guides = kind === 'guides';
  const disclosureScope = JSON.stringify([workspace.workspaceId, workspace.disclosureRevision]);
  const [selection, setSelection] = useState<{ scope: string; item: CognitionLabSaved }>();
  const selected =
    !guides &&
    selection?.scope === disclosureScope &&
    (kind === 'all' || selection.item.kind === kind)
      ? selection.item
      : undefined;
  const setSelected = (item: CognitionLabSaved | undefined) =>
    setSelection(item ? { scope: disclosureScope, item } : undefined);
  const [replacing, setReplacing] = useState(false);
  const [keepCurrentModels, setKeepCurrentModels] = useState(false);
  const [removing, setRemoving] = useState(false);
  const page = useLabPage(
    guides
      ? undefined
      : JSON.stringify([workspace.workspaceId, workspace.disclosureRevision, query, kind]),
    (cursor, signal) =>
      labRead<CognitionLabPage<CognitionLabSaved>>(
        '/scenarios',
        { kind: kind === 'all' ? undefined : kind, query, cursor, limit: 50 },
        signal,
      ),
    refresh,
    query ? 150 : 0,
  );
  const guidePage = useLabPage(
    guides ? JSON.stringify([disclosureScope, query, 'guides']) : undefined,
    (cursor, signal) =>
      labRead<CognitionLabPage<CognitionLabRecipe>>(
        '/recipes',
        { query, cursor, limit: 50 },
        signal,
      ),
    refresh,
    query ? 150 : 0,
  );
  const [guideId, setGuideId] = useState<string>();
  const activePage = guides ? guidePage : page;
  const load = async () => {
    if (
      !selected ||
      selected.withheld ||
      (selected.kind !== 'scenario' && selected.kind !== 'checkpoint')
    )
      return;
    const result = await execute({
      kind: selected.kind === 'checkpoint' ? 'restoreCheckpoint' : 'loadScenario',
      savedId: selected.id,
      keepCurrentModels,
      expected: expected(workspace),
    });
    if (result?.ok) close();
  };
  return (
    <>
      <LabModal
        title="Library"
        close={close}
        wide
        pending={activePage.pending}
        toolbar={
          <>
            <LabSearch label="Search library" value={query} onChange={setQuery} />
            <LabUpdates
              available={activePage.updatesAvailable}
              refresh={activePage.refreshPage}
              label="Refresh library"
            />
            <LabTabs
              label="Library collection"
              value={kind}
              onChange={setKind}
              options={[
                { id: 'scenario', label: 'Scenarios' },
                { id: 'checkpoint', label: 'Checkpoints' },
                { id: 'run', label: 'Runs' },
                { id: 'comparison', label: 'Comparisons' },
                { id: 'guides', label: 'Experiment guides' },
                { id: 'all', label: 'All saved work' },
              ]}
            />
          </>
        }
        footer={
          <>
            <span className="cl-hint">
              {guides
                ? 'Guides describe experiments; selecting one changes no context or state.'
                : selected
                  ? `${selected.name} · ${selected.kind}`
                  : 'Select saved work to inspect or load it.'}
            </span>
            <span className="cl-spacer" />
            <Button size="sm" disabled={busy} onPress={saveScenario}>
              Save current scenario
            </Button>
            <Button size="sm" disabled={busy} onPress={importWork}>
              Import
            </Button>
            {selected && (
              <>
                {!selected.withheld && selected.kind !== 'comparison' && (
                  <a className="ol-btn" href={labExportUrl(selected.kind, selected.id)} download>
                    Export
                  </a>
                )}
                <Button size="sm" variant="quiet" onPress={() => setRemoving(true)}>
                  Remove
                </Button>
                {selected.withheld ? null : selected.kind === 'comparison' ? (
                  <Button
                    size="sm"
                    disabled={!selected.comparisonRunIds?.length}
                    onPress={() => {
                      inspectComparison(selected.comparisonRunIds ?? []);
                      close();
                    }}
                  >
                    Inspect results
                  </Button>
                ) : selected.kind === 'run' ? (
                  <Button
                    size="sm"
                    onPress={() => {
                      inspectRun(selected.runId ?? selected.id);
                      close();
                    }}
                  >
                    Inspect recorded run
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!selected.compatible || busy}
                    onPress={() => {
                      setKeepCurrentModels(false);
                      setReplacing(true);
                    }}
                  >
                    Load {selected.kind}
                  </Button>
                )}
              </>
            )}
            <Button size="sm" onPress={close}>
              Close
            </Button>
          </>
        }
      >
        <LabError message={activePage.error} />
        {guides ? (
          <>
            <p className="cl-hint">
              Reference experiments supplied by the selected world. Prepare their actual people,
              history and conditions in the editor, then save a reusable scenario. These guides do
              not install a setup or tell a character what to choose.
            </p>
            <ul className="cl-list">
              {guidePage.value?.items.map((guide) => (
                <li key={guide.id} className="cl-record" data-selected={guideId === guide.id}>
                  <button
                    className="cl-record-action"
                    onClick={() => setGuideId(guideId === guide.id ? undefined : guide.id)}
                    aria-expanded={guideId === guide.id}
                  >
                    <strong>{guide.name}</strong>
                    <p className="cl-hint">{guide.description}</p>
                  </button>
                  {guideId === guide.id && (
                    <section className="cl-section">
                      <ExperimentGuideDetails guide={guide} />
                    </section>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            {selected?.kind === 'comparison' && !selected.withheld && (
              <p className="cl-hint">
                This retained evidence group links its recorded runs and starting checkpoint.
                Inspect its results here; export each run individually. Removing the group keeps its
                child runs saved and releases the group's references.
              </p>
            )}
            <ul className="cl-list">
              {page.value?.items.map((item) => (
                <li key={item.id} className="cl-record" data-selected={selected?.id === item.id}>
                  <button className="cl-record-action" onClick={() => setSelected(item)}>
                    <div className="cl-record-heading">
                      <strong>{item.name}</strong>
                      <small>
                        {item.kind} · {item.completeness}
                      </small>
                    </div>
                    <p className="cl-hint">
                      {instantLabel(item.createdAt)} ·{' '}
                      {item.bytes === undefined ? 'Size not captured' : bytesLabel(item.bytes)} ·{' '}
                      {item.gameTime === undefined
                        ? 'Game time unavailable'
                        : `Game time ${item.gameTime}`}
                    </p>
                    {item.description && <p>{item.description}</p>}
                    {item.worldId && <p className="cl-hint">World: {item.worldId}</p>}
                    {!item.compatible && (
                      <p className="cl-hint">
                        {item.reason ??
                          'This saved item is not compatible with the installed current format.'}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {activePage.value?.nextCursor && (
          <Button size="sm" onPress={activePage.loadMore} busy={activePage.paging}>
            {guides ? 'More experiment guides' : 'More saved work'}
          </Button>
        )}
        {!activePage.pending && !activePage.value?.items.length && activePage.value?.nextCursor && (
          <p className="cl-hint">
            No matches in the pages searched so far. More library items remain.
          </p>
        )}
        {!activePage.pending &&
          !activePage.value?.items.length &&
          !activePage.value?.nextCursor &&
          !activePage.error && (
            <LabEmpty
              title={
                query
                  ? 'No matching library items.'
                  : guides
                    ? 'No experiment guides supplied.'
                    : 'No saved work in this collection.'
              }
            >
              {guides
                ? 'This world supplies no matching reference experiments.'
                : 'Save a scenario, capture a continuation checkpoint, or retain a useful run.'}
            </LabEmpty>
          )}
      </LabModal>
      {replacing && selected && (
        <LabModal
          title={`Load ${selected.name}`}
          close={() => setReplacing(false)}
          footer={
            <>
              <Button size="sm" onPress={() => setReplacing(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" busy={busy} onPress={() => void load()}>
                Replace lab scenario
              </Button>
            </>
          }
        >
          <p>
            This replaces the active lab situation with {selected.name}, settles or cancels its
            active work, and leaves execution stopped. The ordinary game is independent. Current
            local drafts will be discarded only after a confirmed replacement.
          </p>
          <label className="cl-inline">
            <input
              type="checkbox"
              checked={keepCurrentModels}
              disabled={busy}
              onChange={(event) => setKeepCurrentModels(event.target.checked)}
            />
            Keep current model settings
          </label>
          <p className="cl-hint">
            When selected, loading keeps the current models, reasoning effort and output allowance.
          </p>
        </LabModal>
      )}
      {removing && selected && (
        <LabModal
          title={`Remove ${selected.name}`}
          close={() => setRemoving(false)}
          footer={
            <>
              <Button size="sm" onPress={() => setRemoving(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                busy={busy}
                onPress={() => {
                  void execute({ kind: 'removeSaved', savedIds: [selected.id] }).then((result) => {
                    if (result?.ok) {
                      setSelected(undefined);
                      setRemoving(false);
                    }
                  });
                }}
              >
                Remove saved {selected.kind}
              </Button>
            </>
          }
        >
          <p>
            {selected.kind === 'comparison'
              ? 'Remove this comparison group and release its references. Its child runs remain saved.'
              : `Remove this named saved ${selected.kind}.`}{' '}
            Bytes still needed by another retained run or active origin remain with their owning
            records. This does not replace the active scenario.
          </p>
        </LabModal>
      )}
    </>
  );
}

export function SaveWork({
  workspace,
  kind,
  execute,
  busy,
  close,
}: {
  workspace: CognitionLabWorkspace;
  kind: 'scenario' | 'checkpoint' | 'run';
  execute: LabExecute;
  busy: boolean;
  close(): void;
}) {
  const [name, setName] = useState(
    kind === 'run' ? (workspace.run?.name ?? workspace.name) : workspace.name,
  );
  const [description, setDescription] = useState('');
  const descriptionId = useId();
  const [error, setError] = useState('');
  const save = async () => {
    if (!name.trim()) return setError('Name this saved work.');
    const result =
      kind === 'run'
        ? workspace.run
          ? await execute({ kind: 'retainRun', runId: workspace.run.id, name })
          : undefined
        : await execute({
            kind: kind === 'scenario' ? 'saveScenario' : 'saveCheckpoint',
            expected: expected(workspace),
            name,
            ...(description.trim() ? { description } : {}),
          });
    if (result?.ok) close();
    else if (result) setError(result.message);
  };
  return (
    <LabModal
      title={kind === 'run' ? 'Retain recorded run' : `Save ${kind}`}
      close={close}
      footer={
        <>
          <Button size="sm" onPress={close}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" busy={busy} onPress={() => void save()}>
            {kind === 'run' ? 'Retain run' : `Save ${kind}`}
          </Button>
        </>
      }
    >
      <div className="cl-stack">
        <p>
          {kind === 'scenario'
            ? 'A reusable starting situation with current applied native state and lab settings.'
            : kind === 'checkpoint'
              ? 'A coherent continuation of the current native situation, including supported work, custom input and lab settings.'
              : 'The actual captured inputs, outputs and outcome evidence. A run without a native checkpoint cannot continue a world.'}
        </p>
        <label className="cl-field">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        {kind !== 'run' && (
          <div className="cl-field">
            <label htmlFor={descriptionId}>Description (optional)</label>
            <textarea
              id={descriptionId}
              aria-describedby={`${descriptionId}-help`}
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span id={`${descriptionId}-help`} className="cl-hint">
              Searchable notes about this setup. These notes are not sent to characters.
            </span>
          </div>
        )}
        <LabError message={error} />
      </div>
    </LabModal>
  );
}

function ExperimentGuideDetails({ guide }: { guide: CognitionLabRecipe }) {
  return (
    <>
      <p>{guide.setup}</p>
      <p className="cl-hint">
        Change: {guide.changedFactor}
        <br />
        Observe: {guide.observe}
        <br />
        Prerequisites: {guide.prerequisites.join(', ')}
      </p>
    </>
  );
}

export function CompareRuns({
  workspace,
  execute,
  busy,
  drafts,
  close,
}: {
  workspace: CognitionLabWorkspace;
  execute: LabExecute;
  busy: boolean;
  drafts: LabDraft[];
  close(): void;
}) {
  const [query, setQuery] = useState('');
  const [originId, setOriginId] = useState(workspace.run?.originId ?? '');
  const [recipeId, setRecipeId] = useState<string>();
  const [selectedRecipe, setSelectedRecipe] = useState<{
    scope: string;
    record: CognitionLabRecipe;
  }>();
  const [actorId, setActorId] = useState(workspace.defaults.actorId);
  const [targetId, setTargetId] = useState(workspace.defaults.targetId);
  const [text, setText] = useState('');
  const [variants, setVariants] = useState(() => [
    {
      id: crypto.randomUUID(),
      name: 'Baseline',
      effort: '',
      models: {} as Record<string, string>,
      factorGroup: '',
    },
    {
      id: crypto.randomUUID(),
      name: 'Changed factor',
      effort: '',
      models: {} as Record<string, string>,
      factorGroup: '',
    },
  ]);
  const changeVariant = (id: string, patch: Partial<(typeof variants)[number]>) =>
    setVariants((previous) =>
      previous.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)),
    );
  const [error, setError] = useState('');
  const factorGroups = new Map<string, LabDraft[]>();
  for (const draft of drafts) {
    const key = draftGroup(draft);
    const group = factorGroups.get(key) ?? [];
    group.push(draft);
    factorGroups.set(key, group);
  }
  const scope = currentScope(workspace);
  const recordScope = JSON.stringify([scope, workspace.disclosureRevision]);
  const recipe =
    selectedRecipe?.scope === recordScope && selectedRecipe.record.id === recipeId
      ? selectedRecipe.record
      : undefined;
  const run = async () => {
    if (!originId || !actorId || !text.trim())
      return setError('Choose an origin, speaker and ordinary speech stimulus.');
    if (variants.some((variant) => variant.factorGroup && !factorGroups.has(variant.factorGroup)))
      return setError(
        'A selected field factor is no longer available. Choose its current draft group again.',
      );
    try {
      const result = await execute({
        kind: 'runComparison',
        expected: expected(workspace),
        originId,
        recipeId,
        policy: workspace.settings.policy,
        variants: variants.map((variant) => ({
          name: variant.name,
          settings:
            variant.effort || Object.keys(variant.models).length
              ? {
                  ...(variant.effort
                    ? { effort: variant.effort === 'native-default' ? null : variant.effort }
                    : {}),
                  ...(Object.keys(variant.models).length ? { models: variant.models } : {}),
                }
              : undefined,
          edits: variant.factorGroup
            ? factorGroups.get(variant.factorGroup)?.map(draftEdit)
            : undefined,
          stimulus: { kind: 'say', actorId, targetId, text, volume: workspace.defaults.volume },
        })),
      });
      if (result?.ok) close();
      else if (result) setError(result.message);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not prepare this comparison.');
    }
  };
  return (
    <LabModal
      title="Serial matched comparison"
      close={close}
      wide
      toolbar={
        <LabSearch
          label="Find saved origins and reference recipes"
          value={query}
          onChange={setQuery}
        />
      }
      footer={
        <>
          <Button size="sm" onPress={close}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" busy={busy} onPress={() => void run()}>
            Run variants serially
          </Button>
        </>
      }
    >
      <div className="cl-stack">
        <p>
          Each variant restores one complete origin, applies its declared difference and runs
          through ordinary intake. The final variant remains the current lab state. Expectations and
          notes are excluded from model inputs.
        </p>
        <LabError message={error} />
        <RecordPicker<CognitionLabSaved>
          label="Starting scenario or checkpoint"
          path="/scenarios"
          kind="origin"
          scope={recordScope}
          value={originId}
          onChange={(id) => setOriginId(id ?? '')}
          filter={query}
        />
        <RecordPicker<CognitionLabRecipe>
          label="Optional reference recipe"
          path="/recipes"
          scope={recordScope}
          value={recipeId}
          onChange={setRecipeId}
          onRecord={(record) => setSelectedRecipe({ scope: recordScope, record })}
          filter={query}
          emptyLabel="No reference recipe"
        />
        {recipe && (
          <section className="cl-section">
            <h3>{recipe.name}</h3>
            <p>{recipe.description}</p>
            <ExperimentGuideDetails guide={recipe} />
          </section>
        )}
        <ActorPicker label="Speaker" scope={scope} value={actorId} onChange={setActorId} />
        <ActorPicker
          revision={workspace.scenarioRevision}
          label="Addressee"
          scope={scope}
          value={targetId}
          onChange={setTargetId}
          optional
        />
        <label className="cl-field">
          Same sentence in both variants
          <textarea value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        {variants.map((variant, index) => (
          <section key={variant.id} className="cl-section cl-stack">
            <div className="cl-inline">
              <h3>Variant {index + 1}</h3>
              <span className="cl-spacer" />
              {variants.length > 2 && (
                <Button
                  size="sm"
                  variant="quiet"
                  onPress={() =>
                    setVariants((previous) => previous.filter((item) => item.id !== variant.id))
                  }
                >
                  Remove variant
                </Button>
              )}
            </div>
            <label className="cl-field">
              Name
              <input
                value={variant.name}
                onChange={(event) => changeVariant(variant.id, { name: event.target.value })}
              />
            </label>
            <label className="cl-field">
              Effort override
              <select
                value={variant.effort}
                onChange={(event) => changeVariant(variant.id, { effort: event.target.value })}
              >
                <option value="">Use saved origin setting</option>
                <option value="native-default">Native route default</option>
                {workspace.effortChoices.map((effort) => (
                  <option key={effort} value={effort}>
                    {effort}
                  </option>
                ))}
              </select>
            </label>
            {Object.entries(workspace.settings.models).map(([purpose, model]) => (
              <label key={purpose} className="cl-field">
                {purpose} model override
                <select
                  value={variant.models[purpose] ?? ''}
                  onChange={(event) => {
                    const models = { ...variant.models };
                    if (event.target.value) models[purpose] = event.target.value;
                    else delete models[purpose];
                    changeVariant(variant.id, { models });
                  }}
                >
                  <option value="">Use saved origin setting (current: {model})</option>
                  {(workspace.modelChoices[purpose] ?? []).map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="cl-field">
              Native field factor
              <select
                aria-label="Native field factor"
                value={variant.factorGroup}
                onChange={(event) => changeVariant(variant.id, { factorGroup: event.target.value })}
              >
                <option value="">Keep saved origin values</option>
                {[...factorGroups].map(([id, group]) => (
                  <option key={id} value={id}>
                    {group[0]!.actorName} · {group.map((draft) => draft.field.label).join(', ')}
                  </option>
                ))}
              </select>
              <span className="cl-hint">
                Choose one explicit atomic field group. Other current drafts stay unchanged.
              </span>
            </label>
          </section>
        ))}
        <Button
          size="sm"
          disabled={variants.length >= COGNITION_LAB_MAX_COMPARISON_VARIANTS}
          onPress={() =>
            setVariants((previous) => [
              ...previous,
              {
                id: crypto.randomUUID(),
                name: `Variant ${previous.length + 1}`,
                effort: '',
                models: {},
                factorGroup: '',
              },
            ])
          }
        >
          Add variant
        </Button>
        <p className="cl-hint">
          {variants.length} of {COGNITION_LAB_MAX_COMPARISON_VARIANTS} variants in this serial
          batch.
        </p>
        <p className="cl-hint">
          Native source tokens and current privacy rules are rechecked. If an origin cannot
          reproduce the same permitted baseline, the comparison must report that mismatch.
        </p>
      </div>
    </LabModal>
  );
}
