import { Button as AriaButton } from 'react-aria-components';
import type { CatalogueAction } from '@open-legend/protocol';
import { actionCommitment } from '../action-browser';
import { Explanation, Icon } from '../design-system/components';

/** Command and disclosure are siblings: touch/keyboard details never execute an action. */
export function ActionChoice({
  action,
  icon,
  badge,
  run,
  expanded,
  expand,
}: {
  action: CatalogueAction;
  icon: string;
  badge?: string;
  run(action: CatalogueAction): void;
  expanded: boolean;
  expand(open: boolean): void;
}) {
  const identity = action.facts?.filter(([label]) => label === 'Tool' || label === 'Target');
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
          <Icon name={icon} badge={badge} />
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
      <details
        className="ol-action-detail"
        open={expanded}
        onToggle={(event) => expand(event.currentTarget.open)}
      >
        <summary>Details for {action.label}</summary>
        {expanded && (
          <>
            <p className="ol-prose">{action.description}</p>
            {!action.enabled && <p>{action.reason ?? 'Unavailable right now.'}</p>}
            {!!action.facts?.length && (
              <dl>
                {action.facts.map(([label, value]) => (
                  <div className="ol-fact" key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        )}
      </details>
    </div>
  );
}
