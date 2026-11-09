//! Current body metadata is paired with the genuine originating body ordinal.
//! Notepad/identity metadata does not grant a new physical or historical source.
use super::{
    npc_subject::{NpcSubjectFact, subject_fact},
    *,
};
use crate::reception::KnowledgeSubject;
use crate::simulation::AcceptedActorRead;

#[derive(Serialize)]
struct BodySubject {
    ordinal: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    subject: Option<NpcSubjectFact>,
    subjects: Vec<NpcSubjectFact>,
}
#[derive(Serialize)]
pub(crate) struct NpcReferenceFacts {
    myself: NpcSubjectFact,
    bodies: Vec<BodySubject>,
    knowledge: Vec<NpcSubjectFact>,
    #[serde(rename = "attributionIdentities")]
    attribution_identities: crate::worlds::CapturedAttributionIdentities,
    #[serde(skip)]
    _storage: ByteReservation,
}
impl NpcReferenceFacts {
    pub(crate) fn capture(
        state: &SimulationState,
        read: &AcceptedActorRead,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let actor = &read.perception.actor_id;
        let notes = state
            .reception
            .actor_knowledge
            .as_ref()
            .and_then(|owners| owners.get(actor));
        let count = notes.map_or(0, indexmap::IndexMap::len);
        let bytes = size_of::<Self>()
            .checked_add(
                read.perception
                    .bodies
                    .len()
                    .checked_mul(size_of::<BodySubject>() + 2 * size_of::<NpcSubjectFact>())
                    .ok_or(ExecutionError::Capacity)?,
            )
            .and_then(|n| n.checked_add(count.checked_mul(size_of::<NpcSubjectFact>())?))
            .and_then(|n| n.checked_add(actor.len()))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let names = InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )?;
        let myself = subject_fact(
            state,
            actor,
            &names,
            ObserverSubject::Entity {
                entity_id: actor.clone(),
            },
            budget,
        )?;
        let mut bodies = Vec::with_capacity(read.perception.bodies.len());
        for (ordinal, body) in read.perception.bodies.iter().enumerate() {
            let _copy =
                budget.reserve(body.subject.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            let subject = body
                .subject
                .clone()
                .map(|subject| subject_fact(state, actor, &names, subject, budget))
                .transpose()?;
            let (selected, _copy) = names.capture_current_body_subjects(&body.source_id, budget)?;
            let mut subjects = Vec::with_capacity(selected.iter().flatten().count());
            for selected in selected.into_iter().flatten() {
                subjects.push(subject_fact(state, actor, &names, selected, budget)?);
            }
            bodies.push(BodySubject {
                ordinal,
                subject,
                subjects,
            });
        }
        let mut knowledge = Vec::with_capacity(count);
        for note in notes.into_iter().flat_map(indexmap::IndexMap::values) {
            let _copy = budget.reserve(
                note.subject_id
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let subject = match &note.subject_id {
                Some(KnowledgeSubject::Entity { entity_id }) => ObserverSubject::Entity {
                    entity_id: entity_id.clone(),
                },
                Some(KnowledgeSubject::Individual { individual_id }) => {
                    ObserverSubject::Individual {
                        individual_id: individual_id.clone(),
                    }
                }
                // Map annotations have their separate read-only marker/place
                // product; they never become response identity edit handles.
                _ => continue,
            };
            knowledge.push(subject_fact(state, actor, &names, subject, budget)?);
        }
        let attribution_identities = names.capture_attribution_identities(
            read.perception
                .bodies
                .iter()
                .map(|body| body.source_id.as_str())
                .chain(std::iter::once(actor.as_str()))
                .chain(
                    knowledge
                        .iter()
                        .filter_map(|fact| fact.canonical_id.as_deref()),
                ),
            budget,
        )?;
        Ok(Self {
            myself,
            bodies,
            knowledge,
            attribution_identities,
            _storage: storage,
        })
    }
}
