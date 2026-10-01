import type { WorldAgentReviewView, WorldAgentPlanView } from '@open-legend/protocol';
import { useEffect, useRef, useState } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { Button, Tag } from '../design-system/components';
import { post } from '../api';

/** Only an exact server-returned plan can be approved. Prose is never approval authority.
 * docs/invention-workshop-tools.md#5-explicit-apply-and-revision-continuity
 */
export function WorldAgentReview({
  worldId,
  sessionId,
  planId,
  canApply,
  onClose,
  onChanged,
}: {
  worldId: string;
  sessionId: string;
  planId: string;
  canApply: boolean;
  onClose(): void;
  onChanged(): void;
}) {
  const [review, setReview] = useState<WorldAgentReviewView>();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const working = useRef(false),
    alive = useRef(true);
  const dialog = useRef<HTMLDivElement>(null);
  // Approval removes its button. Keep keyboard focus inside the review for the next action.
  useEffect(() => {
    dialog.current?.focus();
  }, [review?.plan.status]);
  const body = { worldId, sessionId, planId };
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void post<{ ok: boolean; message?: string; data: WorldAgentReviewView }>(
      '/api/world-agent/session/review',
      body,
      controller.signal,
    )
      .then((r) => {
        if (!alive.current) return;
        if (r.ok) setReview(r.data);
        else setError(r.message ?? 'Review unavailable.');
      })
      .catch((e) => {
        if (alive.current) setError(e instanceof Error ? e.message : 'Review unavailable.');
      });
    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [worldId, sessionId, planId]);
  async function act(decision: 'approve' | 'reject' | 'apply') {
    if (!review || working.current || !canApply) return;
    working.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (decision === 'apply') {
        const r = await post<{ ok: boolean; message?: string }>(
          '/api/world-agent/session/apply',
          body,
        );
        if (!r.ok)
          throw new Error(
            r.message ?? 'Apply did not succeed; inspect current state before trying again.',
          );
        if (alive.current)
          setNotice(
            r.message ?? 'The change was committed. Crafting or other ongoing work is separate.',
          );
      } else {
        const r = await post<{ ok: boolean; message?: string; data: WorldAgentPlanView }>(
          '/api/world-agent/session/decision',
          { ...body, decision, digest: review.plan.digest },
        );
        if (!r.ok) throw new Error(r.message ?? 'Decision not accepted.');
        if (alive.current) setReview((v) => v && { ...v, plan: r.data });
      }
      const refreshed = await post<{ ok: boolean; message?: string; data: WorldAgentReviewView }>(
        '/api/world-agent/session/review',
        body,
      );
      if (refreshed.ok && alive.current) setReview(refreshed.data);
      onChanged();
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : 'Outcome could not be confirmed. Refresh this exact plan.',
        );
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
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
      <Modal className="ol-modal">
        <Dialog ref={dialog} className="ol-person-dialog" aria-label="Review exact world change">
          <h2>Review exact change</h2>
          {review && (
            <>
              <Tag>
                {review.draft.kind} · revision {review.draft.revision} · {review.plan.status}
              </Tag>
              <p>{review.draft.intent}</p>
              <p>{review.plan.validation.semantics}</p>
              <p>{review.plan.validation.message}</p>
              <p className="ol-caption">
                Coverage: {review.plan.validation.coverage.replace(/\.$/, '')}. Native validation is
                not proof that every requested meaning or possible interaction was checked.
              </p>
              <p>Affected records in this adapter's scope: {review.plan.impact.affected}.</p>
              {(review.plan.preparation ?? review.draft.preparation) &&
                (() => {
                  const preparation = review.plan.preparation ?? review.draft.preparation;
                  if (!preparation) return null;
                  const label = (ref: { kind: string; id: string; version: string }) =>
                    preparation.graph.nodes.find(
                      (node) =>
                        node.ref.kind === ref.kind &&
                        node.ref.id === ref.id &&
                        node.ref.version === ref.version,
                    )?.label ?? ref.id;
                  return (
                    <>
                      <p>{preparation.presentation.description}</p>
                      <p>
                        {review.plan.status === 'applied'
                          ? 'This change has been applied; see the native result below.'
                          : 'Saved for review. No world change has been applied.'}
                        {review.draft.kind === 'recipe' &&
                          ' Saving or installing a recipe does not create an item; crafting is a separate action.'}
                      </p>
                      <details open>
                        <summary>Requirements and checks</summary>
                        <ul>
                          {preparation.requirements.map((requirement) => (
                            <li key={requirement.id}>
                              <q>{requirement.source.text}</q> — {requirement.finding} (
                              {requirement.status})
                            </li>
                          ))}
                        </ul>
                        <ul>
                          {preparation.checks.map((check) => (
                            <li key={check.id}>
                              {check.status}: {check.finding}
                            </li>
                          ))}
                        </ul>
                        <p className="ol-caption">
                          These checks cover the supported native rules. Broader interactions have
                          not been evaluated.
                        </p>
                      </details>
                      <details>
                        <summary>Materials and dependencies</summary>
                        <ul>
                          {preparation.graph.edges.map((edge) => (
                            <li key={edge.id}>
                              {label(edge.source)} → {edge.relation.replaceAll('_', ' ')} →{' '}
                              {label(edge.target)}
                              {edge.role && ` (${edge.role})`}
                              {edge.quantity !== undefined && ` × ${edge.quantity}`}
                            </li>
                          ))}
                        </ul>
                        {preparation.graph.unresolved.map((finding, index) => (
                          <p key={index}>
                            {finding.field}: {finding.message}
                          </p>
                        ))}
                        <p className="ol-caption">
                          {preparation.graph.coverage.scope}:{' '}
                          {preparation.graph.coverage.projection}. Proposed outputs are not
                          installed definitions or possessed items.
                        </p>
                      </details>
                    </>
                  );
                })()}
              {review.plan.status !== 'applied' &&
                review.plan.validation.activationRequiresResume && (
                  <p>Applying this change requires a running world. Approval does not resume it.</p>
                )}
              {!!review.plan.validation.structuralErrors.length && (
                <p>{review.plan.validation.structuralErrors.join('\n')}</p>
              )}
              <details>
                <summary>Exact candidate</summary>
                <pre className="ol-agent-json">{JSON.stringify(review.draft.payload, null, 2)}</pre>
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
              {review.plan.result && <p role="status">{review.plan.result.message}</p>}
              {canApply && review.plan.status === 'pending' && (
                <div className="ol-agent-tools">
                  <Button
                    busy={busy}
                    disabled={!review.plan.validation.ok}
                    onPress={() => void act('approve')}
                  >
                    Approve this exact change
                  </Button>
                  <Button disabled={busy} variant="quiet" onPress={() => void act('reject')}>
                    Reject
                  </Button>
                </div>
              )}
              {canApply && review.plan.status === 'approved' && (
                <Button busy={busy} onPress={() => void act('apply')}>
                  Apply approved change
                </Button>
              )}
            </>
          )}
          {notice && notice !== review?.plan.result?.message && <p role="status">{notice}</p>}
          {error && <p role="alert">{error}</p>}
          <Button variant="quiet" disabled={busy} onPress={onClose}>
            Close review
          </Button>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
