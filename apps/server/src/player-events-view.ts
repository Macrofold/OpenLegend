import {
  isConversationEvent,
  nativeText,
  type ActorEvent,
  selectedPlayerViewRules,
} from '@open-legend/domain';

/** The existing player request's event-selection window. The native host passes
 * this actual display setting to its finite read, not a copied world law. */
export const PLAYER_EVENT_WINDOW = 512;
type Rules = ReturnType<typeof selectedPlayerViewRules>;
export function isPlayerJournalEvent(
  event: Pick<ActorEvent, 'type' | 'text' | 'data'>,
  rules: Rules,
) {
  const movement = rules.journalMovement;
  return !(
    event.type === movement.eventType &&
    (event.data?.['actionType'] === movement.actionType ||
      (event.data?.['actionType'] === undefined &&
        nativeText(event.text).endsWith(movement.textSuffix)))
  );
}
export function boundPlayerEvents(visible: ActorEvent[], rules: Rules): ActorEvent[] {
  visible.sort((a, b) => (b.order ?? b.sequence) - (a.order ?? a.sequence));
  const bounded: ActorEvent[] = [];
  let journal = 0,
    conversation = 0;
  for (const event of visible) {
    const inJournal = isPlayerJournalEvent(event, rules) && journal < 60;
    const inConversation = isConversationEvent(event) && conversation < 30;
    if (inJournal || inConversation) bounded.push(event);
    if (inJournal) journal++;
    if (inConversation) conversation++;
    if (journal >= 60 && conversation >= 30) break;
  }
  return bounded.reverse();
}
