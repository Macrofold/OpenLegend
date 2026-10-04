import { useState } from 'react';
import { Button } from '../design-system/components';
import './operations.css';

/** Outcome of an invite link, reported by the sign-in callback as `?entry=`. */
const MESSAGES: Record<string, { title: string; detail: string }> = {
  'invite-accepted': {
    title: 'Invitation accepted',
    detail:
      'Your access is ready. An invitation with a character opens the game; other roles open World operations.',
  },
  'invite-unavailable': {
    title: 'This invitation is unavailable',
    detail:
      'The link is invalid, expired, revoked or already used. Ask the world operator for a new invitation.',
  },
  'already-member': {
    title: 'This account already has access',
    detail: 'The invitation was not used. Continue with this account’s existing access.',
  },
  'character-unavailable': {
    title: 'The invited character is unavailable',
    detail:
      'That character can no longer be assigned by this invitation. Ask the world operator for a new invitation.',
  },
  storage: {
    title: 'Invitation result not confirmed',
    detail: 'The invitation could not be completed. Try the original invitation link again later.',
  },
};

export function EntryNotice() {
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('entry'));
  const message = code ? MESSAGES[code] : undefined;
  if (!message) return null;
  return (
    <div className="ol-card ol-entry-notice" role="status">
      <div>
        <strong>{message.title}</strong>
        <p>{message.detail}</p>
      </div>
      <Button
        size="sm"
        variant="quiet"
        onPress={() => {
          setCode(null);
          const url = new URL(location.href);
          url.searchParams.delete('entry');
          history.replaceState(null, '', url);
        }}
      >
        Dismiss
      </Button>
    </div>
  );
}
