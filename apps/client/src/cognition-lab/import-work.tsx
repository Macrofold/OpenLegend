import { useState } from 'react';
import { Button } from '../design-system/components';
import type { LabImportResult } from './api';
import { LabError, LabModal } from './controls';
import { bytesLabel } from './types';

export function ImportWork({
  upload,
  busy,
  close,
}: {
  upload(file: File, validateOnly: boolean): Promise<LabImportResult | undefined>;
  busy: boolean;
  close(): void;
}) {
  const [file, setFile] = useState<File>();
  const [validated, setValidated] = useState<LabImportResult>();
  const [error, setError] = useState('');
  const submit = async (validateOnly: boolean) => {
    if (!file) return;
    const result = await upload(file, validateOnly);
    if (result?.ok) {
      if (validateOnly) setValidated(result);
      else close();
    } else if (result) setError(result.message);
  };
  return (
    <LabModal
      title="Import current-format lab bundle"
      close={close}
      footer={
        <>
          <Button size="sm" onPress={close}>
            Close
          </Button>
          {validated?.ok ? (
            <Button
              size="sm"
              variant="primary"
              busy={busy}
              onPress={() => (validated.kind === 'run' ? close() : void submit(false))}
            >
              {validated.kind === 'run'
                ? 'Done'
                : `Install ${validated.name ?? 'validated bundle'}`}
            </Button>
          ) : (
            <Button size="sm" busy={busy} disabled={!file} onPress={() => void submit(true)}>
              Validate selected bundle
            </Button>
          )}
        </>
      }
    >
      <div className="cl-stack">
        <p>
          Validation adds compatible evidence to Library without replacing the lab. Complete
          scenarios and checkpoints can then be installed explicitly. Imported evidence never runs a
          model request.
        </p>
        <label className="cl-field">
          Bundle file
          <input
            type="file"
            disabled={busy}
            onChange={(event) => {
              setFile(event.target.files?.[0]);
              setValidated(undefined);
              setError('');
            }}
          />
        </label>
        {file && (
          <p>
            {file.name} · {bytesLabel(file.size)}
          </p>
        )}
        <LabError message={error} />
        {validated?.ok && (
          <>
            <h3>{validated.name ?? 'Compatible bundle'}</h3>
            <p>{validated.message}</p>
            <p>
              {validated.kind === 'run'
                ? 'This recorded run is in Library. It preserves its captured completeness and does not replace the active scenario.'
                : 'Installing replaces the active lab scenario and discards its current drafts after confirmed replacement. The ordinary game, credentials and paid-call receipts remain with their owners.'}
            </p>
          </>
        )}
      </div>
    </LabModal>
  );
}
