import { useId, useRef, useState, type ReactNode } from 'react';
import { Modal, ModalOverlay, Toolbar } from 'react-aria-components';
import { Button, Icon, TextTooltip } from '../design-system/components';
import { LoadingDialog, LoadingIndicator, LoadingRegion } from '../design-system/loading';

/** A compact utility retains the shared button, tooltip and keyboard behavior. */
export function LabIconButton({
  icon,
  label,
  onPress,
  disabled,
  pressed,
}: {
  icon: string;
  label: string;
  onPress(): void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <TextTooltip text={label}>
      <Button
        size="sm"
        variant="quiet"
        className="cl-icon-button"
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onPress={onPress}
      >
        <Icon name={icon} size={16} />
      </Button>
    </TextTooltip>
  );
}

export function LabSearch({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="cl-search">
      <label className="cl-sr-only" htmlFor={id}>
        {label}
      </label>
      <Icon name="ui.search" size={16} />
      <input
        id={id}
        ref={input}
        type="search"
        value={value}
        placeholder={placeholder ?? label}
        onChange={(event) => onChange(event.target.value)}
      />
      <LabIconButton
        icon="ui.close"
        label={`Clear ${label.toLocaleLowerCase()}`}
        disabled={!value}
        onPress={() => {
          onChange('');
          input.current?.focus();
        }}
      />
    </div>
  );
}

export function LabPane({
  title,
  description,
  actions,
  navigation,
  toolbar,
  footer,
  children,
  pending = false,
  className = '',
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  navigation?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  pending?: boolean;
  className?: string;
}) {
  return (
    <section className={`cl-pane ${className}`} aria-label={title}>
      <header className="cl-pane-header">
        <div className="cl-pane-title">
          <strong>{title}</strong>
          {description && <small>{description}</small>}
        </div>
        {actions}
      </header>
      {navigation}
      {toolbar && <div className="cl-pane-toolbar">{toolbar}</div>}
      <LoadingRegion className="cl-pane-body">
        {children}
        <LoadingIndicator active={pending} label={`Reading ${title.toLocaleLowerCase()}`} />
      </LoadingRegion>
      {footer && <footer className="cl-pane-footer">{footer}</footer>}
    </section>
  );
}

export function LabModal({
  title,
  children,
  footer,
  toolbar,
  close,
  wide = false,
  pending = false,
  editor = false,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  toolbar?: ReactNode;
  close(): void;
  wide?: boolean;
  pending?: boolean;
  editor?: boolean;
}) {
  return (
    <ModalOverlay
      className="ol-root cl-modal-overlay"
      isOpen
      isDismissable={!pending}
      onOpenChange={(open) => !open && close()}
    >
      <Modal className={`cl-modal ${wide ? 'cl-modal-wide' : ''}`}>
        <LoadingDialog aria-label={title} className="cl-dialog">
          <header className="cl-modal-header">
            <h2 slot="title">{title}</h2>
            <LabIconButton icon="ui.close" label={`Close ${title}`} onPress={close} />
          </header>
          {toolbar && <div className="cl-modal-toolbar">{toolbar}</div>}
          <div className={`cl-modal-body ${editor ? 'cl-modal-editor' : ''}`}>{children}</div>
          {footer && <footer className="cl-modal-footer">{footer}</footer>}
          <LoadingIndicator active={pending} label={title} />
        </LoadingDialog>
      </Modal>
    </ModalOverlay>
  );
}

export function LabTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string; icon?: string; disabled?: boolean }[];
  value: T;
  onChange(value: T): void;
}) {
  return (
    <Toolbar aria-label={label} className="cl-tabs">
      {options.map((option) => (
        <Button
          key={option.id}
          size="sm"
          variant="quiet"
          aria-pressed={value === option.id}
          disabled={option.disabled}
          onPress={() => onChange(option.id)}
        >
          {option.icon && <Icon name={option.icon} size={16} />}
          {option.label}
        </Button>
      ))}
    </Toolbar>
  );
}

export function LabEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="cl-empty">
      <p>{title}</p>
      {children}
    </div>
  );
}

export function LabError({ message, retry }: { message?: string; retry?(): void }) {
  return message ? (
    <div className="cl-error" role="alert">
      <p>{message}</p>
      {retry && (
        <Button size="sm" onPress={retry}>
          Refresh information
        </Button>
      )}
    </div>
  ) : null;
}

/** A paged reading window stays put until its reader chooses current results. */
export function LabUpdates({
  available,
  refresh,
  label,
}: {
  available?: boolean;
  refresh(): void;
  label: string;
}) {
  return available ? (
    <Button size="sm" variant="quiet" onPress={refresh}>
      {label} · updates available
    </Button>
  ) : null;
}

/** Exact JSON remains text; model and imported content never becomes markup. */
export function LabJson({ value }: { value: unknown }) {
  return <pre className="cl-json">{JSON.stringify(value, null, 2)}</pre>;
}

export function LabCopy({ text, label = 'Copy content' }: { text: string; label?: string }) {
  const [message, setMessage] = useState('');
  return (
    <>
      <LabIconButton
        icon="ui.copy"
        label={label}
        onPress={() => {
          void navigator.clipboard.writeText(text).then(
            () => setMessage('Copied.'),
            () => setMessage('Could not copy. Select and copy the text directly.'),
          );
        }}
      />
      <span className="cl-sr-only" role="status">
        {message}
      </span>
    </>
  );
}

/** Text preserves incomplete numbers; explicit steps remain available without dragging. */
export function LabNumberInput({
  id,
  label,
  value,
  minimum,
  maximum,
  step = 1,
  onChange,
}: {
  id?: string;
  label: string;
  value: string;
  minimum?: number;
  maximum?: number;
  step?: number;
  onChange(value: string): void;
}) {
  const amount = value.trim() ? Number(value) : Number.NaN;
  const usable = Number.isFinite(amount);
  const increment = (direction: -1 | 1) => {
    if (!usable) return;
    const next = Math.max(
      minimum ?? -Infinity,
      Math.min(maximum ?? Infinity, amount + step * direction),
    );
    onChange(String(next));
  };
  return (
    <div className="cl-number-input">
      <input
        id={id}
        aria-label={label}
        type="text"
        inputMode="decimal"
        role="spinbutton"
        aria-valuemin={minimum}
        aria-valuemax={maximum}
        aria-valuenow={usable ? amount : undefined}
        aria-valuetext={usable ? undefined : value || 'No value'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            increment(event.key === 'ArrowUp' ? 1 : -1);
          }
        }}
      />
      <LabIconButton
        icon="ui.minus"
        label={`Decrease ${label}`}
        disabled={!usable || amount <= (minimum ?? -Infinity)}
        onPress={() => increment(-1)}
      />
      <LabIconButton
        icon="ui.plus"
        label={`Increase ${label}`}
        disabled={!usable || amount >= (maximum ?? Infinity)}
        onPress={() => increment(1)}
      />
    </div>
  );
}

/** Long prose and exact requests share one searchable, copyable editor surface. */
export function LabTextEditor({
  label,
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange?(value: string): void;
  readOnly?: boolean;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [wrap, setWrap] = useState(true);
  const [message, setMessage] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const find = (direction: 'next' | 'previous') => {
    const element = editor.current;
    if (!element || !query) return;
    const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu');
    let match: RegExpExecArray | undefined | null;
    if (direction === 'previous') {
      let last: RegExpExecArray | undefined;
      let candidate: RegExpExecArray | null;
      while ((candidate = pattern.exec(value))) {
        last = candidate;
        if (candidate.index < element.selectionStart) match = candidate;
      }
      match ??= last;
    } else {
      pattern.lastIndex = element.selectionEnd;
      match = pattern.exec(value);
      if (!match) {
        pattern.lastIndex = 0;
        match = pattern.exec(value);
      }
    }
    if (!match) {
      setMessage('No match in this content.');
      return;
    }
    setMessage('Match selected.');
    element.focus();
    element.setSelectionRange(match.index, match.index + match[0].length);
  };
  return (
    <div className="cl-text-editor">
      <div className="cl-inline">
        <LabSearch
          label={`Find in ${label.toLocaleLowerCase()}`}
          value={query}
          onChange={(next) => {
            setQuery(next);
            setMessage('');
          }}
        />
        <Button size="sm" onPress={() => find('previous')}>
          Find previous
        </Button>
        <Button size="sm" onPress={() => find('next')}>
          Find next
        </Button>
        <label className="cl-inline">
          <input
            type="checkbox"
            checked={wrap}
            onChange={(event) => setWrap(event.target.checked)}
          />
          Wrap
        </label>
        <LabCopy text={value} />
      </div>
      <textarea
        ref={editor}
        aria-label={label}
        className="cl-payload-text"
        style={{ whiteSpace: wrap ? 'pre-wrap' : 'pre' }}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        autoFocus={autoFocus}
      />
      <span className="cl-sr-only" role="status">
        {message}
      </span>
    </div>
  );
}
