//! Exact deterministic create identities need a scoped SQL negative lookup
//! when their canonical owner is cold. This does not hydrate or mutate it.
use super::*;
use crate::geometry::GeometryBinding;
use crate::records::InstalledRow;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AppraisalCreatesRequest {
    pub binding: GeometryBinding,
    pub world_id: String,
    pub generation: String,
    pub actor_id: String,
    pub ids: Vec<String>,
    maximum_transfer_bytes: usize,
    #[serde(skip)]
    storage: ByteReservation,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AppraisalCreatesAnswer {
    pub binding: GeometryBinding,
    rows: Vec<InstalledRow>,
    #[serde(skip)]
    _storage: Option<ByteReservation>,
}
impl AppraisalCreatesAnswer {
    pub(crate) fn decode(
        text: &str,
        budget: &ByteBudget,
    ) -> Result<Self, crate::simulation::DriveError> {
        use crate::simulation::DriveError;
        let shape = crate::encoding::JsonAllocationShape::read(text)?;
        let bytes = shape
            .array_items
            .checked_mul(4)
            .and_then(|n| {
                n.checked_mul(size_of::<InstalledRow>().max(size_of::<crate::records::SqlCell>()))
            })
            .and_then(|n| {
                n.checked_add(
                    shape
                        .members
                        .checked_mul(map_storage::<String, crate::records::SqlCell>(1)?)?,
                )
            })
            .and_then(|n| n.checked_add(text.len().checked_mul(12)?))
            .and_then(|n| {
                n.checked_add(
                    shape
                        .strings
                        .checked_mul(8 * size_of::<u16>() + 2 * size_of::<usize>())?,
                )
            })
            .ok_or(DriveError::Capacity)?;
        let storage = budget.reserve(bytes).map_err(|_| DriveError::Capacity)?;
        let mut value: Self =
            serde_json::from_str(text).map_err(|_| DriveError::MalformedResponse)?;
        value._storage = Some(storage);
        Ok(value)
    }
}
impl AppraisalCreatesRequest {
    pub(crate) fn prepare(
        state: &SimulationState,
        actor: &str,
        response: &ActorResponse,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let count = (0..response.len())
            .filter_map(|index| response.operation(index))
            .filter(|op| {
                op.kind == ResponseKind::Appraise
                    && op
                        .data
                        .get("kind")
                        .and_then(crate::records::SqlCell::as_str)
                        == Some("create")
            })
            .count();
        if count == 0 {
            return Ok(None);
        }
        let mut storage = budget.reserve(
            count
                .checked_mul(size_of::<String>() + 512)
                .and_then(|n| {
                    n.checked_add(
                        state.physical.header.id.len()
                            + state.generation.len()
                            + actor.len()
                            + size_of::<Self>(),
                    )
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut ids = Vec::with_capacity(count);
        for op in (0..response.len()).filter_map(|index| response.operation(index)) {
            if op.kind != ResponseKind::Appraise
                || op
                    .data
                    .get("kind")
                    .and_then(crate::records::SqlCell::as_str)
                    != Some("create")
            {
                continue;
            }
            let _decode = budget.reserve(
                op.data
                    .heap_bytes()
                    .and_then(|n| n.checked_mul(12))
                    .and_then(|n| n.checked_add(1024))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let pin: crate::values::DefinitionPin = super::super::actions::decode(
                op.data
                    .get("definitionPin")
                    .ok_or(ExecutionError::InvalidCheckpoint)?,
            )?;
            let source: crate::appraisals::PerceivedCause = super::super::actions::decode(
                op.data
                    .get("source")
                    .ok_or(ExecutionError::InvalidCheckpoint)?,
            )?;
            let definition = state
                .appraisals
                .definitions
                .get(&pin.id)
                .filter(|definition| definition.pin == pin)
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            let target = op
                .data
                .get("targetId")
                .filter(|target| !target.is_null())
                .and_then(crate::records::SqlCell::as_str);
            let _shape = budget.reserve(
                pin.heap_bytes()
                    .and_then(|n| n.checked_add(source.heap_bytes()?))
                    .and_then(|n| n.checked_mul(16))
                    .and_then(|n| n.checked_add(1024))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let (_, id) = crate::appraisals::creation_identity(
                actor,
                &pin,
                target,
                &source.occurrence_id,
                &definition.value.stacking,
            )?;
            storage.resize(
                storage
                    .bytes()
                    .checked_add(id.len())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            ids.push(id);
        }
        Ok(Some(Self {
            binding,
            world_id: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            actor_id: actor.into(),
            ids,
            maximum_transfer_bytes: budget.limit().saturating_sub(budget.used()),
            storage,
        }))
    }
    pub(crate) fn finish(
        self,
        state: &SimulationState,
        answer: AppraisalCreatesAnswer,
        bindings: &mut AppraisalBindings,
        budget: &ByteBudget,
    ) -> Result<ByteReservation, ExecutionError> {
        if answer.binding != self.binding {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let mut storage = self.storage;
        storage.resize(
            storage
                .bytes()
                .checked_add(
                    map_storage::<String, crate::appraisals::Appraisal>(answer.rows.len())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut outcomes = IndexMap::with_capacity(answer.rows.len());
        for row in answer.rows {
            let _decode = budget.reserve(crate::experience::encoded_body_bound(&row.payload)?)?;
            let value: crate::appraisals::Appraisal =
                serde_json::from_str(&row.payload).map_err(|_| ExecutionError::Invariant)?;
            if value.actor_id != self.actor_id
                || value.id != row.slot
                || !self.ids.contains(&value.id)
                || !row.extra.is_empty()
                || row.parent
                    != crate::encoding::json_record(&[
                        "world",
                        "appraisals",
                        self.actor_id.as_str(),
                    ])
                    .map_err(|_| ExecutionError::Invariant)?
                || row.id
                    != crate::encoding::json_record(&[
                        "world",
                        "appraisals",
                        self.actor_id.as_str(),
                        value.id.as_str(),
                    ])
                    .map_err(|_| ExecutionError::Invariant)?
                || state
                    .appraisals
                    .definitions
                    .get(&value.definition_pin.id)
                    .is_none_or(|definition| definition.pin != value.definition_pin)
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            storage.resize(
                storage
                    .bytes()
                    .checked_add(
                        value
                            .heap_bytes()
                            .and_then(|n| n.checked_add(value.id.len()))
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            if outcomes.insert(value.id.clone(), value).is_some() {
                return Err(ExecutionError::InvalidCheckpoint);
            }
        }
        bindings.complete_creates = Some(self.ids);
        bindings.prior_outcomes = Some(outcomes);
        Ok(storage)
    }
}
