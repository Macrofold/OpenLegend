//! Current grant administration and its synchronous disclosure fence.

use super::{
    ACCESS_COLUMN_BYTES, AccessError, Authority, AuthorizedScope, Cache, Capability, RequestScope,
    exact_integer, granted_actor, now_ms,
};
use crate::store::{CommitError, StoreError, StoreResult, sql_ordinal};
use openlegend_simulation::identity::MAX_SAFE_INTEGER;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tokio_postgres::{Row, Transaction};
use uuid::Uuid;

#[derive(Debug)]
pub(crate) enum AccessUpdateError {
    Conflict,
    Access(AccessError),
}

impl From<AccessError> for AccessUpdateError {
    fn from(error: AccessError) -> Self {
        Self::Access(error)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct UpdateGrant {
    pub account_id: String,
    pub expected_revision: u64,
    pub capabilities: Vec<Capability>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct GrantRecord {
    pub(super) world_id: String,
    pub(super) account_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) actor_id: Option<String>,
    pub(super) revision: u64,
    pub(super) capabilities: Vec<Capability>,
}

impl GrantRecord {
    fn capabilities_fit(actor: Option<&str>, capabilities: &[Capability]) -> bool {
        actor.is_some() || !capabilities.contains(&Capability::Play)
    }

    pub(super) fn read(world: &str, row: &Row) -> StoreResult<Self> {
        let account: &str = row.try_get(0)?;
        let actor: &str = row.try_get(1)?;
        let revision = exact_integer(row.try_get(2)?)?;
        let capabilities: &str = row.try_get(3)?;
        if [account, actor, capabilities]
            .into_iter()
            .any(|text| text.len() > ACCESS_COLUMN_BYTES as usize)
        {
            return Err(StoreError::InvalidRecord);
        }
        let capabilities: Vec<Capability> =
            serde_json::from_str(capabilities).map_err(|_| StoreError::InvalidRecord)?;
        let actor_id = granted_actor(actor);
        if capabilities.len() > 6 || !Self::capabilities_fit(actor_id, &capabilities) {
            return Err(StoreError::InvalidRecord);
        }
        Ok(Self {
            world_id: world.into(),
            account_id: account.into(),
            actor_id: actor_id.map(str::to_owned),
            revision,
            capabilities,
        })
    }
}

pub(super) async fn audit(
    tx: &Transaction<'_>,
    world: &str,
    account: &str,
    issuer: &str,
    facts: &impl Serialize,
    at: i64,
) -> StoreResult<()> {
    let id = Uuid::new_v4().to_string();
    let facts = serde_json::to_string(facts).map_err(|_| StoreError::InvalidRecord)?;
    tx.execute(
        "INSERT INTO auth_access_audit VALUES($1,$2,$3,$4,$5,$6)",
        &[&id, &world, &account, &issuer, &at, &facts],
    )
    .await?;
    Ok(())
}

/// Recheck the saved access-management grant before an administrative write.
pub(crate) async fn assert_saved_access_manager(
    tx: &Transaction<'_>,
    scope: &RequestScope,
) -> StoreResult<()> {
    assert_saved_grant(tx, scope, "manage-access").await
}

/// Recheck the exact operational session and grant in the same transaction
/// as an authority change, after the old in-memory scope stops serving.
pub(crate) async fn assert_saved_grant(
    tx: &Transaction<'_>,
    scope: &RequestScope,
    capability: &str,
) -> StoreResult<()> {
    let session = sql_ordinal(scope.session_revision)?;
    let grant = sql_ordinal(scope.grant_revision)?;
    let actor = if scope.actor_id.is_empty() {
        format!("{}{}", super::CHARACTERLESS, scope.account_id)
    } else {
        scope.actor_id.clone()
    };
    let active: bool = tx
        .query_one(
            "SELECT EXISTS(SELECT 1 FROM auth_sessions s JOIN auth_grants g ON \
             g.account_id=s.account_id WHERE s.id=$1 AND s.account_id=$2 AND \
             s.revision=$3 AND s.expires_at>$4 AND g.world_id=$5 AND g.actor_id=$6 \
             AND g.revision=$7 AND g.capabilities::jsonb ? $8)",
            &[
                &scope.session_id,
                &scope.account_id,
                &session,
                &now_ms(),
                &scope.world_id,
                &actor,
                &grant,
                &capability,
            ],
        )
        .await?
        .try_get(0)?;
    if !active {
        return Err(StoreError::StaleCut);
    }
    Ok(())
}

pub(super) struct GrantChange<'a> {
    cache: &'a Mutex<Cache>,
    pub(super) uncertain: bool,
}

impl Drop for GrantChange<'_> {
    fn drop(&mut self) {
        if self.uncertain {
            // An ambiguous commit is reconciled by reopening the writer. Do
            // not permit this account to load the previous grant in the gap.
            return;
        }
        if let Ok(mut cache) = self.cache.lock()
            && let Some(revision) = cache.revision.checked_add(1)
        {
            cache.revision = revision;
            cache.changing_grant = None;
        }
    }
}

impl Authority {
    pub(crate) fn current_operations<T>(
        &self,
        authorized: &AuthorizedScope,
        publish: impl FnOnce(&RequestScope, &[Capability], bool) -> T,
    ) -> Result<T, AccessError> {
        let cache = self.cache.lock().map_err(|_| AccessError::Availability)?;
        let (grant, _) = self.selected_grant(&cache, authorized, false)?;
        Ok(publish(&authorized.scope, &grant.capabilities, self.local))
    }

    pub(crate) fn invite_mode(&self) -> bool {
        !self.local
    }

    pub(super) fn fence_grant(&self, account: &str) -> Result<GrantChange<'_>, AccessError> {
        let mut cache = self.cache.lock().map_err(|_| AccessError::Availability)?;
        if cache.changing_grant.is_some() {
            return Err(AccessError::Busy);
        }
        cache.revision = cache
            .revision
            .checked_add(1)
            .ok_or(AccessError::Availability)?;
        cache.tokens.retain(|_, access| access.account != account);
        cache.changing_grant = Some(account.to_owned());
        Ok(GrantChange {
            cache: &self.cache,
            uncertain: false,
        })
    }

    /// Fence the affected account before waiting on SQL. Removing Play also
    /// releases that control generation in the same grant and audit commit.
    pub(crate) async fn set_capabilities(
        &self,
        authorized: &AuthorizedScope,
        request: UpdateGrant,
        signal: impl Fn(),
    ) -> Result<(), AccessUpdateError> {
        let _change = self.changes.lock().await;
        self.current(authorized, Capability::ManageAccess, false, |_, _| ())?;
        let mut fence = self.fence_grant(&request.account_id)?;
        signal();
        let scope = authorized.scope.clone();
        let result = self.store.operational(move |tx| Box::pin(async move {
            assert_saved_access_manager(tx, &scope).await?;
            let limit = ACCESS_COLUMN_BYTES;
            let row = tx.query_opt(
                "SELECT account_id,actor_id,revision,capabilities FROM auth_grants \
                 WHERE world_id=$1 AND account_id=$2 AND \
                 greatest(octet_length(account_id),octet_length(actor_id),octet_length(capabilities))<=$3",
                &[&scope.world_id, &request.account_id, &limit],
            ).await?;
            let Some(row) = row else { return Ok(Err(AccessUpdateError::Conflict)) };
            let old = GrantRecord::read(&scope.world_id, &row)?;
            if old.revision != request.expected_revision || old.revision == MAX_SAFE_INTEGER {
                return Ok(Err(AccessUpdateError::Conflict));
            }
            let mut capabilities = Vec::with_capacity(request.capabilities.len());
            for capability in request.capabilities {
                if !capabilities.contains(&capability) {
                    capabilities.push(capability);
                }
            }
            if !GrantRecord::capabilities_fit(old.actor_id.as_deref(), &capabilities) {
                return Ok(Err(AccessError::Forbidden.into()));
            }
            let after = GrantRecord { revision: old.revision + 1, capabilities, ..old.clone() };
            let revision = sql_ordinal(after.revision)?;
            let expected = sql_ordinal(old.revision)?;
            if old.capabilities.contains(&Capability::Play) && !after.capabilities.contains(&Capability::Play) {
                let actor = old.actor_id.as_ref().ok_or(StoreError::InvalidRecord)?;
                let control = tx.query_opt(
                    "SELECT generation FROM auth_controls WHERE world_id=$1 AND actor_id=$2",
                    &[&scope.world_id, actor],
                ).await?;
                let generation = control.map_or(Ok(0), |row| exact_integer(row.try_get(0)?))?;
                if generation == MAX_SAFE_INTEGER {
                    return Ok(Err(AccessUpdateError::Conflict));
                }
                let generation = sql_ordinal(generation + 1)?;
                tx.execute(
                    "INSERT INTO auth_controls VALUES($1,$2,$3,$4,'','') ON CONFLICT(world_id,actor_id) \
                     DO UPDATE SET generation=excluded.generation,account_id=excluded.account_id,\
                     session_id='',connection_id=''",
                    &[&scope.world_id, actor, &generation, &old.account_id],
                ).await?;
            }
            let permissions = serde_json::to_string(&after.capabilities)
                .map_err(|_| StoreError::InvalidRecord)?;
            if tx.execute(
                "UPDATE auth_grants SET revision=$3,capabilities=$4 WHERE world_id=$1 AND account_id=$2 AND revision=$5",
                &[&scope.world_id, &old.account_id, &revision, &permissions, &expected],
            ).await? != 1 {
                return Err(StoreError::StaleCut);
            }
            audit(tx, &scope.world_id, &old.account_id, &scope.account_id,
                  &serde_json::json!({ "type":"capabilities", "before":old, "after":after }),
                  now_ms()).await?;
            Ok(Ok(()))
        })).await;
        match result {
            Ok(result) => result,
            Err(CommitError::RolledBack(StoreError::StaleCut)) => Err(AccessError::Changed.into()),
            Err(error) => {
                fence.uncertain = matches!(error, CommitError::Unknown(_));
                Err(AccessError::from(error).into())
            }
        }
    }
}
