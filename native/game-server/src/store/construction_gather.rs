//! Construction grants remain operational authority. Read them only for a
//! tracked material choice, and publish a completed origin on the physical
//! candidate's protected transaction.

use super::read::admitted_query;
use super::{PrefixProjection, Store, StoreError, StoreResult, ordinal, sql_ordinal};
use openlegend_simulation::construction_gather::{
    CompletedHearth, ConstructionEffect, GatheredMaterial, MaterialGrant, MaterialGrants, material_origin_limit,
};
use openlegend_simulation::encoding::{json_record, sha256_hex};
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::records::{SaveRows, SqlCell};
use serde::Serialize;
use std::mem::size_of;
use std::sync::Arc;
use tokio_postgres::Transaction;

const SELECT: &str = "SELECT id,revision,payload FROM auth_construction_grants \
    WHERE world_id=$1 AND ($2::text IS NULL OR payload::jsonb->>'actorId'=$2) \
    ORDER BY id";
const LOCK: &str = "SELECT id,revision,payload FROM auth_construction_grants \
    WHERE world_id=$1 AND payload::jsonb->>'actorId'=ANY($2) ORDER BY id FOR UPDATE";

impl Store {
    pub(crate) async fn construction_materials(
        self: &Arc<Self>,
        world: &str,
        actor: Option<&str>,
    ) -> StoreResult<Arc<MaterialGrants>> {
        let store = self.clone();
        let workspace = self
            .budget
            .reserve((world.len() + actor.map_or(0, str::len)) + 128)
            .map_err(|_| StoreError::Capacity)?;
        let world = world.to_owned();
        let actor = actor.map(str::to_owned);
        self.read_operational(move |tx| {
            Box::pin(async move {
                let _arguments = workspace;
                store
                    .construction_materials_in(tx, &world, actor.as_deref())
                    .await
            })
        })
        .await
    }

    /// Stopped-world recovery already holds the real installation transaction.
    /// Read its current grants from there, independently of the checkpoint.
    pub(crate) async fn construction_materials_in(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        actor: Option<&str>,
    ) -> StoreResult<Arc<MaterialGrants>> {
        let (_wire, rows) = admitted_query(tx, SELECT, &[&world, &actor], &self.budget).await?;
        let (grants, custody) = decode(self, world, &rows)?;
        Ok(Arc::new(
            MaterialGrants::from_funded(grants, custody).map_err(|_| StoreError::Capacity)?,
        ))
    }
}

fn decode(
    store: &Store,
    world: &str,
    rows: &[tokio_postgres::Row],
) -> StoreResult<(Vec<MaterialGrant>, ByteReservation)> {
    let mut bytes = rows
        .len()
        .checked_mul(size_of::<MaterialGrant>())
        .and_then(|bytes| bytes.checked_add(size_of::<MaterialGrants>() + 2 * size_of::<usize>()))
        .ok_or(StoreError::Capacity)?;
    for row in rows {
        let payload: &str = row.try_get(2)?;
        bytes = bytes
            .checked_add(SqlCell::json_decode_bound(payload).ok_or(StoreError::InvalidRecord)?)
            .ok_or(StoreError::Capacity)?;
    }
    let custody = store
        .budget
        .reserve(bytes)
        .map_err(|_| StoreError::Capacity)?;
    let mut grants = Vec::new();
    grants
        .try_reserve_exact(rows.len())
        .map_err(|_| StoreError::Capacity)?;
    for row in rows {
        let id: &str = row.try_get(0)?;
        let revision = ordinal(row.try_get(1)?)?;
        let grant: MaterialGrant =
            serde_json::from_str(row.try_get(2)?).map_err(|_| StoreError::InvalidRecord)?;
        if !grant.is_valid(world, id, revision) {
            return Err(StoreError::InvalidRecord);
        }
        grants.push(grant);
    }
    Ok((grants, custody))
}

pub(crate) struct MaterialGatherProjection<'a, P> {
    pub(crate) store: &'a Store,
    pub(crate) gameplay: P,
    pub(crate) acquisitions: &'a [Arc<ConstructionEffect>],
}

impl<P: PrefixProjection> PrefixProjection for MaterialGatherProjection<'_, P> {
    async fn before_records(
        &self,
        tx: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        if !self.acquisitions.is_empty() {
            self.apply_material_grants(tx, &rows.world_id).await?;
        }
        self.gameplay.before_records(tx, rows, revision).await
    }

    async fn after_records(
        &self,
        tx: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.gameplay.after_records(tx, rows, revision).await
    }
}

impl<P> MaterialGatherProjection<'_, P> {
    async fn apply_material_grants(&self, tx: &Transaction<'_>, world: &str) -> StoreResult<()> {
        let mut work = self
            .store
            .budget
            .reserve(world.len() + 256 + self.acquisitions.len() * (2 * size_of::<&str>() + 64))
            .map_err(|_| StoreError::Capacity)?;
        let timeline_key = format!("integration:world-timeline:{world}");
        let (_timeline_rows, timeline) = admitted_query(
            tx,
            "SELECT value FROM meta WHERE key=$1",
            &[&timeline_key],
            &self.store.budget,
        )
        .await?;
        let [timeline] = timeline.as_slice() else {
            return Err(StoreError::StaleCut);
        };
        let text: &str = timeline.try_get(0)?;
        work.resize(
            work.bytes()
                .checked_add(text.len())
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(|_| StoreError::Capacity)?;
        let timeline: String = serde_json::from_str(text).map_err(|_| StoreError::InvalidRecord)?;
        if timeline.is_empty() {
            return Err(StoreError::InvalidRecord);
        }
        let mut actors: Vec<&str> = self
            .acquisitions
            .iter()
            .map(|fact| fact.actor_id())
            .collect();
        actors.sort_unstable();
        actors.dedup();
        let (_wire, rows) =
            admitted_query(tx, LOCK, &[&world, &actors], &self.store.budget).await?;
        let (mut grants, mut custody) = decode(self.store, world, &rows)?;
        // Earlier acquisitions in this prefix affect the fences of later
        // completions. PostgreSQL reads and locks exactly this actor set.
        for effect in self.acquisitions {
            let fact = match effect.as_ref() {
                ConstructionEffect::Gather(fact) => fact,
                ConstructionEffect::Hearth(fact) => {
                    self.record_hearth(tx, world, &timeline, fact, &grants).await?;
                    continue;
                }
            };
            let mut selected = grants
                .iter_mut()
                .filter(|grant| grant.matches(&fact.actor_id, &fact.source_id, &fact.definition));
            for fence in &fact.grants {
                let grant = selected.next().ok_or(StoreError::StaleCut)?;
                if fence.id != grant.id
                    || fence.revision != grant.revision
                    || grant.material_ids.len() >= material_origin_limit()
                {
                    return Err(StoreError::StaleCut);
                }
                if grant.material_ids.contains(&fact.item_id) {
                    continue;
                }
                let current = sql_ordinal(grant.revision)?;
                let revision = grant
                    .revision
                    .checked_add(1)
                    .ok_or(StoreError::InvalidRecord)?;
                let next = sql_ordinal(revision)?;
                let extra = fact
                    .item_id
                    .len()
                    .checked_add(size_of::<String>())
                    .and_then(|add| add.checked_add(custody.bytes()))
                    .ok_or(StoreError::Capacity)?;
                custody.resize(extra).map_err(|_| StoreError::Capacity)?;
                grant
                    .material_ids
                    .try_reserve_exact(1)
                    .map_err(|_| StoreError::Capacity)?;
                let fingerprint = fingerprint(self.store, &grant.id, fact)?;
                let added = tx
                    .execute(
                        "INSERT INTO auth_construction_effect_receipts\
                    (world_id,timeline_id,permission_id,effect_kind,action_id,fingerprint) \
                    VALUES($1,$2,$3,'material',$4,$5) ON CONFLICT DO NOTHING",
                        &[&world, &timeline, &grant.id, &fact.action_id, &fingerprint],
                    )
                    .await?;
                if added != 1 {
                    return Err(StoreError::StaleCut);
                }
                let updated = tx
                    .execute(
                        "UPDATE auth_construction_grants SET revision=$4, \
                    payload=jsonb_set(jsonb_set(payload::jsonb,'{revision}',to_jsonb($4::bigint)), \
                    '{materialIds}',(payload::jsonb->'materialIds') || to_jsonb($5::text))::text \
                    WHERE world_id=$1 AND id=$2 AND revision=$3",
                        &[&world, &grant.id, &current, &next, &fact.item_id],
                    )
                    .await?;
                if updated != 1 {
                    return Err(StoreError::StaleCut);
                }
                grant.material_ids.push(fact.item_id.clone());
                grant.revision = revision;
            }
            if selected.next().is_some() {
                return Err(StoreError::StaleCut);
            }
        }
        Ok(())
    }
}

// Same fields and canonical ASCII key order as Source's material effect
// receipt. The one actual origin is always the carried lot's own identity.
fn fingerprint(store: &Store, permission_id: &str, fact: &GatheredMaterial) -> StoreResult<String> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Pin<'a> {
        digest: &'a str,
        id: &'a str,
        version: u64,
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Output<'a> {
        definition: Pin<'a>,
        item_id: &'a str,
        origin_ids: [&'a str; 1],
        port: &'a str,
        quantity: u64,
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Acquisition<'a> {
        action_id: &'a str,
        actor_id: &'a str,
        at: f64,
        operation: &'static str,
        outputs: [Output<'a>; 1],
        physical_life: u64,
        source_id: &'a str,
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Effect<'a> {
        acquisition: Acquisition<'a>,
        kind: &'static str,
        permission_id: &'a str,
    }
    let _encoded = store
        .budget
        .reserve(
            1024 + 8
                * (fact.action_id.len()
                    + fact.actor_id.len()
                    + fact.source_id.len()
                    + fact.definition.id.len()
                    + fact.definition.digest.len()
                    + fact.item_id.len()
                    + permission_id.len()),
        )
        .map_err(|_| StoreError::Capacity)?;
    let payload = json_record(&Effect {
        acquisition: Acquisition {
            action_id: &fact.action_id,
            actor_id: &fact.actor_id,
            at: fact.at,
            operation: "gather",
            outputs: [Output {
                definition: Pin {
                    digest: &fact.definition.digest,
                    id: &fact.definition.id,
                    version: fact.definition.version,
                },
                item_id: &fact.item_id,
                origin_ids: [&fact.item_id],
                port: &fact.definition.id,
                quantity: fact.quantity,
            }],
            physical_life: fact.physical_life,
            source_id: &fact.source_id,
        },
        kind: "material",
        permission_id,
    })
    .map_err(|_| StoreError::InvalidRecord)?;
    Ok(sha256_hex(payload.as_bytes()))
}

impl<P> MaterialGatherProjection<'_, P> {
    async fn record_hearth(&self, tx: &Transaction<'_>, world: &str, timeline: &str,
        fact: &CompletedHearth, grants: &[MaterialGrant]) -> StoreResult<()> {
        if !grants.iter().any(|grant| fact.permitted(grant)) { return Err(StoreError::StaleCut); }
        let fingerprint = hearth_fingerprint(self.store, fact)?;
        let added = tx.execute(
            "INSERT INTO auth_construction_effect_receipts \
            (world_id,timeline_id,permission_id,effect_kind,action_id,fingerprint) \
            VALUES($1,$2,$3,'hearth-created',$4,$5) ON CONFLICT DO NOTHING",
            &[&world, &timeline, &fact.grant.id, &fact.action_id, &fingerprint],
        ).await?;
        if added != 1 { return Err(StoreError::StaleCut); }
        Ok(())
    }
}

fn hearth_fingerprint(store: &Store, fact: &CompletedHearth) -> StoreResult<String> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Site<'a> { max_x: f64, max_z: f64, min_x: f64, min_z: f64, surface_id: &'a str }
    #[derive(Serialize)]
    struct Pin<'a> { digest: &'a str, id: &'a str, version: u64 }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Effect<'a> {
        action_id: &'a str, actor_id: &'a str, definition: Pin<'a>, hearth_id: &'a str,
        kind: &'static str, origin_ids: &'a [String], permission_id: &'a str,
        permission_revision: u64, physical_life: u64, site: Site<'a>,
    }
    let effect = Effect {
        action_id: &fact.action_id, actor_id: &fact.actor_id,
        definition: Pin { digest: &fact.definition.digest, id: &fact.definition.id, version: fact.definition.version },
        hearth_id: &fact.hearth_id, kind: "hearth-created", origin_ids: &fact.origin_ids,
        permission_id: &fact.grant.id, permission_revision: fact.grant.revision, physical_life: fact.physical_life,
        site: Site { max_x: fact.site.max_x, max_z: fact.site.max_z, min_x: fact.site.min_x,
            min_z: fact.site.min_z, surface_id: &fact.site.surface_id },
    };
    let bytes = openlegend_simulation::encoding::json_record_len(&effect).map_err(|_| StoreError::InvalidRecord)?;
    let _custody = store.budget.reserve(bytes + 128).map_err(|_| StoreError::Capacity)?;
    let text = json_record(&effect).map_err(|_| StoreError::InvalidRecord)?;
    Ok(sha256_hex(text.as_bytes()))
}
