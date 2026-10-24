import { useEffect, useRef, useState } from 'react';
import type {
  ApiResult,
  CommandInput,
  ConstructionPlan,
  ConstructionView,
  GameView,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button, SelectField } from '../design-system/components';
import { LoadingIndicator } from '../design-system/loading';
import type { ConstructionWorkProps } from './construction';

/** The reviewed construction remains owned by Build. This only offers its first
 * ordinary phase; accepting it will not start or authorize that physical work. */
export function ConstructionCooperation({
  view,
  plan,
  cooperation,
  ready,
  operations,
}: {
  view: GameView;
  plan?: ConstructionPlan;
  cooperation?: Extract<ConstructionView, { ok: true }>['cooperation'];
  ready: boolean;
  operations: ConstructionWorkProps['operations'];
}) {
  const owner = JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.player.id,
    view.access?.privateDraftScope,
  ]);
  const [selection, setSelection] = useState<{ owner: string; id: string; label: string }>();
  ready = ready && view.access?.controlling !== false;
  const person = selection?.owner === owner ? selection : undefined;
  const present = cooperation?.people.find((candidate) => candidate.id === person?.id);
  const key = JSON.stringify([owner, view.commandEpoch, plan, person?.id, ready, !!present]);
  const current = useRef(key);
  current.current = key;
  const [review, setReview] = useState<{ key: string; input: CommandInput; result: ApiResult }>();
  const [checking, setChecking] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setChecking(false);
    if (!ready || !plan || !present || !cooperation) return;
    const controller = new AbortController(),
      input: CommandInput = {
        type: 'outing',
        outingOperation: 'propose',
        cooperationKind: 'help',
        targetId: present.id,
        cooperationTask: { kind: 'construction', plan },
      };
    setChecking(true);
    void post<ApiResult>(
      '/api/activity-preview',
      input,
      AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    )
      .then((result) => {
        if (!controller.signal.aborted) setReview({ key, input, result });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setReview({
            key,
            input,
            result: {
              ok: false,
              code: 'unavailable',
              message:
                'The proposed work could not be checked. Refresh the work offer to try again. Nothing was sent.',
            },
          });
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [key, retry]);
  if (!cooperation) return null;
  const selected = review?.key === key ? review : undefined;
  return (
    <details>
      <summary>Offer my reviewed work to someone</summary>
      <p>
        Only the first ordinary operation in this reviewed plan is offered. Sending starts no
        construction. {cooperation.description}
      </p>
      <SelectField
        label="Offer this work to"
        value={person?.id ?? ''}
        placeholder="Choose a nearby person"
        options={[
          ...(person && !present
            ? [{ id: person.id, label: person.label + ' — not currently available' }]
            : []),
          ...cooperation.people,
        ]}
        onChange={(id) => {
          const candidate = cooperation.people.find((candidate) => candidate.id === id);
          setSelection(candidate ? { owner, ...candidate } : undefined);
        }}
      />
      {!cooperation.people.length && (
        <p>No person is currently available nearby to review these terms.</p>
      )}
      <LoadingIndicator active={checking} label="Checking proposed work" />
      {selected && <p role="status">{selected.result.message}</p>}
      <div className="ol-actions">
        <Button
          disabled={!ready || !present || checking || !!operations.pending}
          onPress={() => setRetry((value) => value + 1)}
        >
          Refresh work offer
        </Button>
        <Button
          disabled={!ready || !present || checking || !selected?.result.ok || !!operations.pending}
          onPress={() => {
            if (current.current !== key || !selected?.result.ok) return;
            void operations.dispatch({
              id: 'offer-reviewed-construction',
              label: 'Offer my reviewed work',
              enabled: true,
              command: selected.input,
            });
          }}
        >
          Send work proposal
        </Button>
      </div>
    </details>
  );
}
