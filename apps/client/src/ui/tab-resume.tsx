import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { Button } from '../design-system/components';
import './tab-resume.css';

export function TabResumeDialog({
  character,
  elsewhere,
  busy,
  error,
  resume,
}: {
  character: string;
  elsewhere: boolean;
  busy: boolean;
  error: string;
  resume(): void;
}) {
  const title = elsewhere ? 'Open Legend is open in another tab.' : 'Game paused';
  return (
    <ModalOverlay className="ol-root ol-modal-overlay" isOpen isKeyboardDismissDisabled>
      <Modal className="ol-modal ol-tab-resume">
        <Dialog aria-label={title} className="ol-person-dialog">
          <header className="ol-modal-head">
            <h2 className="ol-heading">{title}</h2>
          </header>
          <div className="ol-person-form">
            <p>
              {elsewhere
                ? `Resume as ${character} here to pause the other tab.`
                : `Resume as ${character} here. Leaving this tab pauses your play.`}
            </p>
            {error && <p role="alert">{error}</p>}
          </div>
          <footer className="ol-modal-actions">
            <Button variant="primary" busy={busy} onPress={resume} autoFocus>
              {busy ? 'Resuming…' : 'Resume here'}
            </Button>
          </footer>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
