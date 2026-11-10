//! Personal source attribution uses selected observer knowledge and the exact
//! event-time episode. Formatting receives these finite facts, never a world.
use super::*;
use crate::capture::npc_subject::{NpcSubjectFact, subject_fact};
use crate::reception::ObserverSubject;
use crate::worlds::InstalledPersonalNameReader;

#[derive(Deserialize)]
struct AssociationValue {
    kind: String,
    #[serde(default)]
    strength: Option<String>,
    #[serde(default)]
    subject: Option<ObserverSubject>,
}
#[derive(Deserialize)]
struct SubjectFacet {
    value: AssociationValue,
}
#[derive(Deserialize)]
struct SubjectObservation {
    facets: Vec<SubjectFacet>,
}
#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpeechSubject {
    #[serde(default)]
    source_subject: Option<ObserverSubject>,
}
#[derive(Default, Deserialize)]
struct Manifest {
    #[serde(default)]
    speech: Vec<SpeechSubject>,
    #[serde(default)]
    observations: Vec<SubjectObservation>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SourceAttribution {
    #[serde(default)]
    modality: Option<Box<serde_json::value::RawValue>>,
    #[serde(default)]
    source_subject: Option<ObserverSubject>,
    #[serde(default)]
    evidence: Option<SpeechSubject>,
    #[serde(default)]
    observation: Option<SubjectObservation>,
    #[serde(default)]
    observations: Vec<SubjectObservation>,
    #[serde(default)]
    manifest: Option<Manifest>,
    #[serde(default)]
    entity_ids: Vec<String>,
    #[serde(default)]
    source_id: Option<String>,
    #[serde(default)]
    target_id: Option<String>,
    #[serde(default)]
    entity_episodes: IndexMap<String, String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OccurrenceRole {
    role: &'static str,
    entity_id: String,
    myself: bool,
}
pub(crate) struct NpcSourceAttribution {
    subjects: Vec<NpcSubjectFact>,
    entity_subjects: Vec<NpcSubjectFact>,
    presentation_subjects: Vec<NpcSubjectFact>,
    permitted_entities: Vec<String>,
    bound_entity_ids: Vec<String>,
    occurrence_roles: Vec<OccurrenceRole>,
    names: crate::worlds::CapturedNames,
    identities: crate::worlds::CapturedAttributionIdentities,
    named_other: bool,
    reading_modality: Option<String>,
    reading_entities: Vec<String>,
    _storage: ByteReservation,
}
impl Serialize for NpcSourceAttribution {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Role<'a> {
            role: &'static str,
            entity_id: &'a str,
            myself: bool,
            name: &'a crate::state::Named,
        }
        struct Roles<'a>(&'a NpcSourceAttribution);
        impl Serialize for Roles<'_> {
            fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                let mut out = serializer.serialize_seq(Some(self.0.occurrence_roles.len()))?;
                for role in &self.0.occurrence_roles {
                    let name = self.0.names.get(&role.entity_id).ok_or_else(|| {
                        serde::ser::Error::custom("occurrence role name is unavailable")
                    })?;
                    out.serialize_element(&Role {
                        role: role.role,
                        entity_id: &role.entity_id,
                        myself: role.myself,
                        name,
                    })?;
                }
                out.end()
            }
        }
        let mut out = serializer.serialize_struct("Attribution", 8)?;
        out.serialize_field("subjects", &self.subjects)?;
        out.serialize_field("entitySubjects", &self.entity_subjects)?;
        out.serialize_field("presentationSubjects", &self.presentation_subjects)?;
        out.serialize_field("permittedEntities", &self.permitted_entities)?;
        out.serialize_field("boundEntityIds", &self.bound_entity_ids)?;
        out.serialize_field("occurrenceRoles", &Roles(self))?;
        out.serialize_field("namedOther", &self.named_other)?;
        out.serialize_field("attributionIdentities", &self.identities)?;
        out.end()
    }
}
impl NpcSourceAttribution {
    pub(crate) fn perspective_entity(&self, ordinal: usize) -> Option<&str> {
        self.identities.key(ordinal)
    }
    pub(crate) fn perspective_matches(
        &self,
        ordinal: usize,
        current: &crate::worlds::CapturedAttributionIdentities,
    ) -> bool {
        self.identities.matches_entry(ordinal, current)
    }
    pub(crate) fn appraisal_source(
        &self,
        record: &super::CapturedPersonalRecord,
        decision: &str,
        trigger: bool,
        budget: &ByteBudget,
    ) -> Result<(crate::appraisals::PerceivedCause, ByteReservation), ExecutionError> {
        let header = record.header();
        let source_kind = match header.reference.kind {
            PersonalSourceKind::Awareness => "awareness",
            PersonalSourceKind::Memory => "memory",
            PersonalSourceKind::Summary => "summary",
        };
        let coverage = match header.reference.kind {
            PersonalSourceKind::Awareness => self
                .reading_modality
                .as_deref()
                .ok_or(ExecutionError::InvalidCheckpoint)?,
            PersonalSourceKind::Memory => header
                .source
                .as_deref()
                .ok_or(ExecutionError::InvalidCheckpoint)?,
            PersonalSourceKind::Summary => "inferred",
        };
        let occurrence = header.event_id.as_deref().unwrap_or(&header.reference.id);
        let kind = if trigger && header.reference.kind == PersonalSourceKind::Awareness {
            "perceived-event"
        } else {
            "remembered"
        };
        let bytes = heap_sum([
            kind.len(),
            source_kind.len(),
            header.actor_id.len(),
            header.reference.id.len(),
            occurrence.len(),
            header.reference.revision.len(),
            coverage.len(),
            decision.len(),
            self.reading_entities
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        Ok((
            crate::appraisals::PerceivedCause {
                kind: kind.into(),
                actor_id: header.actor_id.clone(),
                source_id: header.reference.id.clone(),
                source_kind: source_kind.into(),
                occurrence_id: occurrence.to_owned(),
                source_version: header.reference.revision.clone(),
                coverage: coverage.to_owned(),
                subject_ids: self.reading_entities.clone(),
                recall_episode_id: Some(decision.to_owned()),
            },
            storage,
        ))
    }
    pub(crate) fn subject(&self, ordinal: usize) -> Option<&NpcSubjectFact> {
        self.subjects.get(ordinal)
    }
    pub(crate) fn entity(&self, ordinal: usize) -> Option<(&NpcSubjectFact, bool)> {
        let fact = self.entity_subjects.get(ordinal)?;
        let id = fact.canonical_id.as_deref()?;
        Some((fact, self.bound_entity_ids.iter().any(|bound| bound == id)))
    }
    pub(super) fn capture(
        state: &SimulationState,
        actor: &str,
        source: &super::CapturedPersonalRecord,
        names: &InstalledPersonalNameReader<'_>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let _decode = budget.reserve(crate::experience::encoded_body_bound(source.payload())?)?;
        let body: SourceAttribution = serde_json::from_str(source.payload())
            .map_err(|_| ExecutionError::InvalidCheckpoint)?;
        let presentation: crate::records::SqlCell = serde_json::from_str(source.payload())
            .map_err(|_| ExecutionError::InvalidCheckpoint)?;
        fn visit(
            value: &crate::records::SqlCell,
            callback: &mut impl FnMut(&str, bool) -> Result<(), ExecutionError>,
        ) -> Result<(), ExecutionError> {
            if let Some((id, individual)) =
                match value.get("kind").and_then(crate::records::SqlCell::as_str) {
                    Some("entity") => value
                        .get("entityId")
                        .and_then(crate::records::SqlCell::as_str)
                        .map(|id| (id, false)),
                    Some("individual") => value
                        .get("individualId")
                        .and_then(crate::records::SqlCell::as_str)
                        .map(|id| (id, true)),
                    _ => None,
                }
            {
                callback(id, individual)?;
            }
            for child in value
                .as_array()
                .into_iter()
                .flatten()
                .chain(value.object_values())
            {
                visit(child, callback)?;
            }
            Ok(())
        }
        let mut presentation_count = 0usize;
        visit(&presentation, &mut |_, _| {
            presentation_count = presentation_count
                .checked_add(1)
                .ok_or(ExecutionError::Capacity)?;
            Ok(())
        })?;
        let _presentation_backing = budget.reserve(
            presentation_count
                .checked_mul(size_of::<NpcSubjectFact>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut presentation_subjects = Vec::with_capacity(presentation_count);
        visit(&presentation, &mut |id, individual| {
            let _id = budget.reserve(id.len())?;
            let subject = if individual {
                ObserverSubject::Individual {
                    individual_id: id.to_owned(),
                }
            } else {
                ObserverSubject::Entity {
                    entity_id: id.to_owned(),
                }
            };
            presentation_subjects.push(subject_fact(state, actor, names, subject, budget)?);
            Ok(())
        })?;
        let awareness = source.header().reference.kind == PersonalSourceKind::Awareness;
        let manifest = body.manifest.unwrap_or_default();
        let count = manifest
            .speech
            .len()
            .checked_add(2)
            .and_then(|n| {
                n.checked_add(
                    body.observation
                        .iter()
                        .chain(&body.observations)
                        .chain(&manifest.observations)
                        .try_fold(0usize, |n, original| n.checked_add(original.facets.len()))?,
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        let mut bound = size_of::<Self>()
            .checked_add(
                count
                    .checked_mul(size_of::<NpcSubjectFact>())
                    .ok_or(ExecutionError::Capacity)?,
            )
            .and_then(|n| {
                n.checked_add(map_storage::<&str, ()>(
                    count.checked_add(body.entity_ids.len())?.checked_add(1)?,
                )?)
            })
            .and_then(|n| n.checked_add(2 * size_of::<OccurrenceRole>() + 2 * size_of::<&str>()))
            .ok_or(ExecutionError::Capacity)?;
        for id in body
            .entity_ids
            .iter()
            .chain(&body.source_id)
            .chain(&body.target_id)
            .chain(std::iter::once(
                &state
                    .physical
                    .entities
                    .get(actor)
                    .ok_or(ExecutionError::MissingActor)?
                    .id,
            ))
        {
            bound = bound
                .checked_add(id.len())
                .ok_or(ExecutionError::Capacity)?;
        }
        let storage = budget.reserve(bound)?;
        let mut subjects = Vec::with_capacity(count);
        let subject_inputs = body
            .source_subject
            .into_iter()
            .filter(|_| awareness)
            .chain(body.evidence.and_then(|evidence| evidence.source_subject))
            .chain(
                manifest
                    .speech
                    .into_iter()
                    .filter_map(|speech| speech.source_subject),
            )
            .chain(
                body.observation
                    .into_iter()
                    .chain(body.observations)
                    .chain(manifest.observations)
                    .flat_map(|observation| {
                        observation.facets.into_iter().filter_map(|facet| {
                            (facet.value.kind == "association"
                                && facet.value.strength.as_deref() == Some("supported"))
                            .then_some(facet.value.subject)
                            .flatten()
                        })
                    }),
            );
        let mut permitted = IndexSet::with_capacity(count + body.entity_ids.len() + 1);
        permitted.insert(actor);
        for subject in subject_inputs {
            subjects.push(subject_fact(state, actor, names, subject, budget)?);
        }
        for fact in &subjects {
            if let Some(id) = &fact.canonical_id {
                permitted.insert(id);
            }
        }
        let binds = |id: &str| {
            names.awareness_binds_subject(
                id,
                body.source_id.as_deref(),
                body.target_id.as_deref(),
                &body.entity_ids,
                body.entity_episodes.get(id).map(String::as_str),
            )
        };
        // Awareness role references have a narrower source-bound roster than
        // retained association subjects. Preserve the actual factory order.
        let bound_inputs = || {
            body.source_id
                .iter()
                .chain(&body.target_id)
                .chain(&body.entity_ids)
        };
        let bound_bytes = bound_inputs().try_fold(
            (body.entity_ids.len() + 2)
                .checked_mul(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
            |n, id| n.checked_add(id.len()).ok_or(ExecutionError::Capacity),
        )?;
        let bound_storage = budget.reserve(if awareness { bound_bytes } else { 0 })?;
        let mut bound_entity_ids = Vec::with_capacity(if awareness {
            body.entity_ids.len() + 2
        } else {
            0
        });
        if awareness {
            for id in bound_inputs() {
                if binds(id)? {
                    bound_entity_ids.push(id.clone());
                }
            }
            for id in &body.entity_ids {
                if binds(id)? {
                    permitted.insert(id);
                }
            }
        }
        let mut occurrence_roles = Vec::with_capacity(2);
        if awareness
            && source.header().event_type.as_deref()
                != Some(
                    state
                        .installed
                        .occurrence_rules
                        .value()
                        .speech_event
                        .as_str(),
                )
        {
            for (id, role) in [
                (body.source_id.as_deref(), "source"),
                (body.target_id.as_deref(), "subject"),
            ] {
                if let Some(id) = id.filter(|id| state.physical.entities.get(id).is_some()) {
                    if binds(id)? {
                        occurrence_roles.push(OccurrenceRole {
                            role,
                            entity_id: id.to_owned(),
                            myself: id == actor,
                        });
                    }
                }
            }
        }
        let named_other = permitted.iter().any(|id| {
            *id != actor
                && names.identity_for_entity(id).is_some_and(|identity| {
                    !identity.given_name.is_empty()
                        || identity
                            .nickname
                            .as_ref()
                            .is_some_and(|name| !name.is_empty())
                })
        });
        let mut role_ids = [""; 2];
        for (index, role) in occurrence_roles.iter().enumerate() {
            role_ids[index] = &role.entity_id;
        }
        // Conversation perspective also depends on empty identity lists for
        // source participants. These naming facts confer no entity permission.
        let identities = names.capture_attribution_identities(
            permitted
                .iter()
                .copied()
                .chain(body.entity_ids.iter().map(String::as_str)),
            budget,
        )?;
        let names_for_subjects = names;
        let names = names.capture_names(&role_ids[..occurrence_roles.len()], budget)?;
        let permitted_bytes = permitted
            .iter()
            .try_fold(0usize, |n, id| n.checked_add(id.len()))
            .and_then(|n| n.checked_add(permitted.len().checked_mul(size_of::<String>())?))
            .ok_or(ExecutionError::Capacity)?;
        let mut storage = storage;
        storage.merge(bound_storage)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(permitted_bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        storage.resize(
            storage
                .bytes()
                .checked_add(
                    permitted
                        .len()
                        .checked_mul(size_of::<NpcSubjectFact>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut entity_subjects = Vec::with_capacity(permitted.len());
        for id in &permitted {
            let _copy = budget.reserve(id.len())?;
            entity_subjects.push(subject_fact(
                state,
                actor,
                names_for_subjects,
                ObserverSubject::Entity {
                    entity_id: (*id).to_owned(),
                },
                budget,
            )?);
        }
        let permitted_entities = permitted.into_iter().map(str::to_owned).collect();
        let reading_modality = if awareness {
            let raw = body
                .modality
                .as_ref()
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            storage.resize(
                storage
                    .bytes()
                    .checked_add(
                        raw.get()
                            .len()
                            .checked_mul(4)
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            Some(
                serde_json::from_str::<String>(raw.get())
                    .map_err(|_| ExecutionError::InvalidCheckpoint)?,
            )
        } else {
            None
        };
        storage.resize(
            storage
                .bytes()
                .checked_add(
                    body.entity_ids
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            subjects,
            entity_subjects,
            permitted_entities,
            bound_entity_ids,
            occurrence_roles,
            names,
            identities,
            named_other,
            presentation_subjects,
            reading_modality,
            reading_entities: body.entity_ids,
            _storage: storage,
        })
    }
}
