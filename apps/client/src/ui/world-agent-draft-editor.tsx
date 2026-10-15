import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  WorldAgentExactDraftView,
  WorldAgentDraftPreviewView,
  WorldAgentWorkResult,
  WorldAgentDraftEditorView,
} from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { post, privateDraftScope } from '../api';
import { readLocal } from './storage';
import { WorldAgentPreparationDetails } from './world-agent-work-details';
import { WorldCreationPreviewView } from './world-creation-preview';
import { authoringKey } from './world-agent-identity';
import { holdActionFocus } from './action-focus';

type LocalEdit = {
  fields: Record<string, string>;
  intent: string;
  operation?: { body: string; id: string };
};
type EditorField = WorldAgentDraftEditorView['fields'][number];
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
function readEdit(key: string): LocalEdit | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (value === null) return null;
  if (!localEdit(value))
    throw new Error('The retained edit is unreadable. Restore it before saving.');
  return value;
}
function sameOperation(a: LocalEdit['operation'], b: LocalEdit['operation']) {
  return !!a && !!b && a.id === b.id && a.body === b.body;
}
/** Optional drafts must not erase an unresolved native Save. Dispatch and cleanup
 * use the same owner with mandatory readback, without imposing a new content cap. */
function writeEdit(
  key: string,
  edit: LocalEdit | null,
  settled?: LocalEdit['operation'],
  verify = true,
) {
  const current = readEdit(key);
  if (current?.operation && !sameOperation(current.operation, settled ?? edit?.operation))
    throw new Error('An earlier Save remains unresolved. Reload and check that original Save.');
  const text = JSON.stringify(edit);
  localStorage.setItem(key, text);
  if (verify && localStorage.getItem(key) !== text)
    throw new Error(
      'This browser could not retain the exact Save record. Restore storage and check the original Save before continuing.',
    );
}
export function discardRetainedDraftEdit(key: string): void {
  if (readEdit(key)?.operation)
    throw new Error(
      'The original Save needs confirmation. Keep editing and retry that Save before discarding.',
    );
  writeEdit(key, null);
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
      (draft.editor?.fields ?? []).map((field) => {
        const value = valueAt(draft.payload, field.path);
        return [
          fieldKey(field),
          typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : '',
        ];
      }),
    ),
  };
}
function changedEdit(edit: LocalEdit, draft: WorldAgentExactDraftView): boolean {
  const original = initialEdit(draft);
  return (
    edit.intent !== original.intent ||
    Object.keys(edit.fields).some((key) => !Object.hasOwn(original.fields, key)) ||
    (draft.editor?.fields ?? []).some(
      (field) => edit.fields[fieldKey(field)] !== original.fields[fieldKey(field)],
    )
  );
}
export function hasRetainedDraftEdit(draft: WorldAgentExactDraftView, key: string): boolean {
  const retained = readLocal<LocalEdit | null>(key, null, localEdit);
  return !!retained && (!!retained.operation || changedEdit(retained, draft));
}
function replaceAt(candidate: unknown, path: string[], value: string | number | boolean): boolean {
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
function parse(
  field: EditorField,
  text: string,
): { value: string | number | boolean } | { error: string } {
  if (field.kind === 'boolean')
    return text === 'true' || text === 'false'
      ? { value: text === 'true' }
      : { error: `Choose a value for ${field.label}.` };
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

/** Editor fields and derived facts come from their semantic owner, never client formulas. */
export function WorldAgentDraftEditor({
  draft,
  worldId,
  sessionId,
  connected,
  mutationReason,
  onDirty,
  onSaved,
  onRebased,
}: {
  draft: WorldAgentExactDraftView;
  worldId: string;
  sessionId: string;
  connected: boolean;
  mutationReason: string | null;
  onDirty(dirty: boolean): void;
  onSaved(draft: WorldAgentExactDraftView): void;
  onRebased(draft: WorldAgentExactDraftView): void;
}) {
  const audience = privateDraftScope();
  const key = authoringKey(
    'draft-edit',
    worldId,
    audience,
    sessionId,
    draft.id,
    draft.revision,
    draft.kind,
  );
  const subject = draft.kind === 'world-opening' ? 'opening' : 'recipe';
  const initial = useMemo(() => initialEdit(draft), [draft]);
  const [edit, setEdit] = useState(() => readLocal(key, initial, localEdit));
  const [preview, setPreview] = useState<{ signature: string; data: WorldAgentDraftPreviewView }>();
  const [pending, setPending] = useState<'preview' | 'save' | 'latest' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newer, setNewer] = useState<WorldAgentExactDraftView>();
  const base = draft;
  const savingReason =
    mutationReason ??
    (Math.max(base.latestRevision, newer?.revision ?? 0) > base.revision
      ? 'This draft has a newer revision. Inspect it and deliberately reapply your fields before saving.'
      : null);
  const working = useRef(false);
  const editor = useRef<HTMLElement>(null);
  const alive = useRef(true);
  const editRef = useRef(edit);
  editRef.current = edit;
  const metadata = base.editor;
  const fields = metadata?.fields ?? [];
  const baseInitial = initial;
  const dirty = useMemo(() => changedEdit(edit, base) || !!edit.operation, [edit, base]);
  const { candidate, problems, missingFields } = useMemo(() => {
    const candidate = structuredClone(base.payload);
    const problems: { id: string; message: string }[] = [];
    const fieldKeys = new Set(fields.map(fieldKey));
    const missingFields = Object.entries(edit.fields).filter(([key]) => !fieldKeys.has(key));
    if (missingFields.length)
      problems.push({
        id: 'missing-editor-fields',
        message:
          'The current editor no longer describes some retained fields. Refresh or explicitly discard them before saving; their exact local values remain below.',
      });
    for (const field of fields) {
      const parsed = parse(field, edit.fields[fieldKey(field)] ?? '');
      if ('error' in parsed) problems.push({ id: fieldKey(field), message: parsed.error });
      else if (!replaceAt(candidate, field.path, parsed.value))
        problems.push({
          id: fieldKey(field),
          message: `${field.label} is unavailable in this saved draft. Refresh its exact revision.`,
        });
    }
    return { candidate, problems, missingFields };
  }, [base.payload, metadata, edit.fields]);
  const signature = useMemo(
    () => JSON.stringify({ candidate, intent: edit.intent, revision: base.revision }),
    [candidate, edit.intent, base.revision],
  );
  const candidateIdentity = useRef(signature);
  candidateIdentity.current = signature;
  const previewCurrent = preview?.signature === signature;
  const facts = previewCurrent ? (preview.data.facts ?? []) : (metadata?.facts ?? []);
  useEffect(() => {
    onDirty(dirty);
    try {
      // Optional typing persistence needs the conflict guard, not dispatch readback.
      writeEdit(key, dirty ? edit : null, undefined, false);
    } catch {
      // Unsent drafts remain optional; the dispatch boundary refuses unavailable
      // storage and never overwrites a different unresolved operation.
    }
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
    setNotice('');
  }
  function saveBody() {
    return {
      worldId,
      sessionId,
      draftId: base.id,
      expectedRevision: base.revision,
      candidate,
      ...(edit.intent !== base.intent ? { intent: edit.intent } : {}),
    };
  }
  async function acceptSave(
    response: WorldAgentWorkResult<WorldAgentExactDraftView>,
    submittedSignature: string,
    submittedBody: string,
  ) {
    if (!alive.current || candidateIdentity.current !== submittedSignature) return;
    const settle = (keepDraft: boolean) => {
      const { operation, ...retained } = editRef.current;
      if (!operation || operation.body !== submittedBody)
        throw new Error('The original Save identity changed. Its result must be checked.');
      writeEdit(key, keepDraft ? retained : null, operation);
      editRef.current = retained;
      setEdit(retained);
    };
    if (!response.ok || !response.data) {
      // An acknowledged refusal is final for this identity; an unavailable outcome
      // remains retained so a lost acknowledgement can reconcile the original request.
      if (response.status !== 'unavailable') {
        setNotice(response.message ?? 'The original Save was refused. Your fields remain here.');
        settle(true);
      }
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
            latest.data?.id === base.id &&
            latest.data.revision === history.data.latestRevision
          )
            setNewer(latest.data);
        }
      }
      throw new Error(response.message ?? 'This edit was not saved. Your fields remain here.');
    }
    if (response.data.id !== base.id || response.data.revision !== base.revision + 1)
      throw new Error(
        'The retained Save returned a different draft. Your local fields remain here.',
      );
    setNotice(`The original Save created revision ${response.data.revision}.`);
    if (submittedBody !== JSON.stringify(saveBody())) {
      settle(true);
      setNewer(response.data);
      setNotice(
        `The original Save created revision ${response.data.revision}. Your later local changes remain above; inspect and reapply them deliberately.`,
      );
      return;
    }
    settle(false);
    onDirty(false);
    onSaved(response.data);
  }
  async function retrySave() {
    const operation = editRef.current.operation;
    if (working.current || !connected || !operation) return;
    let body: unknown;
    try {
      body = JSON.parse(operation.body);
    } catch {
      setError('The retained Save request cannot be read. Your local fields remain here.');
      return;
    }
    if (
      !record(body) ||
      body.worldId !== worldId ||
      body.sessionId !== sessionId ||
      body.draftId !== base.id ||
      body.expectedRevision !== base.revision
    ) {
      setError('The retained Save belongs to a different exact draft. Your fields remain here.');
      return;
    }
    working.current = true;
    const restoreFocus = holdActionFocus(editor.current);
    setPending('save');
    setError('');
    setNotice('');
    const submittedSignature = signature;
    let dispatched = false;
    try {
      writeEdit(key, editRef.current);
      dispatched = true;
      const response = await post<WorldAgentWorkResult<WorldAgentExactDraftView>>(
        '/api/world-agent/session/draft-save',
        { ...body, operationId: operation.id },
      );
      await acceptSave(response, submittedSignature, operation.body);
    } catch (failure) {
      if (alive.current && candidateIdentity.current === submittedSignature)
        setError(
          `${failure instanceof Error ? failure.message : 'The original Save remains unconfirmed.'}${dispatched ? '' : ' No Save request was sent.'}`,
        );
    } finally {
      working.current = false;
      if (alive.current) {
        setPending(null);
        restoreFocus();
      }
    }
  }
  async function perform(kind: 'preview' | 'save') {
    if (
      working.current ||
      !connected ||
      problems.length ||
      !metadata ||
      (kind === 'save' && (savingReason || editRef.current.operation))
    )
      return;
    working.current = true;
    const restoreFocus = holdActionFocus(editor.current);
    setPending(kind);
    setError('');
    setNotice('');
    const submittedSignature = signature;
    let dispatched = false;
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
        const stored = readEdit(key);
        if (stored?.operation && !sameOperation(stored.operation, editRef.current.operation)) {
          const retained = { ...editRef.current, operation: stored.operation };
          editRef.current = retained;
          setEdit(retained);
          throw new Error(
            'An earlier Save remains unresolved. Check the original Save before saving these changes.',
          );
        }
        const operationBody = JSON.stringify(body);
        const operationId =
          editRef.current.operation?.body === operationBody
            ? editRef.current.operation.id
            : crypto.randomUUID();
        const retained = {
          ...editRef.current,
          operation: { body: operationBody, id: operationId },
        };
        writeEdit(key, retained);
        editRef.current = retained;
        setEdit(retained);
        dispatched = true;
        const response = await post<WorldAgentWorkResult<WorldAgentExactDraftView>>(
          '/api/world-agent/session/draft-save',
          { ...body, operationId },
        );
        await acceptSave(response, submittedSignature, operationBody);
      }
    } catch (failure) {
      if (alive.current && candidateIdentity.current === submittedSignature)
        setError(
          `${failure instanceof Error ? failure.message : 'Outcome could not be confirmed. Retry the same edit to recover its retained result.'}${kind === 'save' && !dispatched ? ' No Save request was sent.' : ''}`,
        );
    } finally {
      working.current = false;
      if (alive.current) {
        setPending(null);
        restoreFocus();
      }
    }
  }
  async function inspectLatest() {
    if (working.current || !connected) return;
    working.current = true;
    const restoreFocus = holdActionFocus(editor.current);
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
      if (alive.current) {
        setPending(null);
        restoreFocus();
      }
    }
  }
  const unmatchedFields = newer
    ? fields.filter(
        (field) =>
          edit.fields[fieldKey(field)] !== baseInitial.fields[fieldKey(field)] &&
          !newer.editor?.fields.some(
            (newField) => fieldKey(newField) === fieldKey(field) && newField.label === field.label,
          ),
      )
    : [];
  if (!metadata)
    return (
      <section ref={editor} tabIndex={-1} className="ol-agent-draft-editor">
        <h4>Editing unavailable</h4>
        <p>
          Editable fields are not available for this exact saved draft. Conversation and exact
          inspection remain available.
        </p>
        {dirty && <p role="status">Your retained local edit has not been discarded.</p>}
        {!!missingFields.length && (
          <details>
            <summary>Inspect retained local field values</summary>
            <pre className="ol-agent-json">
              {JSON.stringify(Object.fromEntries(missingFields), null, 2)}
            </pre>
          </details>
        )}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {edit.operation && (
          <Button
            size="sm"
            disabled={!!pending || !connected}
            busy={pending === 'save'}
            onPress={() => void retrySave()}
          >
            Retry original Save
          </Button>
        )}
        <Button
          size="sm"
          variant="quiet"
          disabled={pending === 'save' || !!edit.operation}
          onPress={() => {
            change(initial);
            try {
              writeEdit(key, null);
            } catch {
              /* Keep any unresolved native Save. */
            }
          }}
        >
          Discard local changes
        </Button>
      </section>
    );
  return (
    <section
      ref={editor}
      tabIndex={-1}
      className="ol-agent-draft-editor"
      aria-label={`Edit saved ${subject}`}
    >
      <h4>
        Edit {subject} · based on revision {base.revision}
      </h4>
      <p className="ol-caption">
        Changes stay on this device until Save creates a new revision. Native preview and Save use
        no model call. Review and activation remain separate.
      </p>
      {!!missingFields.length && (
        <>
          <p role="status">
            {problems.find((problem) => problem.id === 'missing-editor-fields')?.message}
          </p>
          <details>
            <summary>Retained fields without a current editor</summary>
            <pre className="ol-agent-json">
              {JSON.stringify(Object.fromEntries(missingFields), null, 2)}
            </pre>
          </details>
        </>
      )}
      {fields.map((field, index) => {
        const id = `draft-${base.id}-${index}`;
        // The wrapping label also contains validation detail; keep the field name stable.
        const problem = problems.find((entry) => entry.id === fieldKey(field));
        const value = edit.fields[fieldKey(field)] ?? '';
        return (
          <label key={fieldKey(field)} htmlFor={id}>
            <span id={`${id}-label`}>
              {field.label}
              {field.unit && ` (${field.unit})`}
            </span>
            {field.kind === 'boolean' ? (
              <input
                id={id}
                type="checkbox"
                checked={value === 'true'}
                disabled={pending === 'save'}
                aria-labelledby={`${id}-label`}
                aria-invalid={!!problem}
                aria-describedby={problem ? `${id}-error` : undefined}
                onChange={(event) =>
                  change({
                    ...editRef.current,
                    fields: {
                      ...editRef.current.fields,
                      [fieldKey(field)]: String(event.target.checked),
                    },
                  })
                }
              />
            ) : field.kind === 'choice' ? (
              <select
                id={id}
                value={value}
                disabled={pending === 'save'}
                aria-labelledby={`${id}-label`}
                aria-invalid={!!problem}
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
                aria-labelledby={`${id}-label`}
                aria-invalid={!!problem}
                aria-describedby={problem ? `${id}-error` : undefined}
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
                aria-labelledby={`${id}-label`}
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
      <section aria-label="Native candidate preview">
        <h4>Native facts</h4>
        {dirty && !previewCurrent && (
          <p role="status">
            Out of date for these local changes. Preview changes to recompute these facts natively.
          </p>
        )}
        <dl className="ol-agent-draft-facts">
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
        {previewCurrent && preview.data.openingPreview && (
          <WorldCreationPreviewView preview={preview.data.openingPreview} />
        )}
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
            disabled={
              !!pending ||
              unmatchedFields.length > 0 ||
              missingFields.length > 0 ||
              !newer.editor ||
              !!edit.operation
            }
            onPress={() => {
              const latestInitial = initialEdit(newer);
              const retainedFields = Object.fromEntries(
                (newer.editor?.fields ?? []).map((field) => [
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
              const nextKey = authoringKey(
                'draft-edit',
                worldId,
                audience,
                sessionId,
                newer.id,
                newer.revision,
                newer.kind,
              );
              try {
                writeEdit(nextKey, reapplied);
                writeEdit(key, null);
                onRebased(newer);
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : 'The reapplied fields could not be retained. Your original edit remains here.',
                );
              }
            }}
          >
            Reapply my fields to revision {newer.revision}
          </Button>
        </section>
      )}
      <div className="ol-agent-draft-actions">
        {savingReason && <p role="status">{savingReason}</p>}
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
        {edit.operation && (
          <p role="status">
            The original Save needs confirmation. Retry that exact request before saving later
            changes; your current fields will be retained.
          </p>
        )}
        <div className="ol-agent-tools">
          {edit.operation && (
            <Button
              size="sm"
              busy={pending === 'save'}
              disabled={!!pending || !connected}
              onPress={() => void retrySave()}
            >
              Retry original Save
            </Button>
          )}
          <Button
            size="sm"
            busy={pending === 'preview'}
            disabled={!!pending || problems.length > 0 || !connected}
            onPress={() => void perform('preview')}
          >
            Preview changes
          </Button>
          <Button
            size="sm"
            variant="primary"
            busy={pending === 'save'}
            disabled={
              !!pending || problems.length > 0 || !!savingReason || !dirty || !!edit.operation
            }
            onPress={() => void perform('save')}
          >
            Save new revision
          </Button>
          <Button
            size="sm"
            variant="quiet"
            disabled={pending === 'save' || !!edit.operation}
            onPress={() => {
              setPreview(undefined);
              change(initial);
              try {
                writeEdit(key, null);
              } catch {
                /* Keep any unresolved native Save. */
              }
            }}
          >
            Discard local changes
          </Button>
        </div>
      </div>
    </section>
  );
}
