//! Selected independent read custody for pending canonical accounts and
//! archive charges, with the detached owner distinguished from its suffix.

use super::*;
use openlegend_simulation::received::SourceVersionArchiveChange;
use openlegend_simulation::records::ChangedRows;
use serde_json::value::RawValue;

#[derive(Default)]
pub(super) struct Owner {
    accounts: BTreeMap<Source, Option<Account>>,
    archives: BTreeMap<Version, Archive>,
}

#[derive(Clone, Copy, PartialEq, Eq, Serialize)]
pub(super) struct Charge {
    pub category: AccountClass,
    pub bytes: u64,
}

struct Archive {
    from: Option<Charge>,
    to: Option<Charge>,
}

pub(super) struct Overlay<'a> {
    prefix: Option<&'a Owner>,
    suffix: &'a Owner,
}

impl Owner {
    pub(super) fn prepare<'a>(
        store: &Store,
        rows: Option<&ChangedRows>,
        archives: impl Iterator<Item = SourceVersionArchiveChange<'a>>,
        selected: &BTreeMap<String, BTreeSet<String>>,
        custody: &mut ByteReservation,
    ) -> StoreResult<Self> {
        let mut owner = Self::default();
        if let Some(rows) = rows {
            if [
                "data_world",
                "world_settings",
                "experience_state",
                "mind_memories_owners",
                "mind_awareness_owners",
                "mind_summaries_owners",
            ]
            .into_iter()
            .any(|name| rows.deletes.contains_key(name))
            {
                // An accepted replacement must provide scoped descendant
                // deletions before these rows can serve the archive reader.
                return Err(StoreError::StaleCut);
            }
            for kind in KINDS {
                let table = kind.table();
                let columns = store.source_columns(kind)?;
                for id in rows.deletes.get(table).into_iter().flatten() {
                    let _temporary = store
                        .budget
                        .reserve(
                            id.len()
                                .checked_mul(4)
                                .and_then(|n| n.checked_add(512))
                                .ok_or(StoreError::Capacity)?,
                        )
                        .map_err(|_| StoreError::Capacity)?;
                    let source = account_record(kind, id)?;
                    if selected.contains_key(&source.actor_id) {
                        fund(custody, id.len(), 1)?;
                        owner.accounts.insert(source, None);
                    }
                }
                for row in rows.writes.get(table).into_iter().flatten() {
                    let value = |at: usize| row.extra.get(at).ok_or(StoreError::InvalidRecord);
                    let text = |at| value(at)?.as_str().ok_or(StoreError::InvalidRecord);
                    let actor = text(columns.actor)?;
                    if !selected.contains_key(actor) {
                        continue;
                    }
                    if row.write_columns.is_some() {
                        return Err(StoreError::StaleCut);
                    }
                    let metadata = value(columns.metadata)?;
                    let bytes = json_record_len(metadata).map_err(|_| StoreError::InvalidRecord)?;
                    fund(
                        custody,
                        bytes
                            .checked_add(row.payload.len())
                            .and_then(|n| n.checked_add(row.id.len()))
                            .ok_or(StoreError::Capacity)?,
                        1,
                    )?;
                    let source = account_record(kind, &row.id)?;
                    if source.actor_id != actor || source.id != text(columns.source)? {
                        return Err(StoreError::InvalidRecord);
                    }
                    let revision = text(columns.revision)?.to_owned();
                    let mut metadata = Metadata::from_cell(metadata)?;
                    if kind == Kind::Memory {
                        // Impressions have no archive-accounting metadata but
                        // their exact personal dependencies remain selectable.
                        #[derive(Deserialize)]
                        struct Body<'a> {
                            #[serde(borrow)]
                            impression: Option<Impression<'a>>,
                        }
                        #[derive(Deserialize)]
                        struct Impression<'a> {
                            #[serde(borrow)]
                            dependencies: Vec<&'a RawValue>,
                        }
                        let body: Body<'_> = serde_json::from_str(&row.payload)
                            .map_err(|_| StoreError::InvalidRecord)?;
                        if let Some(impression) = body.impression {
                            for dep in impression.dependencies {
                                if let Ok(reference) = parse::<PersonalSourceRef>(dep.get()) {
                                    metadata.versions.push(reference);
                                }
                            }
                        }
                    }
                    owner.accounts.insert(
                        source.clone(),
                        Some(Account {
                            key: Version { source, revision },
                            metadata,
                            category: category(text(columns.category)?)?,
                            bytes: row.payload.len(),
                            payload: Some(row.payload.clone()),
                        }),
                    );
                }
            }
        }
        for archive in archives {
            if !selected.contains_key(archive.actor_id) {
                continue;
            }
            let kind = source_kind(archive.kind).ok_or(StoreError::InvalidRecord)?;
            fund(
                custody,
                archive
                    .actor_id
                    .len()
                    .checked_add(archive.id.len())
                    .and_then(|n| n.checked_add(archive.revision.len()))
                    .ok_or(StoreError::Capacity)?,
                1,
            )?;
            let version = Version {
                source: Source {
                    actor_id: archive.actor_id.to_owned(),
                    kind,
                    id: archive.id.to_owned(),
                },
                revision: archive.revision.to_owned(),
            };
            let from = archive
                .expected_prior
                .map(|(category, bytes)| Charge { category, bytes });
            let to = archive
                .desired
                .map(|(category, bytes)| Charge { category, bytes });
            match owner.archives.entry(version) {
                std::collections::btree_map::Entry::Vacant(entry) => {
                    entry.insert(Archive { from, to });
                }
                std::collections::btree_map::Entry::Occupied(mut entry) => {
                    if entry.get().from != to {
                        return Err(StoreError::StaleCut);
                    }
                    entry.get_mut().from = from;
                }
            }
        }
        Ok(owner)
    }
}

impl<'a> Overlay<'a> {
    pub(super) fn join(owners: &'a [Owner; 2], detached_durable: bool) -> StoreResult<Self> {
        let [prefix, suffix] = owners;
        if !detached_durable
            && suffix.archives.iter().any(|(key, state)| {
                prefix
                    .archives
                    .get(key)
                    .is_some_and(|prior| prior.to != state.from)
            })
        {
            return Err(StoreError::StaleCut);
        }
        Ok(Self {
            prefix: (!detached_durable).then_some(prefix),
            suffix,
        })
    }

    pub(super) fn account(&self, source: &Source) -> Option<Option<&Account>> {
        self.suffix
            .accounts
            .get(source)
            .or_else(|| self.prefix.and_then(|owner| owner.accounts.get(source)))
            .map(Option::as_ref)
    }

    pub(super) fn accounts(&self) -> impl Iterator<Item = &Account> {
        self.prefix
            .into_iter()
            .flat_map(|owner| owner.accounts.iter())
            .filter(|(key, _)| !self.suffix.accounts.contains_key(*key))
            .chain(&self.suffix.accounts)
            .filter_map(|(_, row)| row.as_ref())
    }

    pub(super) fn archive(
        &self,
        version: &Version,
        durable: Option<Charge>,
    ) -> StoreResult<Option<Charge>> {
        let mut value = durable;
        for owner in self.prefix.into_iter().chain(std::iter::once(self.suffix)) {
            if let Some(change) = owner.archives.get(version) {
                if change.from != value {
                    return Err(StoreError::StaleCut);
                }
                value = change.to;
            }
        }
        Ok(value)
    }
}

// Candidate row carriers and B-tree headers coexist with decoded JSON and
// lower-level driver storage. The reset point for this workspace is the whole
// source query, whose reply has its own independently funded bytes.
pub(super) fn fund(custody: &mut ByteReservation, bytes: usize, count: usize) -> StoreResult<()> {
    let needed = bytes
        .checked_mul(16)
        .and_then(|size| size.checked_add(count.checked_mul(2048)?))
        .and_then(|size| size.checked_add(custody.bytes()))
        .ok_or(StoreError::Capacity)?;
    custody.resize(needed).map_err(|_| StoreError::Capacity)
}
