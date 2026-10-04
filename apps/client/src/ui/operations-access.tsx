import { useState } from 'react';
import type { AccessCapability, OperationsView } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section, Tag } from '../design-system/components';

type Access = NonNullable<OperationsView['access']>;
type Role = 'player' | 'spectator' | 'operator';
const EXPIRY = [
  { hours: 1, label: '1 hour' },
  { hours: 24, label: '1 day' },
  { hours: 168, label: '7 days' },
  { hours: 720, label: '30 days' },
];
const ROLE_TEXT: Record<Role, string> = {
  player: 'Player: plays the chosen character',
  spectator: 'Spectator: watches the public overview',
  operator: 'Operator: no character; chosen operations only',
};
const ROLE_DETAIL: Record<Role, string> = {
  player:
    'Assign one eligible character to the invited account. They play that character after signing in.',
  spectator:
    'Read the public world overview without a character, private knowledge or control of the world.',
  operator:
    'Use only the operations you choose below. This invitation does not assign a character.',
};
const OPERATOR_OPTIONS: AccessCapability[] = [
  'spectate',
  'inspect',
  'save',
  'manage-access',
  'create',
];
const when = (at: number) =>
  new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Invite enrollment and access removal for `manage-access` holders. The server owns every
 * rule; this form only offers choices the issuer can currently delegate. */
export function AccessSection({
  view,
  access,
  describe,
  onChanged,
}: {
  view: OperationsView;
  access: Access;
  describe: (capability: AccessCapability) => string;
  onChanged: () => void;
}) {
  const [role, setRole] = useState<Role>('player');
  const [character, setCharacter] = useState(access.candidates[0] ?? { actorId: '', name: '' });
  const actorId = character.actorId;
  const [label, setLabel] = useState('');
  const [hours, setHours] = useState(168);
  const [chosen, setChosen] = useState<AccessCapability[]>(['spectate']);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const characterAvailable = access.candidates.some((candidate) => candidate.actorId === actorId);
  const delegable = OPERATOR_OPTIONS.filter((capability) => view.capabilities.includes(capability));
  async function run(
    request: () => Promise<{ ok: boolean; message?: string; link?: string }>,
  ): Promise<void> {
    setBusy(true);
    setMessage('');
    try {
      const result = await request();
      setMessage(result.message ?? (result.ok ? 'Done.' : 'The request was not accepted.'));
      if (result.ok && result.link) setLink(result.link);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
      onChanged();
    }
  }
  const create = () =>
    run(() => {
      setLink(null);
      setCopyMessage('');
      return post<{ ok: boolean; message?: string; link?: string }>('/api/invites/create', {
        id: crypto.randomUUID(),
        role,
        label,
        expiresInHours: hours,
        ...(role === 'player' ? { actorId } : {}),
        ...(role === 'operator' ? { capabilities: chosen } : {}),
      });
    });
  const pending = access.invites.filter((invite) => invite.status === 'pending');
  return (
    <>
      <Section title="Invite someone">
        {view.mode !== 'oidc' ? (
          <p className="ol-muted">
            Invitations need a configured account sign-in service. This local world has one player;
            invitation links are unavailable here.
          </p>
        ) : (
          <form
            className="ol-operations-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy) void create();
            }}
          >
            <label>
              Who is this for?
              <input
                value={label}
                maxLength={80}
                required
                placeholder="Name you will recognize"
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
            <label>
              Role
              <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
                {(Object.keys(ROLE_TEXT) as Role[]).map((value) => (
                  <option key={value} value={value}>
                    {ROLE_TEXT[value]}
                  </option>
                ))}
              </select>
            </label>
            <p className="ol-muted">{ROLE_DETAIL[role]}</p>
            {role === 'player' &&
              (access.candidates.length || actorId ? (
                <label>
                  Character
                  <select
                    value={actorId}
                    onChange={(event) => {
                      const candidate = access.candidates.find(
                        (item) => item.actorId === event.target.value,
                      );
                      if (candidate) setCharacter(candidate);
                    }}
                  >
                    {!actorId && <option value="">Choose an eligible character</option>}
                    {actorId && !characterAvailable && (
                      <option value={actorId} disabled>
                        {character.name || actorId} — no longer available
                      </option>
                    )}
                    {access.candidates.map((candidate) => (
                      <option key={candidate.actorId} value={candidate.actorId}>
                        {candidate.name} ({candidate.actorId})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="ol-muted">
                  No living person without a human owner is available. A creator can add a person
                  with God mode first.
                </p>
              ))}
            {role === 'player' && !!actorId && !characterAvailable && (
              <p role="status">
                The selected character is no longer eligible. Choose another character deliberately
                before creating the invitation.
              </p>
            )}
            {role === 'operator' && (
              <fieldset>
                <legend>Operations (you can delegate only what you hold)</legend>
                {OPERATOR_OPTIONS.filter(
                  (capability) => delegable.includes(capability) || chosen.includes(capability),
                ).map((capability) => (
                  <label key={capability}>
                    <input
                      type="checkbox"
                      checked={chosen.includes(capability)}
                      onChange={(event) =>
                        setChosen((current) =>
                          event.target.checked
                            ? [...current, capability]
                            : current.filter((item) => item !== capability),
                        )
                      }
                    />
                    {describe(capability)}
                    {!delegable.includes(capability) &&
                      ' — no longer delegable; uncheck to continue'}
                  </label>
                ))}
              </fieldset>
            )}
            <label>
              Link expires after
              <select value={hours} onChange={(event) => setHours(Number(event.target.value))}>
                {EXPIRY.map((option) => (
                  <option key={option.hours} value={option.hours}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="ol-caption">
              The link can be used once. Its expiry limits enrollment; it does not remove an account
              that has already joined.
            </p>
            <Button
              type="submit"
              variant="primary"
              busy={busy}
              disabled={
                !label.trim() ||
                (role === 'player' && !characterAvailable) ||
                (role === 'operator' &&
                  (!chosen.length || chosen.some((capability) => !delegable.includes(capability))))
              }
            >
              Create invite link
            </Button>
          </form>
        )}
        {message && <p role="status">{message}</p>}
        {link && (
          <div className="ol-operations-link-result">
            <strong>Invitation link created</strong>
            <p className="ol-caption">
              Copy it now and share it with the intended person. The full link is only shown here;
              it cannot be recovered from the invitation list.
            </p>
            <code className="ol-operations-secret" aria-label="Invite link">
              {link}
            </code>
            <Button
              size="sm"
              onPress={() => {
                if (!navigator.clipboard) {
                  setCopyMessage('Copy is unavailable here. Select and copy the link above.');
                  return;
                }
                void navigator.clipboard
                  .writeText(link)
                  .then(() => setCopyMessage('Invitation link copied.'))
                  .catch(() =>
                    setCopyMessage('Could not copy automatically. Select and copy the link above.'),
                  );
              }}
            >
              Copy link
            </Button>
            {copyMessage && <p role="status">{copyMessage}</p>}
          </div>
        )}
      </Section>
      <Section title="Invitation links" count={pending.length}>
        <p className="ol-caption">
          {pending.length} pending. Revoking an unused invitation disables its link. It does not
          remove access from an account that has already joined.
        </p>
        {!access.invites.length ? (
          <p className="ol-muted">No invites yet.</p>
        ) : (
          <ul className="ol-operations-list">
            {access.invites.map((invite) => (
              <li key={invite.id}>
                <div className="ol-operations-row">
                  <strong>{invite.label}</strong>
                  <Tag>{invite.role}</Tag>
                  <Tag tone={invite.status === 'pending' ? 'accent' : 'neutral'}>
                    {invite.status}
                  </Tag>
                  {invite.actorId && <span className="ol-muted">{invite.actorId}</span>}
                </div>
                <span className="ol-caption">
                  {invite.status === 'redeemed' && invite.redeemedAt
                    ? `Used ${when(invite.redeemedAt)}`
                    : `Expires ${when(invite.expiresAt)}`}
                </span>
                {invite.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="quiet"
                    disabled={busy}
                    onPress={() => void run(() => post('/api/invites/revoke', { id: invite.id }))}
                  >
                    Revoke invite
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Accounts with access" count={access.grants.length}>
        <p className="ol-caption">
          Removing an account’s access is separate from revoking its invitation. It ends that
          account’s granted operations in this world.
        </p>
        <ul className="ol-operations-list">
          {access.grants.map((grant) => (
            <li key={grant.accountId}>
              <div className="ol-operations-row">
                <strong>{grant.label ?? grant.accountId}</strong>
                {grant.self && <Tag>you</Tag>}
                <span className="ol-muted">
                  {grant.actorId ? `Character ${grant.actorId}` : 'No character'}
                </span>
              </div>
              <span className="ol-caption">
                {grant.capabilities.length
                  ? grant.capabilities.map(describe).join(' · ')
                  : 'Access removed'}
              </span>
              {!grant.self &&
                grant.capabilities.length > 0 &&
                (removing === grant.accountId ? (
                  <div
                    className="ol-operations-confirm"
                    role="group"
                    aria-label={`Remove access for ${grant.label ?? grant.accountId}`}
                  >
                    <p>
                      Remove world access for <strong>{grant.label ?? grant.accountId}</strong>?
                    </p>
                    <div className="ol-operations-row">
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
                        onPress={() => {
                          setRemoving(null);
                          void run(() =>
                            post('/api/access', {
                              accountId: grant.accountId,
                              expectedRevision: grant.revision,
                              capabilities: [],
                            }),
                          );
                        }}
                      >
                        Confirm removing access
                      </Button>
                      <Button size="sm" variant="quiet" onPress={() => setRemoving(null)}>
                        Keep access
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="quiet"
                    disabled={busy}
                    onPress={() => setRemoving(grant.accountId)}
                  >
                    Remove access
                  </Button>
                ))}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
