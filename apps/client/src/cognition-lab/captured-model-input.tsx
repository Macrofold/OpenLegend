import { useMemo, useState } from 'react';
import type {
  CognitionLabArtifact,
  CognitionLabModelInput,
  CognitionLabWorkspace,
} from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { labRead } from './api';
import { ArtifactModal } from './artifact-viewer';
import { LabError, LabTabs, LabTextEditor } from './controls';
import { instantLabel, readableStatus } from './types';
import { useLabRead } from './use-lab-read';

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** These are retained request fields, never a new rendering of today's world.
 * No prompt-heading parsing: character prose can itself contain headings. */
function inputFields(text: string) {
  const input: unknown = JSON.parse(text);
  if (!object(input) || !object(input['request'])) return [];
  const request = input['request'];
  return ['instructions', 'context', 'state', 'questions', 'files'].flatMap((id) => {
    const value = id === 'files' ? input[id] : request[id];
    if (value === undefined) return [];
    const structured = typeof value !== 'string';
    return [
      {
        id,
        label: `${readableStatus(id)}${structured ? ' (structured)' : ''}`,
        text: structured ? JSON.stringify(value, null, 2) : value,
        structured,
      },
    ];
  });
}

export function CapturedModelInput({
  workspace,
  actorId,
  scope,
  refresh,
}: {
  workspace: CognitionLabWorkspace;
  actorId: string;
  scope: string;
  refresh: number;
}) {
  const readScope = JSON.stringify([scope, workspace.worldId, workspace.timeline, actorId]);
  const captured = useLabRead(
    readScope,
    (signal) =>
      labRead<CognitionLabModelInput>(
        `/current/${encodeURIComponent(actorId)}/model-input`,
        undefined,
        signal,
      ),
    refresh,
  );
  const stage = captured.value?.stage;
  const input = stage?.artifacts.find((artifact) => artifact.kind === 'input');
  const artifact = useLabRead(input ? JSON.stringify([readScope, input.id]) : undefined, (signal) =>
    labRead<CognitionLabArtifact>(
      `/artifacts/${encodeURIComponent(input?.id ?? '')}`,
      { offset: 0, limit: 1024 * 1024 },
      signal,
    ),
  );
  const decoded = useMemo(() => {
    if (!artifact.value || artifact.value.nextOffset !== undefined) return undefined;
    try {
      return { fields: inputFields(artifact.value.text) };
    } catch {
      return { fields: [], error: 'Read the full capture to inspect this input format.' };
    }
  }, [artifact.value]);
  const [fieldId, setFieldId] = useState('context');
  const [full, setFull] = useState<string>();
  const selected =
    decoded?.fields.find((field) => field.id === fieldId) ??
    decoded?.fields.find((field) => field.id === 'context' || field.id === 'state') ??
    decoded?.fields[0];
  return (
    <section className="cl-section" aria-label="Last sent model input">
      <div className="cl-inline">
        <strong>Last sent model input</strong>
        <span className="cl-spacer" />
        {input && (
          <Button size="sm" onPress={() => setFull(input.id)}>
            Read full request
          </Button>
        )}
      </div>
      <LabError message={captured.error ?? artifact.error ?? decoded?.error} />
      {!stage ? (
        <p className="cl-hint">
          {captured.pending
            ? 'Reading captured input…'
            : (captured.value?.reason ??
              'No retained dispatched decision input is available for this character in this situation.')}
        </p>
      ) : (
        <>
          <p className="cl-hint">
            {stage.configuration?.model ?? stage.kind} · {stage.purpose} ·{' '}
            {instantLabel(stage.recordedAt)} · {readableStatus(stage.status)}
          </p>
          <p className="cl-hint">
            This complete input combines categories and is shared across these tabs. It was captured
            earlier; current editable values are below.
          </p>
          {!input ? (
            <p className="cl-hint">
              This dispatched call has no retained input artifact. Missing capture does not
              establish what was included or omitted.
            </p>
          ) : decoded?.fields.length ? (
            <>
              <LabTabs
                label="Captured input fields"
                options={decoded.fields}
                value={selected?.id ?? ''}
                onChange={setFieldId}
              />
              {selected && (
                <LabTextEditor
                  label={`Captured ${selected.label}`}
                  value={selected.text}
                  readOnly
                />
              )}
              {selected?.structured && (
                <p className="cl-hint">
                  Structured values are formatted as JSON. String fields are shown unchanged. Read
                  full request for the complete captured payload.
                </p>
              )}
            </>
          ) : (
            <p className="cl-hint">
              {artifact.pending
                ? 'Reading exact captured content…'
                : artifact.value?.nextOffset !== undefined
                  ? 'This input is larger than the inline view. Read full request for bounded chunks and the complete download.'
                  : 'Read full request for all captured fields, including any response schema.'}
            </p>
          )}
        </>
      )}
      {input && full === input.id && (
        <ArtifactModal
          key={JSON.stringify([readScope, full])}
          artifactId={full}
          scope={readScope}
          title="Complete captured model input"
          close={() => setFull(undefined)}
        />
      )}
    </section>
  );
}
