import { useEffect, useRef, useState } from 'react';
import type {
  WorldAgentExactDraftView,
  WorldAgentDraftPreviewView,
  WorldAgentWorkResult,
  WorldAgentRecipeEditorView,
} from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { post } from '../api';
import { readLocal, writeLocal } from './storage';
import { WorldAgentPreparationDetails } from './world-agent-work-details';

type LocalEdit = {
  fields: Record<string, string>;
  intent: string;
  operation?: { body: string; id: string };
};
type EditorField = WorldAgentRecipeEditorView['fields'][number];
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';
function localEdit(value: unknown): value is LocalEdit {
  return (
    record(value) &&
    record(value.fields) &&
    Object.values(value.fields).every((field) => typeof field === 'string') &&
    typeof value.intent === 'string' &&
    (value.operation === undefined ||
      (record(value.operation) &&
        typeof value.operation.body === 'string' &&
        typeof value.operation.id === 'string'))
  );
}
function valueAt(candidate: unknown, path: string[]): unknown {
  let value = candidate;
  for (const part of path) {
    if (!record(value) || !Object.hasOwn(value, part)) return undefined;
    value = value[part];
  }
  return value;
}
function fieldKey(field: EditorField) {
  return JSON.stringify(field.path);
}
function initialEdit(draft: WorldAgentExactDraftView): LocalEdit {
  return {
    intent: draft.intent,
    fields: Object.fromEntries(
      (draft.recipeEditor?.fields ?? []).map((field) => {
        const value = valueAt(draft.payload, field.path);
        return [
          fieldKey(field),
          typeof value === 'string' || typeof value === 'number' ? String(value) : '',
        ];
      }),
    ),
  };
}
function changedEdit(edit: LocalEdit, draft: WorldAgentExactDraftView): boolean {
  const original = initialEdit(draft);
  return (
    edit.intent !== original.intent ||
    (draft.recipeEditor?.fields ?? []).some(
      (field) => edit.fields[fieldKey(field)] !== original.fields[fieldKey(field)],
    )
  );
}
export function hasRetainedRecipeEdit(draft: WorldAgentExactDraftView, key: string): boolean {
  const retained = readLocal<LocalEdit | null>(key, null, localEdit);
  return !!retained && changedEdit(retained, draft);
}
function replaceAt(candidate: unknown, path: string[], value: string | number): boolean {
  if (!path.length) return false;
  let target = candidate;
  for (const part of path.slice(0, -1)) {
    if (
      !record(target) ||
      !Object.hasOwn(target, part) ||
      ['__proto__', 'constructor', 'prototype'].includes(part)
    )
      return false;
    target = target[part];
  }
  const last = path.at(-1);
  if (
    !last ||
    !record(target) ||
    !Object.hasOwn(target, last) ||
    ['__proto__', 'constructor', 'prototype'].includes(last)
  )
    return false;
  target[last] = value;
  return true;
}
function parse(field: EditorField, text: string): { value: string | number } | { error: string } {
  if (field.kind !== 'number') return { value: text };
  const trimmed = text.trim();
  if (
    !trimmed ||
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed) ||
    !Number.isFinite(Number(trimmed))
  )
    return { error: `Enter a complete number for ${field.label}.` };
  const value = Number(trimmed);
  if (field.minimum !== undefined && value < field.minimum)
    return {
      error: `${field.label} must be at least ${field.minimum}${field.unit ? ` ${field.unit}` : ''}.`,
    };
  if (field.maximum !== undefined && value > field.maximum)
    return {
      error: `${field.label} must be at most ${field.maximum}${field.unit ? ` ${field.unit}` : ''}.`,
    };
  return { value };
}

/** Field schema and derived facts come from the installed family, never client formulas. */
export function WorldAgentRecipeEditor({
  draft,
  worldId,
  sessionId,
  accessScope,
  mutationReason,
  onDirty,
  onSaved,
  onRebased,
}: {
  draft: WorldAgentExactDraftView;
  worldId: string;
  sessionId: string;
  accessScope: string;
  mutationReason: string | null;
  onDirty(dirty: boolean): void;
  onSaved(draft: WorldAgentExactDraftView): void;
  onRebased(draft: WorldAgentExactDraftView): void;
}) {
  const key = `open-legend:authoring:${worldId}:${accessScope}:${sessionId}:${draft.id}:${draft.revision}:recipe-edit`;
  const initial = initialEdit(draft);
  const [edit, setEdit] = useState(() => readLocal(key, initial, localEdit));
  const [preview, setPreview] = useState<{ signature: string; data: WorldAgentDraftPreviewView }>();
  const [pending, setPending] = useState<'preview' | 'save' | 'latest' | null>(null);
  const [error, setError] = useState('');
  const [newer, setNewer] = useState<WorldAgentExactDraftView>();
  const base = draft;
  const savingReason =
    mutationReason ??
    (base.latestRevision > base.revision
      ? 'This draft has a newer revision. Inspect it and deliberately reapply your fields before saving.'
      : null);
  const working = useRef(false);
  const alive = useRef(true);
  const editRef = useRef(edit);
  editRef.current = edit;
  const metadata = base.recipeEditor;
  const fields = metadata?.fields ?? [];
  const baseInitial = initialEdit(base);
  const dirty = changedEdit(edit, base);
  const candidate = structuredClone(base.payload);
  const problems: { id: string; message: string }[] = [];
  for (const field of fields) {
    const parsed = parse(field, edit.fields[fieldKey(field)] ?? '');
    if ('error' in parsed) problems.push({ id: fieldKey(field), message: parsed.error });
    else if (!replaceAt(candidate, field.path, parsed.value))
      problems.push({
        id: fieldKey(field),
        message: `The installed field ${field.label} is unavailable in this candidate. Refresh its exact revision.`,
      });
  }
  const signature = JSON.stringify({ candidate, intent: edit.intent, revision: base.revision });
  const candidateIdentity = useRef(signature);
  candidateIdentity.current = signature;
  const previewCurrent = preview?.signature === signature;
  const facts = previewCurrent ? (preview.data.facts ?? []) : (metadata?.facts ?? []);
  useEffect(() => {
    onDirty(dirty);
    writeLocal(key, dirty ? edit : null);
  }, [dirty, edit, key]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      candidateIdentity.current = '';
    };
  }, []);
  function change(next: LocalEdit) {
    editRef.current = next;
    setEdit(next);
    setError('');
    setNewer(undefined);
  }
  async function perform(kind: 'preview' | 'save') {
    if (working.current || problems.length || !metadata || (kind === 'save' && savingReason))
      return;
    working.current = true;
    setPending(kind);
    setError('');
    const submittedSignature = signature;
    const body = {
      worldId,
      sessionId,
      draftId: base.id,
      expectedRevision: base.revision,
      candidate,
      ...(kind === 'save' && edit.intent !== base.intent ? { intent: edit.intent } : {}),
    };
    try {
      if (kind === 'preview') {
        const response = await post<WorldAgentWorkResult<WorldAgentDraftPreviewView>>(
          '/api/world-agent/session/draft-preview',
          body,
        );
        if (!alive.current || candidateIdentity.current !== submittedSignature) return;
        if (!response.ok || !response.data)
          throw new Error(response.message ?? 'Native preview unavailable.');
        if (response.data.revision !== base.revision)
          throw new Error(
            'The preview belongs to a different revision. Preview this candidate again.',
          );
        setPreview({ signature: submittedSignature, data: response.data });
      } else {
        const operationBody = JSON.stringify(body);
        const operationId =
          editRef.current.operation?.body === operationBody
            ? editRef.current.operation.id
            : crypto.randomUUID();
        const retained = {
          ...editRef.current,
          operation: { body: operationBody, id: operationId },
        };
        editRef.current = retained;
        setEdit(retained);
        writeLocal(key, retained);
        const response = await post<WorldAgentWorkResult<WorldAgentExactDraftView>>(
          '/api/world-agent/session/draft-save',
          { ...body, operationId },
        );
        if (!alive.current || candidateIdentity.current !== submittedSignature) return;
        if (!response.ok || !response.data) {
          if (response.status === 'stale') {
            const history = await post<WorldAgentWorkResult<{ latestRevision: number }>>(
              '/api/world-agent/session/draft-history',
              { worldId, sessionId, draftId: base.id },
            );
            if (!alive.current || candidateIdentity.current !== submittedSignature) return;
            if (history.ok && history.data) {
              const latest = await post<WorldAgentWorkResult<WorldAgentExactDraftView>>(
                '/api/world-agent/session/draft-read',
                { worldId, sessionId, draftId: base.id, revision: history.data.latestRevision },
              );
              if (
                alive.current &&
                candidateIdentity.current === submittedSignature &&
                latest.ok &&
                latest.data
              )
                setNewer(latest.data);
            }
          }
          throw new Error(
            response.message ?? 'This recipe edit was not saved. Your fields remain here.',
          );
        }
        writeLocal(key, null);
        onDirty(false);
        onSaved(response.data);
      }
    } catch (failure) {
      if (alive.current && candidateIdentity.current === submittedSignature)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Outcome could not be confirmed. Retry the same edit to recover its retained result.',
        );
    } finally {
      working.current = false;
      if (alive.current) setPending(null);
    }
  }
  async function inspectLatest() {
    if (working.current) return;
    working.current = true;
    setPending('latest');
    setError('');
    const submittedSignature = signature;
    try {
      const latest = await post<WorldAgentWorkResult<WorldAgentExactDraftView>>(
        '/api/world-agent/session/draft-read',
        { worldId, sessionId, draftId: base.id, revision: base.latestRevision },
      );
      if (!alive.current || candidateIdentity.current !== submittedSignature) return;
      if (!latest.ok || !latest.data)
        throw new Error(latest.message ?? 'The newer exact revision is unavailable.');
      setNewer(latest.data);
    } catch (failure) {
      if (alive.current && candidateIdentity.current === submittedSignature)
        setError(
          failure instanceof Error ? failure.message : 'The newer exact revision is unavailable.',
        );
    } finally {
      working.current = false;
      if (alive.current) setPending(null);
    }
  }
  const unmatchedFields = newer
    ? fields.filter(
        (field) =>
          edit.fields[fieldKey(field)] !== baseInitial.fields[fieldKey(field)] &&
          !newer.recipeEditor?.fields.some(
            (newField) => fieldKey(newField) === fieldKey(field) && newField.label === field.label,
          ),
      )
    : [];
  if (!metadata)
    return (
      <section className="ol-agent-recipe-editor">
        <h4>Recipe editing unavailable</h4>
        <p>
          The installed family has not supplied supported editable fields for this exact candidate.
          Conversation and exact inspection remain available.
        </p>
      </section>
    );
  return (
    <section className="ol-agent-recipe-editor" aria-label="Edit saved recipe">
      <h4>Edit recipe · based on revision {base.revision}</h4>
      <p className="ol-caption">
        Changes stay on this device until Save creates a new revision. Native preview and Save use
        no model call. Applying the recipe remains separate.
      </p>
      {fields.map((field, index) => {
        const id = `recipe-${base.id}-${index}`;
        const problem = problems.find((entry) => entry.id === fieldKey(field));
        const value = edit.fields[fieldKey(field)] ?? '';
        return (
          <label key={fieldKey(field)} htmlFor={id}>
            <span>
              {field.label}
              {field.unit && ` (${field.unit})`}
            </span>
            {field.kind === 'choice' ? (
              <select
                id={id}
                value={value}
                disabled={pending === 'save'}
                aria-describedby={problem ? `${id}-error` : undefined}
                onChange={(event) =>
                  change({
                    ...editRef.current,
                    fields: { ...editRef.current.fields, [fieldKey(field)]: event.target.value },
                  })
                }
              >
                {!field.choices?.some((choice) => choice.value === value) && (
                  <option value={value}>Current value: {value || 'Not selected'}</option>
                )}
                {field.choices?.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            ) : field.kind === 'text' ? (
              <textarea
                id={id}
                value={value}
                rows={2}
                disabled={pending === 'save'}
                onChange={(event) =>
                  change({
                    ...editRef.current,
                    fields: { ...editRef.current.fields, [fieldKey(field)]: event.target.value },
                  })
                }
              />
            ) : (
              <input
                id={id}
                type="text"
                inputMode="decimal"
                value={value}
                disabled={pending === 'save'}
                aria-invalid={!!problem}
                aria-describedby={problem ? `${id}-error` : undefined}
                onChange={(event) =>
                  change({
                    ...editRef.current,
                    fields: { ...editRef.current.fields, [fieldKey(field)]: event.target.value },
                  })
                }
              />
            )}
            {problem && (
              <span id={`${id}-error`} className="ol-caption">
                {problem.message}
              </span>
            )}
          </label>
        );
      })}
      <details>
        <summary>Edit the saved purpose</summary>
        <label>
          Purpose
          <textarea
            rows={3}
            value={edit.intent}
            disabled={pending === 'save'}
            onChange={(event) => change({ ...editRef.current, intent: event.target.value })}
          />
        </label>
      </details>
      <section aria-label="Native recipe preview">
        <h4>Derived output facts</h4>
        {dirty && !previewCurrent && (
          <p role="status">
            Out of date for these local changes. Preview changes to recompute these facts natively.
          </p>
        )}
        <dl className="ol-agent-recipe-facts">
          {facts.map((fact) => (
            <div key={fact.id}>
              <dt>{fact.label}</dt>
              <dd>
                {fact.value}
                {fact.unit && ` ${fact.unit}`}
              </dd>
            </div>
          ))}
        </dl>
        {previewCurrent && (
          <WorldAgentPreparationDetails
            preparation={preview.data.preparation}
            validation={preview.data.validation}
          />
        )}
      </section>
      {base.latestRevision > base.revision && !newer && (
        <Button size="sm" variant="quiet" disabled={!!pending} onPress={() => void inspectLatest()}>
          Inspect newer revision {base.latestRevision} without discarding my edit
        </Button>
      )}
      {newer && (
        <section aria-label="Newer saved revision">
          <h4>Newer revision {newer.revision}</h4>
          <p>{newer.summary}</p>
          <details>
            <summary>Inspect newer exact values</summary>
            <pre className="ol-agent-json">{JSON.stringify(newer.payload, null, 2)}</pre>
          </details>
          <p>
            Your attempted edit remains above. Reapply it deliberately to this newer revision; Save
            will validate again.
          </p>
          {!!unmatchedFields.length && (
            <p role="status">
              The newer revision changed these editable fields:{' '}
              {unmatchedFields.map((field) => field.label).join(', ')}. Your attempted values remain
              above; they cannot be copied into different fields automatically.
            </p>
          )}
          <Button
            size="sm"
            disabled={!!pending || unmatchedFields.length > 0 || !newer.recipeEditor}
            onPress={() => {
              const latestInitial = initialEdit(newer);
              const retainedFields = Object.fromEntries(
                (newer.recipeEditor?.fields ?? []).map((field) => [
                  fieldKey(field),
                  editRef.current.fields[fieldKey(field)] !== baseInitial.fields[fieldKey(field)]
                    ? (editRef.current.fields[fieldKey(field)] ?? '')
                    : (latestInitial.fields[fieldKey(field)] ?? ''),
                ]),
              );
              const reapplied = {
                fields: retainedFields,
                intent:
                  editRef.current.intent !== base.intent ? editRef.current.intent : newer.intent,
              };
              const nextKey = `open-legend:authoring:${worldId}:${accessScope}:${sessionId}:${newer.id}:${newer.revision}:recipe-edit`;
              writeLocal(nextKey, reapplied);
              writeLocal(key, null);
              onRebased(newer);
            }}
          >
            Reapply my fields to revision {newer.revision}
          </Button>
        </section>
      )}
      <div className="ol-agent-recipe-actions">
        {savingReason && <p role="status">{savingReason}</p>}
        {error && <p role="alert">{error}</p>}
        <div className="ol-agent-tools">
          <Button
            size="sm"
            busy={pending === 'preview'}
            disabled={!!pending || problems.length > 0}
            onPress={() => void perform('preview')}
          >
            Preview changes
          </Button>
          <Button
            size="sm"
            variant="primary"
            busy={pending === 'save'}
            disabled={!!pending || problems.length > 0 || !!savingReason || !dirty}
            onPress={() => void perform('save')}
          >
            Save new revision
          </Button>
          <Button
            size="sm"
            variant="quiet"
            disabled={pending === 'save'}
            onPress={() => {
              setPreview(undefined);
              change(initial);
              writeLocal(key, null);
            }}
          >
            Discard local changes
          </Button>
        </div>
      </div>
    </section>
  );
}
