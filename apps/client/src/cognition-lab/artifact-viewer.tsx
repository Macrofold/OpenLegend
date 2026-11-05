import { useState } from 'react';
import type { CognitionLabArtifact } from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { labRead } from './api';
import { LabError, LabModal, LabTextEditor } from './controls';
import { useLabRead } from './use-lab-read';

export function ArtifactModal({
  artifactId,
  scope,
  title,
  close,
}: {
  artifactId: string;
  scope: string;
  title: string;
  close(): void;
}) {
  const [offsets, setOffsets] = useState([0]);
  const offset = offsets.at(-1)!;
  const artifact = useLabRead(JSON.stringify([scope, artifactId, offset]), (signal) =>
    labRead<CognitionLabArtifact>(
      `/artifacts/${encodeURIComponent(artifactId)}`,
      { offset, limit: 1024 * 1024 },
      signal,
    ),
  );
  const text = artifact.value?.text ?? '';
  const nextOffset = artifact.value?.nextOffset;
  return (
    <LabModal
      title={title}
      close={close}
      wide
      editor
      pending={artifact.pending}
      footer={
        <>
          <span className="cl-hint">
            {offset.toLocaleString()}–
            {(offset + new TextEncoder().encode(text).byteLength).toLocaleString()} of{' '}
            {artifact.value?.length.toLocaleString() ?? '?'} bytes
          </span>
          <span className="cl-spacer" />
          {offset > 0 && (
            <Button size="sm" onPress={() => setOffsets([0])}>
              First chunk
            </Button>
          )}
          {offsets.length > 1 && (
            <Button size="sm" onPress={() => setOffsets((previous) => previous.slice(0, -1))}>
              Previous chunk
            </Button>
          )}
          {nextOffset !== undefined && (
            <Button size="sm" onPress={() => setOffsets((previous) => [...previous, nextOffset])}>
              Next chunk
            </Button>
          )}
          {artifact.value && (
            <a className="ol-btn" href={artifact.value.downloadUrl} download>
              Download complete content
            </a>
          )}
          <Button size="sm" onPress={close}>
            Close
          </Button>
        </>
      }
    >
      <div className="cl-stack">
        <LabError message={artifact.error} />
        <LabTextEditor label="Exact captured content" value={text} readOnly />
        <p className="cl-hint">
          Exact retained bytes are shown in bounded chunks. Find and Copy apply to this chunk;
          download preserves the complete captured content.
        </p>
      </div>
    </LabModal>
  );
}
