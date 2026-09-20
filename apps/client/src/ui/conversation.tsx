import { useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Button, Icon } from '../design-system/components';
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
  interruption,
  pending,
  children,
}: {
  role: 'you' | 'agent' | 'status';
  label: string;
  text: string;
  failureReason?: string;
  interruption?: string;
  pending?: boolean;
  children?: ReactNode;
}) {
  return (
    <>
      <div className={`ol-message ol-message-${role}`}>
        <strong className="ol-message-author">{label}</strong>
        <div className="ol-prose">{text}</div>
        {failureReason && <FailureStatus reason={failureReason} />}
        {interruption && <p className="ol-caption">{interruption}</p>}
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
  ariaLabel = 'Conversation',
  id,
}: {
  conversationKey: string;
  items: ConversationItem[];
  empty?: ReactNode;
  ariaLabel?: string;
  id?: string;
}) {
  const log = useRef<HTMLDivElement>(null);
  const previous = useRef<{ key: string; count: number } | null>(null);
  const unread = useRef(false);
  const [showNewMessage, setShowNewMessage] = useState(false);

  const scrollToBottom = () => {
    const element = log.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    unread.current = false;
    setShowNewMessage(false);
  };

  useLayoutEffect(() => {
    const openedConversation = !previous.current || previous.current.key !== conversationKey;
    const addedMessage = !!previous.current && items.length > previous.current.count;
    if (openedConversation) {
      previous.current = { key: conversationKey, count: items.length };
      scrollToBottom();
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
    previous.current = { key: conversationKey, count: items.length };
  }, [conversationKey, items.length]);

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
      <AutoTextarea
        id={textareaId}
        ref={inputRef}
        aria-label={ariaLabel}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void onSubmit();
          }
        }}
      />
      <Button type="submit" variant="primary" icon={submitIcon} disabled={disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}
