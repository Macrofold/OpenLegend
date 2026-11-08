//! A protected edit reads physical pages at the accepted live SQL cut, including
//! the existing packer's unsaved projection. This transport neither packs pages
//! nor commits them. It verifies the actual pending contents before exchange.

use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::received::{ReceivedBatch, ReceivedValues, TemporalValueMeaning};
use crate::simulation::SimulationState;
use std::mem::size_of;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TemporalPageReadBinding {
    world_id: String,
    generation: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    accepted_cut: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    identity_through: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    candidate_id: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    candidate_generation: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    request_serial: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TemporalPageReadRequest {
    binding: TemporalPageReadBinding,
    actor_id: String,
    #[serde(skip)]
    undo_cursor: usize,
    #[serde(skip)]
    header: Arc<str>,
    #[serde(skip)]
    at: f64,
    #[serde(skip)]
    _reservation: ByteReservation,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CompleteTemporalPages {
    binding: TemporalPageReadBinding,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    durable_revision: u64,
    coverage: OwnerCoverage,
    rows: Vec<InstalledRow>,
}
fn error() -> ReceivedError {
    ReceivedError("Temporal physical read is incomplete, stale or differs from accepted contents.")
}

impl TemporalPageReadRequest {
    /// The host issues this only under its actual preparing-candidate fence,
    /// before privacy's first canonical mutation, and retains projection custody.
    pub(crate) fn prepare(
        state: &SimulationState,
        actor: &str,
        key: CandidateKey,
        request_serial: u64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let history = state.temporal.actor(actor).ok_or_else(error)?;
        if key.base_cut != state.accepted_cut
            || request_serial > crate::identity::MAX_SAFE_INTEGER
            || key.id > crate::identity::MAX_SAFE_INTEGER
            || key.generation > crate::identity::MAX_SAFE_INTEGER
        {
            return Err(error().into());
        }
        let reservation = budget.reserve(
            heap_sum([
                state.physical.header.id.len(),
                state.generation.len(),
                actor.len(),
                size_of::<Self>(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            binding: TemporalPageReadBinding {
                world_id: state.physical.header.id.clone(),
                generation: state.generation.clone(),
                accepted_cut: state.accepted_cut,
                identity_through: state.physical.identity.next_id(),
                candidate_id: key.id,
                candidate_generation: key.generation,
                request_serial,
            },
            actor_id: actor.to_owned(),
            undo_cursor: state.temporal.undo.len(),
            header: Arc::clone(&history.payload),
            at: state.physical.header.sim_time,
            _reservation: reservation,
        })
    }
    fn matches(&self, state: &SimulationState, key: CandidateKey) -> bool {
        self.binding.world_id == state.physical.header.id
            && self.binding.generation == state.generation
            && self.binding.accepted_cut == state.accepted_cut
            && key.base_cut == state.accepted_cut
            && self.binding.identity_through == state.physical.identity.next_id()
            && self.binding.candidate_id == key.id
            && self.binding.candidate_generation == key.generation
            && self.at == state.physical.header.sim_time
            && self.undo_cursor == state.temporal.undo.len()
            && state
                .temporal
                .actor(&self.actor_id)
                .is_some_and(|actor| actor.payload == self.header)
    }
}

pub(crate) fn materialize_temporal_pages(
    core: &mut CoreMutation<'_>,
    key: CandidateKey,
    request: TemporalPageReadRequest,
    response: CompleteTemporalPages,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if !request.matches(core.state, key)
        || response.binding != request.binding
        || response.durable_revision > core.state.durable_revision
    {
        return Err(error().into());
    }
    let owner = json_record(&[
        "world",
        "experience",
        "temporal",
        "actors",
        &request.actor_id,
    ])
    .map_err(|_| error())?;
    if response.coverage.table != "mind_temporal_pages"
        || response.coverage.owner != owner
        || !response.coverage.complete
        || !response.coverage.parent_present
        || response.coverage.next_ordinal != request.binding.identity_through
    {
        return Err(error().into());
    }
    let mut bytes =
        map_storage::<String, u64>(response.rows.len()).ok_or(ExecutionError::Capacity)?;
    for row in &response.rows {
        bytes = heap_sum([
            bytes,
            crate::experience::encoded_body_bound(&row.payload)?,
            row.id
                .len()
                .checked_mul(3)
                .ok_or(ExecutionError::Capacity)?,
            row.parent.len(),
            row.slot.len(),
            row.extra.heap_bytes().ok_or(ExecutionError::Capacity)?,
            size_of::<TemporalUndo>() * 2,
        ])
        .ok_or(ExecutionError::Capacity)?;
    }
    let reservation = budget.reserve(bytes)?;
    let values = core
        .state
        .reception
        .received_values
        .as_ref()
        .ok_or_else(error)?;
    let meaning = core.state.installed.account_law();
    let mut pages = BTreeMap::new();
    let mut ids = IndexMap::new();
    let mut batches = IndexMap::new();
    for row in response.rows {
        let page = Arc::new(TemporalPageRecord::install(
            row,
            &request.actor_id,
            request.at,
            values,
            Some(&meaning),
        )?);
        if page.position() >= response.coverage.next_ordinal
            || ids
                .insert(page.row_id().to_owned(), page.position())
                .is_some()
        {
            return Err(error().into());
        }
        for batch in page.batches() {
            if batches
                .insert(
                    (batch.physical_life, batch.epoch.clone(), batch.batch_order),
                    Arc::clone(batch),
                )
                .is_some()
            {
                return Err(error().into());
            }
        }
        if pages.insert(page.position(), page).is_some() {
            return Err(error().into());
        }
    }
    let actor = core
        .state
        .temporal
        .actor(&request.actor_id)
        .ok_or_else(error)?;
    let mut known = 0usize;
    for page in actor.pages.values() {
        let found = ids
            .get(page.row_id())
            .and_then(|position| pages.get(position))
            .ok_or_else(error)?;
        if page.position() != found.position()
            || page.payload() != found.payload()
            || page.columns() != found.columns()
        {
            return Err(error().into());
        }
        known = known
            .checked_add(page.batches().count())
            .ok_or(ExecutionError::Capacity)?;
    }
    for page in &actor.pending_pages {
        let pending = page.batch();
        if batches
            .get(&(
                pending.physical_life,
                pending.epoch.clone(),
                pending.batch_order,
            ))
            .is_none_or(|batch| batch.as_ref() != pending.as_ref())
        {
            return Err(error().into());
        }
        known = known.checked_add(1).ok_or(ExecutionError::Capacity)?;
    }
    if actor.complete_pages && known != batches.len() {
        return Err(error().into());
    }
    let directories = pages
        .values()
        .map(|page| page.metadata().charge_directory.clone())
        .collect::<Vec<_>>();
    let recent = ReceivedRecentDirectory::install(
        &directories,
        actor.header.frontier.as_ref(),
        Some((actor.header.bytes, actor.header.count)),
    )?;
    if recent != actor.recent {
        return Err(error().into());
    }
    let temporal = &mut core.state.temporal;
    temporal
        .undo
        .try_reserve(2)
        .map_err(|_| ExecutionError::Capacity)?;
    temporal.undo.push(TemporalUndo::Reservation(reservation));
    let actor = temporal
        .actors
        .get_mut(&request.actor_id)
        .ok_or_else(error)?;
    temporal.undo.push(TemporalUndo::HydratedPages {
        actor_id: request.actor_id,
        before: std::mem::replace(&mut actor.pages, pages),
        pending: std::mem::take(&mut actor.pending_pages),
        complete: actor.complete_pages,
        next_ordinal: actor.page_order_upper_bound,
    });
    actor.complete_pages = true;
    actor.page_order_upper_bound = response.coverage.next_ordinal;
    // No SQL or save-prefix acknowledgement occurred. The host must keep the
    // actual packed projection/read cut alive, and transfer canonical resident
    // custody before discard_undo/accept; the candidate guard is not that proof.
    Ok(())
}
