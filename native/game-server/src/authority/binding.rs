//! An operator can change an account's current character, without transferring
//! either character's permanent privacy ownership. The protected gameplay
//! commit and the operational receipt are one publication.

use super::{
    ACCESS_COLUMN_BYTES, AccessError, AccessUpdateError, Authority, AuthorizedScope, Capability,
    RequestScope,
    managed_access::{GrantChange, GrantRecord, assert_manager, audit},
    now_ms,
};
use crate::store::{OrdinaryProjection, PrefixProjection, StoreError, StoreResult, sql_ordinal};
use openlegend_simulation::{host::ByteReservation, identity::MAX_SAFE_INTEGER, records::SaveRows};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::sync::MutexGuard;
use tokio_postgres::Transaction;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct BindingRequest {
    id: String,
    account_id: String,
    actor_id: String,
    expected_revision: u64,
}

impl BindingRequest {
    pub(crate) fn valid(&self) -> bool {
        self.expected_revision <= MAX_SAFE_INTEGER
            && [&self.id, &self.account_id, &self.actor_id]
                .into_iter()
                .all(|value| crate::npc::valid_request_id(value))
    }

    fn fingerprint(&self, timeline: &str) -> StoreResult<String> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Input<'a> {
            request: &'a BindingRequest,
            timeline_id: &'a str,
        }
        let exact = serde_json::to_vec(&Input {
            request: self,
            timeline_id: timeline,
        })
        .map_err(|_| StoreError::InvalidRecord)?;
        Ok(openlegend_simulation::encoding::hex_bytes(&Sha256::digest(
            exact,
        )))
    }
}

pub(crate) struct BindingPlan {
    scope: RequestScope,
    request: BindingRequest,
    previous: GrantRecord,
    fingerprint: String,
    _custody: ByteReservation,
}

pub(crate) struct BindingFence<'a> {
    grant: GrantChange<'a>,
    _change: MutexGuard<'a, ()>,
}

impl BindingFence<'_> {
    pub(crate) fn uncertain(&mut self) {
        self.grant.uncertain = true;
    }
}

pub(crate) enum BindingPreparation<'a> {
    Replayed,
    Ready(BindingPlan, BindingFence<'a>),
}

impl Authority {
    /// Call with the protected save barrier held. The affected old grant
    /// stops serving immediately before any native candidate or SQL write.
    pub(crate) async fn prepare_binding<'a>(
        &'a self,
        authorized: &AuthorizedScope,
        request: BindingRequest,
        signal: impl FnOnce(),
    ) -> Result<BindingPreparation<'a>, AccessUpdateError> {
        let change = self.changes.lock().await;
        let scope = self.current(authorized, Capability::ManageAccess, false, |scope, _| {
            scope.clone()
        })?;
        let custody = self
            .budget
            .reserve(ACCESS_COLUMN_BYTES as usize * 12)
            .map_err(|_| AccessError::Read(StoreError::Capacity))?;
        let fingerprint = request
            .fingerprint(&scope.timeline_id)
            .map_err(AccessError::from)?;
        let prepared = self.store.read_simulation_cut(move |tx| Box::pin(async move {
            let recorded = tx.query_opt(
                "SELECT CASE WHEN octet_length(fingerprint)=64 THEN fingerprint END FROM auth_binding_receipts \
                 WHERE world_id=$1 AND issuer_id=$2 AND request_id=$3",
                &[&scope.world_id, &scope.account_id, &request.id],
            ).await?;
            if let Some(row) = recorded {
                let recorded: Option<String> = row.try_get(0)?;
                let recorded = recorded.ok_or(StoreError::InvalidRecord)?;
                return Ok(if recorded == fingerprint { Ok(None) } else { Err(AccessUpdateError::Conflict) });
            }
            let previous = target_grant(tx, &scope.world_id, &request.account_id).await?;
            let Some(previous) = previous.filter(|grant| {
                grant.revision == request.expected_revision && grant.revision < MAX_SAFE_INTEGER
                && grant.actor_id.as_ref().is_some_and(|actor| actor != &request.actor_id)
            }) else {
                return Ok(Err(AccessUpdateError::Conflict));
            };
            let plan = BindingPlan { scope, request, previous, fingerprint, _custody: custody };
            if plan.occupied(tx).await? {
                return Ok(Err(AccessError::Forbidden.into()));
            }
            Ok(Ok(Some(plan)))
        })).await.map_err(AccessError::from)??;
        self.current(authorized, Capability::ManageAccess, false, |_, _| ())?;
        let Some(plan) = prepared else {
            return Ok(BindingPreparation::Replayed);
        };
        let grant = self.fence_grant(&plan.request.account_id)?;
        signal();
        Ok(BindingPreparation::Ready(
            plan,
            BindingFence {
                grant,
                _change: change,
            },
        ))
    }
}

async fn target_grant(
    tx: &Transaction<'_>,
    world: &str,
    account: &str,
) -> StoreResult<Option<GrantRecord>> {
    let row = tx
        .query_opt(
            "SELECT account_id,actor_id,revision,capabilities FROM auth_grants \
         WHERE world_id=$1 AND account_id=$2 AND \
         greatest(octet_length(account_id),octet_length(actor_id),octet_length(capabilities))<=$3",
            &[&world, &account, &ACCESS_COLUMN_BYTES],
        )
        .await?;
    row.as_ref()
        .map(|row| GrantRecord::read(world, row))
        .transpose()
}

impl BindingPlan {
    pub(crate) fn project<'a>(&'a self, ordinary: OrdinaryProjection<'a>) -> BindingProjection<'a> {
        BindingProjection {
            ordinary,
            binding: self,
        }
    }

    pub(crate) fn native_input(&self) -> StoreResult<(String, String, String)> {
        Ok((
            self.request.account_id.clone(),
            self.previous_actor()?.to_owned(),
            self.request.actor_id.clone(),
        ))
    }

    fn previous_actor(&self) -> StoreResult<&str> {
        self.previous
            .actor_id
            .as_deref()
            .ok_or(StoreError::StaleCut)
    }

    async fn occupied(&self, tx: &Transaction<'_>) -> StoreResult<bool> {
        Ok(tx.query_one(
            "SELECT EXISTS(SELECT 1 FROM auth_grants WHERE world_id=$1 AND actor_id=$2) OR \
             EXISTS(SELECT 1 FROM auth_actor_owners WHERE world_id=$1 AND actor_id IN ($2,$3) AND account_id<>$4)",
            &[&self.scope.world_id, &self.request.actor_id, &self.previous_actor()?, &self.request.account_id],
        ).await?.try_get(0)?)
    }

    /// Persist one exact grant, both released controls, permanent owners and
    /// the existing binding receipt. The native publication owns the same SQL transaction.
    pub(crate) async fn write(&self, tx: &Transaction<'_>) -> StoreResult<()> {
        assert_manager(tx, &self.scope).await?;
        let world = &self.scope.world_id;
        let account = &self.request.account_id;
        let previous = self.previous_actor()?;
        let target = &self.request.actor_id;
        let actor_ids = [previous, target.as_str()];
        let actors = actor_ids.as_slice();
        let expected = sql_ordinal(self.previous.revision)?;
        let revision = sql_ordinal(self.previous.revision + 1)?;
        if self.occupied(tx).await?
            || tx
                .execute(
                    "UPDATE auth_grants SET actor_id=$3,revision=$4 \
             WHERE world_id=$1 AND account_id=$2 AND actor_id=$5 AND revision=$6",
                    &[world, account, target, &revision, &previous, &expected],
                )
                .await?
                != 1
        {
            return Err(StoreError::StaleCut);
        }
        tx.execute(
            "INSERT INTO auth_actor_owners(world_id,actor_id,account_id) \
             SELECT $1,actor,$2 FROM unnest($3::text[]) AS actor \
             ON CONFLICT(world_id,actor_id) DO NOTHING",
            &[world, account, &actors],
        )
        .await?;
        if tx.execute(
            "INSERT INTO auth_controls(world_id,actor_id,generation,account_id,session_id,connection_id) \
             SELECT $1,actors.actor,COALESCE(c.generation,0)+1,$2,'','' \
             FROM unnest($3::text[]) AS actors(actor) LEFT JOIN auth_controls c \
             ON c.world_id=$1 AND c.actor_id=actors.actor WHERE COALESCE(c.generation,0)<$4 \
             ON CONFLICT(world_id,actor_id) DO UPDATE SET generation=excluded.generation,\
             account_id=excluded.account_id,session_id='',connection_id=''",
            &[world, account, &actors, &sql_ordinal(MAX_SAFE_INTEGER)?],
        ).await? != 2 {
            return Err(StoreError::StaleCut);
        }
        tx.execute(
            "DELETE FROM auth_exits WHERE world_id=$1 AND actor_id=ANY($2)",
            &[world, &actors],
        )
        .await?;
        let after = GrantRecord {
            actor_id: Some(target.clone()),
            revision: self.previous.revision + 1,
            ..self.previous.clone()
        };
        let facts = serde_json::json!({ "type":"binding", "before":self.previous, "after":after });
        let payload = serde_json::to_string(&facts).map_err(|_| StoreError::InvalidRecord)?;
        tx.execute(
            "INSERT INTO auth_binding_receipts(world_id,issuer_id,request_id,fingerprint,payload) VALUES($1,$2,$3,$4,$5)",
            &[world, &self.scope.account_id, &self.request.id, &self.fingerprint, &payload],
        ).await?;
        audit(tx, world, account, &self.scope.account_id, &facts, now_ms()).await
    }
}

pub(crate) struct BindingProjection<'a> {
    pub(crate) ordinary: OrdinaryProjection<'a>,
    binding: &'a BindingPlan,
}

impl PrefixProjection for BindingProjection<'_> {
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
        self.binding.write(tx).await
    }
}
