//! Event-time words and current routing permissions have distinct owners.
//! This read never replaces an earlier speaker label with a later known name.
use super::*;
use crate::host::retained_size::heap_sum;
use crate::reception::{CurrentBodyReadScope, ObserverSubject, ReferenceRole};
use crate::worlds::InstalledPersonalNameReader;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Contact {
    id: String,
    life: u64,
    lease_id: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RoleFacts {
    self_contact: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    actor_contact: Option<Contact>,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_communication_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_communication_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_contact: Option<Contact>,
    #[serde(skip)]
    _guard: ByteReservation,
}
pub(super) struct RoleReader<'a> {
    state: &'a SimulationState,
    actor: &'a str,
    names: InstalledPersonalNameReader<'a>,
    body: Option<CurrentBodyReadScope<'a>>,
}
impl<'a> RoleReader<'a> {
    pub fn prepare(state: &'a SimulationState, actor: &'a str) -> Result<Self, ExperienceError> {
        let names = InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )
        .map_err(|_| ExperienceError::Unavailable)?;
        let body = CurrentBodyReadScope::prepare(
            &state.reception,
            &state.physical.entities,
            &state.installed,
            &state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            actor,
        )
        .map_err(|_| ExperienceError::Unavailable)?;
        Ok(Self {
            state,
            actor,
            names,
            body,
        })
    }
    fn current(&self, id: &str) -> Result<Option<(&str, u64, &str)>, ExperienceError> {
        let Some(entity) = self.state.physical.entities.get(id) else {
            return Ok(None);
        };
        let Some(body) = self
            .body
            .as_ref()
            .map(|scope| scope.native_body(id))
            .transpose()
            .map_err(|_| ExperienceError::Unavailable)?
            .flatten()
        else {
            return Ok(None);
        };
        Ok(Some((
            &entity.id,
            entity
                .actor
                .as_ref()
                .and_then(|actor| actor.physical_life)
                .unwrap_or(0),
            &body.field.id,
        )))
    }
    pub fn capture(
        &self,
        evidence: &Evidence<'_>,
        budget: &ByteBudget,
    ) -> Result<RoleFacts, ExperienceError> {
        // The canonical source remains borrowed. Only these small routing
        // fields are decoded; speech words and acquired originals stay opaque.
        #[derive(Deserialize)]
        struct SpeechRole {
            #[serde(default)]
            addressee: Option<crate::reception::SpeechParticipant>,
        }
        let (source_id, target_id, source_subject, source_body, addressee, _parse_guard);
        let subject;
        let body;
        let source;
        let target;
        let speech;
        let facets;
        let pool_values = match evidence {
            Evidence::Temporal { values, .. } => values.as_ref(),
            _ => None,
        };
        match evidence {
            Evidence::Awareness(value) => {
                let bound = [
                    value.source_id,
                    value.target_id,
                    value.source_subject,
                    value.source_body,
                    value.speech,
                ]
                .into_iter()
                .flatten()
                .try_fold(0usize, |bytes, raw| {
                    bytes.checked_add(raw.get().len().checked_mul(32)?)
                })
                .ok_or_else(capacity)?;
                _parse_guard = budget.reserve(bound).map_err(|_| capacity())?;
                source = value
                    .source_id
                    .map(|raw| serde_json::from_str::<String>(raw.get()))
                    .transpose()
                    .map_err(|_| ExperienceError::InvalidBody("event source role"))?;
                target = value
                    .target_id
                    .map(|raw| serde_json::from_str::<String>(raw.get()))
                    .transpose()
                    .map_err(|_| ExperienceError::InvalidBody("event target role"))?;
                subject = value
                    .source_subject
                    .map(|raw| serde_json::from_str::<ObserverSubject>(raw.get()))
                    .transpose()
                    .map_err(|_| ExperienceError::InvalidBody("event subject role"))?;
                body = value
                    .source_body
                    .map(|raw| serde_json::from_str::<AwarenessSourceBody>(raw.get()))
                    .transpose()
                    .map_err(|_| ExperienceError::InvalidBody("event body role"))?;
                speech = value
                    .speech
                    .map(|raw| serde_json::from_str::<SpeechRole>(raw.get()))
                    .transpose()
                    .map_err(|_| ExperienceError::InvalidBody("event speech role"))?;
                source_id = source.as_deref();
                target_id = target.as_deref();
                source_subject = subject.as_ref();
                source_body = body.as_ref();
                addressee = speech
                    .as_ref()
                    .is_some_and(|speech| speech.addressee.is_some());
            }
            _ => {
                let count = match evidence {
                    Evidence::Temporal { members, .. } | Evidence::Current { members, .. } => {
                        members.len()
                    }
                    _ => unreachable!(),
                };
                _parse_guard = budget
                    .reserve(
                        count
                            .checked_mul(size_of::<&SensoryFacet>())
                            .ok_or_else(capacity)?,
                    )
                    .map_err(|_| capacity())?;
                let mut values = Vec::new();
                values.try_reserve_exact(count).map_err(|_| capacity())?;
                match evidence {
                    Evidence::Temporal {
                        receipt, members, ..
                    } => {
                        for &index in members {
                            if let Some(ReceivedValueFragment::Sensory(value)) =
                                pool_values.value_at(&receipt.facets[index].value_ref)
                            {
                                values.push(value);
                            } else {
                                return Err(ExperienceError::Unavailable);
                            }
                        }
                    }
                    Evidence::Current {
                        original, members, ..
                    } => {
                        for &index in members {
                            values.push(&original.observation().facets[index].value);
                        }
                    }
                    _ => unreachable!(),
                }
                facets = values;
                let Some(SensoryFacet::Event {
                    references,
                    source_subject: subject,
                    ..
                }) = facets
                    .iter()
                    .find(|value| matches!(value, SensoryFacet::Event { .. }))
                    .copied()
                else {
                    return Err(ExperienceError::Unavailable);
                };
                source_id = references
                    .iter()
                    .find(|reference| reference.role == ReferenceRole::Actor)
                    .map(|reference| reference.id.as_str());
                target_id = None;
                source_subject = subject.as_ref();
                source_body = None;
                addressee = false;
            }
        }
        let mut self_contact = false;
        let mut actor_contact = None;
        if let Some(body) = source_body {
            let physical = self
                .state
                .physical
                .entities
                .get(&body.entity_id)
                .and_then(|entity| entity.actor.as_ref())
                .and_then(|actor| actor.physical_life)
                .unwrap_or(0);
            if body.entity_id == self.actor && body.physical_life == physical {
                self_contact = true;
            } else if body.physical_life == physical {
                actor_contact = self
                    .current(&body.entity_id)?
                    .filter(|(_, _, lease)| body.lease_id.as_deref() == Some(*lease));
            }
        }
        let communication = source_subject
            .filter(|subject| matches!(subject, ObserverSubject::Individual { .. }))
            .and_then(|subject| self.names.observer_individual(subject))
            .filter(|identity| identity.seed_only != Some(true))
            .and_then(|identity| identity.canonical_id.as_deref())
            .filter(|id| *id != self.actor && Some(*id) == source_id);
        let target = target_id.filter(|id| {
            addressee && *id != self.actor && self.names.can_address_remembered_subject(id)
        });
        let target_contact = if let Some(id) = target {
            let association = self
                .names
                .current_body_association(id)
                .map_err(|_| ExperienceError::Unavailable)?;
            if association
                .and_then(|subject| self.names.observer_individual(subject))
                .and_then(|identity| identity.canonical_id.as_deref())
                == Some(id)
            {
                self.current(id)?
            } else {
                None
            }
        } else {
            None
        };
        let contact_bytes = |value: Option<(&str, u64, &str)>| {
            value.map_or(Some(0), |(id, _, lease)| id.len().checked_add(lease.len()))
        };
        let guard = budget
            .reserve(
                heap_sum([
                    contact_bytes(actor_contact).ok_or_else(capacity)?,
                    contact_bytes(target_contact).ok_or_else(capacity)?,
                    communication.map_or(0, str::len),
                    target.map_or(0, str::len),
                ])
                .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let contact = |value: (&str, u64, &str)| Contact {
            id: value.0.to_owned(),
            life: value.1,
            lease_id: value.2.to_owned(),
        };
        let result = RoleFacts {
            self_contact,
            actor_contact: actor_contact.map(contact),
            source_communication_id: communication.map(str::to_owned),
            target_communication_id: target.map(str::to_owned),
            target_contact: target_contact.map(contact),
            _guard: guard,
        };
        // String::to_owned allocates these exact slices; all retained clones
        // remain with the detached account's guard until JSON handoff finishes.
        Ok(result)
    }
}
