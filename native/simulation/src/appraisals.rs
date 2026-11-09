//! Personally acquired appraisals are finite private records. Their saved body
//! and semantic header share one owner; no map here represents a mutable world.

use crate::encoding::{content_label, json_record, sha256_hex};
use crate::events::WorldEvent;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::install::rows::{take_collection, validate_map_row, validate_marker};
use crate::install::{InstallError, RowImport};
use crate::records::{ChildShape, InstalledRow, OwnerCoverage};
use crate::simulation::InstalledWorld;
use crate::state::EntityStore;
use crate::values::{DefinitionPin, WorkVector};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::BTreeMap, mem::size_of, sync::Arc};
mod index;
mod residency;
use index::AppraisalIndex;
mod read;
mod response;
pub(crate) use read::{AppraisalScope, write_actor_appraisals};
pub(crate) use response::{
    AppraisalBindings, AppraisalChangeCursor, AppraisalChangeStep, AppraisalPublication,
    CompletedAppraisalChange,
};

#[derive(Clone, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub(crate) enum ValueLaw {
    Qualitative,
    Scaled { min: f64, max: f64 },
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub(crate) enum LifetimeLaw {
    Persistent,
    Expires { seconds: f64 },
    Decays { per_hour: f64, bands: Vec<f64> },
    ConditionSustained,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Definition {
    pub id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub version: u64,
    pub implementation: String,
    pub label: String,
    pub causes: Vec<String>,
    pub stacking: String,
    pub value: ValueLaw,
    pub lifetime: LifetimeLaw,
    pub reflection: bool,
    pub decision: bool,
}
pub(crate) struct InstalledAppraisalDefinition {
    pub value: Definition,
    pub pin: DefinitionPin,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Policy {
    definitions: Vec<Definition>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub(crate) enum AppraisalValue {
    Qualitative,
    Scaled { value: f64 },
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub(crate) enum AppraisalLifetime {
    Persistent,
    Expires { at: f64 },
    Decays { anchor_time: f64, anchor_value: f64 },
}
#[derive(Clone, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PerceivedCause {
    pub kind: String,
    pub actor_id: String,
    pub source_id: String,
    pub source_kind: String,
    pub occurrence_id: String,
    pub source_version: String,
    pub coverage: String,
    pub subject_ids: Vec<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recall_episode_id: Option<String>,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AppraisalOperation {
    pub id: String,
    pub body: String,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Appraisal {
    pub id: String,
    pub actor_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub revision: u64,
    pub definition_pin: DefinitionPin,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub target_id: Option<String>,
    pub stack_key: String,
    pub state: String,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub cause: Option<PerceivedCause>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub interpretation_source: Option<PerceivedCause>,
    pub value: AppraisalValue,
    pub lifetime: AppraisalLifetime,
    pub created_at: f64,
    pub changed_at: f64,
    pub last_operation: AppraisalOperation,
    pub creation_operation: AppraisalOperation,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub predecessor_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub next_at: Option<f64>,
}
pub(crate) struct AppraisalRecord {
    pub value: Appraisal,
    pub row: InstalledRow,
    _reservation: Option<ByteReservation>,
}
pub(crate) struct AppraisalOwner {
    pub row: Option<InstalledRow>,
    pub coverage: OwnerCoverage,
    pub active_complete: bool,
    pub records: IndexMap<String, Arc<AppraisalRecord>>,
    index: AppraisalIndex,
}
pub(crate) struct AppraisalState {
    pub definitions: IndexMap<String, Arc<InstalledAppraisalDefinition>>,
    pub owners: IndexMap<String, AppraisalOwner>,
    pub owner_coverage: OwnerCoverage,
    pub processes_present: bool,
    pub process_next_ordinal: u64,
    deadlines: BTreeMap<(u64, String), (String, String)>,
    undo: Vec<AppraisalUndo>,
}
enum AppraisalUndo {
    Record {
        actor: String,
        id: String,
        prior: Option<(usize, Arc<AppraisalRecord>)>,
        next: u64,
    },
    Owner {
        actor: String,
        next: u64,
        parent_present: bool,
    },
}
#[derive(Clone, Copy)]
pub(crate) struct AppraisalCheckpoint {
    undo: usize,
}

/// These shapes have fixed engine field names. Their ASCII key ordering is the
/// same ICU ordering used by Source canonicalJson; arbitrary event-data keys are
/// never passed through this helper (their original bytes form sourceVersion).
fn canonical_shape<T: Serialize>(value: &T) -> Result<String, ExecutionError> {
    fn order(value: &mut Value) {
        match value {
            Value::Object(map) => {
                for value in map.values_mut() {
                    order(value)
                }
                map.sort_keys();
            }
            Value::Array(values) => {
                for value in values {
                    order(value)
                }
            }
            _ => {}
        }
    }
    let mut value = serde_json::to_value(value).map_err(|_| ExecutionError::Invariant)?;
    order(&mut value);
    json_record(&value).map_err(|_| ExecutionError::Invariant)
}
fn pin(definition: &Definition) -> Result<DefinitionPin, InstallError> {
    Ok(DefinitionPin {
        id: definition.id.clone(),
        version: definition.version,
        digest: content_label(
            &canonical_shape(definition).map_err(|_| InstallError::DefinitionBody)?,
        ),
    })
}
pub(crate) fn install_appraisals(
    import: &mut RowImport,
    present: bool,
    processes: bool,
    entities: &EntityStore,
    installed: &InstalledWorld,
) -> Result<AppraisalState, InstallError> {
    let policy: Option<Policy> = installed
        .manifest
        .appraisals
        .as_deref()
        .map(|value| {
            serde_json::from_value(value.clone()).map_err(|_| InstallError::DefinitionBody)
        })
        .transpose()?;
    let mut definitions = IndexMap::new();
    for definition in policy.into_iter().flat_map(|policy| policy.definitions) {
        if definition.implementation != "appraisal-v1"
            || !matches!(definition.stacking.as_str(), "target" | "cause")
            || definitions.contains_key(&definition.id)
        {
            return Err(InstallError::DefinitionBody);
        }
        let pin = pin(&definition)?;
        definitions.insert(
            definition.id.clone(),
            Arc::new(InstalledAppraisalDefinition {
                value: definition,
                pin,
            }),
        );
    }
    let root = take_collection(
        import,
        "mind_appraisals_owners",
        "[\"world\"]",
        present,
        true,
    )?;
    let mut owners = IndexMap::new();
    for row in root.rows {
        validate_map_row(
            &row,
            "[\"world\"]",
            "appraisals",
            &row.slot,
            root.coverage.next_ordinal,
        )?;
        validate_marker(&row, ChildShape::Object)?;
        if entities
            .get(&row.slot)
            .is_none_or(|entity| entity.actor.is_none())
        {
            return Err(InstallError::ParentPresence);
        }
        let records = take_collection(import, "mind_appraisals", &row.id, true, false)?;
        let mut values = IndexMap::new();
        for source in records.rows {
            validate_map_row(
                &source,
                &row.id,
                "",
                &source.slot,
                records.coverage.next_ordinal,
            )?;
            let value: Appraisal = serde_json::from_str(&source.payload)
                .map_err(|_| InstallError::UnsupportedFamily("appraisal source family"))?;
            if value.actor_id != row.slot
                || value.id != source.slot
                || definitions
                    .get(&value.definition_pin.id)
                    .is_none_or(|definition| definition.pin != value.definition_pin)
                || value.cause.as_ref().is_some_and(|cause| {
                    !matches!(cause.kind.as_str(), "perceived-event" | "remembered")
                })
            {
                return Err(InstallError::CurrentFormat);
            }
            if values
                .insert(
                    value.id.clone(),
                    Arc::new(AppraisalRecord {
                        value,
                        row: source,
                        _reservation: None,
                    }),
                )
                .is_some()
            {
                return Err(InstallError::DuplicateRow);
            }
        }
        let active_complete = records.coverage.complete
            || import
                .working_set()
                .is_some_and(|working| working.active_appraisals(&row.slot));
        owners.insert(
            row.slot.clone(),
            AppraisalOwner {
                row: Some(row),
                active_complete,
                coverage: records.coverage,
                records: values,
                index: AppraisalIndex::default(),
            },
        );
    }
    let process = take_collection(
        import,
        "mind_appraisal_processes",
        "[\"world\"]",
        processes,
        true,
    )?;
    if !process.rows.is_empty() {
        return Err(InstallError::UnsupportedFamily(
            "enrolled appraisal process",
        ));
    }
    let mut state = AppraisalState {
        definitions,
        owners,
        owner_coverage: root.coverage,
        processes_present: processes,
        process_next_ordinal: process.coverage.next_ordinal,
        deadlines: BTreeMap::new(),
        undo: Vec::new(),
    };
    for owner in state.owners.values() {
        for record in owner.records.values() {
            index_deadline(&mut state.deadlines, &record.value);
        }
    }
    Ok(state)
}
impl AppraisalState {
    /// A restored record keeps its body and derived-key allowance in that same
    /// canonical Arc. Replacement or acceptance cannot free a held old body.
    pub(crate) fn prepare_indices(&mut self, budget: &ByteBudget) -> Result<(), ExecutionError> {
        for owner in self.owners.values_mut() {
            for record in owner.records.values_mut() {
                let record = Arc::get_mut(record).ok_or(ExecutionError::Invariant)?;
                if record._reservation.is_some() {
                    return Err(ExecutionError::Invariant);
                }
                record._reservation =
                    Some(budget.reserve(residency::record_bytes(&record.value, &record.row)?)?);
                owner.index.insert(&record.value)?;
            }
        }
        Ok(())
    }
    pub(crate) fn checkpoint(&self) -> AppraisalCheckpoint {
        AppraisalCheckpoint {
            undo: self.undo.len(),
        }
    }
    pub(crate) fn rollback_to(
        &mut self,
        checkpoint: AppraisalCheckpoint,
    ) -> Result<(), ExecutionError> {
        if checkpoint.undo > self.undo.len() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        while self.undo.len() > checkpoint.undo {
            match self.undo.pop().ok_or(ExecutionError::Invariant)? {
                AppraisalUndo::Owner {
                    actor,
                    next,
                    parent_present,
                } => {
                    self.owners
                        .shift_remove(&actor)
                        .ok_or(ExecutionError::Invariant)?;
                    self.owner_coverage.next_ordinal = next;
                    self.owner_coverage.parent_present = parent_present;
                }
                AppraisalUndo::Record {
                    actor,
                    id,
                    prior,
                    next,
                } => {
                    let owner = self
                        .owners
                        .get_mut(&actor)
                        .ok_or(ExecutionError::Invariant)?;
                    if let Some(current) = owner.records.shift_remove(&id) {
                        owner.index.remove(&current.value)?;
                        unindex_deadline(&mut self.deadlines, &current.value);
                    }
                    if let Some((at, record)) = prior {
                        owner.index.insert(&record.value)?;
                        index_deadline(&mut self.deadlines, &record.value);
                        owner.records.shift_insert(at, id, record);
                    }
                    owner.coverage.next_ordinal = next;
                }
            }
        }
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) {
        self.undo = Vec::new()
    }
    pub(crate) fn changed_records(&self) -> impl Iterator<Item = (&str, &str)> + '_ {
        self.undo.iter().filter_map(|undo| match undo {
            AppraisalUndo::Record { actor, id, .. } => Some((actor.as_str(), id.as_str())),
            _ => None,
        })
    }
    pub(crate) fn next_deadline(&self) -> f64 {
        self.deadlines
            .first_key_value()
            .map_or(f64::INFINITY, |(key, _)| f64::from_bits(key.0))
    }
}
pub(crate) fn encode_appraisal_changes(
    state: &AppraisalState,
    ledger: &crate::records::RecordLedger,
    output: &mut crate::records::RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), crate::records::RecordEncodingError> {
    use crate::records::{RecordEncodingError, RecordPlacement, RowEffects};
    let error = || RecordEncodingError("Appraisal save requires its actual source placement.");
    let _selection = budget
        .reserve(map_storage::<(&str, &str), ()>(state.undo.len()).ok_or_else(error)?)
        .map_err(|_| error())?;
    let mut seen = indexmap::IndexSet::new();
    seen.try_reserve(state.undo.len()).map_err(|_| error())?;
    for undo in &state.undo {
        if let AppraisalUndo::Owner { actor, .. } = undo {
            let owner = state.owners.get(actor).ok_or_else(error)?;
            let row = owner.row.as_ref().ok_or_else(error)?;
            let placement = RecordPlacement::from_row(row);
            let create = ledger
                .presence("mind_appraisals_owners", &row.id, &row.parent)
                .map(|present| !present)
                .ok_or_else(error)?;
            output.write_encoded(
                "mind_appraisals_owners",
                &placement,
                &row.payload,
                &row.extra,
                create,
                RowEffects::default(),
            )?;
            output.observe_owner(&state.owner_coverage)?;
        }
    }
    for (actor, id) in state.changed_records() {
        if !seen.insert((actor, id)) {
            continue;
        }
        let owner = state.owners.get(actor).ok_or_else(error)?;
        let record = owner.records.get(id).ok_or_else(error)?;
        let row = &record.row;
        let _address = budget
            .reserve(row.id.len() + row.parent.len() + row.slot.len())
            .map_err(|_| error())?;
        let placement = RecordPlacement::from_row(row);
        let create=match ledger.presence("mind_appraisals",&row.id,&row.parent){Some(present)=>!present,None if state.undo.iter().any(|undo|
            matches!(undo,AppraisalUndo::Record{actor:changed,id:changed_id,prior:None,..} if changed==actor&&changed_id==id))=>true,None=>return Err(error())};
        output.write_encoded(
            "mind_appraisals",
            &placement,
            &row.payload,
            &row.extra,
            create,
            RowEffects::default(),
        )?;
        output.observe_owner(&owner.coverage)?;
    }
    Ok(())
}
fn unindex_deadline(index: &mut BTreeMap<(u64, String), (String, String)>, value: &Appraisal) {
    if let Some(at) = value.next_at {
        index.remove(&(at.to_bits(), value.id.clone()));
    }
}
fn index_deadline(index: &mut BTreeMap<(u64, String), (String, String)>, value: &Appraisal) {
    if value.state == "active" {
        if let Some(at) = value.next_at {
            index.insert(
                (at.to_bits(), value.id.clone()),
                (value.actor_id.clone(), value.id.clone()),
            );
        }
    }
}
fn next_deadline(record: &Appraisal, definition: &Definition, now: f64) -> Option<f64> {
    match (&record.lifetime, &definition.lifetime) {
        (AppraisalLifetime::Expires { at }, _) => Some(*at),
        (
            AppraisalLifetime::Decays {
                anchor_time,
                anchor_value,
            },
            LifetimeLaw::Decays { per_hour, bands },
        ) => bands
            .iter()
            .map(|band| anchor_time + ((anchor_value - band) / per_hour) * 3600.0)
            .find(|at| *at > now),
        _ => None,
    }
}
fn put(
    core: &mut CoreMutation<'_>,
    value: Appraisal,
    mut reservation: ByteReservation,
    checked: Option<&response::CheckedCreation>,
) -> Result<(), ExecutionError> {
    let actor = &value.actor_id;
    let id = &value.id;
    let state = &mut core.state.appraisals;
    state
        .undo
        .try_reserve_exact(2)
        .map_err(|_| ExecutionError::Capacity)?;
    if !state.owners.contains_key(actor) {
        if !state.owner_coverage.complete {
            return Err(ExecutionError::Invariant);
        }
        state
            .owners
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        let parent =
            json_record(&["world", "appraisals", actor]).map_err(|_| ExecutionError::Invariant)?;
        let row = InstalledRow {
            id: parent.clone(),
            parent: "[\"world\"]".to_owned(),
            slot: actor.clone(),
            position: state.owner_coverage.next_ordinal,
            payload: "{}".to_owned(),
            extra: Vec::new(),
        };
        let owner = AppraisalOwner {
            row: Some(row),
            coverage: OwnerCoverage {
                table: "mind_appraisals".to_owned(),
                owner: parent,
                parent_present: true,
                complete: true,
                next_ordinal: 0,
            },
            records: IndexMap::new(),
            active_complete: true,
            index: AppraisalIndex::default(),
        };
        state.undo.push(AppraisalUndo::Owner {
            actor: actor.clone(),
            next: state.owner_coverage.next_ordinal,
            parent_present: state.owner_coverage.parent_present,
        });
        state.owner_coverage.next_ordinal = state
            .owner_coverage
            .next_ordinal
            .checked_add(1)
            .ok_or(ExecutionError::Identity)?;
        state.owner_coverage.parent_present = true;
        state.owners.insert(actor.clone(), owner);
    }
    let owner = state
        .owners
        .get_mut(actor)
        .ok_or(ExecutionError::Invariant)?;
    let prior = owner
        .records
        .get_full(id)
        .map(|(at, _, record)| (at, Arc::clone(record)));
    if prior.is_none()
        && !owner.coverage.complete
        && !checked.is_some_and(|proof| proof.matches(actor, id))
    {
        return Err(ExecutionError::Invariant);
    }
    let next = owner.coverage.next_ordinal;
    let position = prior
        .as_ref()
        .map_or(next, |(_, record)| record.row.position);
    let payload = json_record(&value).map_err(|_| ExecutionError::Invariant)?;
    let row = InstalledRow {
        id: json_record(&["world", "appraisals", actor, id])
            .map_err(|_| ExecutionError::Invariant)?,
        parent: owner.coverage.owner.clone(),
        slot: id.clone(),
        position,
        payload,
        extra: Vec::new(),
    };
    // The preparation allowance covers encoding peak; the canonical owner must
    // keep every actual body/index allocation after that temporary work ends.
    let resident = residency::record_bytes(&value, &row)?;
    if resident > reservation.bytes() {
        reservation.resize(resident)?;
    }
    let undo = AppraisalUndo::Record {
        actor: actor.clone(),
        id: id.clone(),
        prior,
        next,
    };
    owner
        .records
        .try_reserve(1)
        .map_err(|_| ExecutionError::Capacity)?;
    if let Some(prior) = owner.records.get(id) {
        owner.index.remove(&prior.value)?;
        unindex_deadline(&mut state.deadlines, &prior.value);
    }
    owner.index.insert(&value)?;
    index_deadline(&mut state.deadlines, &value);
    owner.records.insert(
        id.clone(),
        Arc::new(AppraisalRecord {
            value,
            row,
            _reservation: Some(reservation),
        }),
    );
    if matches!(&undo, AppraisalUndo::Record { prior: None, .. }) {
        owner.coverage.next_ordinal = next.checked_add(1).ok_or(ExecutionError::Identity)?;
    }
    state.undo.push(undo);
    Ok(())
}
pub(crate) fn appraise_perceived_event(
    core: &mut CoreMutation<'_>,
    event: &WorldEvent,
    actor: &str,
    target: &str,
    definition_id: &str,
    value: f64,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(entity) = core.state.physical.entities.get(actor).filter(|entity| {
        entity.has_memory() && entity.actor.as_ref().is_some_and(|actor| actor.alive)
    }) else {
        return Ok(());
    };
    if !event.audience.iter().any(|id| id == actor) {
        return Ok(());
    }
    let _ = entity;
    let Some(definition) = core
        .state
        .appraisals
        .definitions
        .get(definition_id)
        .cloned()
    else {
        return Ok(());
    };
    let ValueLaw::Scaled { min, max } = definition.value.value else {
        return Err(ExecutionError::UnsupportedFamily);
    };
    if !value.is_finite()
        || value < min
        || value > max
        || !definition
            .value
            .causes
            .iter()
            .any(|cause| cause == "perceived-event")
    {
        return Ok(());
    }
    if matches!(definition.value.lifetime, LifetimeLaw::Decays { .. }) && value <= min {
        return Ok(());
    }
    // The Source record quota bounds the complete serialized record. This
    // fixed schema's simultaneous strings/JSON/undo remain under this owned
    // reservation, including the optional interpretation's refused path.
    let bytes = heap_sum([
        8192 * 4,
        size_of::<AppraisalRecord>() + 2 * size_of::<usize>(),
        map_storage::<String, Arc<AppraisalRecord>>(4).ok_or(ExecutionError::Capacity)?,
        map_storage::<String, AppraisalOwner>(4).ok_or(ExecutionError::Capacity)?,
        (actor.len() + target.len() + event.id.len())
            .checked_mul(16)
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let reservation = budget.reserve(bytes)?;
    let pin = &definition.pin;
    let stack_key = canonical_shape(&(
        actor,
        pin,
        Some(target),
        if definition.value.stacking == "target" {
            None
        } else {
            Some(event.id.as_str())
        },
    ))?;
    let id = format!(
        "appraisal-{}-{}",
        content_label(&stack_key),
        content_label(&event.id)
    );
    if core
        .state
        .appraisals
        .owners
        .get(actor)
        .is_some_and(|owner| owner.records.contains_key(&id))
    {
        return Ok(());
    }
    let cause = PerceivedCause {
        kind: "perceived-event".to_owned(),
        actor_id: actor.to_owned(),
        source_id: event.id.clone(),
        source_kind: "event".to_owned(),
        occurrence_id: event.id.clone(),
        source_version: sha256_hex(
            json_record(event)
                .map_err(|_| ExecutionError::Invariant)?
                .as_bytes(),
        ),
        coverage: "personally experienced".to_owned(),
        subject_ids: vec![target.to_owned()],
        recall_episode_id: None,
    };
    let value = AppraisalValue::Scaled { value };
    #[derive(Serialize)]
    struct OperationBody<'a> {
        definition: &'a DefinitionPin,
        cause: &'a PerceivedCause,
        #[serde(rename = "targetId")]
        target_id: Option<&'a str>,
        value: &'a AppraisalValue,
    }
    let body = canonical_shape(&OperationBody {
        definition: pin,
        cause: &cause,
        target_id: Some(target),
        value: &value,
    })?;
    let now = core.state.physical.header.sim_time;
    let lifetime = match definition.value.lifetime {
        LifetimeLaw::Persistent => AppraisalLifetime::Persistent,
        LifetimeLaw::Expires { seconds } => AppraisalLifetime::Expires { at: now + seconds },
        LifetimeLaw::Decays { .. } => AppraisalLifetime::Decays {
            anchor_time: now,
            anchor_value: match value {
                AppraisalValue::Scaled { value } => value,
                _ => return Err(ExecutionError::Invariant),
            },
        },
        LifetimeLaw::ConditionSustained => return Err(ExecutionError::UnsupportedFamily),
    };
    let mut record = Appraisal {
        id: id.clone(),
        actor_id: actor.to_owned(),
        revision: 1,
        definition_pin: pin.clone(),
        target_id: Some(target.to_owned()),
        stack_key,
        state: "active".to_owned(),
        cause: Some(cause),
        interpretation_source: None,
        value,
        lifetime,
        created_at: now,
        changed_at: now,
        last_operation: AppraisalOperation {
            id: event.id.clone(),
            body: body.clone(),
        },
        creation_operation: AppraisalOperation {
            id: event.id.clone(),
            body,
        },
        predecessor_id: None,
        next_at: None,
    };
    record.next_at = next_deadline(&record, &definition.value, now);
    if json_record(&record)
        .map_err(|_| ExecutionError::Invariant)?
        .encode_utf16()
        .count()
        * 3
        > 8192
    {
        return Ok(());
    }
    let request = crate::work::WorkRequest {
        id: id.clone(),
        parent_id: None,
        actor_id: actor.to_owned(),
        module_id: pin.id.clone(),
        definition_pin: pin.clone(),
        limit: WorkVector {
            effects: 32,
            tests: 64,
            depth: 1,
            ..Default::default()
        },
        allocation: WorkVector {
            live: 1,
            retained_bytes: 8192,
            subscriptions: 1,
            ..Default::default()
        },
        recurrence: None,
    };
    match core.physical().admit_work(request) {
        Ok(()) => {}
        Err(ExecutionError::Work(crate::work::WorkError::Unavailable(_))) => return Ok(()),
        Err(error) => return Err(error),
    }
    let checked = response::CheckedCreation::fresh_occurrence(core, event, actor, &id);
    let owner = core.state.appraisals.owners.get(actor);
    if let Some(owner) = owner {
        if !owner.active_complete || (!owner.coverage.complete && checked.is_none()) {
            return Err(crate::experience::ExperienceError::Unavailable.into());
        }
    }
    let prefix = (definition.value.stacking == "target")
        .then(|| AppraisalIndex::scope_key(pin, Some(target)))
        .transpose()?;
    let previous_count = owner
        .zip(prefix.as_deref())
        .map_or(0, |(owner, prefix)| owner.index.scoped(prefix).count());
    let _previous_reservation = budget.reserve(
        previous_count
            .checked_mul(size_of::<Arc<AppraisalRecord>>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut previous = Vec::new();
    previous
        .try_reserve_exact(previous_count)
        .map_err(|_| ExecutionError::Capacity)?;
    if let Some((owner, prefix)) = owner.zip(prefix.as_deref()) {
        for id in owner.index.scoped(prefix) {
            previous.push(Arc::clone(
                owner.records.get(id).ok_or(ExecutionError::Invariant)?,
            ));
        }
    }
    for previous in previous {
        let reservation = budget.reserve(bytes)?;
        let mut value = previous.value.clone();
        value.state = "resolved".to_owned();
        value.revision += 1;
        value.changed_at = now;
        value.next_at = None;
        core.physical().release_work(&value.id)?;
        put(core, value, reservation, None)?;
        core.journal.cognition.note_appraisal_change(actor)?;
    }
    put(core, record, reservation, checked.as_ref())?;
    core.journal.cognition.note_appraisal_change(actor)
}

/// Consume one due native lifetime, then deliver its actual private occurrence
/// before selecting the next deadline. Enrolled process families are refused by
/// installation until their complete deterministic owner is converted.
pub(crate) fn advance_next_appraisal(
    core: &mut CoreMutation<'_>,
    budget: &ByteBudget,
) -> Result<Option<crate::execution::StagedOccurrence>, ExecutionError> {
    use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
    use crate::narration::{Narration, NarrationPart, PersonRole};
    use crate::reception::EventScalar;
    use crate::work::WorkUnit;
    let now = core.state.physical.header.sim_time;
    let Some((key, (actor, id))) = core.state.appraisals.deadlines.first_key_value() else {
        return Ok(None);
    };
    if f64::from_bits(key.0) > now {
        return Ok(None);
    }
    let record = core
        .state
        .appraisals
        .owners
        .get(actor)
        .and_then(|owner| owner.records.get(id))
        .ok_or(ExecutionError::Invariant)?;
    let definition = core
        .state
        .appraisals
        .definitions
        .get(&record.value.definition_pin.id)
        .cloned()
        .ok_or(ExecutionError::Invariant)?;
    let bytes = crate::experience::encoded_body_bound(&record.row.payload)?
        .checked_add(record.row.payload.len())
        .and_then(|n| n.checked_add(8192))
        .ok_or(ExecutionError::Capacity)?;
    let reservation = budget.reserve(bytes)?;
    let mut value = record.value.clone();
    let id = value.id.clone();
    core.journal
        .meters
        .charge(&[(WorkUnit::Tests, 1), (WorkUnit::Effects, 1)])?;
    core.physical().charge_work(
        &id,
        crate::work::WorkDemand {
            tests: Some(1),
            effects: Some(1),
            ..Default::default()
        },
    )?;
    let next = next_deadline(&value, &definition.value, now);
    if next.is_none() || matches!(value.lifetime, AppraisalLifetime::Expires { .. }) {
        value.state = "resolved".to_owned();
        value.next_at = None;
        core.physical().release_work(&id)?;
    } else {
        value.next_at = next;
    }
    value.revision = value
        .revision
        .checked_add(1)
        .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)?;
    value.changed_at = now;
    let actor = value.actor_id.clone();
    let revision = value.revision;
    let active = value.state == "active";
    put(core, value, reservation, None)?;
    core.journal.cognition.note_appraisal_change(&actor)?;
    let parts = if active {
        vec![
            NarrationPart::Participant {
                entity_id: actor.clone(),
                role: PersonRole::Subject,
                article: None,
            },
            NarrationPart::Literal(" ".to_owned().into()),
            NarrationPart::Verb {
                subject_id: actor.clone(),
                verb: "feel".to_owned(),
            },
            NarrationPart::Literal(format!(" {}.", definition.value.label).into()),
        ]
    } else {
        vec![
            NarrationPart::Participant {
                entity_id: actor.clone(),
                role: PersonRole::Possessive,
                article: None,
            },
            NarrationPart::Literal(format!(" {} has ended.", definition.value.label).into()),
        ]
    };
    let mut data = IndexMap::new();
    data.insert("appraisalId".to_owned(), EventScalar::Text(id.into()));
    data.insert("revision".to_owned(), EventScalar::Number(revision as f64));
    data.insert("semanticTrigger".to_owned(), EventScalar::Boolean(true));
    data.insert("importance".to_owned(), EventScalar::Number(5.0));
    data.insert("urgency".to_owned(), EventScalar::Number(0.0));
    Ok(Some(core.stage_event(EventEmissionIntent {
        event_type: "appraisal-changed".to_owned(),
        text: EmissionText::Narration(Narration { parts }),
        audience: AudienceSelection::Explicit(vec![actor.clone()]),
        source_id: Some(actor),
        target_id: None,
        data: Some(data),
        scope: EventScope::Private,
        origin: None,
        exposure: None,
    })?))
}

/// A private-state notice from the actual invalidation owner. Its caller must
/// publish this actor's appraisal dependency change even when no record existed.
pub(crate) struct InvalidatedAppraisals {
    actor_id: String,
    _reservation: ByteReservation,
}
impl InvalidatedAppraisals {
    pub(crate) fn actor_id(&self) -> &str {
        &self.actor_id
    }
}
pub(crate) fn invalidate_appraisals(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    budget: &ByteBudget,
) -> Result<InvalidatedAppraisals, ExecutionError> {
    let owner = core.state.appraisals.owners.get(actor_id);
    if owner.is_some_and(|owner| !owner.coverage.complete) {
        return Err(ExecutionError::Invariant);
    }
    let count = owner.map_or(0, |owner| owner.records.len());
    let key_bytes = owner
        .into_iter()
        .flat_map(|o| o.records.keys())
        .try_fold(0usize, |n, key| n.checked_add(key.len()))
        .ok_or(ExecutionError::Capacity)?;
    let selection = budget.reserve(
        heap_sum([
            key_bytes,
            count
                .checked_mul(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?,
    )?;
    let notice = budget.reserve(actor_id.len())?;
    let mut ids = Vec::new();
    ids.try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    ids.extend(
        owner
            .into_iter()
            .flat_map(|owner| owner.records.keys().cloned()),
    );
    ids.sort_by(|a, b| crate::encoding::js_property_cmp(a, b));
    for id in ids {
        let record = core
            .state
            .appraisals
            .owners
            .get(actor_id)
            .and_then(|owner| owner.records.get(&id))
            .ok_or(ExecutionError::Invariant)?;
        let bound = crate::experience::encoded_body_bound(&record.row.payload)?
            .checked_add(record.row.payload.len())
            .and_then(|n| n.checked_add(8192))
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bound)?;
        let mut value = record.value.clone();
        let changed = value.state != "invalidated";
        if value.state != "invalidated" {
            value.state = "invalidated".into();
            value.revision = value
                .revision
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Identity)?;
            value.changed_at = core.state.physical.header.sim_time;
            value.next_at = None;
            core.physical().release_work(&id)?;
        }
        value.cause = None;
        value.interpretation_source = None;
        value.target_id = None;
        value.stack_key.clear();
        value.value = AppraisalValue::Qualitative;
        value.lifetime = AppraisalLifetime::Persistent;
        value.last_operation = AppraisalOperation {
            id: value.id.clone(),
            body: String::new(),
        };
        value.creation_operation = AppraisalOperation {
            id: value.id.clone(),
            body: String::new(),
        };
        value.predecessor_id = None;
        put(core, value, reservation, None)?;
        if changed {
            core.journal.cognition.note_appraisal_change(actor_id)?;
        }
    }
    // Source invalidation notifies once even when every record was already a
    // tombstone (or no records existed), after its per-ended-record notices.
    core.journal.cognition.note_appraisal_change(actor_id)?;
    // Enrolled processes are a refused installed family and have no selected
    // producer. Their absent owner is not replaced by a synthesized process.
    drop(selection);
    Ok(InvalidatedAppraisals {
        actor_id: actor_id.into(),
        _reservation: notice,
    })
}
