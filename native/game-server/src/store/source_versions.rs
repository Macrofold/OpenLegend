//! Exact archived-source planning uses the candidate's accepted predecessor.
//! The simulation owns retention effects; this owner only selects immutable
//! rows, dependency classes and original bytes from the fixed SQL cut.

use super::{Store, StoreError, StoreResult, durable_head, ordinal};
use openlegend_simulation::encoding::{json_record_len, sha256_hex};
use openlegend_simulation::experience::{PersonalSourceKind as Kind, PersonalSourceRef};
use openlegend_simulation::geometry::GeometryBinding;
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::received::AccountClass;
use openlegend_simulation::records::SqlCell;
use openlegend_simulation::runtime::{
    RuntimeProviderInput, RuntimeRecallDecoder, RuntimeSourceVersionRead,
};
use openlegend_simulation::simulation::SourceVersionsRequest;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::sync::Arc;
use tokio_postgres::Transaction;

mod pending;
mod plan;

const KINDS: [Kind; 3] = [Kind::Awareness, Kind::Memory, Kind::Summary];
const BATCH: usize = 128;

pub(crate) struct PreparedSourceVersions {
    binding: GeometryBinding,
    world: String,
    generation: String,
    revision: u64,
    in_flight_through: Option<u64>,
    maximum: usize,
    forgotten: BTreeMap<String, BTreeSet<String>>,
    changed: BTreeMap<(Kind, String), Mutation>,
    pending: [pending::Owner; 2],
    custody: ByteReservation,
}

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
struct Source {
    actor_id: String,
    kind: Kind,
    id: String,
}

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
struct Version {
    #[serde(flatten)]
    source: Source,
    revision: String,
}

#[derive(Clone, Deserialize)]
struct Learning {
    kind: String,
    id: String,
}

#[derive(Clone, Deserialize, Default)]
struct Metadata {
    versions: Vec<PersonalSourceRef>,
    learning: Vec<Learning>,
}

#[derive(Clone)]
struct Account {
    key: Version,
    metadata: Metadata,
    category: Option<AccountClass>,
    bytes: usize,
    payload: Option<String>,
}

#[derive(Default)]
struct Mutation {
    next: Option<Account>,
    prior: Option<Account>,
    create: bool,
    expired: bool,
}

struct Columns {
    actor: usize,
    source: usize,
    revision: usize,
    metadata: usize,
    category: usize,
}

fn parse<T: for<'de> Deserialize<'de>>(text: &str) -> StoreResult<T> {
    serde_json::from_str(text).map_err(|_| StoreError::InvalidRecord)
}

fn category(value: &str) -> StoreResult<Option<AccountClass>> {
    Ok(match value {
        "optional" => Some(AccountClass::Optional),
        "required" => Some(AccountClass::Required),
        "speech" => Some(AccountClass::Speech),
        "sensory" => None,
        _ => return Err(StoreError::InvalidRecord),
    })
}

fn kind_name(kind: Kind) -> &'static str {
    match kind {
        Kind::Awareness => "awareness",
        Kind::Memory => "memory",
        Kind::Summary => "summary",
    }
}

fn source_kind(kind: &str) -> Option<Kind> {
    KINDS.into_iter().find(|value| kind_name(*value) == kind)
}

fn account_record(kind: Kind, record: &str) -> StoreResult<Source> {
    let id: Vec<String> = parse(record)?;
    let (actor, source) = match (kind, id.as_slice()) {
        (Kind::Awareness | Kind::Summary, [world, experience, family, actor, source])
            if world == "world"
                && experience == "experience"
                && ((kind == Kind::Awareness && family == "awareness")
                    || (kind == Kind::Summary && family == "summaries")) =>
        {
            (actor, source)
        }
        (Kind::Memory, [world, family, actor, source])
            if world == "world" && family == "memories" =>
        {
            (actor, source)
        }
        _ => return Err(StoreError::InvalidRecord),
    };
    Ok(Source {
        actor_id: actor.clone(),
        kind,
        id: source.clone(),
    })
}

impl Store {
    fn source_columns(&self, kind: Kind) -> StoreResult<Columns> {
        let table = self
            .schema
            .tables
            .iter()
            .find(|table| table.name == kind.table())
            .ok_or(StoreError::Schema)?;
        let at = |name| {
            table
                .columns
                .iter()
                .position(|column| column.name == name)
                .ok_or(StoreError::Schema)
        };
        Ok(Columns {
            actor: at("actor_id")?,
            source: at("source_id")?,
            revision: at("account_revision")?,
            metadata: at("retention_metadata")?,
            category: at("retention_class")?,
        })
    }

    /// Prepare selected independently held inputs while the exact provider
    /// question and earlier accepted save owners can still be borrowed.
    pub(crate) fn prepare_source_versions(
        &self,
        read: RuntimeSourceVersionRead<'_>,
    ) -> StoreResult<PreparedSourceVersions> {
        let request = read.request;
        if request.maximum_transfer_bytes == 0 {
            return Err(StoreError::InvalidRecord);
        }
        let maximum = request.maximum_transfer_bytes;
        let mut custody = self.budget.reserve(0).map_err(|_| StoreError::Capacity)?;
        let (forgotten, changed) = self.source_version_inputs(request, &mut custody)?;
        let (prefix, suffix) = read.pending_rows();
        if prefix.is_some() != read.in_flight_through.is_some() {
            return Err(StoreError::StaleCut);
        }
        let pending = [
            pending::Owner::prepare(
                self,
                prefix,
                read.pending_versions(true),
                &forgotten,
                &mut custody,
            )?,
            pending::Owner::prepare(
                self,
                Some(suffix),
                read.pending_versions(false),
                &forgotten,
                &mut custody,
            )?,
        ];
        Ok(PreparedSourceVersions {
            binding: read.binding,
            world: read.world_id.to_owned(),
            generation: read.generation.to_owned(),
            revision: read.durable_revision,
            in_flight_through: read.in_flight_through,
            maximum,
            forgotten,
            changed,
            pending,
            custody,
        })
    }

    fn source_version_inputs(
        &self,
        request: &SourceVersionsRequest,
        custody: &mut ByteReservation,
    ) -> StoreResult<(
        BTreeMap<String, BTreeSet<String>>,
        BTreeMap<(Kind, String), Mutation>,
    )> {
        let mut forgotten = BTreeMap::new();
        for (actor, ids) in request.forgotten() {
            let bytes = ids.iter().try_fold(actor.len(), |n, id| n.checked_add(id.len()))
                .ok_or(StoreError::Capacity)?;
            pending::fund(custody, bytes, ids.len().checked_add(1).ok_or(StoreError::Capacity)?)?;
            if forgotten.insert(actor.to_owned(), ids.iter().cloned().collect()).is_some() {
                return Err(StoreError::InvalidRecord);
            }
        }
        let records = &request.records;
        let mut changed = BTreeMap::<(Kind, String), Mutation>::new();
        for kind in KINDS {
            let table = kind.table();
            let columns = self.source_columns(kind)?;
            for id in records.deletes.get(table).into_iter().flatten() {
                pending::fund(custody, id.len(), 1)?;
                changed.entry((kind, id.clone())).or_default();
            }
            for id in records.expired.get(table).into_iter().flatten() {
                pending::fund(custody, id.len(), 1)?;
                changed.entry((kind, id.clone())).or_default().expired = true;
            }
            for row in records.writes.get(table).into_iter().flatten() {
                let next = columns.account(kind, &row.id, &row.payload, &row.extra, custody)?;
                let change = changed.entry((kind, row.id.clone())).or_default();
                if change.next.replace(next).is_some() {
                    return Err(StoreError::InvalidRecord);
                }
                change.create = row.create;
            }
        }
        for row in request.predecessors() {
            let kind = row.header().reference.kind;
            pending::fund(custody, row.row_id().len(), 0)?;
            // Other already-touched canonical owners are not in this closure.
            let Some(change) = changed.get_mut(&(kind, row.row_id().to_owned())) else {
                continue;
            };
            let columns = self.source_columns(kind)?;
            let mut prior = columns.account(kind, row.row_id(), row.payload(), row.columns(), custody)?;
            if prior.key.source.actor_id != row.header().actor_id {
                return Err(StoreError::InvalidRecord);
            }
            pending::fund(custody, row.payload().len(), 0)?;
            prior.payload = Some(row.payload().to_owned());
            if change.prior.replace(prior).is_some() {
                return Err(StoreError::InvalidRecord);
            }
        }
        for (key, _) in &changed {
            if !forgotten.contains_key(&account_record(key.0, &key.1)?.actor_id) {
                return Err(StoreError::InvalidRecord);
            }
        }
        Ok((forgotten, changed))
    }

    /// Replay the exact earlier private candidate projection, including its
    /// admitted archive baseline, before using the common version planner.
    pub(crate) async fn answer_checkpoint_source_versions(
        &self,
        tx: &Transaction<'_>,
        head: &super::DurableHead,
        request: &SourceVersionsRequest,
        decoder: &RuntimeRecallDecoder<'_>,
    ) -> StoreResult<RuntimeProviderInput> {
        if request.binding.base_cut != 0
            || request.world_id != head.world_id
            || request.generation != head.generation
            || request.maximum_transfer_bytes == 0
        {
            return Err(StoreError::StaleCut);
        }
        let (projection, baseline) = request.restore().ok_or(StoreError::InvalidRecord)?;
        let mut custody = self.budget.reserve(0).map_err(|_| StoreError::Capacity)?;
        let (forgotten, changed) = self.source_version_inputs(request, &mut custody)?;
        let read = PreparedSourceVersions {
            binding: request.binding,
            world: head.world_id.clone(),
            generation: head.generation.clone(),
            revision: head.revision,
            in_flight_through: None,
            maximum: request.maximum_transfer_bytes,
            forgotten,
            changed,
            pending: [pending::Owner::default(), pending::Owner::default()],
            custody,
        };
        self.with_checkpoint_rows(
            tx,
            head,
            projection,
            Some(decoder),
            Some(baseline),
            self.finish_source_versions(tx, read, false),
        ).await
    }

    pub(crate) async fn read_source_versions(
        self: &Arc<Self>,
        read: PreparedSourceVersions,
    ) -> StoreResult<RuntimeProviderInput> {
        let store = self.clone();
        self.read_simulation_cut(move |transaction| {
            Box::pin(async move {
                let head = durable_head(transaction)
                    .await?
                    .ok_or(StoreError::StaleCut)?;
                if head.world_id != read.world || head.generation != read.generation {
                    return Err(StoreError::StaleCut);
                }
                let detached_durable = match head.revision.checked_sub(read.revision) {
                    Some(0) => false,
                    Some(1) if read.in_flight_through.is_some() => true,
                    _ => return Err(StoreError::StaleCut),
                };
                store
                    .finish_source_versions(transaction, read, detached_durable)
                    .await
            })
        })
        .await
    }

    async fn finish_source_versions(
        &self,
        transaction: &Transaction<'_>,
        mut read: PreparedSourceVersions,
        detached_durable: bool,
    ) -> StoreResult<RuntimeProviderInput> {
        let budget = &self.budget;
        let pending = pending::Overlay::join(&read.pending, detached_durable)?;
        let mut inputs = plan::Input {
            world: &read.world,
            selected: &read.forgotten,
            transaction,
            budget,
            sql: &self.schema.source_versions,
            pending: &pending,
            custody: &mut read.custody,
        };
        let plan = inputs.prepare(read.changed).await?;
        drop((read.pending, read.forgotten, read.world, read.generation));
        RuntimeProviderInput::source_versions(read.binding, plan, read.maximum, read.custody)
            .map_err(|error| if error.is_capacity() { StoreError::Capacity } else { StoreError::InvalidRecord })
    }
}

impl Columns {
    fn account(
        &self,
        kind: Kind,
        id: &str,
        payload: &str,
        values: &[SqlCell],
        custody: &mut ByteReservation,
    ) -> StoreResult<Account> {
        let get = |at: usize| values.get(at).ok_or(StoreError::InvalidRecord);
        let text = |at| get(at)?.as_str().ok_or(StoreError::InvalidRecord);
        let metadata = get(self.metadata)?;
        let metadata_bytes = json_record_len(metadata).map_err(|_| StoreError::InvalidRecord)?;
        pending::fund(custody, metadata_bytes.checked_add(id.len()).ok_or(StoreError::Capacity)?, 1)?;
        let source = account_record(kind, id)?;
        if text(self.actor)? != source.actor_id || text(self.source)? != source.id {
            return Err(StoreError::InvalidRecord);
        }
        let revision = text(self.revision)?.to_owned();
        if revision != sha256_hex(payload.as_bytes()) {
            return Err(StoreError::InvalidRecord);
        }
        Ok(Account {
            key: Version { source, revision },
            metadata: Metadata::from_cell(metadata)?,
            category: category(text(self.category)?)?,
            bytes: payload.len(),
            payload: None,
        })
    }
}

impl Metadata {
    fn from_cell(value: &SqlCell) -> StoreResult<Self> {
        let array = |key| value.get(key).and_then(SqlCell::as_array).ok_or(StoreError::InvalidRecord);
        let text = |slot: &SqlCell, key| slot.get(key).and_then(SqlCell::as_str)
            .map(str::to_owned).ok_or(StoreError::InvalidRecord);
        let versions = array("versions")?.iter().map(|row| {
            if row.as_object().is_none_or(|fields| fields.len() != 3) {
                return Err(StoreError::InvalidRecord);
            }
            let kind = row.get("kind").and_then(SqlCell::as_str).and_then(source_kind)
                .ok_or(StoreError::InvalidRecord)?;
            Ok(PersonalSourceRef { kind, id: text(row, "id")?, revision: text(row, "revision")? })
        }).collect::<StoreResult<_>>()?;
        let learning = array("learning")?.iter().map(|row| Ok(Learning {
            kind: text(row, "kind")?, id: text(row, "id")?,
        })).collect::<StoreResult<_>>()?;
        Ok(Self { versions, learning })
    }
}
