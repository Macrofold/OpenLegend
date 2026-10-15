import type {
  WorldAgentReviewView,
  WorldAgentPlanView,
  WorldCreationOperationView,
} from '@open-legend/protocol';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { Button, Tag } from '../design-system/components';
import { post, privateDraftScope, worldCreationOperation } from '../api';
import { WorldAgentPreparationDetails } from './world-agent-work-details';
import { readLocal, writeLocal } from './storage';
import { WorldCreationPreviewView } from './world-creation-preview';
import { WorldCreationTargetDetails } from './world-creation-target-details';
import { worldAgentKindLabel } from './world-agent-labels';
import { holdActionFocus } from './action-focus';
import { authoringKey } from './world-agent-identity';
import { WorldStatusRemovalDetails } from './world-status-removal';
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
  onStatusPolicyChanged,
}: {
  worldId: string;
  sessionId: string;
  planId: string;
  canApply: boolean;
  mutationReason?: string;
  onClose(): void;
  onChanged(plan?: WorldAgentPlanView): void;
  onStatusPolicyChanged?(): void;
}) {
  const [review, setReview] = useState<WorldAgentReviewView>();
  const [currentPlanId, setCurrentPlanId] = useState(planId);
  const [removalUnsafe, setRemovalUnsafe] = useState(false);
  const removalUnsafeRef = useRef(false);
  const updateRemovalUnsafe = useCallback((unsafe: boolean) => {
    removalUnsafeRef.current = unsafe;
    setRemovalUnsafe(unsafe);
  }, []);
  const [removalCancelBlocked, setRemovalCancelBlocked] = useState(false);
  const removalCancelBlockedRef = useRef(false);
  const updateRemovalCancellationBlocked = useCallback((blocked: boolean) => {
    removalCancelBlockedRef.current = blocked;
    setRemovalCancelBlocked(blocked);
  }, []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [creationOutcome, setCreationOutcome] = useState<WorldCreationOperationView>();
  const [creationReading, setCreationReading] = useState(false);
  const readingCreation = useRef(false);
  const working = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const modal = useRef<HTMLDivElement>(null);
  const readingPosition = useRef(0);
  const restoringReading = useRef(true);
  const audience = privateDraftScope();
  const scope = authoringKey('review', worldId, audience, sessionId, currentPlanId);
  const applyKey = authoringKey('apply-operation', worldId, audience, sessionId, currentPlanId);
  const readingKey = authoringKey('review-reading', worldId, audience, sessionId, currentPlanId);
  type ApplyMarker = { scope: string; digest: string };
  const markerValid = (value: unknown): value is ApplyMarker =>
    !!value &&
    typeof value === 'object' &&
    'scope' in value &&
    value.scope === scope &&
    'digest' in value &&
    typeof value.digest === 'string';
  const [retainedApply, setRetainedApply] = useState(() =>
    readLocal<ApplyMarker | null>(applyKey, null, markerValid),
  );
  const canRetryApply =
    retainedApply?.scope === scope && retainedApply.digest === review?.plan.digest;
  const canStartCreation = !review?.plan.creation || creationOutcome?.status === 'prepared';
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const body = { worldId, sessionId, planId: currentPlanId };
  function notifyChanged(plan?: WorldAgentPlanView, kind = review?.draft.kind) {
    onChanged(plan);
    if (plan?.status === 'applied' && kind === 'status-effect-policy') onStatusPolicyChanged?.();
  }
  useEffect(() => {
    const controller = new AbortController();
    const requestScope = scope;
    currentScope.current = requestScope;
    setReview(undefined);
    readingPosition.current = readLocal(
      readingKey,
      0,
      (value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0,
    );
    restoringReading.current = true;
    updateRemovalUnsafe(false);
    updateRemovalCancellationBlocked(false);
    setCreationOutcome(undefined);
    setError('');
    setRetainedApply(readLocal<ApplyMarker | null>(applyKey, null, markerValid));
    void post<{ ok: boolean; message?: string; data: WorldAgentReviewView }>(
      '/api/world-agent/session/review',
      body,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted || currentScope.current !== requestScope) return;
        if (result.ok) {
          updateRemovalUnsafe(!!result.data.plan.removal);
          setReview(result.data);
        } else setError(result.message ?? 'This exact review is unavailable.');
      })
      .catch((failure) => {
        if (!controller.signal.aborted && currentScope.current === requestScope)
          setError(failure instanceof Error ? failure.message : 'Review unavailable.');
      });
    return () => {
      controller.abort();
      writeLocal(readingKey, readingPosition.current);
      currentScope.current = '';
    };
  }, [scope]);
  useEffect(() => {
    if (!review || review.plan.removal || !restoringReading.current) return;
    const frame = requestAnimationFrame(() => {
      if (modal.current) modal.current.scrollTop = readingPosition.current;
      restoringReading.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [scope, review, removalUnsafe]);
  function clearApplyMarker() {
    writeLocal(applyKey, null);
    setRetainedApply(null);
  }
  function retainCreationOutcome(outcome: WorldCreationOperationView) {
    if (
      outcome.planId !== currentPlanId ||
      outcome.operationId !== review?.plan.creation?.operationId
    )
      throw new Error(
        'The returned Start outcome does not belong to this exact review. Check its original result again.',
      );
    setCreationOutcome(outcome);
    if (outcome.status !== 'dispatching' && outcome.status !== 'uncertain') clearApplyMarker();
  }
  async function recoverCreation(signal?: AbortSignal) {
    if (readingCreation.current || working.current) return;
    const requestScope = scope;
    const restoreFocus = signal ? () => {} : holdActionFocus(dialog.current);
    if (!signal) setError('');
    readingCreation.current = true;
    setCreationReading(true);
    try {
      const result = await worldCreationOperation(
        'recover',
        worldId,
        sessionId,
        currentPlanId,
        signal,
      );
      if (signal?.aborted || currentScope.current !== requestScope) return;
      if (result.data) retainCreationOutcome(result.data);
      if (!result.ok || !result.data)
        throw new Error(result.message ?? 'The original Start outcome remains unconfirmed.');
    } catch (failure) {
      if (!signal?.aborted && currentScope.current === requestScope)
        setCreationOutcome((previous) => (previous?.status === 'prepared' ? undefined : previous));
      if (!signal?.aborted && currentScope.current === requestScope)
        setError(
          failure instanceof Error
            ? failure.message
            : 'The original Start outcome remains unconfirmed.',
        );
    } finally {
      readingCreation.current = false;
      if (!signal?.aborted && currentScope.current === requestScope) {
        setCreationReading(false);
        restoreFocus();
      }
    }
  }
  useEffect(() => {
    if (!review?.plan.creation) return;
    const controller = new AbortController();
    void recoverCreation(controller.signal);
    return () => controller.abort();
  }, [review?.plan.creation?.operationId]);
  useEffect(() => {
    if (review?.plan.status === 'applied' && canRetryApply) clearApplyMarker();
  }, [review?.plan.status, canRetryApply, scope]);
  async function act(decision: 'approve' | 'reject' | 'apply' | 'cancel', retry = false) {
    if (
      !review ||
      working.current ||
      ((decision === 'approve' || (decision === 'apply' && !retry)) && removalUnsafeRef.current) ||
      ((decision === 'reject' || decision === 'cancel') && removalCancelBlockedRef.current) ||
      (decision === 'apply' && readingCreation.current) ||
      (decision === 'apply' && !canStartCreation) ||
      (decision === 'cancel' &&
        (!review.plan.creation ||
          creationOutcome?.status !== 'prepared' ||
          readingCreation.current ||
          (review.plan.status !== 'pending' && review.plan.status !== 'approved'))) ||
      (retry ? decision !== 'apply' || !canRetryApply : !canApply || !!mutationReason)
    )
      return;
    const requestScope = scope;
    const restoreFocus = holdActionFocus(dialog.current);
    working.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    let acknowledgedPlan: WorldAgentPlanView | undefined;
    try {
      if (decision === 'cancel') {
        // A lost cancellation reply must be reconciled before offering Start again.
        setCreationOutcome(undefined);
        const cancelled = await worldCreationOperation('cancel', worldId, sessionId, currentPlanId);
        if (currentScope.current !== requestScope) return;
        if (cancelled.data) retainCreationOutcome(cancelled.data);
        if (!cancelled.ok || !cancelled.data)
          throw new Error(
            cancelled.message ??
              'Cancellation needs confirmation. Check the original start result.',
          );
      } else if (decision === 'apply') {
        const marker = { scope, digest: review.plan.digest };
        writeLocal(applyKey, marker);
        setRetainedApply(marker);
        let result: { ok: boolean; message?: string };
        if (review.plan.creation) {
          // Once dispatch starts, an earlier prepared read can no longer prove
          // that cancellation is safe. A lost reply requires native recovery.
          setCreationOutcome(undefined);
          const creation = await worldCreationOperation('start', worldId, sessionId, currentPlanId);
          if (currentScope.current === requestScope && creation.data)
            retainCreationOutcome(creation.data);
          result = creation;
        } else {
          const applied = await post<{
            ok: boolean;
            message?: string;
            data: { data?: WorldAgentPlanView };
          }>('/api/world-agent/session/apply', body);
          if (currentScope.current !== requestScope) return;
          if (applied.ok) {
            const plan = applied.data?.data;
            if (
              !plan ||
              plan.id !== review.plan.id ||
              plan.digest !== review.plan.digest ||
              plan.status !== 'applied'
            )
              throw new Error(
                'The exact Apply result needs confirmation. Check its original result.',
              );
            setReview((previous) => previous && { ...previous, plan });
            // A later detail-read failure cannot erase an acknowledged world change.
            acknowledgedPlan = plan;
            notifyChanged(plan);
          }
          result = applied;
        }
        if (!result.ok)
          throw new Error(
            result.message ??
              'Apply was not confirmed. Refresh this exact plan before trying again.',
          );
        if (currentScope.current === requestScope) {
          if (!review.plan.creation) clearApplyMarker();
          setNotice(
            result.message ??
              (review.plan.creation
                ? 'The original Start result is shown below.'
                : 'This exact change was committed. Crafting or other ongoing work remains a separate action.'),
          );
        }
      } else {
        const result = await post<{ ok: boolean; message?: string; data: WorldAgentPlanView }>(
          '/api/world-agent/session/decision',
          { ...body, decision, digest: review.plan.digest },
        );
        if (!result.ok) throw new Error(result.message ?? 'Decision not accepted.');
        if (currentScope.current === requestScope) {
          setReview((previous) => previous && { ...previous, plan: result.data });
          acknowledgedPlan = result.data;
          notifyChanged(result.data);
        }
      }
      if (currentScope.current !== requestScope) return;
      const refreshed = await post<{ ok: boolean; message?: string; data: WorldAgentReviewView }>(
        '/api/world-agent/session/review',
        body,
      );
      if (currentScope.current !== requestScope) return;
      if (refreshed.ok) {
        setReview(refreshed.data);
        if (
          !acknowledgedPlan ||
          acknowledgedPlan.id !== refreshed.data.plan.id ||
          acknowledgedPlan.digest !== refreshed.data.plan.digest ||
          acknowledgedPlan.status !== refreshed.data.plan.status
        )
          notifyChanged(refreshed.data.plan, refreshed.data.draft.kind);
      } else {
        setError(
          refreshed.message ??
            'The action returned a result, but this exact review could not be refreshed.',
        );
        if (!acknowledgedPlan) onChanged();
      }
    } catch (failure) {
      if (currentScope.current === requestScope)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Outcome could not be confirmed. Refresh this exact plan.',
        );
    } finally {
      working.current = false;
      if (currentScope.current === requestScope) {
        setBusy(false);
        restoreFocus();
      }
    }
  }
  async function refreshReview() {
    if (working.current) return;
    const requestScope = scope;
    const restoreFocus = holdActionFocus(dialog.current);
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await post<{ ok: boolean; message?: string; data: WorldAgentReviewView }>(
        '/api/world-agent/session/review',
        body,
      );
      if (currentScope.current !== requestScope) return;
      if (result.ok) {
        const previousPlan = review?.plan;
        if (
          !previousPlan ||
          previousPlan.id !== result.data.plan.id ||
          previousPlan.revision !== result.data.plan.revision ||
          previousPlan.removal?.binding !== result.data.plan.removal?.binding
        )
          updateRemovalUnsafe(!!result.data.plan.removal);
        setReview(result.data);
        notifyChanged(result.data.plan, result.data.draft.kind);
      } else setError(result.message ?? 'This exact review remains unavailable.');
    } catch (failure) {
      if (currentScope.current === requestScope)
        setError(
          failure instanceof Error ? failure.message : 'This exact review remains unavailable.',
        );
    } finally {
      working.current = false;
      if (currentScope.current === requestScope) {
        setBusy(false);
        restoreFocus();
      }
    }
  }
  return (
    <ModalOverlay
      className="ol-root ol-modal-overlay ol-agent-review-overlay"
      isOpen
      isDismissable={!busy}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal
        ref={modal}
        className="ol-modal"
        onScroll={(event) => {
          if (!restoringReading.current) {
            readingPosition.current = event.currentTarget.scrollTop;
          }
        }}
      >
        <Dialog
          ref={dialog}
          className="ol-person-dialog ol-agent-work-review"
          aria-label={
            review?.plan.creation
              ? 'Review exact new world'
              : review?.plan.removal
                ? 'Review condition removal'
                : 'Review exact world change'
          }
        >
          <div className="ol-agent-work-review-heading">
            <h2>
              {review?.plan.creation
                ? 'Review and start this world'
                : review?.plan.removal
                  ? review.draft.intent
                  : 'Review exact change'}
            </h2>
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
                <Tag>
                  {worldAgentKindLabel[review.draft.kind]} · revision {review.draft.revision} ·{' '}
                  {review.plan.status}
                </Tag>
                <p>{review.draft.intent}</p>
                {review.openingPreview && (
                  <WorldCreationPreviewView preview={review.openingPreview} />
                )}
                {review.plan.creation && (
                  <section className="ol-world-creation" aria-label="Reviewed host and entry">
                    <h4>{review.plan.creation.target.label}</h4>
                    <p>{review.plan.creation.target.operatingProfile}</p>
                    <p>
                      The first character is assigned to account{' '}
                      {review.plan.creation.target.controlAccountId}. Entry requires ordinary
                      authentication and control admission.
                    </p>
                    <p>
                      Start authorizes this exact opening on this host. It cannot replace the
                      current world.
                    </p>
                    <WorldCreationTargetDetails target={review.plan.creation.target} />
                  </section>
                )}
                {!review.plan.removal && (
                  <WorldAgentPreparationDetails
                    preparation={review.plan.preparation ?? review.draft.preparation}
                    preparationRevision={review.plan.revision}
                    validation={review.plan.validation}
                  />
                )}
                {review.plan.removal && (
                  <WorldStatusRemovalDetails
                    key={authoringKey(
                      'removal-details',
                      worldId,
                      audience,
                      sessionId,
                      review.plan.id,
                      review.plan.revision,
                      review.plan.removal.binding,
                    )}
                    worldId={worldId}
                    sessionId={sessionId}
                    plan={review.plan}
                    removal={review.plan.removal}
                    canChange={canApply && !mutationReason && !canRetryApply}
                    busy={busy}
                    onUnsafeChange={updateRemovalUnsafe}
                    onCancellationBlocked={updateRemovalCancellationBlocked}
                    onReadReady={() => {
                      const requestScope = scope;
                      requestAnimationFrame(() => {
                        if (currentScope.current !== requestScope || !restoringReading.current)
                          return;
                        if (modal.current) modal.current.scrollTop = readingPosition.current;
                        restoringReading.current = false;
                      });
                    }}
                    onRevised={(plan) => {
                      updateRemovalUnsafe(true);
                      setReview(undefined);
                      setCurrentPlanId(plan.id);
                      onChanged(plan);
                    }}
                  />
                )}
                {review.plan.removal && (
                  <details>
                    <summary>Native checks and policy details</summary>
                    <WorldAgentPreparationDetails
                      preparation={review.plan.preparation ?? review.draft.preparation}
                      preparationRevision={review.plan.revision}
                      validation={review.plan.validation}
                    />
                  </details>
                )}
                <p>Affected records: {review.plan.impact.affected}.</p>
                <p>
                  {review.plan.status === 'applied'
                    ? review.plan.creation
                      ? 'This world was committed; its confirmed status is shown below.'
                      : 'This exact change has been applied; its native receipt remains below.'
                    : review.plan.creation
                      ? 'This is a saved review. Start is a separate authorized operation.'
                      : 'This is a saved review. The change has not been applied.'}
                  {review.draft.kind === 'recipe' &&
                    ' Installing a recipe does not create an item. Crafting is separate.'}
                </p>
                {review.plan.result && <p role="status">{review.plan.result.message}</p>}
                {review.plan.removal && review.plan.status === 'rejected' && (
                  <p role="status">
                    Removal cancelled. This saved review cannot apply a world change.
                  </p>
                )}
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
                      {
                        base: review.draft.base,
                        digest: review.plan.digest,
                        planId: currentPlanId,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
                {creationOutcome && (
                  <section
                    className="ol-world-creation"
                    aria-label="Original Start outcome"
                    role="status"
                  >
                    <h4>
                      {creationOutcome.status === 'ready'
                        ? 'Ready to enter'
                        : creationOutcome.status === 'created'
                          ? 'World created'
                          : creationOutcome.status === 'host-unavailable'
                            ? 'World created; host unavailable'
                            : creationOutcome.status === 'uncertain' ||
                                creationOutcome.status === 'dispatching'
                              ? 'Start outcome needs confirmation'
                              : creationOutcome.status === 'prepared'
                                ? 'Opening prepared'
                                : creationOutcome.status === 'cancelled'
                                  ? 'Start cancelled'
                                  : 'Start refused'}
                    </h4>
                    <p>{creationOutcome.message}</p>
                    {creationOutcome.status === 'ready' && creationOutcome.entryUrl && (
                      <a className="ol-btn" data-variant="primary" href={creationOutcome.entryUrl}>
                        Enter this world
                      </a>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
          <div className="ol-agent-work-review-footer">
            {review && review.plan.status !== 'applied' && (
              <p className="ol-caption ol-creator-save-status">
                {review.plan.creation
                  ? review.plan.status === 'approved'
                    ? 'This exact opening and host are approved. Start creates the world.'
                    : 'Approval records your decision. Starting this world remains separate.'
                  : review.plan.status === 'approved'
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
            {review?.plan.status === 'pending' && canStartCreation && (
              <>
                <Button
                  variant="primary"
                  busy={busy}
                  disabled={
                    busy ||
                    !canApply ||
                    !!mutationReason ||
                    !review.plan.validation.ok ||
                    removalUnsafe
                  }
                  onPress={() => void act('approve')}
                >
                  {review.plan.creation
                    ? 'Approve this exact opening and host'
                    : 'Approve this exact change'}
                </Button>
                {!review.plan.creation && !review.plan.removal && (
                  <Button
                    disabled={busy || !canApply || !!mutationReason}
                    variant="quiet"
                    onPress={() => void act('reject')}
                  >
                    Reject
                  </Button>
                )}
              </>
            )}
            {review?.plan.status === 'approved' && canStartCreation && (
              <Button
                variant="primary"
                busy={busy}
                disabled={
                  busy ||
                  !canApply ||
                  !!mutationReason ||
                  !!canRetryApply ||
                  removalUnsafe ||
                  (!!review.plan.creation && creationReading)
                }
                onPress={() => void act('apply')}
              >
                {review.plan.creation ? 'Start this world' : 'Apply approved change'}
              </Button>
            )}
            {canRetryApply && !review?.plan.creation && review?.plan.status !== 'applied' && (
              <>
                <p role="status">
                  {review.plan.removal
                    ? 'The original removal outcome needs confirmation. Check result retrieves or completes that same approved operation.'
                    : 'An earlier Apply for this exact review needs confirmation. Retry it to recover the same result; the server still checks whether a new change is permitted.'}
                </p>
                <Button busy={busy} disabled={busy} onPress={() => void act('apply', true)}>
                  {review.plan.removal ? 'Check result' : 'Retry original Apply'}
                </Button>
              </>
            )}
            {review?.plan.removal &&
              (review.plan.status === 'pending' || review.plan.status === 'approved') && (
                <Button
                  variant="quiet"
                  disabled={
                    busy || !canApply || !!mutationReason || !!canRetryApply || removalCancelBlocked
                  }
                  onPress={() => void act('reject')}
                >
                  Cancel removal
                </Button>
              )}
            {review?.plan.creation && (
              <>
                {creationOutcome?.status === 'prepared' &&
                  (review.plan.status === 'pending' || review.plan.status === 'approved') && (
                    <>
                      <Button
                        variant="quiet"
                        disabled={busy || creationReading || !canApply || !!mutationReason}
                        onPress={() => void act('cancel')}
                      >
                        Cancel this start
                      </Button>
                      <p className="ol-caption">
                        Cancellation withdraws this prepared start before dispatch. The saved
                        opening remains available.
                      </p>
                    </>
                  )}
                {(creationOutcome?.status === 'refused' ||
                  creationOutcome?.status === 'cancelled') && (
                  <p role="status">
                    Prepare a new exact review in Work before starting another operation.
                  </p>
                )}
                {canRetryApply && (
                  <p role="status">
                    The original Start needs confirmation. Checking its saved result cannot create
                    another world.
                  </p>
                )}
                <Button
                  disabled={busy || creationReading}
                  busy={creationReading}
                  onPress={() => void recoverCreation()}
                >
                  Check original start result
                </Button>
              </>
            )}
            <Button variant="quiet" disabled={busy} onPress={() => void refreshReview()}>
              Refresh exact review
            </Button>
            <Button variant="quiet" disabled={busy} onPress={onClose}>
              {review?.plan.removal ? 'Hide review' : 'Close review'}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
