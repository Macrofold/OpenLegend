//! Operational invite records and admission. The creation token is returned
//! once. Only its hash reaches PostgreSQL or the pending OIDC attempt.

use super::{
    ACCESS_COLUMN_BYTES, Access, AccessError, Authority, AuthorizedScope, Capability, TokenHash,
    digest_text, granted_actor,
    managed_access::{GrantRecord, assert_manager, audit},
    now_ms, token_hash,
};
use crate::store::{
    CommitError, OrdinaryProjection, PrefixProjection, StoreError, StoreResult, sql_ordinal,
};
use openlegend_simulation::{
    host::ByteReservation, records::SaveRows, runtime::InvitationActors, text::JsText,
    values::is_safe_record_id,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::time::Instant;
use tokio_postgres::Transaction;
use uuid::Uuid;

const DEFAULT_HOURS: u16 = 168;
// docs/limits/multiplayer.md#mp15
const MAXIMUM_HOURS: u16 = 720;
const LIVE_INVITES: i64 = 100;
const DISPLAY_INVITES: usize = 200;
const DISPLAY_GRANTS: usize = 500;
const RECORD_BYTES: i32 = 8192;

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum Role {
    Player,
    Spectator,
    Operator,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NewInvite {
    pub(crate) id: Uuid,
    pub(crate) role: Role,
    pub(crate) actor_id: Option<String>,
    #[serde(default)]
    capabilities: Vec<Capability>,
    label: JsText,
    #[serde(default = "default_hours")]
    expires_in_hours: u16,
}

const fn default_hours() -> u16 {
    DEFAULT_HOURS
}

impl NewInvite {
    pub(crate) fn valid(&mut self) -> bool {
        self.label = self.label.trimmed();
        !self.label.trim_is_empty()
            && self.label.units_len() <= 80
            && (1..=MAXIMUM_HOURS).contains(&self.expires_in_hours)
            && self.capabilities.len() <= 6
            && self.actor_id.as_ref().is_none_or(|id| {
                is_safe_record_id(id)
                    && granted_actor(id).is_some()
                    && id.encode_utf16().count() <= 100
            })
    }

    fn delegated(&self, held: &[Capability]) -> Result<Vec<Capability>, AccessError> {
        if (self.role == Role::Player) != self.actor_id.is_some()
            || (self.role != Role::Operator && !self.capabilities.is_empty())
        {
            return Err(AccessError::Forbidden);
        }
        let requested = match self.role {
            Role::Player => vec![Capability::Play],
            Role::Spectator => vec![Capability::Spectate],
            Role::Operator => {
                self.capabilities
                    .iter()
                    .copied()
                    .fold(Vec::new(), |mut caps, cap| {
                        if !caps.contains(&cap) {
                            caps.push(cap);
                        }
                        caps
                    })
            }
        };
        // A manager may admit a new player without having their own body.
        // Only that allocation can grant Play; other powers remain delegable.
        if permits_role(self.role, &requested, held) {
            Ok(requested)
        } else {
            Err(AccessError::Forbidden)
        }
    }
}

fn role_shape(role: Role, requested: &[Capability]) -> bool {
    match role {
        Role::Player => requested == [Capability::Play],
        Role::Spectator => requested == [Capability::Spectate],
        Role::Operator => !requested.is_empty() && !requested.contains(&Capability::Play),
    }
}

fn permits_role(role: Role, requested: &[Capability], issuer: &[Capability]) -> bool {
    issuer.contains(&Capability::ManageAccess)
        && role_shape(role, requested)
        && (role == Role::Player || requested.iter().all(|cap| issuer.contains(cap)))
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Invite {
    id: Uuid,
    world_id: String,
    role: Role,
    capabilities: Vec<Capability>,
    #[serde(skip_serializing_if = "Option::is_none")]
    actor_id: Option<String>,
    label: JsText,
    created_by: String,
    created_at: i64,
    expires_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    revoked_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    revoked_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    redeemed_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    account_id: Option<String>,
}

impl Invite {
    fn decode(raw: &str) -> StoreResult<Self> {
        let invite: Self = serde_json::from_str(raw).map_err(|_| StoreError::InvalidRecord)?;
        if invite.world_id.is_empty()
            || invite.created_by.is_empty()
            || invite.label.trim_is_empty()
            || invite.label.units_len() > 80
            || invite.created_at < 0
            || invite.expires_at <= invite.created_at
            || invite.capabilities.len() > 6
            || !role_shape(invite.role, &invite.capabilities)
            || (invite.role == Role::Player) != invite.actor_id.is_some()
            || invite
                .actor_id
                .as_deref()
                .is_some_and(|actor| !is_safe_record_id(actor) || granted_actor(actor).is_none())
            || invite.revoked_at.is_some() != invite.revoked_by.is_some()
            || invite.redeemed_at.is_some() != invite.account_id.is_some()
            || (invite.revoked_at.is_some() && invite.redeemed_at.is_some())
        {
            return Err(StoreError::InvalidRecord);
        }
        Ok(invite)
    }

    fn status(&self, now: i64) -> &'static str {
        if self.redeemed_at.is_some() {
            "redeemed"
        } else if self.revoked_at.is_some() {
            "revoked"
        } else if self.expires_at <= now {
            "expired"
        } else {
            "pending"
        }
    }

    pub(super) fn view(&self, now: i64) -> InviteView<'_> {
        InviteView {
            id: self.id,
            role: self.role,
            capabilities: &self.capabilities,
            actor_id: self.actor_id.as_deref(),
            label: &self.label,
            created_at: self.created_at,
            expires_at: self.expires_at,
            status: self.status(now),
            redeemed_at: self.redeemed_at,
            account_id: self.account_id.as_deref(),
        }
    }

    async fn write(&self, tx: &Transaction<'_>) -> StoreResult<()> {
        let id = self.id.to_string();
        let payload = serde_json::to_string(self).map_err(|_| StoreError::InvalidRecord)?;
        let closed = self.revoked_at.is_some() || self.redeemed_at.is_some();
        if tx
            .execute(
                "UPDATE auth_invites SET closed=$3,payload=$4 WHERE world_id=$1 AND id=$2",
                &[&self.world_id, &id, &closed, &payload],
            )
            .await?
            != 1
        {
            return Err(StoreError::StaleCut);
        }
        Ok(())
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InviteView<'a> {
    id: Uuid,
    role: Role,
    capabilities: &'a [Capability],
    #[serde(skip_serializing_if = "Option::is_none")]
    actor_id: Option<&'a str>,
    label: &'a JsText,
    created_at: i64,
    expires_at: i64,
    status: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    redeemed_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    account_id: Option<&'a str>,
}

pub(crate) struct IssuedInvite {
    invite: Invite,
    pub(crate) token: String,
}

impl IssuedInvite {
    pub(crate) fn view(&self) -> InviteView<'_> {
        self.invite.view(now_ms())
    }
}

pub(crate) enum InviteError {
    Access(AccessError),
    Conflict,
    Refused(&'static str),
}

impl From<AccessError> for InviteError {
    fn from(error: AccessError) -> Self {
        Self::Access(error)
    }
}
impl From<StoreError> for InviteError {
    fn from(error: StoreError) -> Self {
        AccessError::from(error).into()
    }
}
impl From<CommitError> for InviteError {
    fn from(error: CommitError) -> Self {
        match error {
            CommitError::RolledBack(StoreError::StaleCut) => AccessError::Changed.into(),
            other => AccessError::from(other).into(),
        }
    }
}

/// Fund the console list, bounded SQL bodies and their decoded copies before
/// reading. The caller retains this owner through the final lease and encoding.
pub(crate) struct AccessRoster {
    invites: Vec<Invite>,
    grants: Vec<GrantRecord>,
    pub(crate) candidates: InvitationActors,
    _custody: ByteReservation,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GrantView<'a> {
    account_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    actor_id: Option<&'a str>,
    capabilities: &'a [Capability],
    revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    label: Option<&'a JsText>,
    #[serde(rename = "self")]
    is_self: bool,
}

impl AccessRoster {
    pub(crate) fn invitations(&self, now: i64) -> impl Iterator<Item = InviteView<'_>> {
        self.invites.iter().map(move |invite| invite.view(now))
    }
    pub(crate) fn grants<'a>(&'a self, own: &'a str) -> impl Iterator<Item = GrantView<'a>> {
        self.grants.iter().map(move |grant| GrantView {
            account_id: &grant.account_id,
            actor_id: grant.actor_id.as_deref(),
            capabilities: &grant.capabilities,
            revision: grant.revision,
            label: self
                .invites
                .iter()
                .find(|invite| invite.account_id.as_deref() == Some(grant.account_id.as_str()))
                .map(|invite| &invite.label),
            is_self: grant.account_id == own,
        })
    }
}

async fn hash_record(
    tx: &Transaction<'_>,
    world: &str,
    hash: TokenHash,
) -> StoreResult<Option<Invite>> {
    let hash = digest_text(hash);
    let row = tx
        .query_opt(
            "SELECT CASE WHEN octet_length(payload)<=$3 THEN payload ELSE '' END \
         FROM auth_invites WHERE world_id=$1 AND token_hash=$2",
            &[&world, &hash, &RECORD_BYTES],
        )
        .await?;
    row.map(|row| Invite::decode(row.try_get(0)?)).transpose()
}

async fn unclaimed(tx: &Transaction<'_>, world: &str, actor: &str) -> StoreResult<bool> {
    Ok(!tx
        .query_one(
            "SELECT EXISTS(SELECT 1 FROM auth_grants WHERE world_id=$1 AND actor_id=$2 \
         UNION ALL SELECT 1 FROM auth_actor_owners WHERE world_id=$1 AND actor_id=$2)",
            &[&world, &actor],
        )
        .await?
        .try_get::<_, bool>(0)?)
}

pub(crate) type InviteHash = [u8; 32];

pub(crate) fn invite_hash(token: &str) -> Option<InviteHash> {
    token_hash(token).ok()
}

impl Authority {
    pub(crate) async fn invite_landing(&self, hash: TokenHash) -> Result<bool, InviteError> {
        if self.local {
            return Ok(false);
        }
        let hold = self
            .budget
            .reserve((RECORD_BYTES as usize) * 4)
            .map_err(|_| StoreError::Capacity)?;
        let world = self.world_id.clone();
        self.store
            .read_operational(move |tx| {
                Box::pin(async move {
                    let _hold = hold;
                    Ok(hash_record(tx, &world, hash)
                        .await?
                        .is_some_and(|invite| invite.status(now_ms()) == "pending"))
                })
            })
            .await
            .map_err(Into::into)
    }

    pub(crate) async fn access_roster(
        &self,
        authorized: &AuthorizedScope,
        mut candidates: InvitationActors,
    ) -> Result<AccessRoster, InviteError> {
        let world = self.current(authorized, Capability::ManageAccess, false, |scope, _| {
            scope.world_id.clone()
        })?;
        let candidate_bytes = candidates
            .actors
            .iter()
            .try_fold(0_usize, |total, actor| {
                total
                    .checked_add(actor.actor_id.len().checked_mul(6)?)?
                    .checked_add(128)
            })
            .ok_or(StoreError::Capacity)?;
        let list_bytes = DISPLAY_INVITES * RECORD_BYTES as usize * 4
            + DISPLAY_GRANTS * ACCESS_COLUMN_BYTES as usize * 5;
        let custody = self
            .budget
            .reserve(
                list_bytes
                    .checked_add(candidate_bytes)
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        self.store
            .read_operational(move |tx| {
                Box::pin(async move {
                    let invites = tx
                        .query(
                            "SELECT CASE WHEN octet_length(payload)<=$2 THEN payload ELSE '' END \
                 FROM auth_invites WHERE world_id=$1 ORDER BY created_at DESC,id DESC LIMIT $3",
                            &[&world, &RECORD_BYTES, &(DISPLAY_INVITES as i64)],
                        )
                        .await?
                        .iter()
                        .map(|row| Invite::decode(row.try_get(0)?))
                        .collect::<StoreResult<Vec<_>>>()?;
                    let grants = tx
                        .query(
                            "SELECT account_id,actor_id,revision,capabilities FROM auth_grants \
                 WHERE world_id=$1 AND greatest(octet_length(account_id),octet_length(actor_id), \
                 octet_length(capabilities))<=$2 ORDER BY account_id LIMIT $3",
                            &[&world, &ACCESS_COLUMN_BYTES, &(DISPLAY_GRANTS as i64)],
                        )
                        .await?
                        .iter()
                        .map(|row| GrantRecord::read(&world, row))
                        .collect::<StoreResult<Vec<_>>>()?;
                    let ids: Vec<_> = candidates
                        .actors
                        .iter()
                        .map(|actor| actor.actor_id.as_str())
                        .collect();
                    let rows = if ids.is_empty() {
                        Vec::new()
                    } else {
                        tx.query(
                "SELECT actor_id FROM auth_actor_owners WHERE world_id=$1 AND actor_id=ANY($2) \
                 UNION SELECT actor_id FROM auth_grants WHERE world_id=$1 AND actor_id=ANY($2)",
                &[&world,&ids],
            ).await?
                    };
                    let mut claimed = rows
                        .iter()
                        .map(|row| row.try_get::<_, &str>(0).map_err(StoreError::from))
                        .collect::<StoreResult<Vec<_>>>()?;
                    claimed.sort_unstable();
                    candidates
                        .actors
                        .retain(|actor| claimed.binary_search(&actor.actor_id.as_str()).is_err());
                    Ok(AccessRoster {
                        invites,
                        grants,
                        candidates,
                        _custody: custody,
                    })
                })
            })
            .await
            .map_err(Into::into)
    }

    /// The actor, when present, must already be checked under the world's
    /// protected admission. This transaction owns the one secret result.
    pub(crate) async fn issue_invite(
        &self,
        authorized: &AuthorizedScope,
        request: NewInvite,
    ) -> Result<IssuedInvite, InviteError> {
        if self.local {
            return Err(InviteError::Refused(
                "Invites need OIDC sign-in; local mode has a single player.",
            ));
        }
        let _change = self.changes.lock().await;
        let (scope, caps) = self.with_current(
            authorized,
            Capability::ManageAccess,
            false,
            |scope, grant, _| (scope.clone(), grant.capabilities.clone()),
        )?;
        let capabilities = request.delegated(&caps)?;
        let mut random = [0_u8; 32];
        getrandom::fill(&mut random).map_err(|_| AccessError::Availability)?;
        let token = digest_text(random);
        let hash = digest_text(token_hash(&token)?);
        let budget = self.budget.clone();
        let result = self.store.operational(move |tx| Box::pin(async move {
            assert_manager(tx,&scope).await?;
            let now = now_ms();
            let id = request.id.to_string();
            let world = &scope.world_id;
            if tx.query_one("SELECT EXISTS(SELECT 1 FROM auth_invites WHERE id=$1)", &[&id]).await?.try_get::<_,bool>(0)? {
                return Ok(Err(InviteError::Conflict));
            }
            let count = if let Some(actor) = &request.actor_id {
                if !unclaimed(tx,world,actor).await? {
                    return Ok(Err(InviteError::Refused("That character cannot be offered to a new player.")));
                }
                // Preserve exact labels. Casting these whole records to SQL
                // JSONB rejects valid text with NUL or unmatched UTF-16 units.
                let _pending = budget.reserve(LIVE_INVITES as usize * RECORD_BYTES as usize * 3)
                    .map_err(|_| StoreError::Capacity)?;
                let rows = tx.query(
                    "SELECT CASE WHEN octet_length(payload)<=$4 THEN payload ELSE '' END \
                     FROM auth_invites WHERE world_id=$1 AND closed=false AND expires_at>$2 LIMIT $3",
                    &[world,&now,&LIVE_INVITES,&RECORD_BYTES],
                ).await?;
                let count = rows.len() as i64;
                if count < LIVE_INVITES {
                    for row in rows {
                        if Invite::decode(row.try_get(0)?)?.actor_id.as_ref() == Some(actor) {
                            return Ok(Err(InviteError::Refused("That character already has a pending invite.")));
                        }
                    }
                }
                count
            } else {
                tx.query_one(
                    "SELECT count(*) FROM (SELECT 1 FROM auth_invites WHERE world_id=$1 AND closed=false \
                     AND expires_at>$2 LIMIT $3) pending",
                    &[world,&now,&LIVE_INVITES],
                ).await?.try_get::<_,i64>(0)?
            };
            if count >= LIVE_INVITES {
                return Ok(Err(InviteError::Refused("Too many pending invites. Revoke unused invites first.")));
            }
            let invite = Invite {
                id:request.id, world_id:scope.world_id, role:request.role, capabilities, actor_id:request.actor_id,
                label:request.label, created_by:scope.account_id, created_at:now,
                expires_at:now.checked_add(i64::from(request.expires_in_hours)*3_600_000).ok_or(StoreError::Capacity)?,
                revoked_at:None, revoked_by:None, redeemed_at:None, account_id:None,
            };
            let payload = serde_json::to_string(&invite).map_err(|_| StoreError::InvalidRecord)?;
            tx.execute("INSERT INTO auth_invites VALUES($1,$2,$3,$4,$5,false,$6)",
                &[&id,&invite.world_id,&hash,&now,&invite.expires_at,&payload]).await?;
            Ok(Ok(invite))
        })).await??;
        Ok(IssuedInvite {
            invite: result,
            token,
        })
    }

    pub(crate) async fn revoke_invite(
        &self,
        authorized: &AuthorizedScope,
        id: Uuid,
    ) -> Result<&'static str, InviteError> {
        let _change = self.changes.lock().await;
        let scope = self.current(authorized, Capability::ManageAccess, false, |scope, _| {
            scope.clone()
        })?;
        self.store
            .operational(move |tx| {
                Box::pin(async move {
                    assert_manager(tx, &scope).await?;
                    let row = tx
                        .query_opt(
                            "SELECT CASE WHEN octet_length(payload)<=$3 THEN payload ELSE '' END \
                 FROM auth_invites WHERE world_id=$1 AND id=$2",
                            &[&scope.world_id, &id.to_string(), &RECORD_BYTES],
                        )
                        .await?;
                    let Some(row) = row else {
                        return Ok(Err(InviteError::Refused("That invite does not exist.")));
                    };
                    let mut invite = Invite::decode(row.try_get(0)?)?;
                    let now = now_ms();
                    let answer = match invite.status(now) {
                        "pending" => {
                            invite.revoked_at = Some(now);
                            invite.revoked_by = Some(scope.account_id);
                            invite.write(tx).await?;
                            Ok("Invite revoked.")
                        }
                        "redeemed" => Err(InviteError::Refused(
                            "Already used. Remove that account’s access instead.",
                        )),
                        "revoked" => Ok("That invite is already revoked."),
                        _ => Ok("That invite is already expired."),
                    };
                    Ok(answer)
                })
            })
            .await?
    }
}

pub(crate) enum ClaimOutcome {
    Accepted(Role),
    Unavailable,
    AlreadyMember,
    CharacterUnavailable,
}

pub(crate) struct Claim {
    hash: InviteHash,
    session_key: TokenHash,
    session: Arc<Access>,
    world: String,
    invite_id: Uuid,
    actor: Option<String>,
    deadline: Instant,
    expires_at: i64,
    _custody: ByteReservation,
}

impl Claim {
    pub(crate) fn invite_id(&self) -> Uuid {
        self.invite_id
    }
    pub(crate) fn actor(&self) -> Option<&str> {
        self.actor.as_deref()
    }

    pub(crate) fn account(&self) -> &str {
        &self.session.account
    }

    pub(crate) fn current_time(&self) -> bool {
        Instant::now() < self.deadline && now_ms() < self.expires_at
    }

    async fn invite(&self, tx: &Transaction<'_>) -> StoreResult<Result<Invite, ClaimOutcome>> {
        let now = now_ms();
        if !self.current_time() {
            return Ok(Err(ClaimOutcome::Unavailable));
        }
        let Some(invite) = hash_record(tx, &self.world, self.hash).await? else {
            return Ok(Err(ClaimOutcome::Unavailable));
        };
        if invite.status(now) != "pending" {
            return Ok(Err(ClaimOutcome::Unavailable));
        }
        let account = &self.session.account;
        let revision = sql_ordinal(self.session.session_revision)?;
        let current: bool = tx
            .query_one(
                "SELECT EXISTS(SELECT 1 FROM auth_sessions WHERE id=$1 AND account_id=$2 \
             AND revision=$3 AND expires_at>$4)",
                &[&self.session.session, account, &revision, &now],
            )
            .await?
            .try_get(0)?;
        if !current {
            return Ok(Err(ClaimOutcome::Unavailable));
        }
        let existing: bool = tx
            .query_one(
                "SELECT EXISTS(SELECT 1 FROM auth_grants WHERE world_id=$1 AND account_id=$2)",
                &[&self.world, account],
            )
            .await?
            .try_get(0)?;
        if existing {
            return Ok(Err(ClaimOutcome::AlreadyMember));
        }
        let issuer = tx
            .query_opt(
                "SELECT CASE WHEN octet_length(capabilities)<=$3 THEN capabilities ELSE '' END \
             FROM auth_grants WHERE world_id=$1 AND account_id=$2",
                &[&self.world, &invite.created_by, &ACCESS_COLUMN_BYTES],
            )
            .await?;
        let Some(issuer) = issuer else {
            return Ok(Err(ClaimOutcome::Unavailable));
        };
        let held: &str = issuer.try_get(0)?;
        let held: Vec<Capability> =
            serde_json::from_str(held).map_err(|_| StoreError::InvalidRecord)?;
        if held.len() > 6 || !permits_role(invite.role, &invite.capabilities, &held) {
            return Ok(Err(ClaimOutcome::Unavailable));
        }
        if let Some(actor) = &invite.actor_id
            && !unclaimed(tx, &self.world, actor).await?
        {
            return Ok(Err(ClaimOutcome::CharacterUnavailable));
        }
        Ok(Ok(invite))
    }

    async fn write_claim(&self, tx: &Transaction<'_>) -> StoreResult<ClaimOutcome> {
        let mut invite = match self.invite(tx).await? {
            Ok(invite) => invite,
            Err(outcome) => return Ok(outcome),
        };
        if invite.id != self.invite_id || invite.actor_id != self.actor || !self.current_time() {
            return Ok(ClaimOutcome::Unavailable);
        }
        let account = &self.session.account;
        let stored_actor = invite
            .actor_id
            .clone()
            .unwrap_or_else(|| format!("{}{account}", super::CHARACTERLESS));
        let caps =
            serde_json::to_string(&invite.capabilities).map_err(|_| StoreError::InvalidRecord)?;
        let at = now_ms();
        if invite.expires_at <= at || self.expires_at <= at {
            return Ok(ClaimOutcome::Unavailable);
        }
        tx.execute(
            "INSERT INTO auth_grants VALUES($1,$2,$3,1,$4)",
            &[&self.world, account, &stored_actor, &caps],
        )
        .await?;
        if let Some(actor) = &invite.actor_id {
            tx.execute(
                "INSERT INTO auth_actor_owners VALUES($1,$2,$3)",
                &[&self.world, actor, account],
            )
            .await?;
        }
        invite.redeemed_at = Some(at);
        invite.account_id = Some(account.clone());
        invite.write(tx).await?;
        audit(tx,&self.world,account,&invite.created_by,
            &serde_json::json!({"type":"invite","inviteId":invite.id,"role":invite.role,"after":invite.capabilities}),
            at).await?;
        Ok(ClaimOutcome::Accepted(invite.role))
    }

    /// Connect the selected invite to the protected world save. A changed
    /// grant, refused allocation or expired login rolls back both halves.
    async fn write_protected(&self, tx: &Transaction<'_>) -> StoreResult<()> {
        match self.write_claim(tx).await? {
            ClaimOutcome::Accepted(Role::Player) => Ok(()),
            _ => Err(StoreError::StaleCut),
        }
    }
}

/// Prepare ordinary history through its owner and add the sealed grant at
/// the end of the same write. The HTTP callback never receives a SQL handle.
pub(crate) struct EnrollmentProjection<'a> {
    pub(crate) ordinary: OrdinaryProjection<'a>,
    pub(crate) invitation: &'a Claim,
}

impl PrefixProjection for EnrollmentProjection<'_> {
    async fn before_records(
        &self,
        tx: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.ordinary.before_records(tx, rows, revision).await
    }

    async fn after_records(
        &self,
        tx: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.ordinary.after_records(tx, rows, revision).await?;
        self.invitation.write_protected(tx).await
    }
}

pub(crate) struct ClaimFence<'a> {
    grant: super::managed_access::GrantChange<'a>,
    _change: tokio::sync::MutexGuard<'a, ()>,
}

impl ClaimFence<'_> {
    pub(crate) fn uncertain(&mut self) {
        self.grant.uncertain = true;
    }
}

impl Authority {
    pub(crate) async fn prepare_claim(
        &self,
        token: &str,
        hash: InviteHash,
        deadline: Instant,
        expires_at: i64,
    ) -> Result<Result<Claim, ClaimOutcome>, InviteError> {
        if self.local || deadline <= Instant::now() || expires_at <= now_ms() {
            return Ok(Err(ClaimOutcome::Unavailable));
        }
        let (key, session) = self.access(token).await?;
        let mut claim = Claim {
            hash,
            session_key: key,
            session,
            world: self.world_id.clone(),
            invite_id: Uuid::nil(),
            actor: None,
            deadline,
            expires_at,
            _custody: self
                .budget
                .reserve(RECORD_BYTES as usize * 8)
                .map_err(|_| StoreError::Capacity)?,
        };
        self.store
            .read_operational(move |tx| {
                Box::pin(async move {
                    match claim.invite(tx).await? {
                        Ok(invite) => {
                            claim.invite_id = invite.id;
                            claim.actor = invite.actor_id;
                            Ok(Ok(claim))
                        }
                        Err(outcome) => Ok(Err(outcome)),
                    }
                })
            })
            .await
            .map_err(Into::into)
    }

    /// The world save barrier, when one is needed, is acquired before this
    /// lock. A stale login read cannot survive the account's grant update.
    pub(crate) async fn enter_claim(&self, claim: &Claim) -> Result<ClaimFence<'_>, InviteError> {
        let _change = tokio::time::timeout_at(claim.deadline, self.changes.lock())
            .await
            .map_err(|_| AccessError::Changed)?;
        if !claim.current_time() {
            return Err(AccessError::Changed.into());
        }
        self.current_session(claim.session_key, &claim.session, |_| ())?;
        let grant = self.fence_grant(claim.account())?;
        Ok(ClaimFence { grant, _change })
    }

    pub(crate) async fn claim_characterless(
        &self,
        claim: Claim,
    ) -> Result<ClaimOutcome, InviteError> {
        if claim.actor().is_some() {
            return Ok(ClaimOutcome::CharacterUnavailable);
        }
        let mut fence = self.enter_claim(&claim).await?;
        let result = self
            .store
            .operational(move |tx| Box::pin(async move { claim.write_claim(tx).await }))
            .await;
        if matches!(result, Err(CommitError::Unknown(_))) {
            fence.uncertain();
        }
        result.map_err(Into::into)
    }
}
