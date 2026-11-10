//! Only ordinals and their displayed spellings cross the formatter boundary.
//! Commands, subjects and proof stay with the two actual native captures.
use super::{NpcReferenceFacts, PreparedNpcCandidates, PreparedNpcSources};
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{CurrentBodyReadScope, ObserverSubject};
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
    Body {
        ordinal: usize,
    },
    BodySubject {
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
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcBindingSelection {
    pub validity: crate::response::ResponseValidityRoute,
    pub actions: Vec<NpcAliasOrdinal>,
    pub intents: Vec<NpcAliasOrdinal>,
    pub evidence: Vec<NpcPersonalEvidence>,
    pub entities: Vec<NpcEntityAlias>,
    pub identities: Vec<NpcSubjectAlias>,
    pub knowledge: Vec<NpcSubjectAlias>,
    pub observations: Vec<NpcAliasOrdinal>,
    pub current: Vec<NpcAliasOrdinal>,
    pub receipts: Vec<NpcReceiptAlias>,
    pub attention: Vec<NpcAliasOrdinal>,
    pub presented: Vec<usize>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub appraisals: Option<crate::response::AppraisalSelection>,
}

pub(crate) struct NpcBindingMaps {
    pub validity: crate::response::ResponseValidityRoute,
    pub actions: IndexMap<String, ResponseActionChoice>,
    pub entity_ids: Vec<String>,
    pub evidence_ids: Vec<String>,
    pub entity_references: IndexMap<String, String>,
    pub physical_references: IndexMap<String, String>,
    pub intention_references: IndexMap<String, String>,
    pub knowledge_references: IndexMap<String, ObserverSubject>,
    pub identity_references: IndexMap<String, ObserverSubject>,
    pub entity_leases: IndexMap<String, String>,
    pub expected_encounters: IndexMap<String, String>,
    pub situation: ResponseSituation,
    pub appraisals: Option<crate::response::PreparedResponseAppraisals>,
    pub storage: ByteReservation,
}

fn invalid() -> ExecutionError {
    ExecutionError::InvalidCheckpoint
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
    pub sources: &'a [PreparedNpcSources],
    pub candidates: &'a PreparedNpcCandidates,
    pub intent_ids: &'a [String],
}
impl NpcBindingRead<'_> {
    fn body(&self, ordinal: usize) -> Result<&super::CapturedBodyBinding, ExecutionError> {
        if !self
            .candidates
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
            NpcSubjectOrdinal::Body { ordinal } => self
                .body(ordinal)
                .ok()
                .and_then(|_| self.references.bodies.get(ordinal)?.subject.as_ref()),
            NpcSubjectOrdinal::BodySubject { ordinal, subject } => self
                .body(ordinal)
                .ok()
                .and_then(|_| self.references.bodies.get(ordinal)?.subjects.get(subject)),
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
            || !read.candidates.work.current(state, actor)
            || read
                .sources
                .iter()
                .any(|source| !source.scope.still_permitted(state))
        {
            return Err(invalid());
        }
        let count = selection
            .entities
            .len()
            .checked_add(1)
            .ok_or(ExecutionError::Capacity)?;
        let bytes = heap_sum([
            size_of::<Self>(),
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
                .and_then(|n| n.checked_mul(5))
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, ObserverSubject>(selection.identities.len())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, ObserverSubject>(selection.knowledge.len())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, usize>(selection.observations.len())
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
        let mut actions =
            IndexMap::with_capacity(selection.actions.len() + selection.intents.len());
        for selected in &selection.actions {
            let offer = read
                .candidates
                .offers()
                .get(selected.ordinal)
                .ok_or_else(invalid)?;
            let command = offer.command.as_ref();
            let text = command.map(|command| command.source_encoding());
            reserve(
                &mut storage,
                heap_sum([
                    selected.alias.len(),
                    read.candidates
                        .work
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                    command
                        .and_then(|c| c.envelope().chosen_purpose.as_ref())
                        .map_or(Some(0), HeapBytes::heap_bytes)
                        .ok_or(ExecutionError::Capacity)?,
                    text.map_or(0, str::len)
                        .checked_mul(12)
                        .ok_or(ExecutionError::Capacity)?,
                    (actor.len() + decision_id.len())
                        .checked_mul(8)
                        .ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?;
            let invocation = text
                .map(|text| -> Result<SqlCell, ExecutionError> {
                    let mut value: SqlCell = serde_json::from_str(text).map_err(|_| invalid())?;
                    let SqlCell::Object(object) = &mut value else {
                        return Err(invalid());
                    };
                    object.insert("actorId".into(), actor.into());
                    object.insert("id".into(), decision_id.into());
                    Ok(value)
                })
                .transpose()?;
            if actions.contains_key(&selected.alias) {
                return Err(invalid());
            }
            actions.insert(
                selected.alias.clone(),
                ResponseActionChoice {
                    invocation,
                    purpose: command.and_then(|command| command.envelope().chosen_purpose.clone()),
                    transition: offer.transition,
                    expected_work: read.candidates.work.clone(),
                },
            );
        }
        for selected in &selection.intents {
            let intent = read.intent_ids.get(selected.ordinal).ok_or_else(invalid)?;
            reserve(
                &mut storage,
                heap_sum([
                    selected.alias.len(),
                    read.candidates
                        .work
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                    (intent.len() + actor.len() + decision_id.len() + 128)
                        .checked_mul(8)
                        .ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut command = IndexMap::with_capacity(4);
            command.insert("type".into(), "withdraw-attempt".into());
            command.insert("id".into(), decision_id.into());
            command.insert("actorId".into(), actor.into());
            command.insert("attemptId".into(), intent.as_str().into());
            if actions
                .insert(
                    selected.alias.clone(),
                    ResponseActionChoice {
                        invocation: Some(SqlCell::Object(command)),
                        purpose: None,
                        transition: crate::commands::WorkTransitionMode::Continue,
                        expected_work: read.candidates.work.clone(),
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
        let mut expected_encounters = IndexMap::with_capacity(count);
        let body_scope = CurrentBodyReadScope::prepare(
            &state.reception,
            &state.physical.entities,
            &state.installed,
            &state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            actor,
        )?;
        for selected in &selection.entities {
            let (fact, physical, body_lease) = match selected.source {
                NpcEntityOrdinal::Myself => (&read.references.myself, true, None),
                NpcEntityOrdinal::Body { ordinal } => {
                    let body = read.body(ordinal)?;
                    if !body_scope
                        .as_ref()
                        .map(|scope| scope.native_body(&body.source_id))
                        .transpose()?
                        .flatten()
                        .is_some_and(|current| current.field.id == body.lease_id)
                    {
                        return Err(invalid());
                    }
                    (
                        &read
                            .references
                            .bodies
                            .get(ordinal)
                            .ok_or_else(invalid)?
                            .entity,
                        true,
                        Some(body.lease_id.as_str()),
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
                    (fact, false, None)
                }
                NpcEntityOrdinal::Knowledge { ordinal } => (
                    read.references
                        .knowledge
                        .get(ordinal)
                        .filter(|fact| fact.can_address_remembered)
                        .ok_or_else(invalid)?,
                    false,
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
            if let Some(episode) = state
                .reception
                .perception_episodes
                .as_ref()
                .and_then(|owners| owners.get(actor))
                .and_then(|episodes| episodes.get(id))
            {
                reserve(&mut storage, id.len() + episode.len())?;
                insert(&mut expected_encounters, id, episode.clone())?;
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
                if matches!(fact.subject, ObserverSubject::Individual { .. })
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
        for (selected, maximum, target) in [
            (
                &selection.observations,
                original.acquired.len(),
                &mut situation.observation_references,
            ),
            (
                &selection.current,
                original.current.len(),
                &mut situation.current_references,
            ),
        ] {
            for selected in selected {
                if selected.ordinal >= maximum {
                    return Err(invalid());
                }
                reserve(&mut storage, selected.alias.len())?;
                insert(target, &selected.alias, selected.ordinal)?;
            }
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
            })
            .transpose()?;
        storage.resize(
            heap_sum([
                size_of::<Self>(),
                actions.heap_bytes().ok_or(ExecutionError::Capacity)?,
                entity_ids.heap_bytes().ok_or(ExecutionError::Capacity)?,
                evidence_ids.heap_bytes().ok_or(ExecutionError::Capacity)?,
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
            validity: selection.validity,
            actions,
            entity_ids,
            evidence_ids,
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
