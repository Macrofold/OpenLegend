//! A response keeps the actual accepted NPC read and its finite issued aliases.
//! Only the native context producer constructs this input. Public/model JSON
//! carries a ticket and a response, never these permission-bearing maps.
use super::*;
use crate::appraisals::AppraisalBindings;
use crate::attention::AttentionPresentation;
use crate::commands::PurposeBinding;
use crate::received::{CapturedTemporalReceipt, TemporalReceiptLocator};
use crate::reception::ObserverSubject;
use crate::simulation::{AcceptedActorRead, SimulationState};
use crate::text::JsText;
use serde::ser::SerializeStruct;
mod appraisals;
pub(crate) use appraisals::{AppraisalSelection, PreparedResponseAppraisals};
mod native;
pub(crate) use native::{ResponseConsumer, ResponseNativeGuard, ResponseValidityRoute};
mod creates;
pub(crate) use creates::{AppraisalCreatesAnswer, AppraisalCreatesRequest};
mod offers;
pub(crate) use offers::{ResponseAttemptCandidate, capture_attempt_candidates};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct WorkPlanIdentity {
    pub id: String,
    pub revision: u64,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ResponseWorkIdentity {
    pub generation: u64,
    pub life: u64,
    pub controller: String,
    pub action_id: Option<String>,
    pub plan: Option<WorkPlanIdentity>,
    pub suspended: Option<WorkPlanIdentity>,
}
impl ResponseWorkIdentity {
    pub(crate) fn capture(
        state: &SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<(Self, ByteReservation), ExecutionError> {
        let actor = state
            .physical
            .entities
            .get(actor)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let bytes = heap_sum([
            actor.controller.capacity(),
            actor
                .action
                .as_ref()
                .map_or(0, |action| action.id.capacity()),
            actor
                .agency
                .plan
                .as_ref()
                .map_or(0, |plan| plan.id.capacity()),
            actor
                .agency
                .suspended_plan()
                .map_or(0, |plan| plan.id.capacity()),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let plan = |plan: &crate::plans::ActorPlan| WorkPlanIdentity {
            id: plan.id.clone(),
            revision: plan.revision,
        };
        Ok((
            Self {
                generation: actor.plan_generation,
                life: actor.physical_life.unwrap_or(0),
                controller: actor.controller.clone(),
                action_id: actor.action.as_ref().map(|action| action.id.clone()),
                plan: actor.agency.plan.as_ref().map(plan),
                suspended: actor.agency.suspended_plan().map(plan),
            },
            storage,
        ))
    }
    pub(crate) fn current(&self, state: &SimulationState, id: &str) -> bool {
        let Some(actor) = state
            .physical
            .entities
            .get(id)
            .and_then(|entity| entity.actor.as_ref())
        else {
            return false;
        };
        self.generation == actor.plan_generation
            && self.life == actor.physical_life.unwrap_or(0)
            && self.controller == actor.controller
            && self.action_id.as_deref() == actor.action.as_ref().map(|action| action.id.as_str())
            && self
                .plan
                .as_ref()
                .map(|plan| (plan.id.as_str(), plan.revision))
                == actor
                    .agency
                    .plan
                    .as_ref()
                    .map(|plan| (plan.id.as_str(), plan.revision))
            && self
                .suspended
                .as_ref()
                .map(|plan| (plan.id.as_str(), plan.revision))
                == actor
                    .agency
                    .suspended_plan()
                    .map(|plan| (plan.id.as_str(), plan.revision))
    }
}

/// The trusted typed binder retains unsupported command families as immutable
/// offered data. The executor refuses that action component; deserializing a
/// response must never discard independent legitimate speech or interpretation.
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ResponseActionChoice {
    pub invocation: Option<crate::records::SqlCell>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub purpose: Option<PurposeBinding>,
    pub transition: crate::commands::WorkTransitionMode,
    pub expected_work: ResponseWorkIdentity,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ResponseAttemptBinding {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub operation_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub manifest_revision: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_episodes: Option<IndexMap<String, Option<String>>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fulfillment: Option<crate::records::SqlCell>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<crate::plans::ActionResolution>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub keep: Option<bool>,
    pub description: JsText,
    pub commands: Vec<crate::records::SqlCell>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResponseSemanticCause {
    pub key: String,
    pub qualitative_revision: String,
    pub severity: f64,
    pub generation: u64,
}
#[derive(Clone)]
pub(crate) struct ResponseSituation {
    pub privacy_revision: u64,
    pub attention_references: IndexMap<String, String>,
    pub retention_references: IndexMap<String, TemporalReceiptLocator>,
    pub receipt_details: IndexMap<String, std::sync::Arc<CapturedTemporalReceipt>>,
    /// Original current-cut or retained personal-source captures, each funded
    /// by the actual native owner retained with this ticket.
    pub observation_references: IndexMap<String, ResponseObservation>,
    pub current_references: IndexMap<String, usize>,
    pub presented: Vec<AttentionPresentation>,
    pub semantic_causes: Option<Vec<ResponseSemanticCause>>,
}
#[derive(Clone, PartialEq)]
pub(crate) enum ResponseObservation {
    Acquired(usize),
    Personal(std::sync::Arc<crate::reception::ObservationContribution>),
}
impl ResponseObservation {
    pub(super) fn observation<'a>(
        &'a self,
        cut: &'a crate::experience::EvidenceCut,
    ) -> Option<&'a crate::reception::ObservationContribution> {
        match self {
            Self::Acquired(index) => cut.acquired.get(*index).map(std::sync::Arc::as_ref),
            Self::Personal(original) => Some(original.as_ref()),
        }
    }
}
impl HeapBytes for ResponseObservation {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}
/// The original situation/history and refreshed current menu are separate real
/// reads in Source prepareDecision. Later unrelated cuts do not revoke either.
pub(crate) struct ResponseReads {
    pub original: std::sync::Arc<AcceptedActorRead>,
    pub current: std::sync::Arc<AcceptedActorRead>,
}
impl ResponseReads {
    pub(crate) fn validate(&self) -> bool {
        Self::compatible(&self.original, &self.current)
    }
    pub(crate) fn compatible(original: &AcceptedActorRead, current: &AcceptedActorRead) -> bool {
        matches!(
            original.purpose,
            crate::capture::ActorReadPurpose::NpcDecision
        ) && matches!(
            current.purpose,
            crate::capture::ActorReadPurpose::NpcDecision
        ) && original.perception.world_id == current.perception.world_id
            && original.perception.actor_id == current.perception.actor_id
            && original.perception.evidence.generation() == current.perception.evidence.generation()
            && original.perception.evidence.cut().observer
                == current.perception.evidence.cut().observer
            && original.perception.evidence.cut().privacy_revision
                == current.perception.evidence.cut().privacy_revision
            && original.perception.at <= current.perception.at
            && original.accepted_cut <= current.accepted_cut
    }
}
pub(crate) struct ResponseBindingInput {
    pub native: Option<ResponseNativeGuard>,
    pub reads: ResponseReads,
    pub actions: IndexMap<String, ResponseActionChoice>,
    pub entity_ids: Vec<String>,
    pub expected_plan: u64,
    pub attempt_bindings: Vec<ResponseAttemptBinding>,
    pub expected_encounters: Option<IndexMap<String, String>>,
    pub evidence_ids: Vec<String>,
    pub knowledge_references: IndexMap<String, ObserverSubject>,
    pub identity_references: IndexMap<String, ObserverSubject>,
    pub entity_leases: IndexMap<String, String>,
    pub situation: Option<ResponseSituation>,
    pub appraisal_bindings: Option<AppraisalBindings>,
}
pub(crate) struct ResponseBindings {
    pub(super) input: ResponseBindingInput,
    _reservation: ByteReservation,
}
impl ResponseBindings {
    pub(crate) fn native_guard(&self) -> Option<&ResponseNativeGuard> {
        self.input.native.as_ref()
    }
    pub(crate) fn current_read(&self) -> &AcceptedActorRead {
        &self.input.reads.current
    }
    pub(crate) fn evidence_ids(&self) -> &[String] {
        &self.input.evidence_ids
    }
    pub(crate) fn appraisal_bindings(&self) -> Option<&AppraisalBindings> {
        self.input.appraisal_bindings.as_ref()
    }
    pub(crate) fn remembered_note_subject(
        &self,
        subject: &crate::reception::ObserverSubject,
    ) -> bool {
        self.input
            .knowledge_references
            .values()
            .any(|known| known == subject)
    }
    pub(crate) fn reflection_encounter_current(
        &self,
        state: &SimulationState,
        subject: &crate::reception::ObserverSubject,
        note: bool,
    ) -> bool {
        let crate::reception::ObserverSubject::Entity { entity_id } = subject else {
            return true;
        };
        (note && self.remembered_note_subject(subject))
            || self
                .input
                .expected_encounters
                .as_ref()
                .is_none_or(|expected| {
                    expected.get(entity_id)
                        == state
                            .reception
                            .perception_episodes
                            .as_ref()
                            .and_then(|owners| owners.get(self.actor_id()))
                            .and_then(|episodes| episodes.get(entity_id))
                })
    }
    pub(crate) fn reflection_sources_current(
        &self,
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let read = &self.input.reads.current;
        Ok(self.input.situation.as_ref().is_none_or(|s| {
            s.privacy_revision
                == state
                    .experience
                    .actor(self.actor_id())
                    .map_or(0, |a| a.privacy.revision())
        }) && super::sources::receipt_details_current_state(state, self)?
            && self
                .input
                .native
                .as_ref()
                .map(|g| {
                    g.current(
                        state,
                        &self.input.reads.original,
                        read,
                        self.actor_id(),
                        budget,
                    )
                })
                .transpose()?
                .unwrap_or(false))
    }
    /// The caller funds allocation before constructing these maps, then moves
    /// their custody here. Existing read/source guards stay with their records.
    pub(crate) fn new(
        input: ResponseBindingInput,
        mut storage: ByteReservation,
    ) -> Result<Self, ExecutionError> {
        if !input.reads.validate() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        if let Some(situation) = &input.situation {
            let cut = input.reads.original.perception.evidence.cut();
            if situation.privacy_revision != cut.privacy_revision
                || situation.observation_references.values().any(|reference| {
                    reference
                        .observation(cut)
                        .is_none_or(|original| original.observer.actor_id != cut.observer.actor_id)
                })
                || situation
                    .current_references
                    .values()
                    .any(|index| *index >= cut.current.len())
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
        }
        let bytes = input.heap_bytes().ok_or(ExecutionError::Capacity)?;
        if storage.bytes() < bytes {
            return Err(ExecutionError::Capacity);
        }
        storage.resize(bytes)?;
        Ok(Self {
            input,
            _reservation: storage,
        })
    }
    pub(crate) fn actor_id(&self) -> &str {
        &self.input.reads.current.perception.actor_id
    }
    pub(crate) fn world_id(&self) -> &str {
        &self.input.reads.current.perception.world_id
    }
    pub(super) fn digest_view<'a>(
        &'a self,
        response: &'a ActorResponse,
        appraisals: Option<&'a AppraisalBindings>,
        attempts: &'a [ResponseAttemptBinding],
    ) -> ResponseDigestView<'a> {
        ResponseDigestView {
            bindings: self,
            response,
            appraisals,
            attempts,
        }
    }
}

pub(super) struct ResponseDigestView<'a> {
    bindings: &'a ResponseBindings,
    response: &'a ActorResponse,
    appraisals: Option<&'a AppraisalBindings>,
    attempts: &'a [ResponseAttemptBinding],
}
impl Serialize for ResponseDigestView<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let input = &self.bindings.input;
        let mut out = serializer.serialize_struct("ResponseDigest", 13)?;
        out.serialize_field("actorId", self.bindings.actor_id())?;
        out.serialize_field("response", self.response.value())?;
        out.serialize_field("actions", &input.actions)?;
        out.serialize_field("entityIds", &input.entity_ids)?;
        out.serialize_field("expectedPlan", &input.expected_plan)?;
        out.serialize_field("attemptBindings", self.attempts)?;
        if let Some(value) = &input.expected_encounters {
            out.serialize_field("expectedEncounters", value)?;
        }
        out.serialize_field("evidenceIds", &input.evidence_ids)?;
        out.serialize_field("knowledgeReferences", &input.knowledge_references)?;
        out.serialize_field("identityReferences", &input.identity_references)?;
        out.serialize_field("entityLeases", &input.entity_leases)?;
        if let Some(value) = &input.situation {
            out.serialize_field(
                "situationBinding",
                &SituationDigest {
                    situation: value,
                    cut: self.bindings.input.reads.original.perception.evidence.cut(),
                },
            )?;
        }
        if let Some(value) = self.appraisals {
            out.serialize_field("appraisalBindings", value)?;
        }
        out.end()
    }
}
struct SituationDigest<'a> {
    situation: &'a ResponseSituation,
    cut: &'a crate::experience::EvidenceCut,
}
impl Serialize for SituationDigest<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        struct Observations<'a>(&'a SituationDigest<'a>);
        impl Serialize for Observations<'_> {
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                use serde::ser::SerializeMap;
                let mut out = serializer
                    .serialize_map(Some(self.0.situation.observation_references.len()))?;
                for (key, reference) in &self.0.situation.observation_references {
                    let original = reference.observation(self.0.cut).ok_or_else(|| {
                        serde::ser::Error::custom("selected original is unavailable")
                    })?;
                    out.serialize_entry(key, &(&original.id, original.revision))?;
                }
                out.end()
            }
        }
        struct Currents<'a>(&'a SituationDigest<'a>);
        impl Serialize for Currents<'_> {
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                use serde::ser::SerializeMap;
                let mut out =
                    serializer.serialize_map(Some(self.0.situation.current_references.len()))?;
                for (key, index) in &self.0.situation.current_references {
                    let snapshot = &self.0.cut.current[*index];
                    out.serialize_entry(
                        key,
                        &(
                            &snapshot.confirmation,
                            snapshot.value_measured_from,
                            snapshot.value_measured_through,
                            snapshot.value_acquired_at,
                            &snapshot.value,
                        ),
                    )?;
                }
                out.end()
            }
        }
        let mut out = serializer.serialize_struct("SituationBinding", 7)?;
        out.serialize_field("privacyRevision", &self.situation.privacy_revision)?;
        out.serialize_field("attentionReferences", &self.situation.attention_references)?;
        out.serialize_field("retentionReferences", &self.situation.retention_references)?;
        out.serialize_field("observationReferences", &Observations(self))?;
        out.serialize_field("currentReferences", &Currents(self))?;
        out.serialize_field("presented", &self.situation.presented)?;
        if let Some(value) = &self.situation.semantic_causes {
            out.serialize_field("semanticCauses", value)?;
        }
        out.end()
    }
}

impl HeapBytes for WorkPlanIdentity {
    fn heap_bytes(&self) -> Option<usize> {
        self.id.heap_bytes()
    }
}
impl HeapBytes for ResponseWorkIdentity {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.controller.heap_bytes()?,
            self.action_id.heap_bytes()?,
            self.plan.heap_bytes()?,
            self.suspended.heap_bytes()?,
        ])
    }
}
impl HeapBytes for ResponseActionChoice {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.invocation.heap_bytes()?,
            self.purpose.heap_bytes()?,
            self.expected_work.heap_bytes()?,
        ])
    }
}
impl HeapBytes for ResponseAttemptBinding {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.operation_id.heap_bytes()?,
            self.target_episodes.heap_bytes()?,
            self.fulfillment.heap_bytes()?,
            self.resolution.heap_bytes()?,
            self.description.heap_bytes()?,
            self.commands.heap_bytes()?,
        ])
    }
}
impl HeapBytes for ResponseSemanticCause {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.key.heap_bytes()?,
            self.qualitative_revision.heap_bytes()?,
        ])
    }
}
impl HeapBytes for ResponseSituation {
    fn heap_bytes(&self) -> Option<usize> {
        let receipts = self.receipt_details.keys().try_fold(
            map_storage::<String, CapturedTemporalReceipt>(self.receipt_details.capacity())?,
            |n, key| n.checked_add(key.capacity()),
        )?;
        let presentations = self.presented.iter().try_fold(
            self.presented
                .capacity()
                .checked_mul(size_of::<AttentionPresentation>())?,
            |n, value| {
                heap_sum([
                    n,
                    value.key.heap_bytes()?,
                    value.description_revision.heap_bytes()?,
                    value.change_revision.heap_bytes()?,
                    value.point.heap_bytes()?,
                ])
            },
        )?;
        heap_sum([
            self.attention_references.heap_bytes()?,
            self.retention_references.heap_bytes()?,
            receipts,
            self.observation_references.heap_bytes()?,
            self.current_references.heap_bytes()?,
            presentations,
            self.semantic_causes.heap_bytes()?,
        ])
    }
}
impl HeapBytes for ResponseBindingInput {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            size_of::<ResponseBindings>()
                + 2 * size_of::<usize>()
                + std::mem::align_of::<ResponseBindings>()
                - 1,
            self.actions.heap_bytes()?,
            self.entity_ids.heap_bytes()?,
            self.attempt_bindings.heap_bytes()?,
            self.expected_encounters.heap_bytes()?,
            self.evidence_ids.heap_bytes()?,
            self.knowledge_references.heap_bytes()?,
            self.identity_references.heap_bytes()?,
            self.entity_leases.heap_bytes()?,
            self.situation.heap_bytes()?,
            self.appraisal_bindings.heap_bytes()?,
        ])
    }
}
