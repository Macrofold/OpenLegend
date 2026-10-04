import { useState } from 'react';
import { Button } from '../design-system/components';
import './operations.css';

/** Outcome of an invite link, reported by the sign-in callback as `?entry=`. */
const MESSAGES: Record<string, string> = {
  'invite-accepted':
    'Invitation accepted. If it included a character, choose Resume here to enter the world.',
  'invite-unavailable':
    'This invitation link is invalid, expired, revoked or already used. Ask the world operator for a new one.',
  'already-member':
    'This account already has access to this world, so the invitation was not used.',
  'character-unavailable':
    'The character offered by this invitation is no longer available. Ask for a new invitation.',
  storage: 'The invitation could not be completed. Try the link again later.',
};

export function EntryNotice() {
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('entry'));
  const message = code ? MESSAGES[code] : undefined;
  if (!message) return null;
  return (
    <div className="ol-card ol-entry-notice" role="status">
      <p>{message}</p>
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
