import { useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import type { CatalogueAction } from '@open-legend/protocol';
import { actionCommitment } from '../action-browser';
import { Explanation, Icon } from '../design-system/components';

/** Blocked rows retain hover and keyboard explanations; only enabled actions execute. */
export function ActionChoice({
  action,
  icon,
  badge,
  run,
  hideTarget = false,
}: {
  action: CatalogueAction;
  icon: string;
  badge?: string;
  hideTarget?: boolean;
  run(action: CatalogueAction): void;
}) {
  const input = action.intent.kind === 'command' ? action.intent.command : undefined;
  const task =
    input?.type === 'outing' && input.cooperationTask?.kind === 'prepare'
      ? input.cooperationTask
      : undefined;
  const [amount, setAmount] = useState<string>();
  const quantity = amount === undefined ? task?.quantity : Number(amount);
  const validQuantity = !task || (Number.isSafeInteger(quantity) && quantity! > 0);
  const identity = action.facts?.filter(
    ([label]) => label === 'Tool' || (!hideTarget && label === 'Target'),
  );
  return (
    <div className="ol-action-choice" data-action-choice={action.id}>
      <Explanation
        title={action.label}
        text={`${action.description}${!action.enabled ? `\n\n${action.reason ?? 'Unavailable right now.'}` : ''}`}
        facts={action.facts}
      >
        <AriaButton
          data-picker-row
          data-catalogue-action={action.id}
          className="ol-item"
          aria-disabled={!action.enabled || !validQuantity}
          onPress={() => {
            if (!action.enabled || !validQuantity) return;
            run(
              task && input
                ? {
                    ...action,
                    intent: {
                      kind: 'command',
                      command: {
                        ...input,
                        cooperationTask: { ...task, quantity: quantity! },
                      },
                    },
                  }
                : action,
            );
          }}
        >
          <Icon name={icon} badge={badge} fallbackLabel={action.label} />
          <span>
            {action.label}
            {!!identity?.length && (
              <small className="ol-item-identity">
                {identity.map(([label, value]) => `${label}: ${value}`).join('; ')}
              </small>
            )}
            <small className="ol-item-reason">{actionCommitment(action)}</small>
          </span>
        </AriaButton>
      </Explanation>
      {task && (
        <label className="ol-field">
          <span>Total items requested</span>
          <input
            type="number"
            min={1}
            step={1}
            value={amount ?? String(task.quantity)}
            disabled={!action.enabled}
            aria-invalid={!validQuantity}
            onChange={(event) => setAmount(event.target.value)}
          />
          {!validQuantity && <small>Choose a positive whole number.</small>}
        </label>
      )}
    </div>
  );
}
