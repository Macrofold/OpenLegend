import type { WorldAgentReviewView, WorldAgentPlanView } from '@open-legend/protocol';
import { useEffect, useRef, useState } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { Button, Tag } from '../design-system/components';
import { post, privateDraftScope } from '../api';
import { WorldAgentPreparationDetails } from './world-agent-work-details';
import { readLocal, writeLocal } from './storage';
import './world-agent-work.css';

/** Approval and Apply remain bound to one exact plan, never displayed prose.
 * docs/invention-workshop-tools.md#5-explicit-apply-and-revision-continuity
 */
export function WorldAgentReview({
  worldId,
  sessionId,
  planId,
  canApply,
  mutationReason,
  onClose,
  onChanged,
}: {
  worldId: string;
  sessionId: string;
  planId: string;
  canApply: boolean;
  mutationReason?: string;
  onClose(): void;
  onChanged(): void;
}) {
  const [review, setReview] = useState<WorldAgentReviewView>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const working = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const scope = `${worldId}:${sessionId}:${planId}`;
  const storageScope = `${worldId}:${privateDraftScope()}:${sessionId}:${planId}`;
  const applyKey = `open-legend:authoring:${storageScope}:apply-operation`;
  type ApplyMarker = { scope: string; digest: string };
  const markerValid = (value: unknown): value is ApplyMarker =>
    !!value &&
    typeof value === 'object' &&
    'scope' in value &&
    value.scope === storageScope &&
    'digest' in value &&
    typeof value.digest === 'string';
  const [retainedApply, setRetainedApply] = useState(() =>
    readLocal<ApplyMarker | null>(applyKey, null, markerValid),
  );
  const canRetryApply =
    retainedApply?.scope === storageScope && retainedApply.digest === review?.plan.digest;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  useEffect(() => {
    dialog.current?.focus();
  }, [review?.plan.status]);
  const body = { worldId, sessionId, planId };
  useEffect(() => {
    const controller = new AbortController();
    const requestScope = scope;
    currentScope.current = requestScope;
    setReview(undefined);
    setError('');
    setRetainedApply(readLocal<ApplyMarker | null>(applyKey, null, markerValid));
    void post<{ ok: boolean; message?: string; data: WorldAgentReviewView }>(
      '/api/world-agent/session/review',
      body,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted || currentScope.current !== requestScope) return;
        if (result.ok) setReview(result.data);
        else setError(result.message ?? 'This exact review is unavailable.');
      })
      .catch((failure) => {
        if (!controller.signal.aborted && currentScope.current === requestScope)
          setError(failure instanceof Error ? failure.message : 'Review unavailable.');
      });
    return () => {
      controller.abort();
      currentScope.current = '';
    };
  }, [scope]);
  function clearApplyMarker() {
    writeLocal(applyKey, null);
    setRetainedApply(null);
  }
  useEffect(() => {
    if (review?.plan.status === 'applied' && canRetryApply) clearApplyMarker();
  }, [review?.plan.status, canRetryApply, scope]);
  async function act(decision: 'approve' | 'reject' | 'apply', retry = false) {
    if (
      !review ||
      working.current ||
      (retry ? decision !== 'apply' || !canRetryApply : !canApply || !!mutationReason)
    )
      return;
    const requestScope = scope;
    working.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (decision === 'apply') {
        const marker = { scope: storageScope, digest: review.plan.digest };
        writeLocal(applyKey, marker);
        setRetainedApply(marker);
        const result = await post<{ ok: boolean; message?: string }>(
          '/api/world-agent/session/apply',
          body,
        );
        if (!result.ok)
          throw new Error(
            result.message ??
              'Apply was not confirmed. Refresh this exact plan before trying again.',
          );
        if (currentScope.current === requestScope) {
          clearApplyMarker();
          setNotice(
            result.message ??
              'This exact change was committed. Crafting or other ongoing work remains a separate action.',
          );
        }
      } else {
        const result = await post<{ ok: boolean; message?: string; data: WorldAgentPlanView }>(
          '/api/world-agent/session/decision',
          { ...body, decision, digest: review.plan.digest },
        );
        if (!result.ok) throw new Error(result.message ?? 'Decision not accepted.');
        if (currentScope.current === requestScope)
          setReview((previous) => previous && { ...previous, plan: result.data });
      }
      const refreshed = await post<{ ok: boolean; message?: string; data: WorldAgentReviewView }>(
        '/api/world-agent/session/review',
        body,
      );
      if (currentScope.current !== requestScope) return;
      if (refreshed.ok) setReview(refreshed.data);
      else
        setError(
          refreshed.message ??
            'The action returned a result, but this exact review could not be refreshed.',
        );
      onChanged();
    } catch (failure) {
      if (currentScope.current === requestScope)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Outcome could not be confirmed. Refresh this exact plan.',
        );
    } finally {
      working.current = false;
      if (currentScope.current === requestScope) setBusy(false);
    }
  }
  async function refreshReview() {
    if (working.current) return;
    const requestScope = scope;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await post<{ ok: boolean; message?: string; data: WorldAgentReviewView }>(
        '/api/world-agent/session/review',
        body,
      );
      if (currentScope.current !== requestScope) return;
      if (result.ok) setReview(result.data);
      else setError(result.message ?? 'This exact review remains unavailable.');
    } catch (failure) {
      if (currentScope.current === requestScope)
        setError(
          failure instanceof Error ? failure.message : 'This exact review remains unavailable.',
        );
    } finally {
      working.current = false;
      if (currentScope.current === requestScope) setBusy(false);
    }
  }
  return (
    <ModalOverlay
      className="ol-root ol-modal-overlay"
      isOpen
      isDismissable={!busy}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal className="ol-modal ol-agent-work-review-modal">
        <Dialog
          ref={dialog}
          className="ol-person-dialog ol-agent-work-review"
          aria-label="Review exact world change"
        >
          <div className="ol-agent-work-review-heading">
            <h2>Review exact change</h2>
            {review && (
              <p className="ol-caption">
                Revision {review.draft.revision} · {review.plan.status}
              </p>
            )}
          </div>
          <div className="ol-agent-work-review-body">
            {!review && !error && <p role="status">Loading exact review…</p>}
            {review && (
              <>
                <Tag>{review.draft.kind}</Tag>
                <h3>{review.draft.title ?? review.draft.intent}</h3>
                <p>Affected records: {review.plan.impact.affected}.</p>
                <p>
                  {review.plan.status === 'applied'
                    ? 'This exact change has been applied.'
                    : 'This is a saved review. The change has not been applied.'}
                  {review.draft.kind === 'recipe' &&
                    ' Installing a recipe does not create an item. Crafting is separate.'}
                </p>
                {review.plan.result && <p role="status">{review.plan.result.message}</p>}
                {review.plan.status !== 'applied' &&
                  review.plan.validation.activationRequiresResume && (
                    <p>
                      Applying this change requires a running world. Approval does not resume it.
                    </p>
                  )}
                {review.draft.title && (
                  <details>
                    <summary>Original purpose</summary>
                    <p>{review.draft.intent}</p>
                  </details>
                )}
                <WorldAgentPreparationDetails
                  preparation={review.plan.preparation ?? review.draft.preparation}
                  preparationRevision={review.plan.revision}
                  validation={review.plan.validation}
                />
                <details>
                  <summary>Exact candidate</summary>
                  <pre className="ol-agent-json">
                    {JSON.stringify(review.draft.payload, null, 2)}
                  </pre>
                </details>
                <details>
                  <summary>Base pins and review identity</summary>
                  <pre className="ol-agent-json">
                    {JSON.stringify(
                      { base: review.draft.base, digest: review.plan.digest, planId },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </>
            )}
          </div>
          <div className="ol-agent-work-review-footer">
            {review && review.plan.status !== 'applied' && (
              <p className="ol-caption ol-creator-save-status">
                {review.plan.status === 'approved'
                  ? 'Approved for this exact revision. Apply makes the change.'
                  : 'Approval records your decision. Apply remains a separate action.'}
              </p>
            )}
            {mutationReason && <p role="status">{mutationReason}</p>}
            {!canApply && !mutationReason && (
              <p role="status">This session is currently read-only.</p>
            )}
            {notice && notice !== review?.plan.result?.message && <p role="status">{notice}</p>}
            {error && <p role="alert">{error}</p>}
            {review?.plan.status === 'pending' && (
              <>
                <Button
                  variant="primary"
                  busy={busy}
                  disabled={busy || !canApply || !!mutationReason || !review.plan.validation.ok}
                  onPress={() => void act('approve')}
                >
                  Approve this exact change
                </Button>
                <Button
                  disabled={busy || !canApply || !!mutationReason}
                  variant="quiet"
                  onPress={() => void act('reject')}
                >
                  Reject
                </Button>
              </>
            )}
            {review?.plan.status === 'approved' && (
              <Button
                variant="primary"
                busy={busy}
                disabled={busy || !canApply || !!mutationReason || !!canRetryApply}
                onPress={() => void act('apply')}
              >
                Apply approved change
              </Button>
            )}
            {canRetryApply && review?.plan.status !== 'applied' && (
              <>
                <p role="status">
                  An earlier Apply for this exact review needs confirmation. Retry it to recover the
                  same result; the server still checks whether a new change is permitted.
                </p>
                <Button busy={busy} disabled={busy} onPress={() => void act('apply', true)}>
                  Retry original Apply
                </Button>
              </>
            )}
            <Button variant="quiet" disabled={busy} onPress={() => void refreshReview()}>
              Refresh exact review
            </Button>
            <Button variant="quiet" disabled={busy} onPress={onClose}>
              Close review
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
