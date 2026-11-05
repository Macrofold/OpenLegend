import { useEffect, useId, useState, type Dispatch, type SetStateAction } from 'react';
import { Toolbar } from 'react-aria-components';
import type {
  CognitionLabCategory,
  CognitionLabCurrent,
  CognitionLabCustomField,
  CognitionLabField,
  CognitionLabPage,
  CognitionLabSource,
  CognitionLabWorkspace,
} from '@open-legend/protocol';
import { Button, Icon, SelectField, TextTooltip } from '../design-system/components';
import { ActorPicker } from './actor-picker';
import { CapturedModelInput } from './captured-model-input';
import { currentScope, expected, labRead } from './api';
import {
  LabEmpty,
  LabError,
  LabIconButton,
  LabModal,
  LabNumberInput,
  LabPane,
  LabSearch,
  LabTabs,
  LabTextEditor,
} from './controls';
import { draftGroup, draftValue, type LabDraft, type LabExecute } from './types';
import { useLabRead } from './use-lab-read';

const categoryIcons: Record<CognitionLabCategory, string> = {
  overview: 'ui.inview',
  person: 'ui.character',
  body: 'ui.character',
  feelings: 'ui.cognition',
  relations: 'ui.speech',
  work: 'ui.crafting',
  possessions: 'ui.inventory',
  surroundings: 'ui.world',
  memories: 'ui.cognition',
  history: 'ui.journal',
  custom: 'ui.settings',
};
const categoryDescriptions: Partial<Record<CognitionLabCategory, string>> = {
  feelings: 'Active feelings, who or what they concern, and how long they last.',
  relations: 'Known characters and personal notes about them.',
  surroundings:
    'Scenario objects and positions. Models receive selected personal observations, not this scenario data. Inspect a recorded call for its exact input.',
  memories:
    'Stored experiences and their editing details. Models receive selected accounts with relevant source, time and participant information. Inspect a recorded call for its exact input.',
};
function customDefinitionId(field: CognitionLabField): string | undefined {
  const token = field.token;
  return field.owner === 'custom' &&
    token &&
    typeof token === 'object' &&
    !Array.isArray(token) &&
    typeof token['fieldId'] === 'string'
    ? token['fieldId']
    : undefined;
}

export function CurrentEditor({
  workspace,
  actorId,
  inspect,
  drafts,
  setDrafts,
  applyGroup,
  reviewDrafts,
  execute,
  busy,
  refresh,
}: {
  workspace: CognitionLabWorkspace;
  actorId?: string;
  inspect(actorId: string | undefined): void;
  drafts: LabDraft[];
  setDrafts: Dispatch<SetStateAction<LabDraft[]>>;
  applyGroup(group: string): Promise<boolean>;
  reviewDrafts(): void;
  execute: LabExecute;
  busy: boolean;
  refresh: number;
}) {
  const scope = currentScope(workspace);
  const readScope = JSON.stringify([scope, workspace.disclosureRevision]);
  const [category, setCategory] = useState<CognitionLabCategory>('overview');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState<{ owner: string; cursor: string }>();
  const [editing, setEditing] = useState<{ field: CognitionLabField; scope: string }>();
  const [source, setSource] = useState<{ id: string; scope: string }>();
  const [custom, setCustom] = useState(false);
  const [creating, setCreating] = useState<{ scope: string; fieldId?: string }>();
  const [actorName, setActorName] = useState<{ id: string; name: string }>();
  const [pins, setPins] = useState<Record<string, string[]>>({});
  const pinScope = JSON.stringify([scope, actorId]);
  const pinned = pins[pinScope] ?? [];
  const fieldIds = category === 'overview' && pinned.length ? JSON.stringify(pinned) : undefined;
  const pageOwner = JSON.stringify([readScope, actorId, category, query, fieldIds]);
  const cursor = page?.owner === pageOwner ? page.cursor : undefined;
  const setCursor = (cursor: string | undefined) =>
    setPage(cursor ? { owner: pageOwner, cursor } : undefined);
  const key = actorId
    ? JSON.stringify([readScope, actorId, category, query, cursor, fieldIds])
    : undefined;
  const current = useLabRead(
    key,
    (signal) =>
      labRead<CognitionLabCurrent>(
        `/current/${encodeURIComponent(actorId ?? '')}`,
        { category, query, cursor, fieldIds, limit: 50 },
        signal,
      ),
    refresh,
    query ? 150 : 0,
  );
  const fields = current.value?.fields;
  const activeCategory = workspace.categories.find((item) => item.id === category);
  const actorDrafts = drafts.filter((draft) => draft.scope === scope && draft.actorId === actorId);
  const visibleFields = [
    ...(fields?.items ?? []),
    ...actorDrafts
      .filter(
        (draft) =>
          draft.field.initialValue !== undefined &&
          draft.field.category === category &&
          !fields?.items.some((field) => field.id === draft.field.id) &&
          (!query || draft.field.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())),
      )
      .map((draft) => draft.field),
  ];
  const groups = [...new Set(actorDrafts.map(draftGroup))];
  const elsewhere = drafts.filter(
    (draft) => draft.scope === scope && draft.actorId !== actorId,
  ).length;
  const fieldDraft = (field: CognitionLabField) =>
    actorDrafts.find((draft) => draft.field.id === field.id);
  const stage = (field: CognitionLabField, value: string | boolean, hold?: boolean) => {
    if (!actorId) return;
    const id = JSON.stringify([scope, actorId, field.id]);
    setDrafts((previous) => {
      const old = previous.find((draft) => draft.id === id);
      const original = old?.field ?? field;
      if (value === draftValue(original) && (hold ?? old?.hold ?? field.held) === field.held)
        return previous.filter((draft) => draft.id !== id);
      const draft: LabDraft = {
        id,
        scope,
        actorId,
        actorName: actorName?.id === actorId ? actorName.name : actorId,
        field: original,
        value,
        hold: hold ?? old?.hold ?? field.held,
      };
      return [...previous.filter((item) => item.id !== id), draft];
    });
  };
  const renderField = (field: CognitionLabField) => (
    <FieldEditor
      key={JSON.stringify([scope, actorId, field.id])}
      field={field}
      draft={fieldDraft(field)}
      disabled={!!current.error}
      scope={readScope}
      actorId={actorId ?? ''}
      stage={(value, hold) => stage(field, value, hold)}
      edit={() => setEditing({ field, scope: readScope })}
      detail={() => field.detail && setSource({ id: field.detail.id, scope: readScope })}
      pinned={pinned.includes(field.id)}
      pinDisabled={!pinned.includes(field.id) && pinned.length >= 100}
      pin={() =>
        setPins((previous) => ({
          ...previous,
          [pinScope]: pinned.includes(field.id)
            ? pinned.filter((id) => id !== field.id)
            : pinned.length < 100
              ? [...pinned, field.id]
              : pinned,
        }))
      }
      category={
        category === 'overview' && field.category && field.category !== 'overview'
          ? () => {
              setCategory(field.category!);
              setQuery('');
              setCursor(undefined);
            }
          : undefined
      }
      reset={() =>
        setDrafts((previous) =>
          previous.filter(
            (draft) =>
              !(draft.scope === scope && draft.actorId === actorId && draft.field.id === field.id),
          ),
        )
      }
      remove={
        field.meaning === 'modelOnly' && customDefinitionId(field)
          ? () =>
              void execute({
                kind: 'removeCustomField',
                fieldId: customDefinitionId(field)!,
                expected: expected(workspace),
              })
          : undefined
      }
    />
  );
  return (
    <>
      <LabPane
        title="Current character"
        description={categoryDescriptions[category] ?? 'Current applied state and drafts'}
        navigation={
          <>
            <div className="cl-actor-row">
              <ActorPicker
                revision={workspace.scenarioRevision}
                label="Inspect person"
                scope={readScope}
                value={actorId}
                onChange={(id) => {
                  setCursor(undefined);
                  inspect(id);
                }}
                onActor={setActorName}
              />
              <span className="cl-badge">Current</span>
            </div>
            <Toolbar aria-label="Character categories" className="cl-tabs cl-category-nav">
              {workspace.categories.map((item) => (
                <TextTooltip key={item.id} text={item.reason ?? item.label}>
                  <Button
                    size="sm"
                    variant="quiet"
                    aria-label={item.label}
                    aria-pressed={category === item.id}
                    onPress={() => {
                      setCategory(item.id);
                      setQuery('');
                      setCursor(undefined);
                    }}
                  >
                    <Icon name={categoryIcons[item.id]} size={16} />
                  </Button>
                </TextTooltip>
              ))}
            </Toolbar>
          </>
        }
        toolbar={
          <>
            <strong>{activeCategory?.label ?? 'Overview'}</strong>
            <LabSearch
              label={`Search ${activeCategory?.label.toLocaleLowerCase() ?? 'fields'}`}
              value={query}
              onChange={(value) => {
                setQuery(value);
                setCursor(undefined);
              }}
            />
            {category === 'custom' && (
              <LabIconButton
                icon="ui.plus"
                label="Add model-only field"
                onPress={() => setCustom(true)}
              />
            )}
            {!!current.value?.create?.length && (
              <LabIconButton
                icon="ui.plus"
                label={
                  current.value.create.length === 1
                    ? current.value.create[0]!.label
                    : 'Add supported field or record'
                }
                onPress={() => {
                  const fields = current.value?.create ?? [];
                  if (fields.length === 1) setEditing({ field: fields[0]!, scope: readScope });
                  else setCreating({ scope: readScope });
                }}
              />
            )}
          </>
        }
        footer={
          <div className="cl-editor-footer">
            <div className="cl-inline">
              {actorDrafts.length ? (
                <>
                  <strong>
                    {actorDrafts.length} draft {actorDrafts.length === 1 ? 'field' : 'fields'}
                  </strong>
                  {groups.map((group) => {
                    const members = actorDrafts.filter((draft) => draftGroup(draft) === group);
                    const first = members[0]?.field;
                    const owner = first?.applyGroup
                      ? members.length === 1
                        ? first.label
                        : `${first.owner} edits`
                      : (first?.owner ?? 'fields');
                    return (
                      <Button
                        key={group}
                        size="sm"
                        busy={busy}
                        onPress={() => void applyGroup(group)}
                      >
                        Apply {owner} ({members.length})
                      </Button>
                    );
                  })}
                  <Button
                    size="sm"
                    variant="quiet"
                    disabled={busy}
                    onPress={() =>
                      setDrafts((previous) =>
                        previous.filter((draft) => !actorDrafts.includes(draft)),
                      )
                    }
                  >
                    Discard
                  </Button>
                </>
              ) : (
                <span className="cl-muted">Applied values · no changes here</span>
              )}
              {!!elsewhere && (
                <Button size="sm" variant="quiet" onPress={reviewDrafts}>
                  {elsewhere} drafts elsewhere
                </Button>
              )}
            </div>
          </div>
        }
        pending={current.pending}
      >
        <LabError message={current.error} />
        {actorId && (
          <CapturedModelInput
            workspace={workspace}
            actorId={actorId}
            scope={readScope}
            refresh={refresh}
          />
        )}
        {!actorId ? (
          <LabEmpty title="Choose a person to inspect." />
        ) : activeCategory && !activeCategory.available ? (
          <LabEmpty
            title={activeCategory.reason ?? 'This category is not installed in this world.'}
          />
        ) : visibleFields.length ? (
          <div className="cl-stack">
            {visibleFields.filter((field) => !field.advanced).map(renderField)}
            {visibleFields.some((field) => field.advanced) && (
              <details
                className="cl-section"
                key={JSON.stringify([readScope, actorId, category, !!query])}
                open={!!query || undefined}
              >
                <summary>
                  Advanced native fields · {visibleFields.filter((field) => field.advanced).length}
                </summary>
                <div className="cl-stack">
                  {visibleFields.filter((field) => field.advanced).map(renderField)}
                </div>
              </details>
            )}
          </div>
        ) : !current.pending && !current.error ? (
          <LabEmpty title={query ? 'No matching fields.' : 'No fields in this category.'} />
        ) : null}
        {actorId && (cursor || fields?.nextCursor || visibleFields.length > 0) && (
          <div className="cl-inline">
            {cursor && (
              <Button size="sm" onPress={() => setCursor(undefined)}>
                First page
              </Button>
            )}
            {fields?.nextCursor && (
              <Button size="sm" onPress={() => setCursor(fields.nextCursor)}>
                More fields
              </Button>
            )}
            <span className="cl-hint">
              {fields?.total !== undefined
                ? `${fields.total} matching fields`
                : `${fields?.items.length ?? 0} applied fields on this page`}
            </span>
          </div>
        )}
      </LabPane>
      {editing && editing.scope === readScope && (
        <FieldModal
          key={JSON.stringify([readScope, editing.field.id])}
          field={editing.field}
          actorId={actorId ?? ''}
          draft={fieldDraft(editing.field)}
          scope={JSON.stringify([scope, workspace.disclosureRevision])}
          close={() => setEditing(undefined)}
          save={(value, original) => {
            stage(original ?? editing.field, value);
            setEditing(undefined);
          }}
        />
      )}
      {creating?.scope === readScope && (
        <LabModal
          title="Add supported field or record"
          close={() => setCreating(undefined)}
          footer={
            <>
              <Button size="sm" onPress={() => setCreating(undefined)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!creating.fieldId}
                onPress={() => {
                  const field = current.value?.create?.find(
                    (field) => field.id === creating.fieldId,
                  );
                  if (field) {
                    setEditing({ field, scope: readScope });
                    setCreating(undefined);
                  }
                }}
              >
                Edit selected record
              </Button>
            </>
          }
        >
          <SelectField
            label="Native field or record"
            value={creating.fieldId}
            options={(current.value?.create ?? []).map((field) => ({
              id: field.id,
              label: field.label,
              description: field.description,
            }))}
            onChange={(fieldId) => setCreating({ scope: readScope, fieldId })}
            placement="bottom start"
          />
          <p className="cl-hint">
            Only the selected native owner can create this record. It remains a draft until its
            named Apply group succeeds.
          </p>
        </LabModal>
      )}
      {source && source.scope === readScope && (
        <SourceModal
          key={JSON.stringify([readScope, source.id])}
          sourceId={source.id}
          scope={readScope}
          close={() => setSource(undefined)}
        />
      )}
      {custom && actorId && (
        <CustomFieldModal
          key={JSON.stringify([scope, actorId])}
          actorId={actorId}
          workspace={workspace}
          execute={execute}
          busy={busy}
          close={() => setCustom(false)}
        />
      )}
    </>
  );
}

function FieldEditor({
  field,
  draft,
  disabled,
  scope,
  actorId,
  stage,
  edit,
  detail,
  remove,
  pinned,
  pinDisabled,
  pin,
  category,
  reset,
}: {
  field: CognitionLabField;
  draft?: LabDraft;
  disabled: boolean;
  scope: string;
  actorId: string;
  stage(value: string | boolean, hold?: boolean): void;
  edit(): void;
  detail(): void;
  remove?: () => void;
  pinned: boolean;
  pinDisabled: boolean;
  pin(): void;
  category?(): void;
  reset(): void;
}) {
  const id = useId();
  const value = draft?.value ?? draftValue(field);
  const writable = field.editable && !!field.owner && !disabled;
  const numeric = field.datatype === 'number' || field.datatype === 'meter';
  const expanded = field.multiline || field.datatype === 'json' || String(value).length > 160;
  const appliedPreview = field.preview ?? (field.value === null ? 'Unknown' : String(value));
  const [sliderPreview, setSliderPreview] = useState<string>();
  return (
    <section className="cl-section cl-field" data-draft={!!draft || undefined}>
      <div className="cl-inline">
        <label className="cl-field-label" htmlFor={id}>
          {field.label}
        </label>
        {field.unit && <span className="cl-hint">{field.unit}</span>}
        {draft && <span className="cl-badge">Draft</span>}
        <span className="cl-spacer" />
        <LabIconButton
          icon="ui.star"
          label={`${pinned ? 'Unpin' : 'Pin'} ${field.label} ${pinned ? 'from' : 'in'} Overview`}
          pressed={pinned}
          disabled={pinDisabled}
          onPress={pin}
        />
        {category && (
          <Button size="sm" variant="quiet" onPress={category}>
            Details
          </Button>
        )}
        <span className="cl-badge">
          {field.meaning === 'modelOnly' ? 'Model input only' : field.meaning}
        </span>
        {field.detail && (
          <LabIconButton icon="ui.search" label={`Read ${field.label}`} onPress={detail} />
        )}
        {remove && (
          <LabIconButton icon="ui.close" label={`Remove ${field.label}`} onPress={remove} />
        )}
      </div>
      {field.description && <div className="cl-hint">{field.description}</div>}
      {pinDisabled && (
        <div className="cl-hint">Overview has 100 pins. Unpin a field before adding another.</div>
      )}
      {draft && (
        <div className="cl-hint">
          Applied:{' '}
          {field.preview ??
            (field.value === null
              ? field.initialValue === undefined
                ? 'Unknown'
                : 'Not created'
              : String(draftValue(field)).slice(0, 160))}
        </div>
      )}
      {!writable ? (
        <>
          <p id={id} className="cl-field-value">
            {expanded && appliedPreview.length > 180
              ? `${appliedPreview.slice(0, 180)}…`
              : appliedPreview}
          </p>
          {field.unavailableReason && <p className="cl-hint">{field.unavailableReason}</p>}
          {(expanded || field.datatype === 'json') && (
            <Button size="sm" variant="quiet" onPress={field.detail ? detail : edit}>
              Read full value
            </Button>
          )}
        </>
      ) : field.datatype === 'boolean' ? (
        <label className="cl-inline">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(event) => stage(event.target.checked)}
          />
          {field.label}
        </label>
      ) : numeric ? (
        <div className="cl-meter-input">
          {field.minimum !== undefined && field.maximum !== undefined ? (
            <input
              type="range"
              aria-label={`${field.label} slider`}
              min={field.minimum}
              max={field.maximum}
              step="any"
              value={
                sliderPreview ??
                (String(value).trim() && Number.isFinite(Number(value))
                  ? Number(value)
                  : field.minimum)
              }
              onChange={(event) => setSliderPreview(event.target.value)}
              onPointerUp={(event) => {
                stage(event.currentTarget.value);
                setSliderPreview(undefined);
              }}
              onPointerCancel={() => setSliderPreview(undefined)}
              onKeyUp={(event) => {
                if (
                  [
                    'ArrowLeft',
                    'ArrowRight',
                    'ArrowUp',
                    'ArrowDown',
                    'Home',
                    'End',
                    'PageUp',
                    'PageDown',
                  ].includes(event.key)
                ) {
                  stage(event.currentTarget.value);
                  setSliderPreview(undefined);
                }
              }}
              onBlur={(event) => {
                if (sliderPreview !== undefined) {
                  stage(event.currentTarget.value);
                  setSliderPreview(undefined);
                }
              }}
            />
          ) : (
            <span className="cl-hint">Exact value</span>
          )}
          <LabNumberInput
            id={id}
            label={field.label}
            value={sliderPreview ?? String(value)}
            minimum={field.minimum}
            maximum={field.maximum}
            onChange={(next) => {
              setSliderPreview(undefined);
              stage(next);
            }}
          />
          {field.minimum !== undefined && field.maximum !== undefined && (
            <span className="cl-hint">
              {field.minimum}–{field.maximum}
              {field.unit ? ` ${field.unit}` : ''}
            </span>
          )}
          <Button size="sm" variant="quiet" disabled={!draft} onPress={reset}>
            Reset draft
          </Button>
          {draft && (!String(value).trim() || !Number.isFinite(Number(value))) && (
            <span className="cl-hint">Complete this number before applying.</span>
          )}
        </div>
      ) : field.datatype === 'choice' || field.datatype === 'reference' ? (
        <FieldChoice
          field={field}
          actorId={actorId}
          scope={scope}
          value={String(value)}
          onChange={stage}
        />
      ) : expanded ? (
        <>
          <p className="cl-field-value">
            {field.preview ??
              `${String(value).slice(0, 180)}${String(value).length > 180 ? '…' : ''}`}
          </p>
          <Button size="sm" variant="quiet" onPress={edit}>
            Edit full {field.datatype === 'json' ? 'structured value' : 'text'}
          </Button>
        </>
      ) : (
        <input id={id} value={String(value)} onChange={(event) => stage(event.target.value)} />
      )}
      {field.holdable && writable && (
        <label className="cl-inline cl-hint">
          <input
            type="checkbox"
            checked={draft?.hold ?? field.held ?? false}
            onChange={(event) => stage(value, event.target.checked)}
          />
          Hold during this experiment
        </label>
      )}
      {!field.holdable && field.holdUnavailableReason && (
        <p className="cl-hint">Hold unavailable: {field.holdUnavailableReason}</p>
      )}
    </section>
  );
}

function FieldChoice({
  field,
  scope,
  actorId,
  value,
  onChange,
}: {
  field: CognitionLabField;
  scope: string;
  actorId: string;
  value: string;
  onChange(value: string): void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string>();
  const [selected, setSelected] = useState<{ scope: string; id: string; label: string }>();
  const choiceScope = JSON.stringify([scope, actorId, field.id]);
  const choices = useLabRead(
    open && field.choiceSource ? JSON.stringify([choiceScope, query]) : undefined,
    (signal) =>
      labRead<CognitionLabPage<{ id: string; label: string }>>(
        `/current/${encodeURIComponent(actorId)}/choices/${encodeURIComponent(field.id)}`,
        { query, limit: 100 },
        signal,
      ),
    0,
    query ? 150 : 0,
  );
  if (
    field.datatype === 'choice' &&
    !field.choiceSource &&
    field.options &&
    field.options.length <= 5
  )
    return (
      <LabTabs label={field.label} options={field.options} value={value} onChange={onChange} />
    );
  const options = choices.value?.items ?? field.options ?? [];
  const selectedLabel =
    options.find((item) => item.id === value)?.label ??
    (selected?.scope === choiceScope && selected.id === value ? selected.label : undefined) ??
    field.preview ??
    value;
  return (
    <SelectField
      label={field.label}
      value={value}
      options={
        value && !options.some((item) => item.id === value)
          ? [{ id: value, label: selectedLabel }, ...options]
          : options
      }
      onChange={(value) => {
        const choice = options.find((item) => item.id === value);
        if (choice) setSelected({ scope: choiceScope, id: value, label: choice.label });
        onChange(value);
        setQuery(undefined);
      }}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) setQuery(undefined);
      }}
      loading={choices.pending}
      {...(field.choiceSource
        ? {
            inputValue: query ?? selectedLabel,
            onInputChange: setQuery,
          }
        : {})}
      placement="bottom start"
    />
  );
}

export function FieldModal({
  field,
  actorId,
  draft,
  scope,
  save,
  close,
}: {
  field: CognitionLabField;
  actorId: string;
  draft?: LabDraft;
  scope: string;
  save(value: string | boolean, original?: CognitionLabField): void;
  close(): void;
}) {
  const [value, setValue] = useState(() =>
    String(
      draft?.value ??
        draftValue(
          field.initialValue === undefined ? field : { ...field, value: field.initialValue },
        ),
    ),
  );
  const needsSource = field.datatype === 'json' && !!field.detail && field.editable;
  const source = useLabRead(
    needsSource ? JSON.stringify([scope, field.detail?.id]) : undefined,
    (signal) =>
      labRead<CognitionLabSource>(
        `/sources/${encodeURIComponent(field.detail?.id ?? '')}`,
        undefined,
        signal,
      ),
  );
  const content = source.value?.content;
  const record =
    content && typeof content === 'object' && !Array.isArray(content) ? content : undefined;
  const nativeField =
    record &&
    'entry' in record &&
    record.hash !== undefined &&
    record.entryId !== undefined &&
    record.generation !== undefined
      ? ({
          ...field,
          value: record.entry ?? null,
          token: { hash: record.hash, entryId: record.entryId, generation: record.generation },
        } satisfies CognitionLabField)
      : undefined;
  useEffect(() => {
    if (!draft && nativeField) setValue(JSON.stringify(nativeField.value, null, 2));
  }, [source.value]);
  const ready = !needsSource || !!nativeField;
  return (
    <LabModal
      title={field.label}
      close={close}
      wide={field.datatype === 'json' || field.datatype === 'text'}
      editor={field.datatype === 'json' || field.datatype === 'text'}
      pending={source.pending}
      footer={
        <>
          <Button size="sm" onPress={close}>
            Cancel
          </Button>
          {field.editable && (
            <Button
              size="sm"
              variant="primary"
              disabled={!ready || !!source.error}
              onPress={() =>
                save(
                  field.datatype === 'boolean' ? value === 'true' : value,
                  draft?.field ?? nativeField,
                )
              }
            >
              Stage edit
            </Button>
          )}
        </>
      }
    >
      <div className="cl-field">
        <LabError message={source.error} />
        <span className="cl-hint">
          {field.meaning === 'modelOnly' ? 'Model input only' : (field.description ?? field.label)}
        </span>
        {field.datatype === 'json' && field.options ? (
          <StringArrayChoices
            field={field}
            value={value}
            change={setValue}
            disabled={!field.editable}
          />
        ) : field.datatype === 'reference' || field.datatype === 'choice' ? (
          <FieldChoice
            field={field}
            scope={scope}
            actorId={actorId}
            value={value}
            onChange={setValue}
          />
        ) : field.datatype === 'number' || field.datatype === 'meter' ? (
          <LabNumberInput
            label={field.label}
            value={value}
            minimum={field.minimum}
            maximum={field.maximum}
            onChange={setValue}
          />
        ) : field.datatype === 'boolean' ? (
          <label className="cl-inline">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(event) => setValue(String(event.target.checked))}
            />
            {field.label}
          </label>
        ) : (
          <LabTextEditor
            label={field.label}
            value={ready ? value : ''}
            readOnly={!field.editable || !ready}
            onChange={setValue}
            autoFocus
          />
        )}
        {field.datatype === 'json' && (
          <span className="cl-hint">
            This edits only the supported {field.label} field. Native validation runs on Apply.
          </span>
        )}
      </div>
    </LabModal>
  );
}

function StringArrayChoices({
  field,
  value,
  change,
  disabled,
}: {
  field: CognitionLabField;
  value: string;
  change(value: string): void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState('');
  let selected: string[] = [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) selected = parsed;
  } catch {
    /* Keep an incomplete original draft visible in the exact editor below. */
  }
  return (
    <div className="cl-stack">
      <SelectField
        label={`Add ${field.label.toLocaleLowerCase()}`}
        value=""
        options={(field.options ?? []).filter(
          (option) =>
            !selected.includes(option.id) &&
            option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
        )}
        inputValue={query}
        onInputChange={setQuery}
        onChange={(id) => {
          if (id) change(JSON.stringify([...new Set([...selected, id])], null, 2));
          setQuery('');
        }}
        disabled={disabled}
        placement="bottom start"
      />
      <div className="cl-inline">
        {selected.map((id) => (
          <Button
            key={id}
            size="sm"
            variant="quiet"
            disabled={disabled}
            onPress={() =>
              change(
                JSON.stringify(
                  selected.filter((other) => other !== id),
                  null,
                  2,
                ),
              )
            }
          >
            Remove {field.options?.find((option) => option.id === id)?.label ?? id}
          </Button>
        ))}
      </div>
      <details>
        <summary>Exact selected identities</summary>
        <LabTextEditor label={field.label} value={value} onChange={change} readOnly={disabled} />
      </details>
    </div>
  );
}

export function SourceModal({
  sourceId,
  scope,
  close,
}: {
  sourceId: string;
  scope: string;
  close(): void;
}) {
  const source = useLabRead(JSON.stringify([scope, sourceId]), (signal) =>
    labRead<CognitionLabSource>(`/sources/${encodeURIComponent(sourceId)}`, undefined, signal),
  );
  return (
    <LabModal
      title={source.value?.label ?? 'Source content'}
      close={close}
      wide
      editor
      pending={source.pending}
      footer={
        <>
          <Button size="sm" onPress={close}>
            Close
          </Button>
        </>
      }
    >
      <LabError message={source.error} />
      {source.value && (
        <>
          <p className="cl-hint">
            {source.value.scope === 'current' ? 'Current source' : 'Captured source'}
            {source.value.actorId ? ` · ${source.value.actorId}` : ''}
          </p>
          <LabTextEditor
            label={source.value.label}
            value={
              typeof source.value.content === 'string'
                ? source.value.content
                : JSON.stringify(source.value.content, null, 2)
            }
            readOnly
          />
        </>
      )}
    </LabModal>
  );
}

function CustomFieldModal({
  actorId,
  workspace,
  execute,
  busy,
  close,
}: {
  actorId: string;
  workspace: CognitionLabWorkspace;
  execute: LabExecute;
  busy: boolean;
  close(): void;
}) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [datatype, setDatatype] = useState<CognitionLabCustomField['datatype']>('text');
  const [value, setValue] = useState('');
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const [unit, setUnit] = useState('');
  const [kind, setKind] = useState<CognitionLabCustomField['subject']['kind']>('person');
  const [target, setTarget] = useState<string>();
  const [objectId, setObjectId] = useState('');
  const [recipients, setRecipients] = useState([actorId]);
  const [error, setError] = useState('');
  const scope = currentScope(workspace);
  const save = async () => {
    if (!label.trim() || !recipients.length)
      return setError('Name this field and choose at least one person who receives it.');
    if (kind === 'relation' && !target)
      return setError('Choose the other person in this directed relationship.');
    if (kind === 'object' && !objectId.trim())
      return setError('Enter the exact object identifier from the current scenario.');
    const parsed =
      datatype === 'boolean'
        ? value === 'true'
        : datatype === 'number' || datatype === 'meter'
          ? Number(value)
          : value;
    if (
      (datatype === 'number' || datatype === 'meter') &&
      (!value.trim() || !Number.isFinite(parsed))
    )
      return setError('Enter a finite number.');
    if (
      datatype === 'meter' &&
      ((minimum.trim() && !Number.isFinite(Number(minimum))) ||
        (maximum.trim() && !Number.isFinite(Number(maximum))))
    )
      return setError('Meter display bounds need finite numbers or an empty field.');
    if (
      datatype === 'meter' &&
      minimum.trim() &&
      maximum.trim() &&
      Number(minimum) > Number(maximum)
    )
      return setError('The meter minimum must not exceed its maximum.');
    const subject: CognitionLabCustomField['subject'] =
      kind === 'person'
        ? { kind, actorId }
        : kind === 'relation'
          ? { kind, fromActorId: actorId, toActorId: target ?? '' }
          : kind === 'object'
            ? { kind, objectId }
            : { kind };
    const result = await execute({
      kind: 'setCustomField',
      expected: expected(workspace),
      field: {
        id: crypto.randomUUID(),
        label: label.trim(),
        description,
        datatype,
        value: parsed,
        subject,
        enabled: true,
        recipientActorIds: recipients,
        placement: 'experimentalContext',
        ...(datatype === 'meter'
          ? {
              ...(minimum.trim() ? { minimum: Number(minimum) } : {}),
              ...(maximum.trim() ? { maximum: Number(maximum) } : {}),
              ...(unit.trim() ? { unit } : {}),
            }
          : {}),
      },
    });
    if (result?.ok) close();
    else if (result) setError(result.message);
  };
  return (
    <LabModal
      title="Add model-only field"
      close={close}
      pending={busy}
      footer={
        <>
          <Button size="sm" onPress={close}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" busy={busy} onPress={() => void save()}>
            Add field
          </Button>
        </>
      }
    >
      <div className="cl-stack">
        <p>
          This information enters only the chosen people's supported model inputs. It grants no
          physical ability, memory, possession or emotional mechanic.
        </p>
        <LabError message={error} />
        <label className="cl-field">
          Name
          <input value={label} onChange={(event) => setLabel(event.target.value)} autoFocus />
        </label>
        <label className="cl-field">
          Meaning and source
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="For example: private belief, observed description, or story premise"
          />
        </label>
        <label className="cl-field">
          Value type
          <select
            value={datatype}
            onChange={(event) =>
              setDatatype(event.target.value as CognitionLabCustomField['datatype'])
            }
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">On/off</option>
            <option value="meter">Meter</option>
          </select>
        </label>
        {datatype === 'boolean' ? (
          <label className="cl-inline">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(event) => setValue(String(event.target.checked))}
            />
            Enabled value
          </label>
        ) : (
          <label className="cl-field">
            Value
            <textarea value={value} onChange={(event) => setValue(event.target.value)} />
          </label>
        )}
        {datatype === 'meter' && (
          <div className="cl-comparison-grid">
            <label className="cl-field">
              Display minimum (optional)
              <input
                type="number"
                step="any"
                value={minimum}
                onChange={(event) => setMinimum(event.target.value)}
              />
            </label>
            <label className="cl-field">
              Display maximum (optional)
              <input
                type="number"
                step="any"
                value={maximum}
                onChange={(event) => setMaximum(event.target.value)}
              />
            </label>
            <label className="cl-field">
              Unit (optional)
              <input value={unit} onChange={(event) => setUnit(event.target.value)} />
            </label>
          </div>
        )}
        <label className="cl-field">
          Subject
          <select
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as typeof kind);
              if (event.target.value === 'scene' || event.target.value === 'object')
                setRecipients([]);
              else setRecipients([actorId]);
            }}
          >
            <option value="person">This person</option>
            <option value="relation">From this person toward someone</option>
            <option value="object">A particular object</option>
            <option value="scene">The scene</option>
          </select>
        </label>
        {kind === 'relation' && (
          <ActorPicker label="Toward person" scope={scope} value={target} onChange={setTarget} />
        )}
        {kind === 'object' && (
          <label className="cl-field">
            Exact object identifier
            <input value={objectId} onChange={(event) => setObjectId(event.target.value)} />
          </label>
        )}
        <div className="cl-field">
          <span className="cl-field-label">Recipients</span>
          <ActorPicker
            revision={workspace.scenarioRevision}
            label="Add recipient"
            scope={scope}
            onChange={(id) => id && setRecipients((previous) => [...new Set([...previous, id])])}
          />
          <div className="cl-inline">
            {recipients.map((id) => (
              <Button
                key={id}
                size="sm"
                variant="quiet"
                onPress={() =>
                  setRecipients((previous) => previous.filter((other) => other !== id))
                }
              >
                {id} ×
              </Button>
            ))}
          </div>
        </div>
      </div>
    </LabModal>
  );
}
