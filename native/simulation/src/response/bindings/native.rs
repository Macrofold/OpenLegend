//! Originating source custody survives the model wait. Rechecking uses the same
//! typed SQL witness admission as recall, at the current SQL/pending cut; it
//! never advances the original situation's temporal receipt prefix.
use super::*;
use crate::capture::{
    NpcHistoricalScope, NpcSourceSelection, NpcSourcesCursor, PreparedNpcSources,
};
use crate::execution::CoreMutation;
use crate::host::CandidateKey;
use std::sync::Arc;

#[derive(Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ResponseConsumer {
    Inspection,
    Chat,
    Thought,
    Reflection,
}
impl ResponseConsumer {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Inspection => "inspection",
            Self::Chat => "chat",
            Self::Thought => "thought",
            Self::Reflection => "reflection",
        }
    }
}

/// Chosen by the admitted director route at issuance, never by model output.
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ResponseValidityRoute {
    Decision,
    PreparedResponse,
    Source,
}

pub(crate) struct ResponseNativeGuard {
    pub(crate) consumer: ResponseConsumer,
    pub(crate) route: ResponseValidityRoute,
    pub(crate) scope: Arc<NpcHistoricalScope>,
    pub(crate) sources: Arc<Vec<PreparedNpcSources>>,
    /// Optional recall bodies are not proofs of the emitted request. Only its
    /// actual evidence/appraisal/trigger selections participate in this guard.
    pub(crate) selected_personal: Vec<(usize, usize)>,
    pub(crate) perspectives: Vec<crate::capture::NpcPerspectiveOrdinal>,
    pub(crate) perspective_snapshots: Arc<Vec<crate::capture::NpcPerspectiveSnapshot>>,
    pub(crate) appraisals: Option<Arc<PreparedResponseAppraisals>>,
    pub(crate) attempt_candidates: Arc<Vec<ResponseAttemptCandidate>>,
    pub(crate) _original_custody: Arc<ByteReservation>,
    pub(crate) _current_custody: Arc<ByteReservation>,
    pub(crate) _ticket_custody: Arc<ByteReservation>,
    pub(crate) _custody: ByteReservation,
}
impl ResponseNativeGuard {
    pub(crate) fn current(
        &self,
        state: &SimulationState,
        original: &AcceptedActorRead,
        read: &AcceptedActorRead,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        Ok(original
            .native_validity
            .as_ref()
            .ok_or(ExecutionError::InvalidCheckpoint)?
            .required_outcomes_current(state, actor, budget)?
            && crate::capture::npc_perspectives_current(
                state,
                actor,
                &self.perspective_snapshots,
                &self.perspectives,
                budget,
            )?
            && self.scope.still_permitted(state)
            && self
                .sources
                .iter()
                .all(|source| source.scope.still_permitted(state))
            && self
                .appraisals
                .as_ref()
                .map(|appraisals| appraisals.current(state, read, actor, budget))
                .transpose()?
                .unwrap_or(true))
    }
    pub(crate) fn source_cursor(
        &self,
        core: &mut CoreMutation<'_>,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Option<NpcSourcesCursor>, ExecutionError> {
        let count = self.selected_personal.len();
        if count == 0 {
            return Ok(None);
        }
        let bytes =
            self.selected_personal
                .iter()
                .map(|&(inventory, ordinal)| &self.sources[inventory].personal[ordinal])
                .try_fold(0usize, |n, source| {
                    n.checked_add(size_of::<crate::capture::NpcPersonalSelection>())?
                        .checked_add(source.record.header().reference.heap_bytes()?)
                        .and_then(|n| {
                            n.checked_add(
                                source.through.as_ref().map_or(Some(0), |parent| {
                                    parent.header().reference.heap_bytes()
                                })?,
                            )
                        })
                })
                .and_then(|n| {
                    n.checked_add(map_storage::<
                        (crate::experience::PersonalSourceKind, &str, &str),
                        (),
                    >(count)?)
                })
                .ok_or(ExecutionError::Capacity)?;
        if bytes == 0 {
            return Ok(None);
        }
        let _copy = budget.reserve(bytes)?;
        let mut selected = indexmap::IndexSet::with_capacity(count);
        let personal = self
            .selected_personal
            .iter()
            .map(|&(inventory, ordinal)| &self.sources[inventory].personal[ordinal])
            .filter(|source| {
                let source = &source.record.header().reference;
                selected.insert((source.kind, source.id.as_str(), source.revision.as_str()))
            })
            .map(|source| crate::capture::NpcPersonalSelection {
                reference: source.record.header().reference.clone(),
                through: source
                    .through
                    .as_ref()
                    .map(|parent| parent.header().reference.clone()),
            })
            .collect();
        Ok(Some(NpcSourcesCursor::new(
            core,
            Arc::clone(&self.scope),
            NpcSourceSelection {
                consolidation_job: None,
                personal,
                receipts: Vec::new(),
            },
            candidate,
            budget,
        )?))
    }
}
