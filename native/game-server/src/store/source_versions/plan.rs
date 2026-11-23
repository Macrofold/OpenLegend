//! Source selection over already validated current-format account metadata.
//! The Source repository supplies the finite indexed SQL; native owns all
//! effects and their chronological rollback after this prepares the evidence.

use super::pending::{Charge, Overlay, fund};
use super::*;
use crate::store::read::admitted_query;
use crate::store::schema::{SourceVersionAccountQueries, SourceVersionStatements};
use openlegend_simulation::encoding::json_record;
use openlegend_simulation::host::ByteBudget;
use openlegend_simulation::received::{SourceVersionChange, SourceVersionPlan};

pub(super) struct Input<'a, 'tx> {
    pub world: &'a str,
    pub selected: &'a BTreeMap<String, BTreeSet<String>>,
    pub transaction: &'a Transaction<'tx>,
    pub budget: &'a ByteBudget,
    pub sql: &'a SourceVersionStatements,
    pub pending: &'a Overlay<'a>,
    pub custody: &'a mut ByteReservation,
}

#[derive(Serialize)]
struct Requested<'a> {
    actor_id: &'a str,
    id: &'a str,
}

#[derive(Serialize)]
struct Learn<'a> {
    actor_id: &'a str,
    source_id: &'a str,
}

fn priority(class: AccountClass) -> u8 {
    match class {
        AccountClass::Optional => 0,
        AccountClass::Speech => 1,
        AccountClass::Required => 2,
    }
}

fn row_version(row: &tokio_postgres::Row) -> StoreResult<Version> {
    Ok(Version {
        source: Source {
            actor_id: row.try_get(0)?,
            kind: source_kind(row.try_get(1)?).ok_or(StoreError::InvalidRecord)?,
            id: row.try_get(2)?,
        },
        revision: row.try_get(3)?,
    })
}

fn metadata_version(actor: &str, reference: &PersonalSourceRef) -> Version {
    Version {
        source: Source {
            actor_id: actor.to_owned(),
            kind: reference.kind,
            id: reference.id.clone(),
        },
        revision: reference.revision.clone(),
    }
}

fn source_learning(actor: &str, source: &Learning) -> Option<Source> {
    Some(Source {
        actor_id: actor.to_owned(),
        kind: source_kind(&source.kind)?,
        id: source.id.clone(),
    })
}

impl Input<'_, '_> {
    pub(super) async fn prepare(
        &mut self,
        mut changed: BTreeMap<(Kind, String), Mutation>,
    ) -> StoreResult<SourceVersionPlan> {
        self.fill_predecessors(&mut changed).await?;
        let mut affected = BTreeSet::new();
        let mut changed_owners = BTreeSet::new();
        let mut old_owners = BTreeMap::<Version, (&str, &Account)>::new();
        let mut current_revisions = BTreeSet::new();
        let mut changed_revisions = BTreeMap::new();
        let mut learning = BTreeSet::new();
        for ((kind, id), mutation) in &changed {
            let source = account_record(*kind, id)?;
            changed_owners.insert(source.clone());
            for account in mutation.prior.iter().chain(&mutation.next) {
                affected.extend(
                    account
                        .metadata
                        .versions
                        .iter()
                        .map(|key| metadata_version(&source.actor_id, key)),
                );
                learning.extend(
                    account
                        .metadata
                        .learning
                        .iter()
                        .filter_map(|key| source_learning(&source.actor_id, key)),
                );
            }
            if let Some(prior) = &mutation.prior {
                affected.insert(prior.key.clone());
                old_owners.insert(prior.key.clone(), (id.as_str(), prior));
            }
            if let Some(next) = &mutation.next {
                current_revisions.insert(next.key.clone());
            }
            if let Some(current) = mutation.next.as_ref().or(mutation.prior.as_ref()) {
                changed_revisions.insert(source, current.key.revision.as_str());
            }
        }
        let mut unresolved = BTreeSet::new();
        for key in learning {
            if let Some(revision) = changed_revisions.get(&key) {
                affected.insert(Version {
                    source: key,
                    revision: (*revision).to_owned(),
                });
            } else {
                unresolved.insert(key);
            }
        }
        for (source, revision) in self.resolve(&unresolved).await? {
            affected.insert(Version { source, revision });
        }
        if affected.is_empty() {
            return Ok(SourceVersionPlan::new(Vec::new()));
        }

        let mut future = BTreeMap::new();
        let mut archives = BTreeMap::new();
        let owners: Vec<_> = changed_owners.iter().collect();
        let owners = json_record(&owners).map_err(|_| StoreError::InvalidRecord)?;
        let keys: Vec<_> = affected.iter().collect();
        for batch in keys.chunks(BATCH) {
            let keys = json_record(&batch).map_err(|_| StoreError::InvalidRecord)?;
            let (_wire, rows) = admitted_query(
                self.transaction,
                &self.sql.dependents,
                &[&keys, &owners, &self.world],
                self.budget,
            )
            .await?;
            for row in &rows {
                let key = row_version(row)?;
                let owner = Source {
                    actor_id: key.source.actor_id.clone(),
                    kind: source_kind(row.try_get(5)?).ok_or(StoreError::InvalidRecord)?,
                    id: row.try_get(6)?,
                };
                if self.pending.account(&owner).is_none() {
                    let class = category(row.try_get(4)?)?.ok_or(StoreError::InvalidRecord)?;
                    self.needed(&mut future, key, class);
                }
            }
            drop(rows);
            drop(_wire);
            let (_wire, rows) = admitted_query(
                self.transaction,
                &self.sql.archives,
                &[&keys, &self.world],
                self.budget,
            )
            .await?;
            let mut durable = BTreeMap::new();
            for row in &rows {
                let class = category(row.try_get(4)?)?.ok_or(StoreError::InvalidRecord)?;
                let old = Charge {
                    category: class,
                    bytes: ordinal(row.try_get(5)?)?,
                };
                if durable.insert(row_version(row)?, old).is_some() {
                    return Err(StoreError::InvalidRecord);
                }
            }
            for key in batch {
                if let Some(charge) = self.pending.archive(key, durable.remove(*key))? {
                    archives.insert((*key).clone(), charge);
                }
            }
        }
        let identities: BTreeSet<_> = affected.iter().map(|key| &key.source).collect();
        let mut pending_learning = BTreeSet::new();
        for account in self
            .pending
            .accounts()
            .filter(|account| !changed_owners.contains(&account.key.source))
        {
            if account.category.is_some() {
                pending_learning.extend(
                    account
                        .metadata
                        .learning
                        .iter()
                        .filter_map(|source| source_learning(&account.key.source.actor_id, source))
                        .filter(|source| identities.contains(source)),
                );
            }
        }
        let pending_learning = self.resolve(&pending_learning).await?;
        for account in self
            .pending
            .accounts()
            .filter(|account| !changed_owners.contains(&account.key.source))
        {
            let Some(class) = account.category else {
                continue;
            };
            for source in &account.metadata.versions {
                let key = metadata_version(&account.key.source.actor_id, source);
                if affected.contains(&key) {
                    self.needed(&mut future, key, class);
                }
            }
            for source in &account.metadata.learning {
                let Some(source) = source_learning(&account.key.source.actor_id, source) else {
                    continue;
                };
                if let Some(revision) = pending_learning.get(&source) {
                    let key = Version {
                        source,
                        revision: revision.clone(),
                    };
                    if affected.contains(&key) {
                        self.needed(&mut future, key, class);
                    }
                }
            }
        }
        for account in changed.values().filter_map(|item| item.next.as_ref()) {
            // An account's explicit manifest references and learned aliases
            // protect the same exact predecessor versions as the Source path.
            let class = account.category.unwrap_or(AccountClass::Optional);
            for source in &account.metadata.versions {
                self.needed(
                    &mut future,
                    metadata_version(&account.key.source.actor_id, source),
                    class,
                );
            }
            for source in account
                .metadata
                .learning
                .iter()
                .filter_map(|source| source_learning(&account.key.source.actor_id, source))
            {
                for key in affected.iter().filter(|key| key.source == source) {
                    self.needed(&mut future, key.clone(), class);
                }
            }
        }
        let mut bodies = self
            .bodies(
                &affected,
                &old_owners,
                &archives,
                &future,
                &current_revisions,
            )
            .await?;
        let mut result = Vec::new();
        for key in affected {
            let old = archives.remove(&key);
            let next = future.get(&key).copied();
            let changed = old_owners.contains_key(&key) && !current_revisions.contains(&key);
            if old.is_none() && (next.is_none() || !changed) {
                continue;
            }
            let desired = match (old, next) {
                (_, None) => None,
                (Some(prior), Some(category)) if prior.category == category => continue,
                (Some(prior), Some(category)) => Some((category, prior.bytes, None)),
                (None, Some(category)) => {
                    let payload = bodies.remove(&key).ok_or(StoreError::StaleCut)?;
                    Some((category, payload.len() as u64, Some(payload)))
                }
            };
            result.push(SourceVersionChange::new(
                key.source.actor_id,
                kind_name(key.source.kind).to_owned(),
                key.source.id,
                key.revision,
                old.map(|prior| (prior.category, prior.bytes)),
                desired,
            ).map_err(|_| StoreError::InvalidRecord)?);
        }
        Ok(SourceVersionPlan::new(result))
    }

    fn queries(&self, kind: Kind) -> &'_ SourceVersionAccountQueries {
        match kind {
            Kind::Awareness => &self.sql.accounts.awareness,
            Kind::Memory => &self.sql.accounts.memory,
            Kind::Summary => &self.sql.accounts.summary,
        }
    }

    fn needed(
        &self,
        future: &mut BTreeMap<Version, AccountClass>,
        key: Version,
        class: AccountClass,
    ) {
        if self
            .selected
            .get(&key.source.actor_id)
            .is_some_and(|forgotten| !forgotten.contains(&key.source.id))
        {
            let old = future.entry(key).or_insert(class);
            if priority(class) > priority(*old) {
                *old = class;
            }
        }
    }

    async fn fill_predecessors(
        &mut self,
        changed: &mut BTreeMap<(Kind, String), Mutation>,
    ) -> StoreResult<()> {
        for kind in KINDS {
            let mut missing = BTreeMap::new();
            for ((_, id), change) in changed
                .iter_mut()
                .filter(|((family, _), _)| *family == kind)
            {
                if change.create || change.prior.is_some() {
                    continue;
                }
                let source = account_record(kind, id)?;
                match self.pending.account(&source) {
                    Some(Some(prior)) => {
                        fund(
                            self.custody,
                            json_record_len(&prior.key)
                                .map_err(|_| StoreError::InvalidRecord)?
                                .checked_add(prior.bytes)
                                .ok_or(StoreError::Capacity)?,
                            1,
                        )?;
                        change.prior = Some(prior.clone());
                    }
                    Some(None) => continue,
                    None => {
                        missing.insert(id.as_str(), (source, change));
                    }
                }
            }
            let ids: Vec<_> = missing.keys().copied().collect();
            for batch in ids.chunks(BATCH) {
                let entries: Vec<_> = batch
                    .iter()
                    .map(|id| Requested {
                        actor_id: &missing[id].0.actor_id,
                        id,
                    })
                    .collect();
                let keys = json_record(&entries).map_err(|_| StoreError::InvalidRecord)?;
                let (_wire, rows) = admitted_query(
                    self.transaction,
                    &self.queries(kind).predecessors,
                    &[&keys, &self.world],
                    self.budget,
                )
                .await?;
                for row in &rows {
                    let id: &str = row.try_get(0)?;
                    let (source, change) = missing.get_mut(id).ok_or(StoreError::InvalidRecord)?;
                    let meta: &str = row.try_get(6)?;
                    if source.actor_id != row.try_get::<_, &str>(3)?
                        || source.id != row.try_get::<_, &str>(4)?
                        || change.prior.is_some()
                    {
                        return Err(StoreError::InvalidRecord);
                    }
                    fund(
                        self.custody,
                        meta.len()
                            .checked_add(id.len())
                            .ok_or(StoreError::Capacity)?,
                        1,
                    )?;
                    change.prior = Some(Account {
                        key: Version {
                            source: source.clone(),
                            revision: row.try_get(5)?,
                        },
                        metadata: parse(meta)?,
                        category: category(row.try_get(7)?)?,
                        bytes: usize::try_from(ordinal(row.try_get(9)?)?)
                            .map_err(|_| StoreError::Capacity)?,
                        payload: None,
                    });
                }
            }
        }
        for change in changed.values() {
            if change.prior.is_none() && change.next.is_none() && !change.expired {
                return Err(StoreError::StaleCut);
            }
        }
        Ok(())
    }

    async fn resolve(&mut self, keys: &BTreeSet<Source>) -> StoreResult<BTreeMap<Source, String>> {
        let mut resolved = BTreeMap::new();
        for kind in KINDS {
            let mut missing = Vec::new();
            for source in keys.iter().filter(|source| source.kind == kind) {
                if let Some(pending) = self.pending.account(source) {
                    let value = pending.ok_or(StoreError::StaleCut)?;
                    resolved.insert(source.clone(), value.key.revision.clone());
                } else {
                    missing.push(source);
                }
            }
            for batch in missing.chunks(BATCH) {
                let requested: Vec<_> = batch
                    .iter()
                    .map(|source| Learn {
                        actor_id: &source.actor_id,
                        source_id: &source.id,
                    })
                    .collect();
                let keys = json_record(&requested).map_err(|_| StoreError::InvalidRecord)?;
                let (_wire, rows) = admitted_query(
                    self.transaction,
                    &self.queries(kind).learning,
                    &[&keys, &self.world],
                    self.budget,
                )
                .await?;
                if rows.len() != batch.len() {
                    return Err(StoreError::StaleCut);
                }
                for row in &rows {
                    let id: &str = row.try_get(1)?;
                    let actor: &str = row.try_get(0)?;
                    let revision: &str = row.try_get(2)?;
                    fund(
                        self.custody,
                        actor
                            .len()
                            .checked_add(id.len())
                            .and_then(|n| n.checked_add(revision.len()))
                            .ok_or(StoreError::Capacity)?,
                        1,
                    )?;
                    let key = Source {
                        actor_id: actor.to_owned(),
                        kind,
                        id: id.to_owned(),
                    };
                    if !batch.contains(&&key) || resolved.insert(key, revision.to_owned()).is_some()
                    {
                        return Err(StoreError::StaleCut);
                    }
                }
            }
        }
        Ok(resolved)
    }

    async fn bodies(
        &mut self,
        affected: &BTreeSet<Version>,
        old_owners: &BTreeMap<Version, (&str, &Account)>,
        archives: &BTreeMap<Version, Charge>,
        future: &BTreeMap<Version, AccountClass>,
        current: &BTreeSet<Version>,
    ) -> StoreResult<BTreeMap<Version, String>> {
        let mut result = BTreeMap::new();
        let mut groups = BTreeMap::<(Kind, &str), Vec<(&str, &Account)>>::new();
        for key in affected {
            if !future.contains_key(key) || archives.contains_key(key) || current.contains(key) {
                continue;
            }
            let Some((id, account)) = old_owners.get(key) else {
                continue;
            };
            if let Some(payload) = &account.payload {
                self.retired(&mut result, key, payload)?;
            } else {
                groups
                    .entry((key.source.kind, &key.source.actor_id))
                    .or_default()
                    .push((id, account));
            }
        }
        for ((kind, actor), rows) in groups {
            let mut offset = 0;
            while offset < rows.len() {
                let start = offset;
                let mut bytes = 0usize;
                while let Some((_, account)) = rows.get(offset) {
                    if account.bytes > 4 * 1024 * 1024 {
                        return Err(StoreError::Capacity);
                    }
                    bytes = bytes
                        .checked_add(account.bytes)
                        .ok_or(StoreError::Capacity)?;
                    if bytes > 4 * 1024 * 1024 || offset - start == BATCH {
                        break;
                    }
                    offset += 1;
                }
                let batch = &rows[start..offset];
                let ids: Vec<_> = batch.iter().map(|(id, _)| *id).collect();
                let (_wire, bodies) = admitted_query(
                    self.transaction,
                    &self.queries(kind).bodies,
                    &[&self.world, &actor, &ids],
                    self.budget,
                )
                .await?;
                if bodies.len() != batch.len() {
                    return Err(StoreError::StaleCut);
                }
                for row in &bodies {
                    let id: &str = row.try_get(0)?;
                    let body: &str = row.try_get(3)?;
                    let (_, expected) = batch
                        .iter()
                        .find(|(record, _)| *record == id)
                        .ok_or(StoreError::StaleCut)?;
                    if body.len() != expected.bytes
                        || row.try_get::<_, &str>(1)? != expected.key.source.id
                        || row.try_get::<_, &str>(2)? != expected.key.revision
                    {
                        return Err(StoreError::StaleCut);
                    }
                    self.retired(&mut result, &expected.key, body)?;
                }
            }
        }
        Ok(result)
    }

    fn retired(
        &mut self,
        result: &mut BTreeMap<Version, String>,
        key: &Version,
        body: &str,
    ) -> StoreResult<()> {
        if sha256_hex(body.as_bytes()) != key.revision {
            return Err(StoreError::StaleCut);
        }
        fund(self.custody, body.len(), 1)?;
        if result.insert(key.clone(), body.to_owned()).is_some() {
            return Err(StoreError::InvalidRecord);
        }
        Ok(())
    }
}
