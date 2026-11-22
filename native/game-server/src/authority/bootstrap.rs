//! First startup grants belong to the same protected commit as actor ownership.
//! Restart checks existing authority and never reapplies configured access.

use super::{CHARACTERLESS, Capability, LOCAL_ISSUER, LOCAL_SUBJECT};
use crate::{
    language::LanguageProvider,
    live_save::ProtectedGameplaySave,
    store::{OrdinaryProjection, PrefixProjection, Store, StoreError, StoreResult},
};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation},
    records::SaveRows,
    runtime::RestoreBinding,
    values::{deserialize_present_option, is_safe_record_id},
};
use serde::Deserialize;
use std::{
    collections::{HashMap, HashSet},
    error::Error,
    sync::Arc,
};
use tokio_postgres::Transaction;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Binding {
    issuer: String,
    subject: String,
    account_id: String,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    actor_id: Option<String>,
    capabilities: Vec<Capability>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Identity {
    Existing,
    Install,
    ReplacePlaceholder,
}

struct Change {
    binding: Binding,
    identity: Identity,
    grant: bool,
}

pub(crate) struct ConfiguredAccounts {
    changes: Vec<Change>,
    pub(crate) owners: Vec<RestoreBinding>,
    _custody: ByteReservation,
}

impl ConfiguredAccounts {
    /// Prepare exactly the missing startup authority against the current world.
    /// Both the changes and their actor bindings remain funded through SQL ACK.
    pub(crate) async fn prepare(
        store: &Store,
        world: &str,
        issuer: &str,
        budget: &ByteBudget,
    ) -> Result<Option<Arc<Self>>, Box<dyn Error + Send + Sync>> {
        let raw = match std::env::var("OPEN_LEGEND_ACCOUNT_BINDINGS") {
            Ok(raw) => raw,
            Err(std::env::VarError::NotPresent) => return Ok(None),
            Err(error) => return Err(error.into()),
        };
        let bytes = openlegend_simulation::records::SqlCell::json_decode_bound(&raw)
            .and_then(|n| n.checked_mul(3))
            .and_then(|n| n.checked_add(4096))
            .ok_or(StoreError::Capacity)?;
        let custody = budget.reserve(bytes)?;
        let mut bindings: Vec<Binding> =
            serde_json::from_str(&raw).map_err(|_| "OPEN_LEGEND_ACCOUNT_BINDINGS is invalid")?;
        if bindings.is_empty() {
            return Ok(None);
        }
        if bindings.len() > 256 {
            return Err("OPEN_LEGEND_ACCOUNT_BINDINGS allows up to 256 accounts".into());
        }
        let mut accounts = HashSet::with_capacity(bindings.len());
        let mut subjects = HashSet::with_capacity(bindings.len());
        for binding in &mut bindings {
            let url = crate::network::parse_url(&binding.issuer)
                .map_err(|_| "Invalid configured account issuer")?;
            if url.as_str() != issuer {
                return Err("Account bindings must use the configured issuer".into());
            }
            binding.issuer = url.into();
            let actor = binding.actor_id.as_deref();
            if !is_safe_record_id(&binding.account_id)
                || binding.account_id.encode_utf16().count() > 100
                || binding.subject.is_empty()
                || binding.subject.contains('\0')
                || binding.subject.encode_utf16().count() > 512
                || actor.is_some_and(|actor| {
                    !is_safe_record_id(actor)
                        || actor.encode_utf16().count() > 100
                        || actor.starts_with(CHARACTERLESS)
                })
                || binding.capabilities.len() > 6
                || (actor.is_none() && binding.capabilities.contains(&Capability::Play))
                || !accounts.insert(binding.account_id.as_str())
                || !subjects.insert(binding.subject.as_str())
            {
                return Err("Invalid or repeated configured account binding".into());
            }
            let mut seen = Vec::with_capacity(binding.capabilities.len());
            binding.capabilities.retain(|capability| {
                if seen.contains(capability) {
                    return false;
                }
                seen.push(*capability);
                true
            });
        }
        drop((raw, accounts, subjects));

        let world = world.to_owned();
        let issuer = issuer.to_owned();
        let owner = store
            .read_simulation_cut(move |tx| {
                Box::pin(async move { Self::read(tx, &world, &issuer, bindings, custody).await })
            })
            .await?;
        Ok(owner.map(Arc::new))
    }

    async fn read(
        tx: &Transaction<'_>,
        world: &str,
        issuer: &str,
        bindings: Vec<Binding>,
        custody: ByteReservation,
    ) -> StoreResult<Option<Self>> {
        let ids: Vec<&str> = bindings
            .iter()
            .map(|binding| binding.account_id.as_str())
            .collect();
        let subjects: Vec<&str> = bindings
            .iter()
            .map(|binding| binding.subject.as_str())
            .collect();
        // Select only configured identities. Compare the indexed issuer and
        // subject in PostgreSQL without transferring unrelated stored text.
        let accounts = tx
            .query(
                "SELECT id, CASE WHEN issuer=$1 AND subject=ANY($3) THEN subject ELSE '' END, \
             issuer=$1 AND subject=ANY($3), issuer=$4 AND subject=$5 \
             FROM auth_accounts WHERE id=ANY($2) OR (issuer=$1 AND subject=ANY($3))",
                &[
                    &issuer,
                    &ids.as_slice(),
                    &subjects.as_slice(),
                    &LOCAL_ISSUER,
                    &LOCAL_SUBJECT,
                ],
            )
            .await?;
        let grants = tx
            .query(
                "SELECT account_id FROM auth_grants WHERE world_id=$1 AND account_id=ANY($2)",
                &[&world, &ids.as_slice()],
            )
            .await?;
        let by_id = accounts
            .iter()
            .map(|row| Ok((row.try_get::<_, &str>(0)?, row)))
            .collect::<StoreResult<HashMap<_, _>>>()?;
        let mut by_subject = HashMap::with_capacity(accounts.len());
        for row in &accounts {
            if row.try_get::<_, bool>(2)? {
                by_subject.insert(row.try_get::<_, &str>(1)?, row.try_get::<_, &str>(0)?);
            }
        }
        let granted = grants
            .iter()
            .map(|row| Ok(row.try_get::<_, &str>(0)?))
            .collect::<StoreResult<HashSet<_>>>()?;

        let mut changes = Vec::new();
        let mut owners = Vec::new();
        let mut actors = HashSet::new();
        for binding in bindings {
            let id = binding.account_id.as_str();
            let grant = !granted.contains(id);
            let identity = match by_subject.get(binding.subject.as_str()) {
                Some(current) if *current == id => Identity::Existing,
                Some(_) => return Err(StoreError::InvalidRecord),
                None => match by_id.get(id) {
                    None => Identity::Install,
                    Some(current) if current.try_get::<_, bool>(3)? => Identity::ReplacePlaceholder,
                    Some(_) => return Err(StoreError::InvalidRecord),
                },
            };
            if grant && let Some(actor) = &binding.actor_id {
                if !actors.insert(actor.clone()) {
                    return Err(StoreError::InvalidRecord);
                }
                owners.push(RestoreBinding {
                    actor_id: actor.clone(),
                    account_id: id.to_owned(),
                });
            }
            if grant || identity != Identity::Existing {
                changes.push(Change {
                    binding,
                    identity,
                    grant,
                });
            }
        }
        Ok((!changes.is_empty()).then_some(Self {
            changes,
            owners,
            _custody: custody,
        }))
    }

    async fn write(&self, tx: &Transaction<'_>, world: &str) -> StoreResult<()> {
        for change in &self.changes {
            let binding = &change.binding;
            match change.identity {
                Identity::Existing => {
                    let current: bool = tx.query_one(
                        "SELECT EXISTS (SELECT 1 FROM auth_accounts WHERE id=$1 AND issuer=$2 AND subject=$3)",
                        &[&binding.account_id, &binding.issuer, &binding.subject],
                    ).await?.try_get(0)?;
                    if !current {
                        return Err(StoreError::StaleCut);
                    }
                }
                Identity::Install => {
                    tx.execute(
                        "INSERT INTO auth_accounts VALUES ($1,$2,$3)",
                        &[&binding.account_id, &binding.issuer, &binding.subject],
                    )
                    .await?;
                }
                Identity::ReplacePlaceholder => {
                    if tx.execute(
                        "UPDATE auth_accounts SET issuer=$2,subject=$3 WHERE id=$1 AND issuer=$4 AND subject=$5",
                        &[&binding.account_id, &binding.issuer, &binding.subject, &LOCAL_ISSUER, &LOCAL_SUBJECT],
                    ).await? != 1 {
                        return Err(StoreError::StaleCut);
                    }
                    tx.execute(
                        "DELETE FROM auth_sessions WHERE account_id=$1",
                        &[&binding.account_id],
                    )
                    .await?;
                }
            }
            if !change.grant {
                continue;
            }
            if let Some(actor) = &binding.actor_id {
                if tx.execute(
                    "INSERT INTO auth_actor_owners VALUES($1,$2,$3) ON CONFLICT(world_id,actor_id)                      DO UPDATE SET account_id=EXCLUDED.account_id WHERE auth_actor_owners.account_id=EXCLUDED.account_id",
                    &[&world, actor, &binding.account_id],
                ).await? != 1 {
                    return Err(StoreError::StaleCut);
                }
            }
            let actor = binding
                .actor_id
                .clone()
                .unwrap_or_else(|| format!("{CHARACTERLESS}{}", binding.account_id));
            let flags = serde_json::to_string(&binding.capabilities)
                .map_err(|_| StoreError::InvalidRecord)?;
            // A concurrent existing grant refuses this entire startup cut.
            tx.execute(
                "INSERT INTO auth_grants VALUES($1,$2,$3,1,$4)",
                &[&world, &binding.account_id, &actor, &flags],
            )
            .await?;
        }
        Ok(())
    }

    pub(crate) fn projection<'a>(
        &'a self,
        save: &'a ProtectedGameplaySave,
        store: &'a Store,
        language: Option<&'a LanguageProvider>,
    ) -> BootstrapProjection<'a> {
        BootstrapProjection {
            accounts: self,
            gameplay: save.projection(store, language),
        }
    }
}

pub(crate) struct BootstrapProjection<'a> {
    accounts: &'a ConfiguredAccounts,
    pub(crate) gameplay: OrdinaryProjection<'a>,
}

impl PrefixProjection for BootstrapProjection<'_> {
    async fn before_records(
        &self,
        tx: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.gameplay.before_records(tx, rows, revision).await?;
        self.accounts.write(tx, &rows.world_id).await
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
