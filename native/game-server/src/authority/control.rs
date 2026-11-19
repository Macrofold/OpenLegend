//! Durable control and its request receipt share the gameplay participation
//! transaction. A pending change fences the old actor's authority until the
//! world publishes the confirmed result or rolls back.

use super::*;
use crate::store::StoreResult;
use openlegend_simulation::{encoding::json_record, identity::MAX_SAFE_INTEGER};
use tokio_postgres::Transaction;

#[derive(Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ControlOperation {
    Acquire,
    Replace,
    Release,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ControlRequest {
    pub id: String,
    pub expected_generation: u64,
    pub operation: ControlOperation,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Controller {
    world_id: String,
    actor_id: String,
    generation: u64,
    account_id: String,
    session_id: String,
    connection_id: String,
}

pub struct ControlChange {
    owner: Arc<Authority>,
    scope: RequestScope,
    request: ControlRequest,
    fingerprint: String,
    unattended: bool,
    _custody: ByteReservation,
}

impl Authority {
    /// Begin only inside the application's protected control lane, with the
    /// selected actor and its actual presence already established.
    pub fn fence_control(
        self: &Arc<Self>,
        authorized: &AuthorizedScope,
        request: ControlRequest,
        unattended: bool,
    ) -> Result<ControlChange, AccessError> {
        let scope = self.current(authorized, Capability::Play, false, |value, _| {
            value.clone()
        })?;
        if !scope.embodied()
            || request.id.is_empty()
            || request.id.len() > 120
            || !request.id.bytes().all(|byte| {
                byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b'.' | b':')
            })
            || request.expected_generation > MAX_SAFE_INTEGER
        {
            return Err(AccessError::Forbidden);
        }
        let custody = self
            .budget
            .reserve(8192)
            .map_err(|_| StoreError::Capacity)?;
        let fingerprint = fingerprint(&scope, &request)?;
        let mut cache = self.cache.lock().map_err(|_| AccessError::Availability)?;
        if !cache.changing_control.insert(scope.actor_id.clone()) {
            return Err(AccessError::Busy);
        }
        Ok(ControlChange {
            owner: self.clone(),
            scope,
            request,
            fingerprint,
            unattended,
            _custody: custody,
        })
    }

    /// Check replay under the protected save barrier before preparing new
    /// participation. The caller rechecks the grant before returning a result.
    pub async fn control_replayed(
        &self,
        scope: &RequestScope,
        request: &ControlRequest,
    ) -> Result<bool, AccessError> {
        let scope = scope.clone();
        let fingerprint = fingerprint(&scope, request)?;
        let id = request.id.clone();
        // An exact operational receipt is bounded by current identity fields.
        let _transfer = self
            .budget
            .reserve(8192)
            .map_err(|_| StoreError::Capacity)?;
        Ok(self
            .store
            .read_simulation_cut(move |tx| {
                Box::pin(
                    async move { Ok(read_receipt(tx, &scope, &id, &fingerprint).await?.is_some()) },
                )
            })
            .await?)
    }
}

impl ControlChange {
    /// Runs inside the prefix transaction after the native rows. Its session,
    /// grant, generation and idempotency checks refer to that exact snapshot.
    pub(crate) async fn write(&self, tx: &Transaction<'_>) -> StoreResult<()> {
        let scope = &self.scope;
        let row = tx
            .query_opt(
                "SELECT g.revision,c.generation,c.account_id,c.session_id,c.connection_id, \
                     coalesce(live.expires_at > $6,false) \
                 FROM auth_sessions s \
                 JOIN auth_grants g ON g.world_id=$1 AND g.account_id=s.account_id \
                 LEFT JOIN auth_controls c ON c.world_id=g.world_id AND c.actor_id=g.actor_id \
                 LEFT JOIN auth_sessions live ON live.id=c.session_id \
                 WHERE s.id=$2 AND s.account_id=$3 AND s.revision=$4 AND g.actor_id=$5 \
                     AND s.expires_at>$6 AND g.capabilities::jsonb ? 'play' \
                     AND coalesce(greatest(octet_length(c.account_id),octet_length(c.session_id), \
                         octet_length(c.connection_id)),0) <= $7",
                &[
                    &scope.world_id,
                    &scope.session_id,
                    &scope.account_id,
                    &(scope.session_revision as i64),
                    &scope.actor_id,
                    &now_ms(),
                    &ACCESS_COLUMN_BYTES,
                ],
            )
            .await?
            .ok_or(StoreError::StaleCut)?;
        if exact_integer(row.try_get(0)?)? != scope.grant_revision
            || read_receipt(tx, scope, &self.request.id, &self.fingerprint)
                .await?
                .is_some()
        {
            return Err(StoreError::StaleCut);
        }
        let generation = exact_integer(row.try_get::<_, Option<i64>>(1)?.unwrap_or(0))?;
        if generation != self.request.expected_generation || generation >= MAX_SAFE_INTEGER {
            return Err(StoreError::StaleCut);
        }
        let old_account: Option<&str> = row.try_get(2)?;
        let old_session: Option<&str> = row.try_get(3)?;
        let old_connection: Option<&str> = row.try_get(4)?;
        let same = old_account == Some(&scope.account_id)
            && old_session == Some(&scope.session_id)
            && old_connection == Some(&scope.connection_id);
        if (self.request.operation == ControlOperation::Release && !same)
            || (self.request.operation == ControlOperation::Acquire
                && !same
                && !self.unattended
                && row.try_get::<_, bool>(5)?)
        {
            return Err(StoreError::StaleCut);
        }
        let release = self.request.operation == ControlOperation::Release;
        let value = Controller {
            world_id: scope.world_id.clone(),
            actor_id: scope.actor_id.clone(),
            generation: generation + 1,
            account_id: scope.account_id.clone(),
            session_id: if release {
                String::new()
            } else {
                scope.session_id.clone()
            },
            connection_id: if release {
                String::new()
            } else {
                scope.connection_id.clone()
            },
        };
        let payload = json_record(&value).map_err(|_| StoreError::InvalidRecord)?;
        tx.execute(
            "INSERT INTO auth_controls(world_id,actor_id,generation,account_id,session_id,connection_id) \
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(world_id,actor_id) DO UPDATE SET \
             generation=excluded.generation,account_id=excluded.account_id,session_id=excluded.session_id, \
             connection_id=excluded.connection_id",
            &[
                &value.world_id,
                &value.actor_id,
                &(value.generation as i64),
                &value.account_id,
                &value.session_id,
                &value.connection_id,
            ],
        )
        .await?;
        tx.execute(
            "INSERT INTO auth_control_receipts(world_id,account_id,request_id,fingerprint,payload) \
             VALUES($1,$2,$3,$4,$5)",
            &[
                &value.world_id,
                &value.account_id,
                &self.request.id,
                &self.fingerprint,
                &payload,
            ],
        )
        .await?;
        Ok(())
    }

    pub(crate) async fn write_exit(
        &self,
        tx: &Transaction<'_>,
        attempt: Option<(&str, i64)>,
    ) -> StoreResult<()> {
        apply_exit(tx, &self.scope.world_id, &self.scope.actor_id, attempt).await
    }
}

pub(crate) async fn apply_exit(
    tx: &Transaction<'_>,
    world: &str,
    actor: &str,
    attempt: Option<(&str, i64)>,
) -> StoreResult<()> {
    if let Some((id, deadline)) = attempt {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Exit<'a> {
            world_id: &'a str,
            actor_id: &'a str,
            id: &'a str,
            deadline: i64,
        }
        let value = json_record(&Exit {
            world_id: world,
            actor_id: actor,
            id,
            deadline,
        })
        .map_err(|_| StoreError::InvalidRecord)?;
        tx.execute(
            "INSERT INTO auth_exits(world_id,actor_id,payload) VALUES($1,$2,$3) \
             ON CONFLICT(world_id,actor_id) DO UPDATE SET payload=excluded.payload",
            &[&world, &actor, &value],
        )
        .await?;
    } else {
        tx.execute(
            "DELETE FROM auth_exits WHERE world_id=$1 AND actor_id=$2",
            &[&world, &actor],
        )
        .await?;
    }
    Ok(())
}

impl Drop for ControlChange {
    fn drop(&mut self) {
        if let Ok(mut cache) = self.owner.cache.lock() {
            // A pre-change read that is still in flight cannot install its
            // old controller. Other actors' cached authority remains usable.
            cache.revision = cache
                .revision
                .checked_add(1)
                .expect("access revision exhausted");
            cache.tokens.retain(|_, row| {
                row.grant
                    .as_ref()
                    .and_then(|grant| grant.actor_id.as_deref())
                    != Some(&self.scope.actor_id)
            });
            cache.changing_control.remove(&self.scope.actor_id);
        }
    }
}

async fn read_receipt(
    tx: &Transaction<'_>,
    scope: &RequestScope,
    id: &str,
    fingerprint: &str,
) -> StoreResult<Option<Controller>> {
    let row = tx
        .query_opt(
            "SELECT CASE WHEN octet_length(fingerprint)=64 THEN fingerprint END, \
                    CASE WHEN octet_length(payload)<=$4 THEN payload END \
             FROM auth_control_receipts WHERE world_id=$1 AND account_id=$2 AND request_id=$3",
            &[&scope.world_id, &scope.account_id, &id, &4096_i32],
        )
        .await?;
    row.map(|row| {
        if row.try_get::<_, Option<&str>>(0)? != Some(fingerprint) {
            return Err(StoreError::StaleCut);
        }
        let payload: Option<&str> = row.try_get(1)?;
        let value: Controller = serde_json::from_str(payload.ok_or(StoreError::InvalidRecord)?)
            .map_err(|_| StoreError::InvalidRecord)?;
        if value.world_id != scope.world_id
            || value.actor_id != scope.actor_id
            || value.account_id != scope.account_id
            || value.generation > MAX_SAFE_INTEGER
        {
            return Err(StoreError::InvalidRecord);
        }
        Ok(value)
    })
    .transpose()
}

fn fingerprint(scope: &RequestScope, request: &ControlRequest) -> Result<String, StoreError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Identity<'a> {
        request: &'a ControlRequest,
        actor_id: &'a str,
        session_id: &'a str,
        connection_id: &'a str,
        timeline_id: &'a str,
        grant_revision: u64,
    }
    let value = Identity {
        request,
        actor_id: &scope.actor_id,
        session_id: &scope.session_id,
        connection_id: &scope.connection_id,
        timeline_id: &scope.timeline_id,
        grant_revision: scope.grant_revision,
    };
    Ok(openlegend_simulation::encoding::sha256_hex(
        json_record(&value)
            .map_err(|_| StoreError::InvalidRecord)?
            .as_bytes(),
    ))
}
