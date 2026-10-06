import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type { ApiResult } from '@open-legend/protocol';
import { Button } from '../design-system/components';
import './tab-resume.css';
import './lethal-attack-dialog.css';

export function LethalAttackDialog({
  review,
  busy,
  cancel,
  confirm,
}: {
  review: NonNullable<ApiResult['lethalReview']>;
  busy: boolean;
  cancel(): void;
  confirm(): void;
}) {
  return (
    <ModalOverlay
      className="ol-root ol-modal-overlay"
      isOpen
      isDismissable={!busy}
      isKeyboardDismissDisabled={busy}
      onOpenChange={(open) => {
        if (!open && !busy) cancel();
      }}
    >
      <Modal className="ol-modal ol-tab-resume ol-lethal-review">
        <Dialog
          aria-label={review.title}
          aria-describedby="lethal-review-description"
          className="ol-person-dialog"
        >
          <header className="ol-modal-head">
            <h2 className="ol-heading">{review.title}</h2>
          </header>
          <div className="ol-person-form">
            <p>{review.targetLabel}</p>
            <p id="lethal-review-description">{review.description}</p>
            <p>{review.attack.name}</p>
            {review.attack.tool && <p>{review.attack.tool}</p>}
            <ul>
              {review.attack.facts
                .filter((fact) => fact.critical)
                .map((fact) => (
                  <li key={fact.name}>
                    {fact.name}: {fact.value}
                  </li>
                ))}
            </ul>
          </div>
          <footer className="ol-modal-actions">
            <Button variant="secondary" autoFocus isDisabled={busy} onPress={cancel}>
              {review.cancelLabel}
            </Button>
            <Button variant="primary" busy={busy} onPress={confirm}>
              {review.confirmLabel}
            </Button>
          </footer>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
