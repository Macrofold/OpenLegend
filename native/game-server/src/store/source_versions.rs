//! Exact archived-source planning uses the candidate's accepted predecessor.
//! The simulation owns retention effects; this owner only selects immutable
//! rows, dependency classes and original bytes from the fixed SQL cut.

use super::{Store, StoreError, StoreResult, durable_head, ordinal};
use openlegend_simulation::encoding::{json_record, json_record_len, sha256_hex};
use openlegend_simulation::experience::{PersonalSourceKind as Kind, PersonalSourceRef};
use openlegend_simulation::geometry::GeometryBinding;
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::received::AccountClass;
use openlegend_simulation::records::{ChangedRows, SqlCell};
use openlegend_simulation::runtime::{
    RuntimeProvider, RuntimeProviderInput, RuntimeSourceVersionRead,
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::borrow::Cow;
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

#[derive(Deserialize)]
struct Envelope<'a> {
    #[serde(borrow)]
    value: Request<'a>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Request<'a> {
    binding: GeometryBinding,
    #[serde(borrow)]
    world_id: Cow<'a, str>,
    #[serde(borrow)]
    generation: Cow<'a, str>,
    base_cut: u64,
    cuts: Vec<PrivacyCut>,
    #[serde(borrow)]
    records: Records<'a>,
    #[serde(borrow)]
    personal_predecessors: Vec<Predecessor<'a>>,
    maximum_transfer_bytes: usize,
    restore_projection: Option<Box<RawValue>>,
    archive_baseline: Option<Box<RawValue>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrivacyCut {
    actor_id: String,
    forgotten: BTreeSet<String>,
}

#[derive(Deserialize)]
struct Records<'a> {
    #[serde(borrow)]
    writes: BTreeMap<&'a str, Vec<Incoming<'a>>>,
    deletes: BTreeMap<String, Vec<String>>,
    #[serde(default)]
    expired: BTreeMap<String, Vec<String>>,
}

#[derive(Deserialize)]
struct Incoming<'a> {
    id: String,
    #[serde(borrow)]
    payload: Cow<'a, str>,
    #[serde(borrow)]
    extra: Vec<&'a RawValue>,
    create: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Predecessor<'a> {
    table: String,
    id: String,
    actor_id: String,
    payload: String,
    #[serde(borrow)]
    extra: Vec<&'a RawValue>,
    encoded_bytes: usize,
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
        let allowance = SqlCell::json_decode_bound(read.request)
            .and_then(|bytes| bytes.checked_mul(2))
            .ok_or(StoreError::Capacity)?;
        let mut custody = self
            .budget
            .reserve(allowance)
            .map_err(|_| StoreError::Capacity)?;
        let Envelope { value: request } =
            serde_json::from_str(read.request).map_err(|_| StoreError::InvalidRecord)?;
        if request.maximum_transfer_bytes == 0
            || request.restore_projection.is_some()
            || request.archive_baseline.is_some()
        {
            return Err(StoreError::InvalidRecord);
        }
        let maximum = request.maximum_transfer_bytes;
        let (forgotten, changed) = self.source_version_inputs(request)?;
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
        mut request: Request<'_>,
    ) -> StoreResult<(
        BTreeMap<String, BTreeSet<String>>,
        BTreeMap<(Kind, String), Mutation>,
    )> {
        let mut forgotten = BTreeMap::new();
        for cut in request.cuts {
            if forgotten.insert(cut.actor_id, cut.forgotten).is_some() {
                return Err(StoreError::InvalidRecord);
            }
        }
        let mut changed = BTreeMap::<(Kind, String), Mutation>::new();
        for kind in KINDS {
            let table = kind.table();
            let columns = self.source_columns(kind)?;
            for id in request.records.deletes.remove(table).into_iter().flatten() {
                changed.entry((kind, id)).or_default();
            }
            for id in request.records.expired.remove(table).into_iter().flatten() {
                changed.entry((kind, id)).or_default().expired = true;
            }
            for row in request.records.writes.remove(table).into_iter().flatten() {
                let next = columns.account(kind, &row.id, &row.payload, &row.extra, None)?;
                let change = changed.entry((kind, row.id)).or_default();
                if change.next.replace(next).is_some() {
                    return Err(StoreError::InvalidRecord);
                }
                change.create = row.create;
            }
        }
        if !request.records.writes.is_empty()
            || !request.records.deletes.is_empty()
            || !request.records.expired.is_empty()
        {
            return Err(StoreError::InvalidRecord);
        }
        for row in request.personal_predecessors {
            let kind = KINDS
                .into_iter()
                .find(|kind| kind.table() == row.table)
                .ok_or(StoreError::InvalidRecord)?;
            // Other already-touched canonical owners are not in this closure.
            let Some(change) = changed.get_mut(&(kind, row.id.clone())) else {
                continue;
            };
            if row.payload.len() != row.encoded_bytes {
                return Err(StoreError::InvalidRecord);
            }
            let columns = self.source_columns(kind)?;
            let mut prior = columns.account(kind, &row.id, &row.payload, &row.extra, None)?;
            if prior.key.source.actor_id != row.actor_id {
                return Err(StoreError::InvalidRecord);
            }
            prior.payload = Some(row.payload);
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
        provider: &RuntimeProvider,
    ) -> StoreResult<RuntimeProviderInput> {
        if !provider
            .asks_source_versions()
            .map_err(|_| StoreError::StaleCut)?
        {
            return Err(StoreError::InvalidRecord);
        }
        let (read, projection, baseline) = provider
            .with_request(|text| {
                let size = SqlCell::json_decode_bound(text)
                    .and_then(|bytes| bytes.checked_mul(2))
                    .ok_or(StoreError::Capacity)?;
                let custody = self
                    .budget
                    .reserve(size)
                    .map_err(|_| StoreError::Capacity)?;
                let Envelope { value: mut request } =
                    serde_json::from_str(text).map_err(|_| StoreError::InvalidRecord)?;
                if request.base_cut != 0
                    || request.binding.base_cut != 0
                    || request.world_id != head.world_id
                    || request.generation != head.generation
                    || request.maximum_transfer_bytes == 0
                {
                    return Err(StoreError::StaleCut);
                }
                let projection = request
                    .restore_projection
                    .take()
                    .ok_or(StoreError::InvalidRecord)?;
                let baseline = request
                    .archive_baseline
                    .take()
                    .ok_or(StoreError::InvalidRecord)?;
                let binding = request.binding;
                let maximum = request.maximum_transfer_bytes;
                let (forgotten, changed) = self.source_version_inputs(request)?;
                Ok((
                    PreparedSourceVersions {
                        binding,
                        world: head.world_id.clone(),
                        generation: head.generation.clone(),
                        revision: head.revision,
                        in_flight_through: None,
                        maximum,
                        forgotten,
                        changed,
                        pending: [pending::Owner::default(), pending::Owner::default()],
                        custody,
                    },
                    projection,
                    baseline,
                ))
            })
            .map_err(|_| StoreError::StaleCut)??;
        self.with_checkpoint_view(tx, head, &projection, async {
            self.apply_checkpoint_archive_baseline(tx, head, &baseline)
                .await?;
            self.finish_source_versions(tx, read, false).await
        })
        .await
    }

    pub(crate) async fn read_source_versions(
        self: &Arc<Self>,
        read: PreparedSourceVersions,
    ) -> StoreResult<RuntimeProviderInput> {
        let store = self.clone();
        self.read_operational(move |transaction| {
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
        let reply = plan::Reply {
            binding: read.binding,
            plan: inputs.prepare(read.changed).await?,
        };
        let len = json_record_len(&reply).map_err(|_| StoreError::InvalidRecord)?;
        if len > read.maximum {
            return Err(StoreError::Capacity);
        }
        let mut custody = budget
            .reserve(len.checked_mul(2).ok_or(StoreError::Capacity)?)
            .map_err(|_| StoreError::Capacity)?;
        let json = json_record(&reply).map_err(|_| StoreError::InvalidRecord)?;
        custody
            .resize(json.capacity())
            .map_err(|_| StoreError::Capacity)?;
        Ok(RuntimeProviderInput::new(json, custody))
    }
}

impl Columns {
    fn account(
        &self,
        kind: Kind,
        id: &str,
        payload: &str,
        values: &[&RawValue],
        previous: Option<String>,
    ) -> StoreResult<Account> {
        let get = |at| {
            values
                .get(at)
                .map(|value: &&RawValue| value.get())
                .ok_or(StoreError::InvalidRecord)
        };
        let source = account_record(kind, id)?;
        if parse::<String>(get(self.actor)?)? != source.actor_id
            || parse::<String>(get(self.source)?)? != source.id
        {
            return Err(StoreError::InvalidRecord);
        }
        let revision = parse::<String>(get(self.revision)?)?;
        if revision != sha256_hex(payload.as_bytes()) {
            return Err(StoreError::InvalidRecord);
        }
        Ok(Account {
            key: Version { source, revision },
            metadata: parse(get(self.metadata)?)?,
            category: category(&parse::<String>(get(self.category)?)?)?,
            bytes: payload.len(),
            payload: previous,
        })
    }
}
