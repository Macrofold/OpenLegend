import { useId } from 'react';
import { Button as AriaButton } from 'react-aria-components';

export function FailureStatus({ reason }: { reason?: string }) {
  const detail = reason || 'The message could not be completed.';
  const detailId = useId();
  return (
    <span className="ol-failure-wrap">
      <AriaButton
        className="ol-message-failure"
        aria-label={`Failed: ${detail}`}
        aria-describedby={detailId}
      >
        Failed
      </AriaButton>
      <span id={detailId} className="ol-failure-detail" role="tooltip">
        {detail}
      </span>
    </span>
  );
}
