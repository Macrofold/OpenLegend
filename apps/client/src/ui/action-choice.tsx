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
          aria-disabled={!action.enabled}
          onPress={() => {
            if (action.enabled) run(action);
          }}
        >
          <Icon name={icon} badge={badge} fallbackLabel={action.label} />
          <span>
            {action.label}
            {!!identity?.length && (
              <small className="ol-item-identity">
                {identity.map(([label, value]) => `${label}: ${value}`).join(' · ')}
              </small>
            )}
            <small className="ol-item-reason">{actionCommitment(action)}</small>
          </span>
        </AriaButton>
      </Explanation>
    </div>
  );
}
