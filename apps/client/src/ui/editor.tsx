import { LoadingDialog, LoadingIndicator } from '../design-system/loading';
import { useId, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Modal, ModalOverlay } from 'react-aria-components';
import { Button, Icon, IconButton, Tag } from '../design-system/components';
import './creator-workspaces.css';

let topLayer = 1200;

export type EditorTab = {
  id: string;
  label: string;
  icon: string;
  content: ReactNode;
};

export function EditorPanel({
  title,
  tabs,
  dirty,
  saving,
  error,
  saveReason,
  closeGuard,
  scope,
  saveLabel = 'Save',
  onSave,
  onDiscard,
  onClose,
}: {
  title: string;
  tabs: EditorTab[];
  dirty: boolean;
  saving: boolean;
  error?: string;
  saveReason?: string;
  /** A separately saved section can guard Close without changing this Save action's scope. */
  closeGuard?: { reason: string; pending: boolean; discard(): void };
  scope?: string;
  saveLabel?: string;
  onSave(): Promise<boolean>;
  onDiscard?(): void;
  onClose(): void;
}) {
  const scopeId = useId();
  const [active, setActive] = useState(tabs[0]?.id ?? '');
  const [position, setPosition] = useState(() => ({
    x: Math.max(12, (innerWidth - Math.min(860, innerWidth - 24)) / 2),
    y: Math.max(12, (innerHeight - Math.min(700, innerHeight - 24)) / 2),
  }));
  const [layer, setLayer] = useState(() => ++topLayer);
  const [confirmClose, setConfirmClose] = useState(false);
  const editor = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = editor.current;
    if (!element) return;
    const clamp = () => {
      const bounds = element.getBoundingClientRect();
      const scale = bounds.width / element.offsetWidth || 1;
      const left = Math.max(8, Math.min(innerWidth - bounds.width - 8, bounds.left));
      const top = Math.max(8, Math.min(innerHeight - bounds.height - 8, bounds.top));
      if (Math.abs(left - bounds.left) < 0.5 && Math.abs(top - bounds.top) < 0.5) return;
      // Resize and size observation may both run before React paints. Derive one
      // absolute correction from the rendered position, rather than adding it twice.
      const style = getComputedStyle(element);
      setPosition({
        x: Number.parseFloat(style.left) + (left - bounds.left) / scale,
        y: Number.parseFloat(style.top) + (top - bounds.top) / scale,
      });
    };
    clamp();
    const observer = new ResizeObserver(clamp);
    observer.observe(element);
    window.addEventListener('resize', clamp);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', clamp);
    };
  }, []);
  const drag = useRef<
    | { x: number; y: number; left: number; top: number; boundsLeft: number; boundsTop: number }
    | undefined
  >(undefined);
  const selected = tabs.find((tab) => tab.id === active) ?? tabs[0];
  const bringForward = () => setLayer(++topLayer);
  const center = () => {
    const element = editor.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const scale = bounds.width / element.offsetWidth || 1;
    const style = getComputedStyle(element);
    setPosition({
      x:
        Number.parseFloat(style.left) +
        (Math.max(8, (innerWidth - bounds.width) / 2) - bounds.left) / scale,
      y:
        Number.parseFloat(style.top) +
        (Math.max(8, (innerHeight - bounds.height) / 2) - bounds.top) / scale,
    });
  };
  const requestClose = () => {
    if (!saving && !closeGuard?.pending) dirty || closeGuard ? setConfirmClose(true) : onClose();
  };
  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    const element = editor.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    bringForward();
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      left: Number.parseFloat(style.left),
      top: Number.parseFloat(style.top),
      boundsLeft: bounds.left,
      boundsTop: bounds.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const element = editor.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const scale = bounds.width / element.offsetWidth || 1;
    const left = Math.max(
      8,
      Math.min(
        innerWidth - bounds.width - 8,
        drag.current.boundsLeft + event.clientX - drag.current.x,
      ),
    );
    const top = Math.max(
      8,
      Math.min(
        innerHeight - bounds.height - 8,
        drag.current.boundsTop + event.clientY - drag.current.y,
      ),
    );
    setPosition({
      x: drag.current.left + (left - drag.current.boundsLeft) / scale,
      y: drag.current.top + (top - drag.current.boundsTop) / scale,
    });
  };
  return (
    <section
      ref={editor}
      className="ol-root ol-editor"
      role="dialog"
      aria-label={title}
      aria-describedby={scope ? scopeId : undefined}
      style={{
        // Constrain the painted window during viewport reflow, before a busy React
        // resize callback can run. Keep the preferred desktop coordinates separately.
        left: `clamp(calc(8px / var(--ui-scale, 1)), ${position.x}px, calc((100dvw - 8px) / var(--ui-scale, 1) - var(--editor-width)))`,
        top: `clamp(calc(8px / var(--ui-scale, 1)), ${position.y}px, calc((100dvh - 8px) / var(--ui-scale, 1) - var(--editor-height)))`,
        zIndex: layer,
      }}
      onPointerDown={bringForward}
    >
      <header
        className="ol-editor-head"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={() => (drag.current = undefined)}
        onPointerCancel={() => (drag.current = undefined)}
      >
        <div>
          <Tag tone="highlight">God mode</Tag>
          <h2 className="ol-heading">{title}</h2>
          {scope && (
            <p className="ol-creator-scope" id={scopeId}>
              {scope}
            </p>
          )}
        </div>
        <div className="ol-creator-window-tools">
          <IconButton icon="ui.recenter" label="Center window" onPress={center} />
          <IconButton
            icon="ui.close"
            label={`Close ${title}`}
            disabled={saving || closeGuard?.pending}
            onPress={requestClose}
          />
        </div>
      </header>
      <div className="ol-editor-layout">
        <nav className="ol-editor-tabs" aria-label={`${title} sections`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="ol-editor-tab"
              data-selected={selected?.id === tab.id || undefined}
              aria-label={tab.label}
              aria-current={selected?.id === tab.id ? 'page' : undefined}
              title={tab.label}
              onClick={() => setActive(tab.id)}
            >
              <Icon name={tab.icon} />
              <span className="ol-editor-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        <main className="ol-editor-content" inert={saving || undefined}>
          {selected?.content}
        </main>
      </div>
      <footer className="ol-editor-actions">
        <span className="ol-editor-state">
          {error ? (
            <span role="alert">{error}</span>
          ) : saveReason ? (
            <span role="status">{saveReason}</span>
          ) : saving ? (
            <LoadingIndicator active={saving} label="Saving changes" />
          ) : dirty ? (
            'Unsaved changes'
          ) : closeGuard ? (
            closeGuard.reason
          ) : (
            'No unsaved changes'
          )}
        </span>
        <div className="ol-editor-save-actions">
          {dirty && onDiscard && (
            <Button variant="quiet" disabled={saving} onPress={onDiscard}>
              Discard changes
            </Button>
          )}
          <Button
            variant="primary"
            busy={saving}
            disabled={!dirty || saving || !!saveReason}
            onPress={() => void onSave()}
          >
            {saveLabel}
          </Button>
        </div>
      </footer>
      {confirmClose && (
        <ModalOverlay
          className="ol-root ol-modal-overlay"
          style={{ zIndex: layer + 1 }}
          isOpen
          isDismissable={!saving}
          isKeyboardDismissDisabled={saving}
          onOpenChange={(open) => !open && setConfirmClose(false)}
        >
          <Modal className="ol-modal">
            <LoadingDialog
              className="ol-person-dialog ol-creator-confirm"
              role="alertdialog"
              aria-label={`Unsaved changes in ${title}`}
            >
              <h3 className="ol-heading">Keep the changes to {title.replace(/^Edit /, '')}?</h3>
              <p>
                {closeGuard?.reason ??
                  'Your edits have not been saved. Keep editing, discard this draft, or save before closing.'}
              </p>
              <div className="ol-creator-window-tools">
                <Button variant="quiet" disabled={saving} onPress={() => setConfirmClose(false)}>
                  Keep editing
                </Button>
                <Button
                  variant="secondary"
                  disabled={saving || closeGuard?.pending}
                  onPress={() => {
                    onDiscard?.();
                    closeGuard?.discard();
                    onClose();
                  }}
                >
                  Discard and Close
                </Button>
                <Button
                  variant="primary"
                  busy={saving}
                  disabled={saving || !!saveReason || !!closeGuard}
                  onPress={() => void onSave().then((saved) => saved && onClose())}
                >
                  Save and Close
                </Button>
              </div>
            </LoadingDialog>
          </Modal>
        </ModalOverlay>
      )}
    </section>
  );
}
