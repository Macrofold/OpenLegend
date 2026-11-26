//! First installation uses the same SQL transaction and reviewed opening as
//! world creation. A deliberate copy reads only the game's gameplay checkpoint.
use super::{HostPermit, LabError, StateInner};
use crate::{
    authority::{AccessError, Authority, Capability, RequestScope, assert_saved_grant},
    boot::StartupStorage,
    creation::{InitialAccount, OpeningValidator, bundle::Bundle},
    store::{DurableHead, Store, StoreError, StoreResult, creation::FirstInstallation},
};
use serde::{Deserialize, Serialize};
use std::{
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use tokio_postgres::Transaction;
use uuid::Uuid;

#[derive(Clone, Copy, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub(super) enum Source {
    Opening,
    Game,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Selection {
    pub source: Source,
}

/// A protected privacy write makes the source unavailable before SQL or
/// foreground worlds yield. Both rollback and commit require a fresh proof.
pub(crate) struct SourceWithdrawal(Arc<Authority>);
impl SourceWithdrawal {
    pub(crate) fn new(authority: Arc<Authority>) -> Result<Self, AccessError> {
        authority.change_evidence(true)?;
        Ok(Self(authority))
    }
}
impl Drop for SourceWithdrawal {
    fn drop(&mut self) {
        let _ = self.0.change_evidence(false);
    }
}

#[derive(Clone, Eq, PartialEq, Hash, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Proof {
    world: String,
    timeline: String,
    account: String,
    actor: String,
    grant: u64,
    ledger: String,
}
pub(crate) struct SourceGuard {
    pub(super) identity: Arc<str>,
    proof: Proof,
    store: Arc<Store>,
    checked: Mutex<Option<(u64, u64)>>,
}
impl SourceGuard {
    pub(super) fn new(proof: Proof, store: Arc<Store>) -> Self {
        Self {
            identity: openlegend_simulation::encoding::json_record_digest(&proof).expect("bounded source proof").into(),
            proof,
            store,
            checked: Mutex::default(),
        }
    }
    pub(super) async fn admit(&self, permit: &HostPermit) -> Result<(u64, u64), AccessError> {
        let p = &self.proof;
        let s = &permit.scope.scope;
        if s.account_id != p.account
            || s.actor_id != p.actor
            || s.world_id != p.world
            || s.timeline_id != p.timeline
            || s.grant_revision != p.grant
        {
            return Err(AccessError::Forbidden);
        }
        for permission in [Capability::Play, Capability::Inspect, Capability::Save] {
            permit
                .host
                .current(&permit.scope, permission, false, |_, _| ())?;
        }
        let epoch = permit.host.evidence_epoch()?;
        if *self.checked.lock().map_err(|_| AccessError::Availability)? != Some(epoch) {
            let scope = s.clone();
            let proof = self
                .store
                .read_operational(move |tx| Box::pin(async move { ledger(tx, &scope).await }))
                .await?;
            if p.ledger != proof || epoch != permit.host.evidence_epoch()? {
                return Err(AccessError::Changed);
            }
            *self.checked.lock().map_err(|_| AccessError::Availability)? = Some(epoch);
        }
        Ok(epoch)
    }
}

// Match the correction/forgetting ledger at the captured cut. Refuse other
// player owners even when the operator also holds Inspect or Manage access.
pub(super) async fn ledger(tx: &Transaction<'_>, s: &RequestScope) -> StoreResult<String> {
    let key = format!("integration:privacy-ledger:{}", s.world_id);
    let row = tx.query_opt(
        "SELECT encode(sha256(convert_to(COALESCE((SELECT value FROM meta WHERE key=$3),''),'UTF8')),'hex')
         WHERE NOT EXISTS (SELECT 1 FROM auth_actor_owners WHERE world_id=$1 AND actor_id<>$2)",
        &[&s.world_id,&s.actor_id,&key],
    ).await?.ok_or(StoreError::StaleCut)?;
    Ok(row.try_get(0)?)
}

pub(super) async fn initialize(store: &Store) -> StoreResult<Option<Proof>> {
    store.read_operational(|tx|Box::pin(read_source(tx))).await
}

pub(super) async fn read_source(tx:&Transaction<'_>)->StoreResult<Option<Proof>>{
    let row=tx.query_one("SELECT CASE WHEN source IS NULL OR octet_length(source)<=4096 THEN source ELSE '' END
        FROM cognition_lab_identity WHERE singleton",&[]).await?;
    let source:Option<String>=row.try_get(0)?;
    source.map(|body|serde_json::from_str(&body).map_err(|_|StoreError::InvalidRecord)).transpose()
}

pub(super) async fn install(
    host: &StateInner,
    startup: &Arc<StartupStorage>,
    data: &Path,
    source: Source,
    permit: HostPermit,
) -> Result<(), LabError> {
    if !startup.store.creation_unoccupied().await?
        || crate::store::creation::retained_files(data).await?
    {
        return Err("The Lab already contains a world or retained scenarios".into());
    }
    let scope = permit.scope.scope.clone();
    let read = scope.clone();
    let source_store = host.game.store.clone();
    let (account, actor) = source_store
        .read_operational(move |tx| {
            Box::pin(async move {
                assert_saved_grant(tx, &read, "create").await?;
                let row = tx
                    .query_one(
                        "SELECT a.issuer,a.subject,g.capabilities,g.actor_id
             FROM auth_accounts a JOIN auth_grants g ON g.account_id=a.id
             WHERE a.id=$1 AND g.world_id=$2 AND octet_length(a.issuer)<=2048
             AND octet_length(a.subject)<=2048 AND octet_length(g.capabilities)<=512",
                        &[&read.account_id, &read.world_id],
                    )
                    .await?;
                let account = InitialAccount {
                    account_id: read.account_id,
                    issuer: row.try_get(0)?,
                    subject: row.try_get(1)?,
                    capabilities: serde_json::from_str(row.try_get(2)?)
                        .map_err(|_| StoreError::InvalidRecord)?,
                };
                Ok((account, row.try_get::<_, String>(3)?))
            })
        })
        .await?;
    let copied = source == Source::Game;
    let (install, actor, proof) = if copied {
        for cap in [Capability::Save, Capability::Play, Capability::Inspect] {
            permit.host.current(&permit.scope, cap, false, |_, _| ())?;
        }
        let epoch = permit.host.evidence_epoch()?;
        let (install, proof) = snapshot(host, startup, data, scope).await?;
        if permit.host.evidence_epoch()? != epoch {
            return Err(AccessError::Changed.into());
        }
        (install, actor, Some((proof, epoch)))
    } else {
        let digest = std::env::var("OPEN_LEGEND_LAB_OPENING_SHA256")
            .map_err(|_| "Configure the reviewed Lab opening digest")?;
        let opening = Bundle::open(&startup.store, host.release.join("opening.json"), &digest)?;
        if account.account_id != opening.account() {
            return Err(AccessError::Forbidden.into());
        }
        (
            opening.prepare(&startup.store).await?,
            opening.actor().to_owned(),
            None,
        )
    };
    let target = startup.clone();
    let release = host.release.clone();
    let validate: OpeningValidator = Arc::new(move |opening, account, actor, grants| {
        let (target, release) = (target.clone(), release.clone());
        Box::pin(async move {
            target
                .validate_first_opening(&release, opening, account, actor, (!copied).then_some(grants))
                .await
        })
    });
    let store = startup.store.clone();
    let data = data.to_owned();
    startup
        .store
        .operational(move |tx| {
            Box::pin(async move {
                let occupied: bool = tx
                    .query_one(&store.schema.creation_target_occupied, &[])
                    .await?
                    .try_get(0)?;
                if occupied || crate::store::creation::retained_files(&data).await? {
                    return Err(StoreError::StaleCut);
                }
                store
                    .stage_first_installation(tx, install, account, actor, validate)
                    .await?;
                if let Some((proof, epoch)) = proof {
                    if permit.host.evidence_epoch().ok() != Some(epoch) {
                        return Err(StoreError::StaleCut);
                    }
                    let body =
                        serde_json::to_string(&proof).map_err(|_| StoreError::InvalidRecord)?;
                    tx.execute(
                        "UPDATE cognition_lab_identity SET source=$1 WHERE singleton",
                        &[&body],
                    )
                    .await?;
                }
                permit.check().map_err(|_| StoreError::Cancelled)
            })
        })
        .await?;
    Ok(())
}

async fn snapshot(
    host: &StateInner,
    startup: &Arc<StartupStorage>,
    data: &Path,
    scope: RequestScope,
) -> Result<(FirstInstallation, Proof), LabError> {
    let id = Uuid::new_v4().to_string();
    let stage = data.join(format!(".lab-import-{id}"));
    let mut builder = tokio::fs::DirBuilder::new();
    #[cfg(unix)]
    builder.mode(0o700);
    builder.create(&stage).await?;
    let result = read_snapshot(host, startup, stage.clone(), id, scope).await;
    tokio::fs::remove_dir_all(stage).await?;
    result
}

pub(super) async fn read_snapshot(
    host: &StateInner,
    startup: &Arc<StartupStorage>,
    stage: PathBuf,
    id: String,
    scope: RequestScope,
) -> Result<(FirstInstallation, Proof), LabError> {
    let protected = host.saves.enter_protected().await?;
    let store = host.game.store.clone();
    let writer = store.clone();
    let (dir, slot, read) = (stage.clone(), id.clone(), scope.clone());
    // Pin the read transaction while the game save barrier is held. The
    // export can then stream to disk independently of ordinary gameplay.
    let (pinned, ready) = tokio::sync::oneshot::channel();
    let capture = store.read_isolated(move |tx| {
        Box::pin(async move {
            assert_saved_grant(tx, &read, "save").await?;
            assert_saved_grant(tx, &read, "inspect").await?;
            let proof = ledger(tx, &read).await?;
            let _ = pinned.send(());
            Ok((writer.write_lab_snapshot(tx, &dir, &slot).await?, proof))
        })
    });
    let release = async {
        let _ = ready.await;
        drop(protected);
    };
    let (result, ()) = tokio::join!(capture, release);
    let (world, ledger) = result?;
    let file = startup
        .store
        .retained_checkpoint(stage, id, world.clone())
        .await?;
    let head = DurableHead {
        world_id: world.clone(),
        generation: Uuid::new_v4().to_string(),
        revision: 1,
    };
    let (opening, history) = file.into_opening(&startup.store, head.clone())?;
    Ok((
        FirstInstallation {
            head,
            opening,
            history,
            construction_grants: Arc::from([]),
        },
        Proof {
            world,
            timeline: scope.timeline_id,
            actor: scope.actor_id,
            account: scope.account_id,
            grant: scope.grant_revision,
            ledger,
        },
    ))
}
