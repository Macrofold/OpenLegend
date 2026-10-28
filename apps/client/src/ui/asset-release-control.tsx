import { useEffect, useRef, useState } from 'react';
import {
  assertAssetRevisionReference,
  sameAssetRevision,
  type AssetRevisionReference,
} from '@open-legend/assets';
import type { CheckpointContext } from '@open-legend/protocol';
import { installedAssetRelease } from '../asset-files';
import { selectInstalledArtwork, type AssetReleaseSelectionRequest } from '../api';
import {
  assetSelectionRequestKey,
  boundedText,
  readRetainedRequest,
  retainRequest,
  releaseRequest,
  type RetainedRequest,
} from '../retained-request';
import { Button } from '../design-system/components';

function validSelection(value: unknown): value is AssetReleaseSelectionRequest {
  if (
    !value ||
    typeof value !== 'object' ||
    !('requestId' in value) ||
    !boundedText(value.requestId, 128) ||
    !('timeline' in value) ||
    !boundedText(value.timeline, 128) ||
    !('reference' in value) ||
    !('expectedRevision' in value) ||
    !Number.isSafeInteger(value.expectedRevision) ||
    Number(value.expectedRevision) < 0 ||
    Object.keys(value).some(
      (key) => !['requestId', 'timeline', 'reference', 'expectedRevision'].includes(key),
    )
  )
    return false;
  try {
    assertAssetRevisionReference(value.reference);
    return true;
  } catch {
    return false;
  }
}

/** Both owner entry points use the same exact choice and retained receipt. A
 * result check never dispatches a new selection after an uncertain reply. */
export function AssetReleaseControl({
  context,
  selected,
  revision,
  onChanged,
}: {
  context: CheckpointContext;
  selected?: AssetRevisionReference;
  revision: number;
  onChanged?(): void;
}) {
  const key = assetSelectionRequestKey(context.recoveryScope);
  const [retained, setRetained] = useState<RetainedRequest<AssetReleaseSelectionRequest>>(() =>
    readRetainedRequest(key, validSelection),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const sending = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const installed = sameAssetRevision(selected, installedAssetRelease);
  async function send(operation: 'install' | 'selection-result') {
    if (sending.current || retained.status === 'unreadable') return;
    if (retained.status === 'empty' && (installed || operation !== 'install')) return;
    sending.current = true;
    setBusy(true);
    setMessage('');
    let request: AssetReleaseSelectionRequest;
    try {
      if (retained.status === 'pending') request = retained.request;
      else {
        request = {
          requestId: crypto.randomUUID(),
          timeline: context.timeline,
          reference: installedAssetRelease,
          expectedRevision: revision,
        };
        retainRequest(key, request);
        setRetained({ status: 'pending', request });
      }
      const result = await selectInstalledArtwork(request, operation, AbortSignal.timeout(15_000));
      if (!alive.current) return;
      if (!result.ok) throw new Error(result.message || 'Artwork selection is not confirmed.');
      if (result.reference || (operation === 'selection-result' && result.retryable === false)) {
        releaseRequest(key, request.requestId);
        setRetained({ status: 'empty' });
        setMessage(
          result.completedUnavailable
            ? 'The earlier artwork selection completed, but its artwork is unavailable. Refreshing the world.'
            : result.reference
              ? 'Artwork selection was saved. Refreshing the world.'
              : 'The earlier artwork choice is no longer current. Review the refreshed world before selecting again.',
        );
        onChanged?.();
      } else setMessage('No completed selection is recorded. You can retry the original choice.');
    } catch (error) {
      if (alive.current) {
        setRetained(readRetainedRequest(key, validSelection));
        setMessage(error instanceof Error ? error.message : 'Artwork selection is not confirmed.');
      }
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div>
      <p>
        {installed
          ? 'The artwork installed with this game is selected.'
          : 'Select the artwork installed with this game. This changes the world’s saved artwork choice for everyone.'}
      </p>
      {retained.status === 'pending' ? (
        <>
          <Button busy={busy} onPress={() => void send('selection-result')}>
            Check artwork selection
          </Button>
          <Button busy={busy} onPress={() => void send('install')}>
            Retry original artwork choice
          </Button>
        </>
      ) : retained.status === 'unreadable' ? (
        <p role="alert">
          This browser could not read the earlier artwork request. Refresh access before selecting.
        </p>
      ) : (
        !installed && (
          <Button busy={busy} onPress={() => void send('install')}>
            Use installed game art
          </Button>
        )
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
