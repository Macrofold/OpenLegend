//! Owned object lineage is an accepted-storage read, never a live item grant.

use super::*;
use crate::{
    host::retained_size::HeapBytes,
    records::{ChangedRows, SqlCell},
    state::{LineageKind, ObjectLineage},
    text::JsText,
};

const TABLE: &str = "sim_object_lineage";
/// The existing object history page plus one row to prove continuation.
pub const OBJECT_HISTORY_SELECTION: usize = 41;

pub struct RuntimeObjectHistoryRead {
    pub world_id: String,
    pub generation: String,
    pub actor_id: String,
    pub at: f64,
    pub durable_revision: u64,
    pub detached: Option<Vec<RuntimeObjectHistoryEntry>>,
    pub suffix: Vec<RuntimeObjectHistoryEntry>,
    physical_life: u64,
    _custody: crate::host::ByteReservation,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeObjectHistoryEntry {
    pub id: String,
    at: f64,
    #[serde(rename = "type")]
    kind: LineageKind,
    quantity: u64,
    name: JsText,
    source_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<String>,
}

impl RuntimeObjectHistoryEntry {
    fn new(record: ObjectLineage, name: JsText) -> Self {
        Self {
            id: record.id,
            at: record.at,
            kind: record.kind,
            quantity: record.quantity,
            name,
            source_id: record.source_id,
            target_id: record.target_id,
        }
    }

    fn retained_bytes(&self) -> Option<usize> {
        self.id
            .heap_bytes()?
            .checked_add(self.name.heap_bytes()?)?
            .checked_add(self.source_id.heap_bytes()?)?
            .checked_add(self.target_id.heap_bytes()?)
    }

    /// The SQL transfer owns decoding workspace until the response hands off
    /// its independently funded body. Validate canonical occurrence and scope
    /// before projecting the recorded source's name and descriptive IDs.
    pub fn from_storage(
        slot: &str,
        payload: &str,
        entity: &str,
        actor: &str,
        object: Option<&str>,
        through: f64,
    ) -> Result<Self, RuntimeError> {
        #[derive(Deserialize)]
        struct Name {
            name: JsText,
        }
        let record: ObjectLineage = serde_json::from_str(payload).map_err(failure)?;
        if !record.valid(through)
            || record.id != slot
            || record.custodian_id.as_deref() != Some(actor)
            || !related(object, &record.source_id, record.target_id.as_deref())
        {
            return Err(failure("invalid object history occurrence"));
        }
        let Name { name } = serde_json::from_str(entity).map_err(failure)?;
        Ok(Self::new(record, name))
    }
}

impl NativeWorldSession {
    /// Take only the matching immutable lineage suffixes across a database
    /// wait. Retired source names are part of the current-format entity rows.
    pub fn capture_object_history(
        &self,
        account: &str,
        actor: &str,
        after: &str,
        object: Option<&str>,
    ) -> Result<Option<RuntimeObjectHistoryRead>, RuntimeError> {
        let accepted = self.session.accepted().map_err(failure)?;
        let state = &accepted.state;
        if accepted.require_player_read(account, actor).is_err() {
            return Ok(None);
        }
        let physical_life = state
            .physical
            .entities
            .get(actor)
            .and_then(crate::state::Entity::physical_life)
            .ok_or_else(|| failure("object history actor is absent"))?;
        let (metadata, save) = self.session.accepted_save_read().map_err(failure)?;
        let (detached, suffix) = save.pending_read_rows();
        if detached.is_some() != metadata.in_flight_through.is_some() {
            return Err(failure("object history save prefix changed"));
        }

        let mut custody = self.budget.reserve(
            size_of::<RuntimeObjectHistoryRead>()
                + state.physical.header.id.len()
                + state.generation.len()
                + actor.len(),
        )?;
        let detached = detached
            .map(|rows| {
                select_pending(
                    rows,
                    state,
                    actor,
                    after,
                    object,
                    &mut custody,
                    &self.budget,
                )
            })
            .transpose()?;
        let suffix = select_pending(
            suffix,
            state,
            actor,
            after,
            object,
            &mut custody,
            &self.budget,
        )?;
        Ok(Some(RuntimeObjectHistoryRead {
            world_id: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            actor_id: actor.to_owned(),
            at: state.physical.header.sim_time,
            durable_revision: metadata.durable_revision,
            detached,
            suffix,
            physical_life,
            _custody: custody,
        }))
    }

    pub fn publish_object_history<T>(
        &self,
        account: &str,
        actor: &str,
        read: &RuntimeObjectHistoryRead,
        publish: impl FnOnce() -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let accepted = self.session.publication_read().map_err(failure)?;
        let state = &accepted.state;
        if read.world_id != state.physical.header.id
            || read.generation != state.generation
            || read.actor_id != actor
            || accepted.require_player_read(account, actor).is_err()
            || state
                .physical
                .entities
                .get(actor)
                .and_then(crate::state::Entity::physical_life)
                != Some(read.physical_life)
        {
            return Ok(None);
        }
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        Ok(Some(publish()))
    }
}

fn related(object: Option<&str>, source: &str, target: Option<&str>) -> bool {
    object.is_none_or(|object| source == object || target == Some(object))
}

fn select_pending(
    changes: &ChangedRows,
    state: &crate::simulation::SimulationState,
    actor: &str,
    after: &str,
    object: Option<&str>,
    custody: &mut crate::host::ByteReservation,
    budget: &ByteBudget,
) -> Result<Vec<RuntimeObjectHistoryEntry>, RuntimeError> {
    // Ordinary custody appends observations. A world replacement changes the
    // generation instead of publishing deletions against this accepted cut.
    if [&changes.deletes, &changes.expired]
        .into_iter()
        .any(|changes| {
            [TABLE, "sim_object_lineage_owners"]
                .into_iter()
                .any(|table| changes.get(table).is_some_and(|rows| !rows.is_empty()))
        })
    {
        return Err(failure("unexpected object history removal"));
    }
    let Some(writes) = changes.writes.get(TABLE).filter(|rows| !rows.is_empty()) else {
        return Ok(Vec::new());
    };
    let count = writes.len().min(OBJECT_HISTORY_SELECTION);
    custody.resize(
        custody
            .bytes()
            .checked_add(count * size_of::<RuntimeObjectHistoryEntry>())
            .ok_or_else(|| failure("capacity"))?,
    )?;
    let mut selected: Vec<RuntimeObjectHistoryEntry> = Vec::with_capacity(count);
    for row in writes {
        let slot = row.slot.as_str();
        if slot <= after
            || (selected.len() == count
                && selected
                    .last()
                    .is_some_and(|entry| entry.id.as_str() < slot))
        {
            continue;
        }
        let [source, target] = row.extra.as_slice() else {
            return Err(failure("invalid pending object history columns"));
        };
        let source = source
            .as_str()
            .ok_or_else(|| failure("invalid object history source"))?;
        let target = match target {
            SqlCell::Null => None,
            value => Some(
                value
                    .as_str()
                    .ok_or_else(|| failure("invalid object history target"))?,
            ),
        };
        if !related(object, source, target) {
            continue;
        }
        let _scratch = decode_preparation(row.payload.as_bytes(), budget)?;
        let record: ObjectLineage = serde_json::from_str(&row.payload).map_err(failure)?;
        if record.custodian_id.as_deref() != Some(actor) {
            continue;
        }
        if record.id != slot || record.source_id != source || record.target_id.as_deref() != target
        {
            return Err(failure("invalid pending object history occurrence"));
        }
        let position = selected
            .binary_search_by(|entry| entry.id.as_str().cmp(slot))
            .err()
            .ok_or_else(|| failure("duplicate object history occurrence"))?;
        let name = &state
            .physical
            .entities
            .get(source)
            .ok_or_else(|| failure("object history source missing"))?
            .name;
        let bytes = record
            .id
            .capacity()
            .checked_add(record.source_id.capacity())
            .and_then(|bytes| {
                bytes.checked_add(record.target_id.as_ref().map_or(0, String::capacity))
            })
            .and_then(|bytes| bytes.checked_add(name.heap_bytes()?))
            .ok_or_else(|| failure("capacity"))?;
        custody.resize(
            custody
                .bytes()
                .checked_add(bytes)
                .ok_or_else(|| failure("capacity"))?,
        )?;
        if selected.len() == count {
            let removed = selected.pop().expect("full object history selection");
            let bytes = removed
                .retained_bytes()
                .ok_or_else(|| failure("capacity"))?;
            drop(removed);
            custody.resize(custody.bytes() - bytes)?;
        }
        selected.insert(
            position,
            RuntimeObjectHistoryEntry::new(record, name.clone()),
        );
    }
    Ok(selected)
}
