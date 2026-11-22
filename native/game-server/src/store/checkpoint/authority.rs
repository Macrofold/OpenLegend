//! Operational custody for a stopped checkpoint restore. These rows belong to
//! the target PostgreSQL database, never to the older gameplay file.

use super::{AdministrativeCheckpoint, allocation_floor};
use crate::authority::granted_actor;
use crate::store::read::admitted_query;
use crate::store::{DurableHead, StoreError, StoreResult, durable_head};
use indexmap::IndexMap;
use openlegend_simulation::encoding::js_trim;
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use openlegend_simulation::records::SqlCell;
use openlegend_simulation::values::{MAX_RECORD_ID_UNITS, is_safe_record_id};
use tokio_postgres::Transaction;

pub(crate) use openlegend_simulation::runtime::RestorePrivacyInput as AcceptedPrivacy;
use openlegend_simulation::runtime::{RestoreBinding as ActorOwner, RestoreGrant as WorldGrant};

pub(crate) struct RecoveryAuthority {
    pub head: DurableHead,
    pub identity_floor: u64,
    pub timeline: String,
    pub owners: Vec<ActorOwner>,
    pub grants: Vec<WorldGrant>,
    pub privacy_revisions: IndexMap<String, u64>,
    /// With a damaged target, absence is a refusal. A healthy native install
    /// may instead establish privacy from its validated current records.
    pub ledger: Option<AcceptedPrivacy>,
    pub(super) storage: ByteReservation,
}

/// Fetch the identity floor and present privileges from one database snapshot.
/// The checkpoint is only a fallback for the allocation floor. Its private
/// history and account ownership never establish any of these privileges.
pub(crate) async fn read_recovery_authority(
    tx: &Transaction<'_>,
    expected: &DurableHead,
    floor_checkpoint: Option<&AdministrativeCheckpoint>,
    budget: &ByteBudget,
) -> StoreResult<RecoveryAuthority> {
    if durable_head(tx).await?.as_ref() != Some(expected) {
        return Err(StoreError::StaleCut);
    }
    let world = &expected.world_id;
    // A malformed gameplay header remains recoverable. Preflight its text
    // without a SQL JSON cast, which would abort the recovery transaction.
    let (settings_transfer, settings) = admitted_query(
        tx,
        "SELECT payload FROM world_settings WHERE world_id=$1 AND id='[\"world\"]'",
        &[world],
        budget,
    )
    .await?;
    let metadata = [
        format!("integration:world-timeline:{world}"),
        format!("integration:privacy-ledger:{world}"),
    ];
    let (_metadata, metadata_rows) = admitted_query(
        tx,
        "SELECT key,value FROM meta WHERE key=ANY($1)",
        &[&metadata.as_slice()],
        budget,
    )
    .await?;
    let mut timeline = None;
    let mut ledger = None;
    let mut ledger_workspace = None;
    for row in &metadata_rows {
        let key: &str = row.try_get(0)?;
        let value: &str = row.try_get(1)?;
        if key == metadata[0] {
            timeline =
                Some(serde_json::from_str::<String>(value).map_err(|_| StoreError::InvalidRecord)?);
        } else if key == metadata[1] {
            ledger_workspace = Some(
                budget
                    .reserve(SqlCell::json_decode_bound(value).ok_or(StoreError::InvalidRecord)?)
                    .map_err(|_| StoreError::Capacity)?,
            );
            let privacy: AcceptedPrivacy =
                serde_json::from_str(value).map_err(|_| StoreError::InvalidRecord)?;
            validate_privacy(&privacy)?;
            ledger = Some(privacy);
        } else {
            return Err(StoreError::InvalidRecord);
        }
    }
    let timeline = timeline
        .filter(|timeline| !timeline.is_empty())
        .ok_or(StoreError::InvalidRecord)?;
    let current_floor = settings
        .first()
        .map(|row| row.try_get::<_, &str>(0))
        .transpose()?
        .and_then(|value| allocation_floor(value, world));
    let identity_floor = current_floor
        .or_else(|| {
            ledger.as_ref()?;
            floor_checkpoint?.target_allocation_floor(expected, &timeline)
        })
        .ok_or(StoreError::InvalidRecord)?;
    drop(settings);
    drop(settings_transfer);

    let (_owners, owner_rows) = admitted_query(
        tx,
        "SELECT actor_id,account_id FROM auth_actor_owners WHERE world_id=$1 ORDER BY actor_id",
        &[world],
        budget,
    )
    .await?;
    let (_grants, grant_rows) = admitted_query(
        tx,
        "SELECT actor_id,account_id FROM auth_grants WHERE world_id=$1 ORDER BY account_id",
        &[world],
        budget,
    )
    .await?;
    let (_revisions, revision_rows) = admitted_query(
        tx,
        "SELECT slot,payload FROM mind_privacy_revisions WHERE world_id=$1 ORDER BY parent_id,position,id",
        &[world],
        budget,
    )
    .await?;
    let owners = owner_rows
        .iter()
        .map(|row| {
            let actor_id: &str = row.try_get(0)?;
            let account_id: &str = row.try_get(1)?;
            if !is_safe_record_id(actor_id) || !is_safe_record_id(account_id) {
                return Err(StoreError::InvalidRecord);
            }
            Ok(ActorOwner {
                actor_id: actor_id.to_owned(),
                account_id: account_id.to_owned(),
            })
        })
        .collect::<StoreResult<Vec<_>>>()?;
    let grants = grant_rows
        .iter()
        .map(|row| {
            let actor_id = granted_actor(row.try_get(0)?);
            let account_id: &str = row.try_get(1)?;
            if actor_id.is_some_and(|actor| !is_safe_record_id(actor))
                || !is_safe_record_id(account_id)
            {
                return Err(StoreError::InvalidRecord);
            }
            Ok(WorldGrant {
                actor_id: actor_id.map(str::to_owned),
                account_id: account_id.to_owned(),
            })
        })
        .collect::<StoreResult<Vec<_>>>()?;
    let mut privacy_revisions = IndexMap::with_capacity(revision_rows.len());
    for row in &revision_rows {
        let actor: &str = row.try_get(0)?;
        let body: &str = row.try_get(1)?;
        let revision: u64 = serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
        if !is_safe_record_id(actor)
            || revision > super::MAX_SAFE_INTEGER
            || privacy_revisions
                .insert(actor.to_owned(), revision)
                .is_some()
        {
            return Err(StoreError::InvalidRecord);
        }
    }
    let storage = recovered_bytes(expected, &timeline, &owners, &grants, &privacy_revisions)?;
    let mut storage = budget.reserve(storage).map_err(|_| StoreError::Capacity)?;
    if let Some(workspace) = ledger_workspace {
        storage.merge(workspace).map_err(|_| StoreError::Capacity)?;
    }
    Ok(RecoveryAuthority {
        head: expected.clone(),
        identity_floor,
        timeline,
        owners,
        grants,
        privacy_revisions,
        ledger,
        storage,
    })
}

pub(crate) fn validate_privacy(privacy: &AcceptedPrivacy) -> StoreResult<()> {
    // Fact aliases may be longer than entity IDs. They still exclude empty and
    // current JavaScript prototype keys, as the original operational ledger.
    let valid_source = |source: &str| {
        !js_trim(source).is_empty()
            && (source.encode_utf16().count() > MAX_RECORD_ID_UNITS || is_safe_record_id(source))
    };
    if privacy.forgotten.iter().any(|(actor, sources)| {
        !is_safe_record_id(actor) || sources.iter().any(|source| !valid_source(source))
    }) || privacy.corrections.iter().any(|(actor, corrections)| {
        !is_safe_record_id(actor)
            || corrections
                .iter()
                .any(|(source, evidence)| !valid_source(source) || !is_safe_record_id(evidence))
    }) {
        return Err(StoreError::InvalidRecord);
    }
    Ok(())
}

fn recovered_bytes(
    head: &DurableHead,
    timeline: &String,
    owners: &Vec<ActorOwner>,
    grants: &Vec<WorldGrant>,
    revisions: &IndexMap<String, u64>,
) -> StoreResult<usize> {
    let size = || {
        let mut n = size_of::<RecoveryAuthority>()
            .checked_add(head.world_id.capacity())?
            .checked_add(head.generation.capacity())?
            .checked_add(timeline.capacity())?
            .checked_add(owners.capacity().checked_mul(size_of::<ActorOwner>())?)?
            .checked_add(grants.capacity().checked_mul(size_of::<WorldGrant>())?)?
            .checked_add(revisions.capacity().checked_mul(128)?)?;
        for owner in owners {
            n = n
                .checked_add(owner.actor_id.capacity())?
                .checked_add(owner.account_id.capacity())?;
        }
        for grant in grants {
            n = n
                .checked_add(grant.actor_id.as_ref().map_or(0, String::capacity))?
                .checked_add(grant.account_id.capacity())?;
        }
        revisions
            .keys()
            .try_fold(n, |n, actor| n.checked_add(actor.capacity()))
    };
    size().ok_or(StoreError::Capacity)
}
