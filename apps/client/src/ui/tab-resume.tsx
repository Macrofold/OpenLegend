import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { Button } from '../design-system/components';
import './tab-resume.css';

export function TabResumeDialog({
  busy,
  loggingOut,
  error,
  resume,
  logout,
}: {
  busy: boolean;
  loggingOut: boolean;
  error: string;
  resume(): void;
  logout(): void;
}) {
  const title = 'Game Paused';
  return (
    <ModalOverlay className="ol-root ol-modal-overlay" isOpen isKeyboardDismissDisabled>
      <Modal className="ol-modal ol-tab-resume">
        <Dialog aria-label={title} className="ol-person-dialog">
          <header className="ol-modal-head">
            <h2 className="ol-heading">{title}</h2>
          </header>
          <div className="ol-person-form">
            <p>OpenLegend is open in another tab.</p>
            {error && <p role="alert">{error}</p>}
          </div>
          <footer className="ol-modal-actions">
            <Button
              variant="secondary"
              busy={loggingOut}
              isDisabled={busy && !loggingOut}
              onPress={logout}
            >
              Log Out
            </Button>
            <Button
              variant="primary"
              busy={busy && !loggingOut}
              isDisabled={loggingOut}
              onPress={resume}
              autoFocus
            >
              Resume Here
            </Button>
          </footer>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
