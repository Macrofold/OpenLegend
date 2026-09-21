import { useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Button, Icon, TextTooltip } from '../design-system/components';
import { AutoTextarea } from './auto-textarea';
import { FailureStatus } from './message-status';

export type ConversationItem = {
  id: string;
  content: ReactNode;
};

export function TypingIndicator() {
  return (
    <span className="ol-typing" role="status" aria-label="Waiting for a reply">
      <span className="ol-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

export function ConversationMessage({
  role,
  label,
  text,
  failureReason,
  onRetry,
  pending,
  children,
}: {
  role: 'you' | 'agent' | 'status';
  label: string;
  text: string;
  failureReason?: string;
  onRetry?: () => void;
  pending?: boolean;
  children?: ReactNode;
}) {
  return (
    <>
      <div className={`ol-message ol-message-${role}`}>
        <strong className="ol-message-author">{label}</strong>
        <div className="ol-prose">{text}</div>
        {failureReason && (
          <span className="ol-message-failure-actions">
            <FailureStatus reason={failureReason} />
            {onRetry && (
              <TextTooltip text="Retry">
                <Button
                  className="ol-message-retry"
                  size="sm"
                  variant="quiet"
                  aria-label="Retry"
                  onPress={onRetry}
                >
                  ↻
                </Button>
              </TextTooltip>
            )}
          </span>
        )}
        {children}
      </div>
      {pending && (
        <div className="ol-message ol-message-agent ol-message-waiting">
          <TypingIndicator />
        </div>
      )}
    </>
  );
}

function latestTwoAreOffscreen(element: HTMLDivElement) {
  const entries = [...element.querySelectorAll<HTMLElement>('[data-conversation-entry]')].slice(-2);
  if (entries.length < 2) return false;
  const viewport = element.getBoundingClientRect();
  return entries.every((entry) => {
    const bounds = entry.getBoundingClientRect();
    return bounds.bottom <= viewport.top || bounds.top >= viewport.bottom;
  });
}

export function ConversationThread({
  conversationKey,
  items,
  empty,
  before,
  openingRevision = 0,
  ariaLabel = 'Conversation',
  id,
  visible = true,
}: {
  conversationKey: string;
  items: ConversationItem[];
  empty?: ReactNode;
  before?: ReactNode;
  openingRevision?: number;
  ariaLabel?: string;
  id?: string;
  visible?: boolean;
}) {
  const log = useRef<HTMLDivElement>(null);
  const previous = useRef<{ key: string; count: number; latestId: string } | null>(null);
  const wasVisible = useRef(false);
  const scrollFrame = useRef<number | null>(null);
  const unread = useRef(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const latestId = items.at(-1)?.id ?? '';
  const previousHeight = useRef(0);
  const previousFirst = useRef<string | undefined>(undefined);
  const previousOpeningRevision = useRef(openingRevision);

  const scrollToBottom = () => {
    const element = log.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      const current = log.current;
      if (current) current.scrollTop = current.scrollHeight;
      scrollFrame.current = null;
    });
    unread.current = false;
    setShowNewMessage(false);
  };

  useLayoutEffect(() => {
    const prior = previous.current;
    const openingLoaded = previousOpeningRevision.current !== openingRevision;
    previousOpeningRevision.current = openingRevision;
    const prepended =
      prior?.key === conversationKey &&
      prior.latestId === latestId &&
      previousFirst.current !== items[0]?.id &&
      items.length > prior.count;
    const oldHeight = previousHeight.current;
    previousHeight.current = log.current?.scrollHeight ?? 0;
    previousFirst.current = items[0]?.id;
    const openedConversation =
      visible && (!prior || prior.key !== conversationKey || !wasVisible.current);
    const addedMessage =
      visible &&
      !!prior &&
      prior.key === conversationKey &&
      (items.length > prior.count || (items.length === prior.count && latestId !== prior.latestId));
    previous.current = { key: conversationKey, count: items.length, latestId };
    wasVisible.current = visible;
    if (!visible) return;
    if (openedConversation || openingLoaded || (prior?.count === 0 && items.length > 0)) {
      scrollToBottom();
      return;
    }
    if (prepended && log.current) {
      log.current.scrollTop += log.current.scrollHeight - oldHeight;
      return;
    }
    if (addedMessage) {
      if (unread.current || (log.current && latestTwoAreOffscreen(log.current))) {
        unread.current = true;
        setShowNewMessage(true);
      } else {
        scrollToBottom();
      }
    }
  }, [conversationKey, items.length, latestId, visible, openingRevision]);

  useLayoutEffect(() => {
    return () => {
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    };
  }, []);

  return (
    <div className="ol-thread-shell">
      <div
        id={id}
        ref={log}
        className="ol-thread"
        role="log"
        aria-label={ariaLabel}
        aria-live="polite"
        onScroll={(event) => {
          const element = event.currentTarget;
          const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 2;
          if (atBottom && unread.current) {
            unread.current = false;
            setShowNewMessage(false);
          }
        }}
      >
        {before}
        {!items.length && empty}
        {items.map((item) => (
          <div key={item.id} className="ol-thread-entry" data-conversation-entry>
            {item.content}
          </div>
        ))}
      </div>
      {showNewMessage && (
        <Button className="ol-new-message" size="sm" variant="solid" onPress={scrollToBottom}>
          New Message <Icon name="ui.next" size={14} />
        </Button>
      )}
    </div>
  );
}

export function ConversationComposer({
  formId,
  textareaId,
  inputRef,
  ariaLabel,
  placeholder,
  maxLength,
  value,
  onChange,
  onSubmit,
  disabled,
  inputDisabled,
  inputDisabledReason,
  submitLabel = 'Send',
  submitIcon = 'ui.send',
}: {
  formId?: string;
  textareaId?: string;
  inputRef?: Ref<HTMLTextAreaElement>;
  ariaLabel: string;
  placeholder: string;
  maxLength: number;
  value: string;
  onChange(value: string): void;
  onSubmit(): void | Promise<void>;
  disabled?: boolean;
  inputDisabled?: boolean;
  inputDisabledReason?: string | null;
  submitLabel?: string;
  submitIcon?: string;
}) {
  return (
    <form
      id={formId}
      className="ol-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <TextTooltip text={inputDisabledReason}>
        <span
          className={`ol-composer-input${inputDisabled ? ' is-disabled' : ''}`}
          tabIndex={inputDisabledReason ? 0 : undefined}
          aria-label={inputDisabledReason ?? undefined}
        >
          <AutoTextarea
            id={textareaId}
            ref={inputRef}
            aria-label={ariaLabel}
            placeholder={placeholder}
            maxLength={maxLength}
            value={value}
            disabled={inputDisabled}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void onSubmit();
              }
            }}
          />
        </span>
      </TextTooltip>
      <Button type="submit" variant="primary" icon={submitIcon} disabled={disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}
