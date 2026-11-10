//! Only ordinals and their displayed spellings cross the formatter boundary.
//! Commands, subjects and proof stay with the two actual native captures.
use super::{NpcReferenceFacts, PreparedNpcCandidates, PreparedNpcSources};
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::ObserverSubject;
use crate::records::SqlCell;
use crate::response::{ResponseActionChoice, ResponseSituation};
use crate::simulation::{AcceptedActorRead, SimulationState};
use indexmap::IndexMap;
use serde::Deserialize;
use std::{mem::size_of, sync::Arc};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcAliasOrdinal {
    pub alias: String,
    pub ordinal: usize,
}
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum NpcCatalogueSource {
    Original,
    Current,
}
#[derive(Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum NpcBindingPurpose {
    Decision,
    Reflection,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcActionOrdinal {
    pub alias: String,
    pub ordinal: usize,
    pub source: NpcCatalogueSource,
}
mod actions;
pub(crate) use actions::prepare_ordinary_actions;
#[derive(Clone, Copy, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub(crate) enum NpcEntityOrdinal {
    Myself,
    Body {
        ordinal: usize,
    },
    ReceivedBody {
        ordinal: usize,
    },
    Personal {
        inventory: usize,
        ordinal: usize,
        entity: usize,
    },
    Knowledge {
        ordinal: usize,
    },
    Social {
        ordinal: usize,
    },
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct NpcEntityAlias {
    pub alias: String,
    pub source: NpcEntityOrdinal,
}
#[derive(Clone, Copy, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub(crate) enum NpcSubjectOrdinal {
    Myself,
    MindRecord {
        ordinal: usize,
    },
    Body {
        ordinal: usize,
    },
    /// An acquired entity identity already present in this body's metadata;
    /// it grants no current physical action or anonymous canonical identity.
    BodyEntity {
        ordinal: usize,
    },
    BodySubject {
        ordinal: usize,
        subject: usize,
    },
    ReceivedBody {
        ordinal: usize,
    },
    /// Historical interpretation can keep an acquired entity identity after
    /// contact loss. This ordinal grants neither a body lease nor communication.
    ReceivedBodyEntity {
        ordinal: usize,
    },
    ReceivedBodySubject {
        ordinal: usize,
        subject: usize,
    },
    Knowledge {
        ordinal: usize,
    },
    Personal {
        inventory: usize,
        ordinal: usize,
        subject: usize,
    },
    Social {
        ordinal: usize,
    },
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct NpcSubjectAlias {
    pub alias: String,
    pub source: NpcSubjectOrdinal,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct NpcReceiptAlias {
    pub alias: String,
    pub inventory: usize,
    pub ordinal: usize,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct NpcPersonalEvidence {
    pub inventory: usize,
    pub ordinal: usize,
}
#[derive(Clone, Copy, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct NpcPerspectiveOrdinal {
    pub snapshot: usize,
    pub entity: usize,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct NpcObservationAlias {
    pub alias: String,
    pub source: NpcObservationOrdinal,
}
#[derive(Clone, Copy, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub(crate) enum NpcObservationOrdinal {
    Acquired {
        ordinal: usize,
    },
    Personal {
        inventory: usize,
        ordinal: usize,
        observation: usize,
    },
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcBindingSelection {
    pub consumer: crate::response::ResponseConsumer,
    pub purpose: NpcBindingPurpose,
    pub validity: crate::response::ResponseValidityRoute,
    pub actions: Vec<NpcActionOrdinal>,
    pub prototype_source: NpcCatalogueSource,
    pub perspectives: Vec<NpcPerspectiveOrdinal>,
    pub semantic_causes: Vec<usize>,
    pub intents: Vec<NpcAliasOrdinal>,
    pub evidence: Vec<NpcPersonalEvidence>,
    pub entities: Vec<NpcEntityAlias>,
    pub identities: Vec<NpcSubjectAlias>,
    pub knowledge: Vec<NpcSubjectAlias>,
    pub observations: Vec<NpcObservationAlias>,
    pub current: Vec<NpcAliasOrdinal>,
    pub receipts: Vec<NpcReceiptAlias>,
    pub attention: Vec<NpcAliasOrdinal>,
    pub presented: Vec<usize>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub appraisals: Option<crate::response::AppraisalSelection>,
}

pub(crate) struct NpcBindingMaps {
    pub consumer: crate::response::ResponseConsumer,
    pub purpose: NpcBindingPurpose,
    pub validity: crate::response::ResponseValidityRoute,
    pub actions: IndexMap<String, ResponseActionChoice>,
    pub ordinary_aliases: Vec<String>,
    pub perspectives: Vec<NpcPerspectiveOrdinal>,
    pub entity_ids: Vec<String>,
    pub evidence_ids: Vec<String>,
    pub selected_personal: Vec<(usize, usize)>,
    pub entity_references: IndexMap<String, String>,
    pub physical_references: IndexMap<String, String>,
    pub intention_references: IndexMap<String, String>,
    pub knowledge_references: IndexMap<String, ObserverSubject>,
    pub identity_references: IndexMap<String, ObserverSubject>,
    pub entity_leases: IndexMap<String, String>,
    pub expected_encounters: IndexMap<String, String>,
    pub situation: ResponseSituation,
    pub appraisals: Option<Arc<crate::response::PreparedResponseAppraisals>>,
    pub storage: ByteReservation,
}

fn invalid() -> ExecutionError {
    ExecutionError::InvalidCheckpoint
}
/// A conversation keeps only the identity tuples that rendered its selected
/// turns/cache. Optional recall candidates do not widen this semantic fence.
pub(crate) fn npc_perspectives_current(
    state: &SimulationState,
    actor: &str,
    snapshots: &[super::NpcPerspectiveSnapshot],
    selected: &[NpcPerspectiveOrdinal],
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    if selected.is_empty() {
        return Ok(true);
    }
    let snapshot = |selected: &NpcPerspectiveOrdinal| snapshots.get(selected.snapshot);
    let ids = selected
        .iter()
        .map(|selected| snapshot(selected).and_then(|snapshot| snapshot.entity(selected.entity)));
    if ids.clone().any(|id| id.is_none()) {
        return Err(invalid());
    }
    let names = crate::worlds::InstalledPersonalNameReader::prepare(
        &state.physical,
        &state.reception,
        &state.installed,
        &state.experience,
        actor,
    )?;
    let current = names.capture_attribution_identities(ids.flatten(), budget)?;
    Ok(selected.iter().all(|selected| {
        snapshot(selected).is_some_and(|snapshot| snapshot.matches(selected.entity, &current))
    }))
}
fn reserve(storage: &mut ByteReservation, bytes: usize) -> Result<(), ExecutionError> {
    storage.resize(
        storage
            .bytes()
            .checked_add(bytes)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(())
}
fn insert<T: PartialEq>(
    map: &mut IndexMap<String, T>,
    key: &str,
    value: T,
) -> Result<(), ExecutionError> {
    if map.get(key).is_some_and(|old| old != &value) {
        return Err(invalid());
    }
    map.insert(key.to_owned(), value);
    Ok(())
}

pub(crate) struct NpcBindingRead<'a> {
    pub original: &'a AcceptedActorRead,
    pub current: &'a AcceptedActorRead,
    pub references: &'a NpcReferenceFacts,
    pub original_references: &'a NpcReferenceFacts,
    pub sources: &'a [PreparedNpcSources],
    pub perspectives: &'a [super::NpcPerspectiveSnapshot],
    pub candidates: Option<&'a PreparedNpcCandidates>,
    pub original_candidates: Option<&'a PreparedNpcCandidates>,
    pub intent_ids: &'a [String],
    pub invocation_id: &'a str,
}
impl NpcBindingRead<'_> {
    fn body(&self, ordinal: usize) -> Result<&super::CapturedBodyBinding, ExecutionError> {
        if !self
            .candidates
            .ok_or_else(invalid)?
            .selection()
            .body_ordinals()
            .contains(&ordinal)
        {
            return Err(invalid());
        }
        self.current
            .perception
            .bodies
            .get(ordinal)
            .ok_or_else(invalid)
    }
    fn subject(&self, source: &NpcSubjectOrdinal) -> Option<&super::npc_subject::NpcSubjectFact> {
        match *source {
            NpcSubjectOrdinal::Myself => Some(&self.references.myself),
            NpcSubjectOrdinal::MindRecord { ordinal } => {
                self.references.mind_subjects.get(ordinal)?.as_ref()
            }
            NpcSubjectOrdinal::Body { ordinal } => self
                .body(ordinal)
                .ok()
                .and_then(|_| self.references.bodies.get(ordinal)?.subject.as_ref()),
            NpcSubjectOrdinal::BodyEntity { ordinal } => {
                let fact = &self.references.bodies.get(ordinal)?.entity;
                (fact.identity_present && !fact.seed_only && fact.can_address_remembered)
                    .then_some(fact)
            }
            NpcSubjectOrdinal::BodySubject { ordinal, subject } => self
                .body(ordinal)
                .ok()
                .and_then(|_| self.references.bodies.get(ordinal)?.subjects.get(subject)),
            NpcSubjectOrdinal::ReceivedBody { ordinal } => {
                self.original.perception.bodies.get(ordinal).and_then(|_| {
                    self.original_references
                        .bodies
                        .get(ordinal)?
                        .subject
                        .as_ref()
                })
            }
            NpcSubjectOrdinal::ReceivedBodyEntity { ordinal } => {
                self.original.perception.bodies.get(ordinal)?;
                let fact = &self.original_references.bodies.get(ordinal)?.entity;
                (fact.identity_present && !fact.seed_only && fact.can_address_remembered)
                    .then_some(fact)
            }
            NpcSubjectOrdinal::ReceivedBodySubject { ordinal, subject } => {
                self.original.perception.bodies.get(ordinal).and_then(|_| {
                    self.original_references
                        .bodies
                        .get(ordinal)?
                        .subjects
                        .get(subject)
                })
            }
            NpcSubjectOrdinal::Knowledge { ordinal } => self.references.knowledge.get(ordinal),
            NpcSubjectOrdinal::Personal {
                inventory,
                ordinal,
                subject,
            } => self
                .sources
                .get(inventory)?
                .personal
                .get(ordinal)?
                .attribution
                .subject(subject),
            NpcSubjectOrdinal::Social { ordinal } => self.references.social.get(ordinal),
        }
    }
}

impl NpcBindingMaps {
    /// This is context preparation, before a model receives its ticket. Later
    /// application uses each captured semantic dependency, never a global cut.
    pub(crate) fn prepare(
        state: &SimulationState,
        read: NpcBindingRead<'_>,
        decision_id: &str,
        selection: &NpcBindingSelection,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let actor = read.current.perception.actor_id.as_str();
        let original = read.original.perception.evidence.cut();
        if !crate::response::ResponseReads::compatible(read.original, read.current)
            || state.generation != read.current.perception.evidence.generation()
            || state.physical.header.id != read.current.perception.world_id
            || read
                .sources
                .iter()
                .any(|source| !source.scope.still_permitted(state))
        {
            return Err(invalid());
        }
        if !read
            .original
            .native_validity
            .as_ref()
            .ok_or_else(invalid)?
            .required_outcomes_current(state, actor, budget)?
        {
            return Err(invalid());
        }
        if selection.consumer == crate::response::ResponseConsumer::Inspection
            || matches!(
                selection.validity,
                crate::response::ResponseValidityRoute::Source
            ) != (selection.purpose == NpcBindingPurpose::Reflection)
            || (selection.consumer == crate::response::ResponseConsumer::Reflection)
                != (selection.purpose == NpcBindingPurpose::Reflection)
            || selection.purpose == NpcBindingPurpose::Decision
                && (read.candidates.is_none() || read.original_candidates.is_none())
            || selection.appraisals.as_ref().is_some_and(|appraisals| {
                appraisals.reflection() != (selection.purpose == NpcBindingPurpose::Reflection)
            })
        {
            return Err(invalid());
        }
        let count = selection
            .entities
            .len()
            .checked_add(1)
            .ok_or(ExecutionError::Capacity)?;
        let encounter_count = count
            .checked_add(
                read.candidates
                    .map_or(0, |candidates| candidates.selection().body_ordinals().len()),
            )
            .ok_or(ExecutionError::Capacity)?;
        for selected in &selection.perspectives {
            if read
                .perspectives
                .get(selected.snapshot)
                .and_then(|snapshot| snapshot.entity(selected.entity))
                .is_none()
            {
                return Err(invalid());
            }
        }
        let bytes = heap_sum([
            size_of::<Self>(),
            selection
                .perspectives
                .len()
                .checked_mul(size_of::<NpcPerspectiveOrdinal>())
                .ok_or(ExecutionError::Capacity)?,
            actor.len(),
            count
                .checked_mul(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, ResponseActionChoice>(
                selection
                    .actions
                    .len()
                    .checked_add(selection.intents.len())
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, String>(count)
                .and_then(|n| n.checked_mul(4))
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, String>(encounter_count).ok_or(ExecutionError::Capacity)?,
            map_storage::<String, ObserverSubject>(selection.identities.len())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, ObserverSubject>(selection.knowledge.len())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, crate::response::ResponseObservation>(
                selection.observations.len(),
            )
            .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, usize>(selection.current.len())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, String>(selection.attention.len())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, crate::received::TemporalReceiptLocator>(
                selection.receipts.len(),
            )
            .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, Arc<crate::received::CapturedTemporalReceipt>>(
                selection.receipts.len(),
            )
            .ok_or(ExecutionError::Capacity)?,
            selection
                .presented
                .len()
                .checked_mul(size_of::<crate::attention::AttentionPresentation>())
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let selected_count = selection
            .evidence
            .len()
            .checked_add(selection.observations.len())
            .and_then(|n| {
                n.checked_add(selection.appraisals.as_ref().map_or(0, |appraisals| {
                    appraisals.sources.len() + usize::from(appraisals.trigger.is_some())
                }))
            })
            .ok_or(ExecutionError::Capacity)?;
        reserve(
            &mut storage,
            selected_count
                .checked_mul(size_of::<(usize, usize)>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut selected_personal = Vec::with_capacity(selected_count);
        for selected in selection
            .evidence
            .iter()
            .map(|selected| (selected.inventory, selected.ordinal))
            .chain(selection.appraisals.iter().flat_map(|appraisals| {
                appraisals
                    .sources
                    .iter()
                    .map(|selected| (selected.inventory, selected.ordinal))
            }))
            .chain(
                selection
                    .appraisals
                    .iter()
                    .filter_map(|appraisals| appraisals.trigger.as_ref())
                    .map(|selected| (selected.inventory, selected.ordinal)),
            )
        {
            if read
                .sources
                .get(selected.0)
                .and_then(|source| source.personal.get(selected.1))
                .is_none()
            {
                return Err(invalid());
            }
            if !selected_personal.contains(&selected) {
                selected_personal.push(selected);
            }
        }
        reserve(
            &mut storage,
            selection
                .evidence
                .len()
                .checked_mul(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut evidence_ids = Vec::with_capacity(selection.evidence.len());
        for selected in &selection.evidence {
            let record = read
                .sources
                .get(selected.inventory)
                .and_then(|source| source.personal.get(selected.ordinal))
                .ok_or_else(invalid)?;
            let id = &record.record.header().reference.id;
            reserve(&mut storage, id.len())?;
            if !evidence_ids.contains(id) {
                evidence_ids.push(id.clone());
            }
        }
        for source in selection
            .observations
            .iter()
            .filter_map(|selected| match selected.source {
                NpcObservationOrdinal::Personal {
                    inventory, ordinal, ..
                } => Some((inventory, ordinal)),
                _ => None,
            })
        {
            if !selected_personal.contains(&source) {
                selected_personal.push(source);
            }
        }
        let (mut actions, ordinary_aliases, action_storage) =
            if let (Some(original), Some(current)) = (read.original_candidates, read.candidates) {
                prepare_ordinary_actions(
                    original,
                    current,
                    &selection.actions,
                    actor,
                    read.invocation_id,
                    selection.intents.len(),
                    budget,
                )?
            } else {
                if !selection.actions.is_empty() || !selection.intents.is_empty() {
                    return Err(invalid());
                }
                (IndexMap::new(), Vec::new(), budget.reserve(0)?)
            };
        storage.merge(action_storage)?;
        for selected in &selection.intents {
            let candidates = read.candidates.ok_or_else(invalid)?;
            let intent = read.intent_ids.get(selected.ordinal).ok_or_else(invalid)?;
            reserve(
                &mut storage,
                heap_sum([
                    selected.alias.len(),
                    candidates
                        .work
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                    (intent.len() + actor.len() + read.invocation_id.len() + 128)
                        .checked_mul(8)
                        .ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut command = IndexMap::with_capacity(4);
            command.insert("type".into(), "withdraw-attempt".into());
            command.insert("id".into(), read.invocation_id.into());
            command.insert("actorId".into(), actor.into());
            command.insert("attemptId".into(), intent.as_str().into());
            if actions
                .insert(
                    selected.alias.clone(),
                    ResponseActionChoice {
                        invocation: Some(SqlCell::Object(command)),
                        purpose: None,
                        transition: crate::commands::WorkTransitionMode::Continue,
                        expected_work: candidates.work.clone(),
                    },
                )
                .is_some()
            {
                return Err(invalid());
            }
        }
        let mut entity_ids = Vec::with_capacity(count);
        let mut entity_references = IndexMap::with_capacity(count);
        let mut physical_references = IndexMap::with_capacity(count);
        let mut intention_references = IndexMap::with_capacity(count);
        let mut entity_leases = IndexMap::with_capacity(count);
        let mut expected_encounters = IndexMap::with_capacity(encounter_count);
        for &ordinal in read
            .candidates
            .map_or(&[][..], |candidates| candidates.selection().body_ordinals())
        {
            let body = read.body(ordinal)?;
            if let Some(episode) = &body.episode {
                reserve(&mut storage, body.source_id.len() + episode.len())?;
                insert(&mut expected_encounters, &body.source_id, episode.clone())?;
            }
        }
        for selected in &selection.entities {
            let (fact, physical, body_lease, episode) = match selected.source {
                NpcEntityOrdinal::Myself => (&read.references.myself, true, None, None),
                NpcEntityOrdinal::Body { ordinal } => {
                    let body = read.body(ordinal)?;
                    // The actual captured grant authorizes this alias. A later
                    // loss is checked by the action/lease owner, and cannot
                    // erase independent speech from the held response.
                    (
                        &read
                            .references
                            .bodies
                            .get(ordinal)
                            .ok_or_else(invalid)?
                            .entity,
                        true,
                        Some(body.lease_id.as_str()),
                        body.episode.as_ref(),
                    )
                }
                NpcEntityOrdinal::ReceivedBody { ordinal } => {
                    let body = read
                        .original
                        .perception
                        .bodies
                        .get(ordinal)
                        .ok_or_else(invalid)?;
                    (
                        &read
                            .original_references
                            .bodies
                            .get(ordinal)
                            .ok_or_else(invalid)?
                            .entity,
                        true,
                        None,
                        None,
                    )
                }
                NpcEntityOrdinal::Personal {
                    inventory,
                    ordinal,
                    entity,
                } => {
                    let (fact, bound) = read
                        .sources
                        .get(inventory)
                        .and_then(|source| source.personal.get(ordinal))
                        .and_then(|source| source.attribution.entity(entity))
                        .ok_or_else(invalid)?;
                    if !bound && !fact.can_address_remembered {
                        return Err(invalid());
                    }
                    (fact, false, None, None)
                }
                NpcEntityOrdinal::Knowledge { ordinal } => (
                    read.references
                        .knowledge
                        .get(ordinal)
                        .filter(|fact| fact.can_address_remembered)
                        .ok_or_else(invalid)?,
                    false,
                    None,
                    None,
                ),
                NpcEntityOrdinal::Social { ordinal } => (
                    read.references
                        .social
                        .get(ordinal)
                        .filter(|fact| fact.can_address_remembered)
                        .ok_or_else(invalid)?,
                    false,
                    None,
                    None,
                ),
            };
            let id = fact.canonical_id.as_deref().ok_or_else(invalid)?;
            reserve(
                &mut storage,
                (selected.alias.len() + id.len())
                    .checked_mul(5)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            insert(&mut entity_references, &selected.alias, id.to_owned())?;
            // Source binds Object.values(entityReferences), including distinct
            // aliases for the same person, in the formatter's issued order.
            if physical {
                insert(&mut physical_references, &selected.alias, id.to_owned())?;
            }
            if fact.can_address_remembered {
                insert(&mut intention_references, &selected.alias, id.to_owned())?;
            }
            if let Some(lease) = body_lease.filter(|_| id != actor) {
                reserve(&mut storage, id.len() + lease.len())?;
                insert(&mut entity_leases, id, lease.to_owned())?;
            }
            let episode = episode.or_else(|| {
                read.current
                    .perception
                    .bodies
                    .iter()
                    .find(|body| body.source_id == id)
                    .and_then(|body| body.episode.as_ref())
            });
            if let Some(episode) = episode {
                reserve(&mut storage, id.len() + episode.len())?;
                insert(&mut expected_encounters, id, episode.clone())?;
            }
        }
        // Situation-query expansion explicitly restores only these old frame
        // leases/episodes over the preserved final-current T2 binding.
        for ordinal in selection
            .entities
            .iter()
            .filter_map(|selected| match selected.source {
                NpcEntityOrdinal::ReceivedBody { ordinal } => Some(ordinal),
                _ => None,
            })
        {
            let body = read
                .original
                .perception
                .bodies
                .get(ordinal)
                .ok_or_else(invalid)?;
            reserve(&mut storage, body.source_id.len() + body.lease_id.len())?;
            entity_leases.insert(body.source_id.clone(), body.lease_id.clone());
            if let Some(episode) = &body.episode {
                reserve(&mut storage, body.source_id.len() + episode.len())?;
                expected_encounters.insert(body.source_id.clone(), episode.clone());
            }
        }
        entity_ids.extend(entity_references.values().cloned());
        let mut identity_references = IndexMap::with_capacity(selection.identities.len());
        let mut knowledge_references = IndexMap::with_capacity(selection.knowledge.len());
        for (selected, target, knowledge) in [
            (&selection.identities, &mut identity_references, false),
            (&selection.knowledge, &mut knowledge_references, true),
        ] {
            for selected in selected {
                let fact = read.subject(&selected.source).ok_or_else(invalid)?;
                let interpretation =
                    !knowledge && matches!(selected.source, NpcSubjectOrdinal::MindRecord { .. });
                if knowledge
                    && matches!(
                        selected.source,
                        NpcSubjectOrdinal::ReceivedBodyEntity { .. }
                    )
                    || !interpretation
                        && matches!(fact.subject, ObserverSubject::Individual { .. })
                        && (!fact.identity_present || fact.seed_only)
                    || knowledge
                        && matches!(fact.subject, ObserverSubject::Entity { .. })
                        && fact.canonical_id.as_deref() != Some(actor)
                        && !fact.current_communication
                {
                    return Err(invalid());
                }
                reserve(
                    &mut storage,
                    selected.alias.len()
                        + fact.subject.heap_bytes().ok_or(ExecutionError::Capacity)?,
                )?;
                insert(target, &selected.alias, fact.subject.clone())?;
            }
        }
        let mut situation = ResponseSituation {
            privacy_revision: original.privacy_revision,
            attention_references: IndexMap::with_capacity(selection.attention.len()),
            retention_references: IndexMap::with_capacity(selection.receipts.len()),
            receipt_details: IndexMap::with_capacity(selection.receipts.len()),
            observation_references: IndexMap::with_capacity(selection.observations.len()),
            current_references: IndexMap::with_capacity(selection.current.len()),
            presented: Vec::with_capacity(selection.presented.len()),
            semantic_causes: None,
        };
        for selected in &selection.observations {
            let reference = match selected.source {
                NpcObservationOrdinal::Acquired { ordinal }
                    if ordinal < original.acquired.len() =>
                {
                    crate::response::ResponseObservation::Acquired(ordinal)
                }
                NpcObservationOrdinal::Personal {
                    inventory,
                    ordinal,
                    observation,
                } => {
                    let original = read
                        .sources
                        .get(inventory)
                        .and_then(|sources| sources.personal.get(ordinal))
                        .and_then(|source| source.originals.observations().get(observation))
                        .ok_or_else(invalid)?;
                    crate::response::ResponseObservation::Personal(Arc::clone(original))
                }
                _ => return Err(invalid()),
            };
            reserve(&mut storage, selected.alias.len())?;
            insert(
                &mut situation.observation_references,
                &selected.alias,
                reference,
            )?;
        }
        for selected in &selection.current {
            if selected.ordinal >= original.current.len() {
                return Err(invalid());
            }
            reserve(&mut storage, selected.alias.len())?;
            insert(
                &mut situation.current_references,
                &selected.alias,
                selected.ordinal,
            )?;
        }
        for selected in &selection.receipts {
            let capture = &read
                .sources
                .get(selected.inventory)
                .and_then(|source| source.receipts.get(selected.ordinal))
                .ok_or_else(invalid)?
                .capture;
            reserve(
                &mut storage,
                2 * selected.alias.len()
                    + capture
                        .receipt()
                        .locator
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
            )?;
            insert(
                &mut situation.retention_references,
                &selected.alias,
                capture.receipt().locator.clone(),
            )?;
            if situation
                .receipt_details
                .insert(selected.alias.clone(), Arc::clone(capture))
                .is_some()
            {
                return Err(invalid());
            }
        }
        let presentations = read.original.perception.attention_presentations();
        for selected in &selection.attention {
            let presentation = presentations.get(selected.ordinal).ok_or_else(invalid)?;
            reserve(&mut storage, selected.alias.len() + presentation.key.len())?;
            insert(
                &mut situation.attention_references,
                &selected.alias,
                presentation.key.clone(),
            )?;
        }
        for ordinal in &selection.presented {
            let presentation = presentations.get(*ordinal).ok_or_else(invalid)?;
            reserve(
                &mut storage,
                heap_sum([
                    presentation
                        .key
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                    presentation
                        .description_revision
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                    presentation
                        .change_revision
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                    presentation
                        .point
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?;
            situation.presented.push(presentation.clone());
        }
        let appraisals = selection
            .appraisals
            .as_ref()
            .map(|selected| {
                crate::response::PreparedResponseAppraisals::prepare(
                    state,
                    read.current,
                    read.sources,
                    selected,
                    decision_id,
                    budget,
                )
                .and_then(crate::response::PreparedResponseAppraisals::into_shared)
            })
            .transpose()?;
        storage.resize(
            heap_sum([
                size_of::<Self>(),
                actions.heap_bytes().ok_or(ExecutionError::Capacity)?,
                ordinary_aliases
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                selection
                    .perspectives
                    .len()
                    .checked_mul(size_of::<NpcPerspectiveOrdinal>())
                    .ok_or(ExecutionError::Capacity)?,
                entity_ids.heap_bytes().ok_or(ExecutionError::Capacity)?,
                evidence_ids.heap_bytes().ok_or(ExecutionError::Capacity)?,
                selected_personal
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                entity_references
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                physical_references
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                intention_references
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                knowledge_references
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                identity_references
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                entity_leases.heap_bytes().ok_or(ExecutionError::Capacity)?,
                expected_encounters
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                situation.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            consumer: selection.consumer,
            purpose: selection.purpose,
            validity: selection.validity,
            actions,
            ordinary_aliases,
            perspectives: selection.perspectives.clone(),
            entity_ids,
            evidence_ids,
            selected_personal,
            entity_references,
            physical_references,
            intention_references,
            identity_references,
            knowledge_references,
            entity_leases,
            expected_encounters,
            situation,
            appraisals,
            storage,
        })
    }
}
