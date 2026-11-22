//! Durable control and its request receipt share the gameplay participation
//! transaction. A pending change fences the old actor's authority until the
//! world publishes the confirmed result or rolls back.

use super::*;
use crate::store::StoreResult;
use openlegend_simulation::{
    encoding::json_record, identity::MAX_SAFE_INTEGER, runtime::RuntimeRestoredPlayers,
};
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
    returning: Option<ReturningControl>,
    finished: bool,
    _custody: ByteReservation,
}

struct ReturningControl {
    scope: Arc<AuthorizedScope>,
    before: Arc<Access>,
    after: Arc<Access>,
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
        let (grant, _) = self.selected(&cache, authorized, Capability::Play, false)?;
        if request.expected_generation != scope.control_generation
            || request.expected_generation == MAX_SAFE_INTEGER
        {
            return Err(AccessError::Changed);
        }
        let returning = if request.operation == ControlOperation::Release {
            None
        } else {
            let custody = self
                .budget
                .reserve(8192)
                .map_err(|_| StoreError::Capacity)?;
            let before = cache.tokens[&authorized.key].clone();
            let generation = request.expected_generation + 1;
            let after = Arc::new(Access {
                session: before.session.clone(),
                account: before.account.clone(),
                session_revision: before.session_revision,
                expires_at: before.expires_at,
                grant: Some(grant.clone()),
                control: Some(Control {
                    generation,
                    account_id: scope.account_id.clone(),
                    session_id: scope.session_id.clone(),
                    connection_id: scope.connection_id.clone(),
                }),
                _custody: custody,
            });
            let scope = Arc::new(AuthorizedScope {
                scope: RequestScope {
                    control_generation: generation,
                    ..scope.clone()
                },
                key: authorized.key,
                expires_at: before.expires_at,
            });
            Some(ReturningControl {
                scope,
                before,
                after,
            })
        };
        if !cache.changing_control.insert(scope.actor_id.clone()) {
            return Err(AccessError::Busy);
        }
        Ok(ControlChange {
            owner: self.clone(),
            scope,
            request,
            fingerprint,
            unattended,
            returning,
            finished: false,
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
    pub(crate) fn returning_scope(&self) -> Option<&Arc<AuthorizedScope>> {
        self.returning.as_ref().map(|next| &next.scope)
    }

    /// Publish the already funded successor only after both PostgreSQL and
    /// simulation accept. The original token must still be current after the
    /// wait. A concurrent logout or grant edit cannot create foreground grace.
    pub(crate) fn confirmed(mut self) -> Result<Option<Arc<AuthorizedScope>>, AccessError> {
        let authority = self.owner.clone();
        let mut cache = authority
            .cache
            .lock()
            .map_err(|_| AccessError::Availability)?;
        let returning = self.returning.take().filter(|next| {
            let key = &next.scope.key;
            !cache.revoking.contains(key)
                && cache.changing_grant.as_deref() != Some(self.scope.account_id.as_str())
                && next.after.expires_at > now_ms()
                && cache
                    .tokens
                    .get(key)
                    .is_some_and(|current| Arc::ptr_eq(current, &next.before))
        });
        self.invalidate(&mut cache);
        if let Some(next) = returning {
            cache.tokens.insert(next.scope.key, next.after);
            Ok(Some(next.scope))
        } else {
            Ok(None)
        }
    }

    fn invalidate(&mut self, cache: &mut Cache) {
        invalidate_control(cache, &self.scope.actor_id);
        self.finished = true;
    }

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

pub(crate) struct PendingExit {
    world: String,
    pub(crate) actor: String,
    pub(crate) account: String,
    pub(crate) id: String,
    pub(crate) deadline: i64,
    _custody: ByteReservation,
}

pub(crate) struct RestoredExitAttempts {
    pub(crate) attempts: Vec<Option<(String, i64)>>,
    _custody: ByteReservation,
}

impl Authority {
    /// At paused startup, match the accepted native roster to current, non-rewindable
    /// exit attempts in one read. Keep both results funded through the protected writes.
    pub(crate) async fn restored_exit_attempts(
        &self,
        players: RuntimeRestoredPlayers,
    ) -> StoreResult<(RuntimeRestoredPlayers, RestoredExitAttempts)> {
        let count = players.players.len();
        // Includes the actor parameter, bounded stored payload, driver row and
        // retained result. The native roster keeps its own reservation.
        let bytes = players
            .players
            .iter()
            .try_fold(0_usize, |bytes, player| {
                bytes
                    .checked_add(player.actor.len())?
                    .checked_add(4 * ACCESS_COLUMN_BYTES as usize)
            })
            .ok_or(StoreError::Capacity)?;
        let custody = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let world = self.world_id.clone();
        self.store.read_simulation_cut(move |tx| Box::pin(async move {
            let mut attempts = Vec::new();
            attempts.try_reserve_exact(count).map_err(|_| StoreError::Capacity)?;
            attempts.resize_with(count, || None);
            let mut actors = Vec::new();
            actors.try_reserve_exact(count).map_err(|_| StoreError::Capacity)?;
            actors.extend(players.players.iter().map(|player| player.actor.as_str()));
            let rows = tx.query(
                "SELECT p.position, CASE WHEN octet_length(e.payload)<=$3 THEN e.payload::jsonb->>'id' END, \
                   CASE WHEN octet_length(e.payload)<=$3 THEN (e.payload::jsonb->>'deadline')::bigint END \
                 FROM unnest($2::text[]) WITH ORDINALITY p(actor_id,position) \
                 JOIN auth_exits e ON e.world_id=$1 AND e.actor_id=p.actor_id",
                &[&world, &actors, &ACCESS_COLUMN_BYTES],
            ).await?;
            for row in rows {
                let position: i64 = row.try_get(0)?;
                let index = usize::try_from(position - 1).map_err(|_| StoreError::InvalidRecord)?;
                let slot = attempts.get_mut(index).ok_or(StoreError::InvalidRecord)?;
                *slot = Some((row.try_get(1)?, row.try_get(2)?));
            }
            Ok((players, RestoredExitAttempts { attempts, _custody: custody }))
        })).await
    }

    /// Used only by a world with no installed game-time exit rule, at a known
    /// due time or on startup. Inactive departures keep their saved attempt.
    pub(crate) async fn next_elapsed_exit(&self) -> StoreResult<Option<PendingExit>> {
        let custody = self
            .budget
            .reserve(8192)
            .map_err(|_| StoreError::Capacity)?;
        let world = self.world_id.clone();
        self.store.read_simulation_cut(move |tx| Box::pin(async move {
            let row = tx.query_opt(
                "SELECT e.actor_id,g.account_id,e.payload::jsonb->>'id', \
                    (e.payload::jsonb->>'deadline')::bigint \
                 FROM auth_exits e \
                 JOIN auth_grants g ON g.world_id=e.world_id AND g.actor_id=e.actor_id \
                 JOIN sim_entities n ON n.world_id=e.world_id AND n.entity_id=e.actor_id \
                 JOIN sim_actors a ON a.world_id=n.world_id AND a.parent_id=n.id \
                 WHERE e.world_id=$1 AND a.payload::jsonb #>> '{participation,phase}'='exiting' \
                 AND octet_length(e.actor_id)+octet_length(g.account_id)+octet_length(e.payload)<=$2 \
                 ORDER BY (e.payload::jsonb->>'deadline')::bigint, n.position LIMIT 1",
                &[&world, &ACCESS_COLUMN_BYTES],
            ).await?;
            row.map(|row| Ok(PendingExit {
                world,
                actor: row.try_get(0)?,
                account: row.try_get(1)?,
                id: row.try_get(2)?,
                deadline: row.try_get(3)?,
                _custody: custody,
            })).transpose()
        })).await
    }
}

impl PendingExit {
    pub(crate) async fn validate(&self, tx: &Transaction<'_>) -> StoreResult<()> {
        let present = tx
            .query_opt(
                "SELECT 1 FROM auth_exits WHERE world_id=$1 AND actor_id=$2 \
             AND payload::jsonb->>'id'=$3 AND (payload::jsonb->>'deadline')::bigint=$4",
                &[&self.world, &self.actor, &self.id, &self.deadline],
            )
            .await?;
        if present.is_none() || now_ms() < self.deadline {
            return Err(StoreError::StaleCut);
        }
        Ok(())
    }
}

/// Internal absence may retire a saved controlling generation without
/// treating the discarded page or a revoked session as a credential.
pub(crate) struct DepartureControl {
    owner: Arc<Authority>,
    subject: Departing,
    _custody: ByteReservation,
}

enum Departing {
    Page(Arc<AuthorizedScope>),
    Restored { actor: String, account: String },
}

impl Authority {
    pub(crate) fn fence_departure(
        self: &Arc<Self>,
        scope: Arc<AuthorizedScope>,
    ) -> Result<DepartureControl, AccessError> {
        if scope.scope.world_id != self.world_id
            || scope.scope.timeline_id != self.timeline
            || !scope.scope.embodied()
            || scope.scope.control_generation >= MAX_SAFE_INTEGER
        {
            return Err(AccessError::Changed);
        }
        self.fence_absent(Departing::Page(scope))
    }

    pub(crate) fn fence_restored_departure(
        self: &Arc<Self>,
        actor: String,
        account: String,
    ) -> Result<DepartureControl, AccessError> {
        self.fence_absent(Departing::Restored { actor, account })
    }

    fn fence_absent(self: &Arc<Self>, subject: Departing) -> Result<DepartureControl, AccessError> {
        let custody = self.budget.reserve(8192).map_err(|_| AccessError::Busy)?;
        let actor = match &subject {
            Departing::Page(scope) => &scope.scope.actor_id,
            Departing::Restored { actor, .. } => actor,
        };
        let mut cache = self.cache.lock().map_err(|_| AccessError::Availability)?;
        if !cache.changing_control.insert(actor.clone()) {
            return Err(AccessError::Busy);
        }
        Ok(DepartureControl {
            owner: self.clone(),
            subject,
            _custody: custody,
        })
    }
}

impl DepartureControl {
    pub(crate) fn page(&self) -> Option<&Arc<AuthorizedScope>> {
        match &self.subject {
            Departing::Page(scope) => Some(scope),
            Departing::Restored { .. } => None,
        }
    }

    pub(crate) fn actor(&self) -> &str {
        match &self.subject {
            Departing::Page(scope) => &scope.scope.actor_id,
            Departing::Restored { actor, .. } => actor,
        }
    }

    pub(crate) fn account(&self) -> &str {
        match &self.subject {
            Departing::Page(scope) => &scope.scope.account_id,
            Departing::Restored { account, .. } => account,
        }
    }

    /// An old page can survive a concurrent access edit or replacement. Skip
    /// that page before preparing physical work; repeat the exact match at write.
    pub(crate) async fn selected(&self) -> StoreResult<bool> {
        let Some(scope) = self.page().cloned() else {
            return Ok(true);
        };
        self.owner.store.read_simulation_cut(move |tx| {
            Box::pin(async move {
                let value = &scope.scope;
                Ok(tx.query_opt(
                    "SELECT 1 FROM auth_controls WHERE world_id=$1 AND actor_id=$2 AND generation=$3 \
                     AND account_id=$4 AND session_id=$5 AND connection_id=$6",
                    &[&value.world_id, &value.actor_id, &(value.control_generation as i64),
                     &value.account_id, &value.session_id, &value.connection_id],
                ).await?.is_some())
            })
        }).await
    }

    /// Reuse a real operational attempt after a paused-world recovery. Only
    /// restored bodies inspect this record, under the protected save barrier.
    pub(crate) async fn previous_attempt(&self) -> StoreResult<Option<(String, i64)>> {
        let world = self.owner.world_id.clone();
        let actor = self.actor().to_owned();
        self.owner
            .store
            .read_simulation_cut(move |tx| {
                Box::pin(async move {
                    let row = tx
                        .query_opt(
                            "SELECT payload::jsonb->>'id',(payload::jsonb->>'deadline')::bigint \
                 FROM auth_exits WHERE world_id=$1 AND actor_id=$2 AND octet_length(payload)<=$3",
                            &[&world, &actor, &ACCESS_COLUMN_BYTES],
                        )
                        .await?;
                    row.map(|row| Ok((row.try_get(0)?, row.try_get(1)?)))
                        .transpose()
                })
            })
            .await
    }

    pub(crate) async fn write(
        &self,
        tx: &Transaction<'_>,
        attempt: (&str, i64),
        previous: bool,
    ) -> StoreResult<()> {
        let world = &self.owner.world_id;
        match &self.subject {
            Departing::Page(scope) => {
                let value = &scope.scope;
                let updated = tx.execute(
                    "UPDATE auth_controls SET generation=generation+1,session_id='',connection_id='' \
                     WHERE world_id=$1 AND actor_id=$2 AND generation=$3 AND account_id=$4 AND session_id=$5 AND connection_id=$6",
                    &[world, &value.actor_id, &(value.control_generation as i64),
                      &value.account_id, &value.session_id, &value.connection_id],
                ).await?;
                if updated != 1 {
                    return Err(StoreError::StaleCut);
                }
            }
            Departing::Restored { actor, account } => {
                let current = tx.query_opt(
                    "SELECT 1 FROM auth_exits WHERE world_id=$1 AND actor_id=$2 \
                     AND (NOT $5 OR (payload::jsonb->>'id'=$3 AND (payload::jsonb->>'deadline')::bigint=$4))",
                    &[world, actor, &attempt.0, &attempt.1, &previous],
                ).await?.is_some();
                if current != previous {
                    return Err(StoreError::StaleCut);
                }
                tx.execute(
                    "UPDATE auth_controls SET generation=generation+1,session_id='',connection_id='' \
                     WHERE world_id=$1 AND actor_id=$2 AND account_id=$3 AND generation<$4 AND session_id<>''",
                    &[world, actor, account, &(MAX_SAFE_INTEGER as i64)],
                ).await?;
            }
        }
        apply_exit(tx, world, self.actor(), Some(attempt)).await
    }
}

impl Drop for DepartureControl {
    fn drop(&mut self) {
        if let Ok(mut cache) = self.owner.cache.lock() {
            invalidate_control(&mut cache, self.actor());
        }
    }
}

fn invalidate_control(cache: &mut Cache, actor: &str) {
    // An older operational read must not install its old controller
    // after this fence. Keep unrelated actors' cached authority current.
    cache.revision = cache
        .revision
        .checked_add(1)
        .expect("access revision exhausted");
    cache.tokens.retain(|_, row| {
        row.grant
            .as_ref()
            .and_then(|grant| grant.actor_id.as_deref())
            != Some(actor)
    });
    cache.changing_control.remove(actor);
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
        if !self.finished {
            let authority = self.owner.clone();
            if let Ok(mut cache) = authority.cache.lock() {
                self.invalidate(&mut cache);
            }
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
