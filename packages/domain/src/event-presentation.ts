/** Presentation categories group permitted occurrences; they do not create evidence. */
export type EventCategory = 'speech' | 'actions' | 'conflict' | 'body' | 'observations';
export interface EventPresentation {
  category: EventCategory;
  icon: string;
  /** Opt in to the ordinary player log; other perceived history stays available to inspection. */
  displayToPlayer?: boolean;
}
export interface EventPresentationPolicy {
  types: Readonly<Record<string, EventPresentation>>;
  fallback: EventPresentation;
  /** Normalize the coordinate suffix on only these authored occurrences. */
  coordinateText?: {
    eventType: string;
    actionEventType: string;
    actionTypes: readonly string[];
    prefixes: readonly string[];
  };
}
