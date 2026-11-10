//! One native request binds selected SQL witnesses to an originating NPC read.
use super::*;
use crate::execution::CoreMutation;
use crate::geometry::GeometryBinding;
use crate::host::CandidateKey;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NpcSourcesRequest {
    pub binding: GeometryBinding,
    origin: Arc<NpcHistoricalScope>,
    selection: NpcSourceSelection,
    maximum_transfer_bytes: usize,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SourceAnswer {
    binding: GeometryBinding,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    read_serial: u64,
    rows: NpcSourceRows,
}
pub(crate) struct NpcSourcesAnswer {
    value: SourceAnswer,
    _storage: ByteReservation,
}
impl NpcSourcesAnswer {
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.value.binding
    }
    pub(crate) fn decode(
        text: &str,
        budget: &ByteBudget,
    ) -> Result<Self, crate::simulation::DriveError> {
        use crate::simulation::DriveError;
        let shape = crate::encoding::JsonAllocationShape::read(text)?;
        let carrier = size_of::<InstalledRow>()
            .max(size_of::<NpcPersonalSourceRow>())
            .max(size_of::<crate::records::SqlCell>());
        let member =
            map_storage::<String, crate::records::SqlCell>(1).ok_or(DriveError::Capacity)?;
        let bytes = shape
            .array_items
            .checked_mul(4)
            .and_then(|n| n.checked_mul(carrier))
            .and_then(|n| n.checked_add(shape.members.checked_mul(member)?))
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
        let value = serde_json::from_str(text).map_err(|_| DriveError::MalformedResponse)?;
        Ok(Self {
            value,
            _storage: storage,
        })
    }
}
/// Recall may select a personal record acquired after the initial situation.
/// This is the actual Sources preparation cut; it never advances the older
/// temporal receipt prefix or turns personal sequence into a universal clock.
#[derive(Clone)]
pub(super) struct NpcPersonalScope {
    pub(super) at: f64,
    pub(super) identity_through: u64,
    pub(super) accepted_cut: u64,
    coverage: [Option<crate::experience::SourceCoverage>; 3],
}
impl NpcPersonalScope {
    fn capture(state: &SimulationState, actor: &str) -> Result<Self, ExecutionError> {
        let coverage = |kind| {
            state
                .experience
                .optional_collection(actor, kind)
                .map(|collection| collection.map(|collection| collection.coverage().clone()))
                .map_err(ExecutionError::from)
        };
        Ok(Self {
            at: state.physical.header.sim_time,
            identity_through: state.physical.identity.next_id(),
            accepted_cut: state.accepted_cut,
            coverage: [
                coverage(PersonalSourceKind::Awareness)?,
                coverage(PersonalSourceKind::Memory)?,
                coverage(PersonalSourceKind::Summary)?,
            ],
        })
    }
    pub(super) fn coverage(
        &self,
        kind: PersonalSourceKind,
    ) -> Option<&crate::experience::SourceCoverage> {
        self.coverage[match kind {
            PersonalSourceKind::Awareness => 0,
            PersonalSourceKind::Memory => 1,
            PersonalSourceKind::Summary => 2,
        }]
        .as_ref()
    }
}

pub(crate) struct NpcSourcesCursor {
    request: NpcSourcesRequest,
    personal_cut: NpcPersonalScope,
    _storage: ByteReservation,
    done: bool,
}
impl NpcSourcesCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        scope: Arc<NpcHistoricalScope>,
        selection: NpcSourceSelection,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !scope.still_permitted(core.state)
            || !scope.allows_selection(selection.receipts.is_empty())
            || selection.consolidation_job.as_ref().is_some_and(|job| {
                !scope.allows_consolidation() || !crate::values::is_safe_record_id(job)
            })
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let mut bytes = size_of::<Self>()
            .checked_add(
                selection
                    .consolidation_job
                    .as_ref()
                    .map_or(0, String::capacity),
            )
            .ok_or(ExecutionError::Capacity)?
            .checked_add(
                selection
                    .receipts
                    .capacity()
                    .checked_mul(size_of::<NpcReceiptSelection>())
                    .ok_or(ExecutionError::Capacity)?,
            )
            .and_then(|n| {
                n.checked_add(
                    selection
                        .personal
                        .capacity()
                        .checked_mul(size_of::<super::NpcPersonalSelection>())?,
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        for receipt in &selection.receipts {
            bytes = bytes
                .checked_add(receipt.locator.actor_id.capacity())
                .and_then(|n| n.checked_add(receipt.locator.epoch.capacity()))
                .and_then(|n| {
                    n.checked_add(receipt.member_indices.as_ref().map_or(Some(0), |members| {
                        members
                            .len()
                            .checked_mul(crate::host::retained_size::tree_node_bound::<u64, ()>()?)
                    })?)
                })
                .ok_or(ExecutionError::Capacity)?;
        }
        for source in &selection.personal {
            if !source.reference.validate()
                || source.through.as_ref().is_some_and(|parent| {
                    parent.kind != PersonalSourceKind::Summary || !parent.validate()
                })
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            bytes = bytes
                .checked_add(source.id.capacity())
                .and_then(|n| n.checked_add(source.revision.capacity()))
                .ok_or(ExecutionError::Capacity)?;
            if let Some(parent) = &source.through {
                bytes = bytes
                    .checked_add(parent.id.capacity())
                    .and_then(|n| n.checked_add(parent.revision.capacity()))
                    .ok_or(ExecutionError::Capacity)?;
            }
        }
        let storage = budget.reserve(bytes)?;
        let binding = GeometryBinding::new(
            candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let personal_cut = NpcPersonalScope::capture(core.state, &scope.actor_id)?;
        Ok(Self {
            personal_cut,
            request: NpcSourcesRequest {
                binding,
                origin: scope,
                selection,
                maximum_transfer_bytes: budget.limit().saturating_sub(budget.used()),
            },
            _storage: storage,
            done: false,
        })
    }
    pub(crate) fn request(&self) -> &NpcSourcesRequest {
        &self.request
    }
    pub(crate) fn complete(
        &mut self,
        core: &CoreMutation<'_>,
        answer: NpcSourcesAnswer,
        budget: &ByteBudget,
    ) -> Result<PreparedNpcSources, ExecutionError> {
        if self.done
            || answer.value.binding != self.request.binding
            || answer.value.read_serial != self.request.origin.read_serial
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let result = PreparedNpcSources::prepare(
            core.state,
            Arc::clone(&self.request.origin),
            self.personal_cut.clone(),
            &self.request.selection,
            answer.value.rows,
            budget,
        )?;
        self.done = true;
        Ok(result)
    }
}
