import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Button, Icon, IconButton, Tag } from '../design-system/components';

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
  onSave(): Promise<boolean>;
  onDiscard?(): void;
  onClose(): void;
}) {
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
      setPosition({
        x: Number.parseFloat(element.style.left) + (left - bounds.left) / scale,
        y: Number.parseFloat(element.style.top) + (top - bounds.top) / scale,
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
  const requestClose = () => {
    if (!saving) dirty ? setConfirmClose(true) : onClose();
  };
  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    const bounds = editor.current?.getBoundingClientRect();
    if (!bounds) return;
    bringForward();
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      left: position.x,
      top: position.y,
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
      style={{ left: position.x, top: position.y, zIndex: layer }}
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
        </div>
        <IconButton icon="ui.close" label={`Close ${title}`} onPress={requestClose} />
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
              <span>{tab.label}</span>
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
          ) : dirty ? (
            'Unsaved changes'
          ) : (
            'All changes saved'
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
            Save
          </Button>
        </div>
      </footer>
      {confirmClose && (
        <div className="ol-editor-confirm" role="alertdialog" aria-label="Unsaved changes">
          <div className="ol-card">
            <h3 className="ol-heading">There are unsaved changes. What would you like to do?</h3>
            <div>
              <Button variant="quiet" onPress={() => setConfirmClose(false)}>
                Keep editing
              </Button>
              <Button variant="secondary" disabled={saving} onPress={onClose}>
                Discard and Close
              </Button>
              <Button
                variant="primary"
                busy={saving}
                disabled={saving || !!saveReason}
                onPress={() => void onSave().then((saved) => saved && onClose())}
              >
                Save and Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
