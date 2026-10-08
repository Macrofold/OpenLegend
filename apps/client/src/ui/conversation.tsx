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

export function ConversationThread({
  conversationKey,
  items,
  empty,
  before,
  openingRevision = 0,
  ariaLabel = 'Conversation',
  id,
  visible = true,
  contentRevision = '',
  liveAnnouncements = 'polite',
  newMessageLabel = 'New messages',
  preserveReading = false,
  renderNewMessageControl,
}: {
  conversationKey: string;
  items: ConversationItem[];
  empty?: ReactNode;
  before?: ReactNode;
  openingRevision?: number;
  ariaLabel?: string;
  id?: string;
  visible?: boolean;
  contentRevision?: string | number;
  liveAnnouncements?: 'polite' | 'off';
  newMessageLabel?: string;
  preserveReading?: boolean;
  renderNewMessageControl?: (onPress: () => void, label: string) => ReactNode;
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
  const previousContentRevision = useRef(contentRevision);
  const followingBottom = useRef(true);

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
    followingBottom.current = true;
    setShowNewMessage(false);
  };

  useLayoutEffect(() => {
    if (!visible) {
      // Keep the last visible geometry and revision: hidden Work/Conversation views
      // can continue receiving text without consuming the reader's anchor or cue.
      wasVisible.current = false;
      return;
    }
    const prior = previous.current;
    const openingLoaded = previousOpeningRevision.current !== openingRevision;
    const contentChanged = previousContentRevision.current !== contentRevision;
    previousContentRevision.current = contentRevision;
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
      visible &&
      (!prior || prior.key !== conversationKey || (!preserveReading && !wasVisible.current));
    const addedMessage =
      visible &&
      !!prior &&
      prior.key === conversationKey &&
      (items.length > prior.count || (items.length === prior.count && latestId !== prior.latestId));
    previous.current = { key: conversationKey, count: items.length, latestId };
    wasVisible.current = visible;
    if (openedConversation || openingLoaded || (prior?.count === 0 && items.length > 0)) {
      scrollToBottom();
      return;
    }
    if (prepended && log.current) {
      log.current.scrollTop += log.current.scrollHeight - oldHeight;
      return;
    }
    if (addedMessage || contentChanged) {
      // New entries may all land below the viewport in one batch. Their new
      // geometry cannot tell us where the reader was before this update.
      if (unread.current || !followingBottom.current) {
        unread.current = true;
        setShowNewMessage(true);
      } else {
        scrollToBottom();
      }
    }
  }, [
    conversationKey,
    items.length,
    latestId,
    visible,
    openingRevision,
    contentRevision,
    preserveReading,
  ]);

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
        // This reader restores prepended history itself; native anchoring would apply it twice.
        style={{ overflowAnchor: 'none' }}
        role="log"
        aria-label={ariaLabel}
        aria-live={liveAnnouncements}
        onScroll={(event) => {
          const element = event.currentTarget;
          previousHeight.current = element.scrollHeight;
          const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 2;
          followingBottom.current = atBottom;
          if (!atBottom && scrollFrame.current !== null) {
            // A deliberate move into history cancels the pending follow-bottom frame.
            cancelAnimationFrame(scrollFrame.current);
            scrollFrame.current = null;
          }
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
      {showNewMessage &&
        (renderNewMessageControl ? (
          // A control placed outside this reader must still follow its visibility.
          visible && renderNewMessageControl(scrollToBottom, newMessageLabel)
        ) : (
          <Button className="ol-new-message" size="sm" variant="solid" onPress={scrollToBottom}>
            {newMessageLabel} <Icon name="ui.next" size={14} />
          </Button>
        ))}
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
  const composing = useRef(false);
  return (
    <form
      id={formId}
      className="ol-composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (composing.current || disabled || inputDisabled) return;
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
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onBlur={() => {
              composing.current = false;
            }}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                !composing.current
              ) {
                event.preventDefault();
                if (!disabled && !inputDisabled) void onSubmit();
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
