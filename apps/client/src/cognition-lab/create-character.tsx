import { useState } from 'react';
import type { CognitionLabField, CognitionLabWorkspace } from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { currentScope, expected } from './api';
import { LabError, LabModal } from './controls';
import { FieldModal } from './current-editor';
import { draftValue, fieldDraftValue, type LabExecute } from './types';

/** Creation reads the installed world's descriptors; the server creates the actual body. */
export function CreateCharacter({
  workspace,
  execute,
  busy,
  open,
  close,
  created,
  importScene,
}: {
  workspace: CognitionLabWorkspace;
  execute: LabExecute;
  busy: boolean;
  open: boolean;
  close(): void;
  created(actorId: string): void;
  importScene(): void;
}) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [editing, setEditing] = useState<CognitionLabField>();
  const [error, setError] = useState('');
  const creation = workspace.characterCreation;
  const rawValue = (field: CognitionLabField) =>
    values[field.id] ??
    draftValue(field.initialValue === undefined ? field : { ...field, value: field.initialValue });
  const create = async () => {
    if (!creation?.available) return;
    try {
      const result = await execute({
        kind: 'createCharacter',
        expected: expected(workspace),
        values: Object.fromEntries(
          creation.fields.map((field) => [field.id, fieldDraftValue(field, rawValue(field))]),
        ),
      });
      if (result?.ok) {
        setValues({});
        setError('');
        if (result.actorId) created(result.actorId);
        close();
      } else if (result) setError(result.message);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not prepare this character.');
    }
  };
  if (!open) return null;
  return (
    <>
      <LabModal
        title="Add character"
        close={close}
        footer={
          <>
            <Button size="sm" onPress={close}>
              Close
            </Button>
            <Button
              size="sm"
              onPress={() => {
                setValues({});
                setError('');
              }}
            >
              Reset creation draft
            </Button>
            <Button
              size="sm"
              variant="primary"
              busy={busy}
              disabled={!creation?.available}
              onPress={() => void create()}
            >
              Create character
            </Button>
          </>
        }
      >
        <div className="cl-stack">
          <p>
            The installed world creates a complete person at the chosen native position. This does
            not invent a past encounter, acquaintance or shared memory.
          </p>
          <LabError message={error} />
          {!creation?.available && (
            <p className="cl-hint">
              {creation?.reason ?? 'Character creation is unavailable for the installed world.'}
            </p>
          )}
          {creation?.fields.map((field) => (
            <section key={field.id} className="cl-section">
              <div className="cl-inline">
                <strong>{field.label}</strong>
                <span className="cl-spacer" />
                <Button
                  size="sm"
                  disabled={!creation.available || busy || !field.editable}
                  onPress={() => setEditing(field)}
                >
                  Edit {field.label}
                </Button>
              </div>
              {field.description && <p className="cl-hint">{field.description}</p>}
              <p className="cl-field-value">{String(rawValue(field)).slice(0, 240) || 'Empty'}</p>
            </section>
          ))}
          <section className="cl-section">
            <h3>Import an existing scene</h3>
            <p>
              Bring existing people with their complete native bodies, history and bindings by
              explicitly importing a whole game snapshot.
            </p>
            <Button
              size="sm"
              onPress={() => {
                close();
                importScene();
              }}
            >
              Open scene import
            </Button>
          </section>
        </div>
      </LabModal>
      {editing && (
        <FieldModal
          field={editing}
          actorId={workspace.defaults.actorId ?? ''}
          scope={currentScope(workspace)}
          draft={{
            id: editing.id,
            scope: currentScope(workspace),
            actorId: workspace.defaults.actorId ?? '',
            actorName: 'New character',
            field: editing,
            value: rawValue(editing),
          }}
          save={(value) => {
            setValues((previous) => ({ ...previous, [editing.id]: value }));
            setEditing(undefined);
          }}
          close={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
