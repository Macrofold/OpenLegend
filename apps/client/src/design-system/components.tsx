import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  Button as AriaButton,
  Tooltip,
  TooltipTrigger,
  Radio,
  RadioGroup,
  Toolbar,
  ComboBox,
  Input,
  Label,
  Popover,
  ListBox,
  ListBoxItem,
  type ButtonProps as AriaButtonProps,
} from 'react-aria-components';
import icons from './icons/icons.json';
export { Toolbar };
export function Icon({
  name,
  label,
  badge,
  size = 20,
  fallbackLabel,
}: {
  name: string;
  label?: string;
  badge?: string;
  size?: number;
  fallbackLabel?: string;
}) {
  const data = (icons as Record<string, { body: string; viewBox: string }>)[name];
  const style = { '--ol-icon': `${size}px` } as CSSProperties;
  // Only repository-owned SVG bodies enter this sink. Generated names remain React text.
  const glyph = data ? (
    <svg
      className="ol-icon"
      viewBox={data.viewBox}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: data.body }}
    />
  ) : (
    <span className="ol-sigil">
      <span>{(fallbackLabel ?? name.split('.').at(-1) ?? '?').charAt(0).toUpperCase()}</span>
    </span>
  );
  return (
    <span
      className="ol-icon-wrap"
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {glyph}
      {badge && (
        <span className="ol-icon-badge">
          <Icon name={badge} size={12} />
        </span>
      )}
    </span>
  );
}
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  busy,
  disabled,
  ...props
}: Omit<AriaButtonProps, 'children'> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'quiet' | 'solid' | 'danger';
  size?: 'sm' | 'md';
  icon?: string;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <AriaButton
      {...props}
      className={`ol-btn ${typeof props.className === 'string' ? props.className : ''}`}
      data-variant={variant}
      data-size={size}
      data-busy={busy || undefined}
      isDisabled={disabled || busy || props.isDisabled}
      aria-busy={busy || undefined}
    >
      {icon && <Icon name={icon} size={16} />}
      <span>{children}</span>
      {busy && (
        <span className="ol-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </AriaButton>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
  pressed,
  disabled,
  ...props
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <AriaButton
      {...props}
      className="ol-ibtn"
      aria-label={label}
      aria-pressed={pressed}
      isDisabled={disabled}
      onPress={onPress}
    >
      <Icon name={icon} />
    </AriaButton>
  );
}

export type SelectOption = {
  id: string;
  label: string;
  icon?: string;
  badge?: string;
  description?: string;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  autoFocus,
  placeholder = 'Search quick actions…',
  placement = 'top start',
}: {
  label: string;
  value?: string | null;
  options: SelectOption[];
  onChange(value: string): void;
  autoFocus?: boolean;
  placeholder?: string;
  placement?: 'top start' | 'bottom start';
}) {
  const trigger = useRef<HTMLDivElement>(null);
  const [popupWidth, setPopupWidth] = useState<number>();
  useLayoutEffect(() => {
    const element = trigger.current;
    if (!element) return;
    const resize = () => setPopupWidth(element.getBoundingClientRect().width);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <ComboBox<SelectOption>
      className="ol-select"
      selectedKey={value}
      onSelectionChange={(key) => key !== null && onChange(String(key))}
      defaultItems={options}
      menuTrigger="focus"
      defaultFilter={(text, query) =>
        query
          .normalize('NFKC')
          .toLocaleLowerCase()
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .every((word) => text.normalize('NFKC').toLocaleLowerCase().includes(word))
      }
    >
      <Label className="ol-select-label">{label}</Label>
      <div className="ol-select-trigger" ref={trigger}>
        <Icon name="ui.search" size={16} />
        <Input className="ol-select-input" autoFocus={autoFocus} placeholder={placeholder} />
        <AriaButton className="ol-select-toggle" aria-label={`Show ${label.toLowerCase()} actions`}>
          <span className="ol-select-chevron" aria-hidden="true" />
        </AriaButton>
      </div>
      <Popover
        className="ol-root ol-select-popover"
        triggerRef={trigger}
        placement={placement}
        style={{ width: popupWidth }}
      >
        <ListBox<SelectOption> className="ol-select-list">
          {(option) => (
            <ListBoxItem className="ol-select-option" id={option.id} textValue={option.label}>
              {option.icon ? <Icon name={option.icon} badge={option.badge} size={18} /> : <span />}
              <span>
                <strong>{option.label}</strong>
                {option.description && (
                  <small className="ol-option-description">{option.description}</small>
                )}
              </span>
              <Icon name="ui.check" size={16} />
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
export function Launcher({
  icon,
  label,
  open,
  side = 'left',
  shortcut,
  onPress,
}: {
  icon: string;
  label: string;
  open: boolean;
  side?: string;
  shortcut?: string;
  onPress(): void;
}) {
  return (
    <div className="ol-launcher-wrap" data-side={side}>
      <AriaButton
        className="ol-launcher"
        aria-label={label}
        aria-expanded={open}
        aria-keyshortcuts={shortcut}
        onPress={onPress}
      >
        <Icon name={icon} size={24} />
      </AriaButton>
      <span className="ol-hover-label" aria-hidden="true">
        {label}
        {shortcut ? ` · ${shortcut}` : ''}
      </span>
    </div>
  );
}
/** Only symbolic styles and text cross this boundary; definitions cannot supply CSS. */
export function Condition({
  attributes,
}: {
  attributes: import('@open-legend/protocol').AttributeView[];
}) {
  return (
    <div className="ol-condition">
      {attributes.map((attribute) => {
        const { id, name, value, min = 0, max = 100, unit, presentation } = attribute;
        if (
          attribute.status !== 'known' ||
          typeof value !== 'number' ||
          attribute.display !== 'meter'
        )
          return (
            <div className="ol-meter" key={id}>
              <span className="ol-meter-label">{name}</span>
              <span>{attribute.status === 'unknown' ? 'Unknown' : value}</span>
            </div>
          );
        const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
        const critical = !!attribute.critical;
        const icon = presentation === 'neutral' ? 'energy' : presentation;
        const display = `${unit === '%' ? Math.round(value) : Math.round(value * 10) / 10}${unit === '%' ? '%' : ` ${unit ?? ''}`}`;
        return (
          <div
            className="ol-meter"
            key={id}
            data-critical={critical || undefined}
            style={
              { '--c': `var(--${critical ? 'danger' : icon})`, '--v': percentage } as CSSProperties
            }
          >
            <Icon name={`meter.${icon}`} />
            <span className="ol-meter-label">{name}</span>
            <span
              className="ol-meter-track"
              role="meter"
              aria-label={name}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={value}
              aria-valuetext={display}
            >
              <span className="ol-meter-fill" />
            </span>
            <span className="ol-meter-value">{display}</span>
          </div>
        );
      })}
    </div>
  );
}
export function Panel({
  title,
  onClose,
  onBack,
  backLabel,
  children,
  footer,
  tabs,
  wide,
  id,
  hidden,
  draggable = false,
}: {
  title: string;
  onClose(): void;
  onBack?: () => void;
  backLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  tabs?: ReactNode;
  wide?: boolean;
  id?: string;
  hidden?: boolean;
  draggable?: boolean;
}) {
  const titleId = useId();
  const body = useRef<HTMLDivElement>(null),
    listScroll = useRef(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<
    | {
        pointerX: number;
        pointerY: number;
        offsetX: number;
        offsetY: number;
        left: number;
        top: number;
      }
    | undefined
  >(undefined);
  const detail = !!onBack;
  useLayoutEffect(() => {
    const element = body.current;
    if (!element) return;
    element.scrollTop = detail ? 0 : listScroll.current;
    return () => {
      if (!detail) listScroll.current = element.scrollTop;
    };
  }, [detail]);
  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (!draggable || (event.target as HTMLElement).closest('button, a, [role="button"]')) return;
    const panel = event.currentTarget.closest<HTMLElement>('.ol-panel');
    if (!panel) return;
    const bounds = panel.getBoundingClientRect();
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
      left: bounds.left,
      top: bounds.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const active = drag.current;
    if (!active) return;
    const dx = Math.max(
      8 - active.left,
      Math.min(innerWidth - 120 - active.left, event.clientX - active.pointerX),
    );
    const dy = Math.max(
      8 - active.top,
      Math.min(innerHeight - 56 - active.top, event.clientY - active.pointerY),
    );
    setOffset({ x: active.offsetX + dx, y: active.offsetY + dy });
  };
  return (
    <section
      id={id}
      className="ol-panel"
      data-wide={wide || undefined}
      role="region"
      aria-labelledby={titleId}
      hidden={hidden}
      data-draggable={draggable || undefined}
      style={{ translate: `${offset.x}px ${offset.y}px` }}
    >
      <header
        className="ol-panel-head"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={() => (drag.current = undefined)}
        onPointerCancel={() => (drag.current = undefined)}
      >
        <div>
          {onBack && (
            <Button
              aria-label={`Back to ${backLabel ?? 'list'}`}
              variant="quiet"
              size="sm"
              icon="ui.back"
              onPress={onBack}
            >
              {backLabel ?? 'Back'}
            </Button>
          )}
          <h2 id={titleId} className="ol-panel-title ol-heading">
            {title}
          </h2>
        </div>
        <IconButton icon="ui.close" label={`Hide ${title} panel`} onPress={onClose} />
      </header>
      {tabs}
      <div ref={body} className="ol-panel-body">
        {children}
      </div>
      {footer && <footer className="ol-panel-foot">{footer}</footer>}
    </section>
  );
}
export function Section({
  title,
  children,
  count,
}: {
  title: string;
  children: ReactNode;
  count?: number;
}) {
  return (
    <section className="ol-sheet-section">
      <div className="ol-section-head">
        <h3 className="ol-eyebrow">{title}</h3>
        {count !== undefined && <span className="ol-caption">{count}</span>}
      </div>
      {children}
    </section>
  );
}
export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return (
    <span className="ol-tag" data-tone={tone}>
      {children}
    </span>
  );
}
export function EntityRow({
  name,
  meta,
  icon,
  count,
  selected,
  onPress,
}: {
  name: string;
  meta?: string;
  icon: string;
  count?: number;
  selected?: boolean;
  onPress(): void;
}) {
  return (
    <AriaButton className="ol-row" data-selected={selected || undefined} onPress={onPress}>
      <span className="ol-row-icon">
        <Icon name={icon} fallbackLabel={name} size={24} />
      </span>
      <span className="ol-row-text">
        <span className="ol-row-title">{name}</span>
        {meta && <span className="ol-row-meta">{meta}</span>}
      </span>
      {count !== undefined ? (
        <span className="ol-row-count">{count}</span>
      ) : (
        <Icon name="ui.next" size={16} />
      )}
    </AriaButton>
  );
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="ol-empty">
      <Icon name="ui.star" size={40} />
      <h3 className="ol-narrative">{title}</h3>
      <div className="ol-meta">{children}</div>
    </div>
  );
}
/** Short hover/focus labels use plain text; rich action details use Explanation. */
export function TextTooltip({ children, text }: { children: ReactNode; text?: string | null }) {
  return (
    <TooltipTrigger delay={300} closeDelay={100} isDisabled={!text}>
      {children}
      <Tooltip className="ol-text-tooltip ol-root" placement="top" offset={4}>
        {text}
      </Tooltip>
    </TooltipTrigger>
  );
}

export function Explanation({
  children,
  title,
  text,
  facts,
}: {
  children: ReactNode;
  title: string;
  text?: string;
  facts?: Array<[string, string]>;
}) {
  return (
    <TooltipTrigger delay={1000} closeDelay={150}>
      {children}
      <Tooltip className="ol-tip ol-root" placement="end" offset={8}>
        <b>{title}</b>
        {text && <div className="ol-prose">{text}</div>}
        {!!facts?.length && (
          <dl>
            {facts.map(([key, value]) => (
              <div className="ol-fact" key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Tooltip>
    </TooltipTrigger>
  );
}
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <RadioGroup
      className="ol-seg"
      aria-label={label}
      orientation="horizontal"
      value={value}
      onChange={onChange}
    >
      {options.map((o) => (
        <Radio key={o.value} className="ol-radio" value={o.value}>
          {o.label}
        </Radio>
      ))}
    </RadioGroup>
  );
}
export function symbol(id: string): string {
  const native: Record<string, string> = {
    raw_fiber: 'resource.reed',
    prepared_fiber: 'resource.fiber',
    cord: 'resource.cord',
    wood: 'resource.branch',
    stone: 'resource.pebble',
    stone_tool: 'resource.flint',
    berries: 'resource.berry',
    raw_meat: 'resource.meat',
    cooked_meat: 'resource.meat',
    hare: 'creature.hare',
    deer: 'creature.deer',
    player: 'person.wayfarer',
    npc: 'person.wayfarer',
    campfire: 'action.fire',
    move: 'action.walk',
    prepare: 'action.craft',
    harvest: 'action.gather',
    cook: 'action.fire',
    equip: 'ui.inventory',
    cancel: 'ui.close',
    recover: 'meter.health',
    teach: 'action.talk',
  };
  return native[id] ?? (id in icons ? id : `action.${id}`);
}
