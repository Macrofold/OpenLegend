import { LoadingDialog } from '../design-system/loading';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button as AriaButton, ListBox, ListBoxItem, Popover } from 'react-aria-components';
import { Icon } from '../design-system/components';

export type PulloutOption = {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  disabled?: boolean;
};

export function PulloutPicker({
  label,
  icon,
  badge,
  placeholder,
  options,
  groups,
  onSelect,
  isOpen,
  onOpenChange,
}: {
  label: string;
  icon: string;
  badge?: string;
  placeholder: string;
  options: PulloutOption[];
  groups?: Array<{ label: string; icon: string; options: PulloutOption[] }>;
  onSelect(id: string): void;
  isOpen?: boolean;
  onOpenChange?(open: boolean): void;
}) {
  const [query, setQuery] = useState('');
  const [localOpen, setLocalOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const open = isOpen ?? localOpen;
  const setOpen = (value: boolean) => {
    setLocalOpen(value);
    onOpenChange?.(value);
    if (!value) {
      setQuery('');
      setOpenGroup(null);
    }
  };
  const close = () => setOpen(false);
  const filtered = useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return options.filter((option) =>
      words.every((word) =>
        `${option.label} ${option.description ?? ''}`.toLocaleLowerCase().includes(word),
      ),
    );
  }, [options, query]);
  const optionCount = groups
    ? groups.reduce((count, group) => count + group.options.length, 0)
    : options.length;
  if (optionCount <= 2) {
    const inlineOptions = groups ? groups.flatMap((group) => group.options) : options;
    return (
      <>
        {inlineOptions.map((option) => (
          <AriaButton
            key={option.id}
            data-picker-row
            className="ol-item"
            isDisabled={option.disabled}
            onPress={() => {
              onSelect(option.id);
              close();
            }}
          >
            <Icon name={option.icon ?? icon} />
            <span>
              {option.label}
              {option.description && <small className="ol-item-reason">{option.description}</small>}
            </span>
            {badge && <small className="ol-item-hint">{badge}</small>}
          </AriaButton>
        ))}
      </>
    );
  }
  return (
    <Pullout label={label} icon={icon} badge={badge} isOpen={open} onOpenChange={setOpen}>
      <div className="ol-pullout-head">
        <strong>{label}</strong>
        <span className="ol-caption">{groups?.length ?? filtered.length} options</span>
      </div>
      {groups ? (
        groups.map((group) => (
          <PulloutPicker
            key={group.label}
            label={group.label}
            icon={group.icon}
            placeholder={`Search ${group.label.toLowerCase()}…`}
            options={group.options}
            isOpen={openGroup === group.label}
            onOpenChange={(value) => setOpenGroup(value ? group.label : null)}
            onSelect={(id) => {
              onSelect(id);
              close();
            }}
          />
        ))
      ) : (
        <>
          <div className="ol-search ol-pullout-search">
            <Icon name="ui.search" size={16} />
            <input
              autoFocus
              type="search"
              value={query}
              placeholder={placeholder}
              aria-label={placeholder}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <ListBox
            className="ol-pullout-list"
            items={filtered}
            aria-label={label}
            selectionMode="single"
            onAction={(key) => {
              onSelect(String(key));
              close();
            }}
            renderEmptyState={() => <p className="ol-empty-pullout">No matches.</p>}
          >
            {(option) => (
              <ListBoxItem
                className="ol-pullout-option"
                id={option.id}
                textValue={option.label}
                isDisabled={option.disabled}
              >
                <Icon name={option.icon ?? 'ui.plus'} size={18} />
                <span>
                  <strong>{option.label}</strong>
                  {option.description && <small>{option.description}</small>}
                </span>
              </ListBoxItem>
            )}
          </ListBox>
        </>
      )}
    </Pullout>
  );
}

export function Pullout({
  label,
  icon,
  badge,
  muted = false,
  disabled = false,
  isOpen,
  onOpenChange,
  children,
}: {
  label: string;
  icon: string;
  badge?: string;
  muted?: boolean;
  disabled?: boolean;
  isOpen: boolean;
  onOpenChange(open: boolean): void;
  children: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = popup.current;
    if (!isOpen || !element) return;
    // Side placement can overflow when neither side fits. Keep the choices on
    // screen by overlapping their parent, while React Aria still owns anchoring.
    const fit = () => {
      const left = Number.parseFloat(element.style.left || '0');
      const viewport = element.ownerDocument.documentElement.clientWidth;
      const shift = Math.max(12 - left, Math.min(0, viewport - 12 - left - element.offsetWidth));
      const value = `${shift}px`;
      if (element.style.getPropertyValue('--ol-pullout-shift') !== value)
        element.style.setProperty('--ol-pullout-shift', value);
    };
    const positioning = new MutationObserver(fit);
    positioning.observe(element, { attributes: true, attributeFilter: ['style'] });
    const resizing = new ResizeObserver(fit);
    resizing.observe(element);
    fit();
    return () => {
      positioning.disconnect();
      resizing.disconnect();
    };
  }, [isOpen]);
  return (
    <>
      <AriaButton
        ref={trigger}
        data-picker-row
        className="ol-item"
        isDisabled={disabled}
        data-unavailable={muted || undefined}
        aria-haspopup={disabled ? undefined : 'dialog'}
        aria-expanded={isOpen}
        onPress={() => onOpenChange(true)}
        onKeyDown={(event) => {
          if (!disabled && event.key === 'ArrowRight') {
            event.preventDefault();
            onOpenChange(true);
          }
        }}
        onHoverStart={() => {
          if (!disabled) onOpenChange(true);
        }}
      >
        <Icon name={icon} />
        <span>{label}</span>
        <span className="ol-pullout-tail">
          {badge && <small className="ol-item-hint">{badge}</small>}
          {!disabled && <Icon name="ui.next" size={16} />}
        </span>
      </AriaButton>
      <Popover
        ref={popup}
        triggerRef={trigger}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isNonModal
        shouldCloseOnInteractOutside={(element) => !element.closest('.ol-pullout-popover')}
        className="ol-root ol-pullout-popover"
        placement="right top"
        shouldFlip
      >
        <div
          className="ol-pullout-body ol-portal-content"
          onKeyDown={(event) => {
            if (!event.currentTarget.contains(event.target as Node)) return;
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'ArrowLeft' && !(event.target instanceof HTMLInputElement)) {
              event.preventDefault();
              event.stopPropagation();
              onOpenChange(false);
              trigger.current?.focus();
            }
            if (
              (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
              event.target instanceof HTMLElement &&
              (event.target.getAttribute('role') === 'dialog' ||
                event.target.hasAttribute('data-picker-row'))
            ) {
              const rows = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-picker-row]'),
              );
              const index = rows.indexOf(document.activeElement as HTMLButtonElement);
              event.preventDefault();
              event.stopPropagation();
              const next =
                index < 0
                  ? event.key === 'ArrowDown'
                    ? 0
                    : rows.length - 1
                  : (index + (event.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
              rows[next]?.focus();
            }
          }}
        >
          <LoadingDialog className="ol-pullout-dialog" aria-label={label}>
            {children}
          </LoadingDialog>
        </div>
      </Popover>
    </>
  );
}

export function PulloutAction({ children }: { children: ReactNode }) {
  return <div className="ol-pullout-action">{children}</div>;
}
