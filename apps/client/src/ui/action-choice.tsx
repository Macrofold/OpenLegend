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
  const pickupLimit = input?.type === 'pickup' ? action.pickupLimit : undefined;
  const defaultAmount = task?.quantity ?? pickupLimit;
  const [amount, setAmount] = useState<string>();
  const quantity = amount === undefined ? defaultAmount : Number(amount);
  const validQuantity =
    defaultAmount === undefined ||
    (Number.isSafeInteger(quantity) &&
      quantity! > 0 &&
      (pickupLimit === undefined || quantity! <= pickupLimit));
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
            const command =
              task && input
                ? { ...input, cooperationTask: { ...task, quantity: quantity! } }
                : input && pickupLimit !== undefined && amount !== undefined
                  ? { ...input, quantity }
                  : undefined;
            run(command ? { ...action, intent: { kind: 'command', command } } : action);
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
      {defaultAmount !== undefined && (
        <label className="ol-field">
          <span>
            {pickupLimit === undefined
              ? 'Total items requested'
              : `Quantity (up to ${pickupLimit})`}
          </span>
          <input
            type="number"
            min={1}
            step={1}
            max={pickupLimit}
            value={amount ?? String(defaultAmount)}
            disabled={!action.enabled}
            aria-invalid={!validQuantity}
            onChange={(event) => setAmount(event.target.value)}
          />
          {!validQuantity && (
            <small>
              {pickupLimit === undefined
                ? 'Choose a positive whole number.'
                : `Choose a whole number from 1 to ${pickupLimit}.`}
            </small>
          )}
        </label>
      )}
    </div>
  );
}
