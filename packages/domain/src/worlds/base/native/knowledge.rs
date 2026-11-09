//! Wilderness observer identity. Canonical routing remains private and separate
//! from an independently supported individual, familiarity and chosen names.

use crate::values::{deserialize_nullable, deserialize_present_option, deserialize_safe_integer};
use crate::worlds::base_recognition::{FamiliarityState, RecognitionKnowledge};
use serde::{Deserialize, Serialize};

#[path = "knowledge/communications.rs"]
mod communications;
pub(crate) use communications::{CommunicationSubject, RememberedCommunications};

#[path = "knowledge/introduction.rs"]
mod introduction;
pub(crate) use introduction::{HeardIntroductions, IntroductionWords};
#[path = "knowledge/name_support.rs"]
mod name_support;
pub(crate) use name_support::StoredNameSupport;
#[path = "knowledge/learn_introduction.rs"]
mod learn_introduction;
#[path = "knowledge/name_evidence.rs"]
mod name_evidence;
pub(crate) use learn_introduction::learn_heard_introductions;
#[path = "knowledge/assign_name.rs"]
mod assign_name;
#[path = "knowledge/body_individual.rs"]
mod body_individual;
pub(crate) use assign_name::{CompletedNameEdit, NameEdit, assign_subject_name};
pub(crate) use body_individual::{EnsuredBodyIndividual, ensure_body_individual};

fn retained_flag<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<bool>, D::Error> {
    if bool::deserialize(deserializer)? {
        Ok(Some(true))
    } else {
        Err(serde::de::Error::custom("Invalid retained identity flag."))
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObserverIdentity {
    #[serde(
        default,
        deserialize_with = "retained_flag",
        skip_serializing_if = "Option::is_none"
    )]
    pub retained: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub familiarity: Option<FamiliarityState>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub individual_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub canonical_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub seed_only: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub voice: Option<RecognitionKnowledge>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub sight: Option<RecognitionKnowledge>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub name_evidence_ids: Option<Vec<String>>,
    pub given_name: crate::text::JsText,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub nickname: Option<crate::text::JsText>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub encounter_id: Option<String>,
    pub authored: bool,
}

use crate::commands::SpeechTargetRole;
use crate::experience::ExperienceState;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use crate::reception::{CurrentBodyReadScope, ObserverLife, ObserverSubject, ReceptionState};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::{EntityStore, Named};
use indexmap::IndexMap;
use std::mem::size_of;

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonalNameRules {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub human_species: String,
    pub person_noun: String,
    pub unidentified: Named,
    pub unidentified_voice: String,
    pub unidentified_individual: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub given_name_characters: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub nickname_characters: u64,
}
impl crate::install::DefinitionIdentity for PersonalNameRules {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}
fn unavailable() -> ReceivedError {
    ReceivedError("Selected personal name or its required receiving family is unavailable.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Personal names exceed native byte allowance.")
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PersonalName<'a> {
    pub name: crate::text::TextRef<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name_form: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub indefinite_article: Option<&'a str>,
}
impl<'a> From<&'a Named> for PersonalName<'a> {
    fn from(name: &'a Named) -> Self {
        Self {
            name: (&name.name).into(),
            name_form: name.name_form.as_deref(),
            indefinite_article: name.indefinite_article.as_deref(),
        }
    }
}
impl PersonalName<'_> {
    fn heap_bound(self) -> Result<usize, ReceivedError> {
        heap_sum([
            self.name.storage_bytes(),
            self.name_form.map_or(0, str::len),
            self.indefinite_article.map_or(0, str::len),
        ])
        .ok_or_else(capacity)
    }
    fn owned(self) -> Named {
        Named {
            name: self.name.to_owned(),
            name_form: self.name_form.map(str::to_owned),
            indefinite_article: self.indefinite_article.map(str::to_owned),
        }
    }
}
pub(crate) struct OwnedPersonalName {
    name: Named,
    _reservation: ByteReservation,
}
impl OwnedPersonalName {
    pub(crate) fn name(&self) -> &Named {
        &self.name
    }
}
/// A sealed finite product from the actual selected personal-name owner. It
/// retains no physical world, identity map or later name lookup callback.
pub(crate) struct CapturedNames {
    observer: ObserverLife,
    names: IndexMap<String, Named>,
    _reservation: ByteReservation,
}
impl CapturedNames {
    pub(crate) fn observer(&self) -> &ObserverLife {
        &self.observer
    }
    pub(crate) fn get(&self, id: &str) -> Option<&Named> {
        self.names.get(id)
    }
    pub(crate) fn render_narration(
        &self,
        narration: &crate::narration::Narration,
        person: crate::narration::GrammaticalPerson,
    ) -> Result<crate::text::JsText, ReceivedError> {
        if narration.parts.iter().any(|part| match part {
            crate::narration::NarrationPart::Literal(_) => false,
            crate::narration::NarrationPart::Participant { entity_id, .. } => {
                !self.names.contains_key(entity_id)
            }
            crate::narration::NarrationPart::Verb { subject_id, .. } => {
                !self.names.contains_key(subject_id)
            }
        }) {
            return Err(unavailable());
        }
        Ok(crate::narration::render_narration_parts(
            narration,
            &self.names,
            Some(&self.observer.actor_id),
            person,
        ))
    }
}
/// Source identityForEntity selects authored/current-episode evidence in actual
/// JavaScript enumeration order. It does not read current physical visibility.
fn identity_for_entity<'a>(
    reception: &'a ReceptionState,
    observer_id: &str,
    id: &str,
) -> Option<&'a ObserverIdentity> {
    let identities = reception.observer_identities.as_ref()?.get(observer_id)?;
    let episode = reception
        .perception_episodes
        .as_ref()
        .and_then(|owners| owners.get(observer_id))
        .and_then(|episodes| episodes.get(id));
    let mut first = None;
    let mut preferred = None;
    for (at, (key, identity)) in identities.iter().enumerate() {
        if identity.seed_only == Some(true) || identity.canonical_id.as_deref() != Some(id) {
            continue;
        }
        let rank =
            crate::encoding::array_index(key).map_or((1, at as u64), |index| (0, u64::from(index)));
        if first.as_ref().is_none_or(|(old, _)| rank < *old) {
            first = Some((rank, identity));
        }
        if identity.authored
            || identity
                .encounter_id
                .as_ref()
                .is_some_and(|encounter| !encounter.is_empty() && Some(encounter) == episode)
        {
            if preferred.as_ref().is_none_or(|(old, _)| rank < *old) {
                preferred = Some((rank, identity));
            }
        }
    }
    preferred.or(first).map(|(_, identity)| identity)
}

/// A captured anonymous episode and an authored identity have distinct validity.
/// Recognition or visibility alone never upgrades an old executable reference.
pub(crate) fn subject_reference_current(
    reception: &ReceptionState,
    observer_id: &str,
    subject_id: &str,
    expected: Option<&Option<String>>,
) -> bool {
    observer_id == subject_id
        || identity_for_entity(reception, observer_id, subject_id)
            .is_some_and(|identity| identity.authored)
        || expected.is_some_and(|expected| {
            expected.as_ref()
                == reception
                    .perception_episodes
                    .as_ref()
                    .and_then(|owners| owners.get(observer_id))
                    .and_then(|episodes| episodes.get(subject_id))
        })
}

pub(crate) struct PersonalNameReader<'a> {
    observer_id: &'a str,
    reception: &'a ReceptionState,
    entities: &'a EntityStore,
    rules: &'a PersonalNameRules,
    scope: Option<CurrentBodyReadScope<'a>>,
}
impl<'a> PersonalNameReader<'a> {
    pub(crate) fn prepare(
        physical: &'a PhysicalState,
        reception: &'a ReceptionState,
        installed: &'a InstalledWorld,
        experience: &'a ExperienceState,
        observer_id: &'a str,
    ) -> Result<Self, ReceivedError> {
        let rules = installed.name_rules.value();
        Ok(Self {
            observer_id,
            reception,
            entities: &physical.entities,
            rules,
            scope: CurrentBodyReadScope::prepare(
                reception,
                &physical.entities,
                installed,
                experience,
                &crate::worlds::base_recognition::WildernessEvidenceMeaning,
                observer_id,
            )?,
        })
    }
    fn identities(&self) -> Option<&'a IndexMap<String, ObserverIdentity>> {
        self.reception
            .observer_identities
            .as_ref()
            .and_then(|owners| owners.get(self.observer_id))
            .map(|identities| &**identities)
    }
    fn episode(&self, id: &str) -> Option<&'a String> {
        self.reception
            .perception_episodes
            .as_ref()
            .and_then(|owners| owners.get(self.observer_id))
            .and_then(|episodes| episodes.get(id))
    }
    fn identity_for_entity(&self, id: &str) -> Option<&'a ObserverIdentity> {
        identity_for_entity(self.reception, self.observer_id, id)
    }
    pub(crate) fn observer_individual(
        &self,
        subject: &ObserverSubject,
    ) -> Option<&'a ObserverIdentity> {
        match subject {
            ObserverSubject::Individual { individual_id } => self
                .identities()
                .and_then(|identities| identities.get(individual_id)),
            ObserverSubject::Entity { entity_id } => self.identity_for_entity(entity_id),
        }
    }
    /// Personal labels use this observer's own naming evidence. Entity fallback
    /// reads the admitted body name; it never exposes a hidden authored name.
    pub(crate) fn subject_label(
        &self,
        subject: &ObserverSubject,
    ) -> Result<crate::text::TextRef<'_>, ReceivedError> {
        let identity = self.observer_individual(subject);
        if let Some(name) = identity.and_then(|identity| {
            identity
                .nickname
                .as_ref()
                .filter(|name| !name.is_empty())
                .or_else(|| (!identity.given_name.is_empty()).then_some(&identity.given_name))
        }) {
            return Ok(name.into());
        }
        match subject {
            ObserverSubject::Entity { entity_id } => Ok(self.observer_name(entity_id)?.name),
            ObserverSubject::Individual { .. } => Ok(if identity
                .is_some_and(|identity| identity.voice.is_some())
            {
                self.rules.unidentified_voice.as_str()
            } else {
                self.rules.unidentified_individual.as_str()
            }
            .into()),
        }
    }
    pub(crate) fn current_body_local_subject(
        &self,
        id: &str,
    ) -> Result<Option<&ObserverSubject>, ReceivedError> {
        match &self.scope {
            Some(scope) => scope.local_subject(id),
            None => Ok(None),
        }
    }
    pub(crate) fn current_body_association(
        &self,
        id: &str,
    ) -> Result<Option<&ObserverSubject>, ReceivedError> {
        match &self.scope {
            Some(scope) => scope.association(id),
            None => Ok(None),
        }
    }
    pub(crate) fn current_body_identity(
        &self,
        id: &str,
    ) -> Result<Option<&'a ObserverIdentity>, ReceivedError> {
        let local = self
            .current_body_local_subject(id)?
            .and_then(|subject| self.observer_individual(subject));
        if local.is_some_and(named) {
            return Ok(local);
        }
        if let Some(association) = self.current_body_association(id)? {
            return Ok(self.observer_individual(association));
        }
        if local.is_some() {
            return Ok(local);
        }
        let Some(episode) = self.episode(id).filter(|episode| !episode.is_empty()) else {
            return Ok(None);
        };
        if self.current_body_grant(id)?.is_none() {
            return Ok(None);
        }
        Ok(self.identities().and_then(|identities| {
            identities
                .iter()
                .enumerate()
                .filter(|(_, (_, identity))| {
                    identity.seed_only != Some(true)
                        && !identity.authored
                        && identity.encounter_id.as_ref() == Some(episode)
                })
                .min_by_key(|(at, (key, _))| {
                    crate::encoding::array_index(key)
                        .map_or((1, *at as u64), |index| (0, u64::from(index)))
                })
                .map(|(_, (_, identity))| identity)
        }))
    }
    pub(crate) fn current_body_grant(
        &self,
        id: &str,
    ) -> Result<Option<(&str, Option<u64>)>, ReceivedError> {
        Ok(match &self.scope {
            Some(scope) => scope
                .native_body(id)?
                .map(|body| (body.field.id.as_str(), body.grant.subject_physical_life)),
            None => None,
        })
    }
    pub(crate) fn current_body_subject(
        &self,
        id: &str,
    ) -> Result<Option<ObserverSubject>, ReceivedError> {
        let local = self.current_body_local_subject(id)?;
        let association = self.current_body_association(id)?;
        if let Some(local) = local {
            let annotated = self.observer_individual(local).is_some_and(named)
                || self
                    .reception
                    .actor_knowledge
                    .as_ref()
                    .and_then(|owners| owners.get(self.observer_id))
                    .is_some_and(|documents| {
                        let (kind, id) = match local {
                            ObserverSubject::Entity { entity_id } => ("entity", entity_id),
                            ObserverSubject::Individual { individual_id } => {
                                ("individual", individual_id)
                            }
                        };
                        crate::encoding::json_record(&(kind, id))
                            .ok()
                            .and_then(|key| documents.get(&format!("subject:{key}")))
                            .is_some_and(|document| !document.text.trim_is_empty())
                    });
            if annotated {
                return Ok(Some(local.clone()));
            }
            return Ok(Some(association.unwrap_or(local).clone()));
        }
        if let Some(association) = association {
            return Ok(Some(association.clone()));
        }
        Ok(self
            .current_body_identity(id)?
            .and_then(|identity| identity.individual_id.as_ref())
            .map(|id| ObserverSubject::Individual {
                individual_id: id.clone(),
            }))
    }
    pub(crate) fn recognizes_subject(&self, id: &str) -> Result<bool, ReceivedError> {
        Ok(self.observer_id == id || self.current_body_identity(id)?.is_some())
    }
    pub(crate) fn can_address_remembered_subject(&self, id: &str) -> bool {
        self.entities
            .get(id)
            .is_some_and(|entity| entity.actor.is_some())
            && (self.observer_id == id
                || self.identities().is_some_and(|identities| {
                    identities.values().any(|identity| {
                        identity.seed_only != Some(true)
                            && identity.canonical_id.as_deref() == Some(id)
                            && identity
                                .individual_id
                                .as_ref()
                                .is_some_and(|individual| !individual.is_empty())
                    })
                }))
    }
    pub(crate) fn can_remember_subject(&self, id: &str) -> Result<bool, ReceivedError> {
        if self
            .entities
            .get(id)
            .is_some_and(|entity| entity.actor.is_some())
        {
            return Ok(self.can_address_remembered_subject(id)
                || self
                    .current_body_association(id)?
                    .and_then(|subject| self.observer_individual(subject))
                    .and_then(|identity| identity.canonical_id.as_deref())
                    == Some(id));
        }
        Ok(self.current_body_grant(id)?.is_some())
    }
    pub(crate) fn outward_body_name(
        &self,
        id: &str,
        sight: &crate::reception::SightResults,
    ) -> Result<Option<PersonalName<'_>>, ReceivedError> {
        let life = self
            .entities
            .get(self.observer_id)
            .and_then(|entity| entity.actor.as_ref())
            .map(|actor| actor.physical_life.unwrap_or(0))
            .ok_or_else(unavailable)?;
        if sight.observer().actor_id != self.observer_id || sight.observer().physical_life != life {
            return Err(unavailable());
        }
        if sight.seen(id) != Some(true) {
            return Ok(None);
        }
        let entity = self.entities.get(id).ok_or_else(unavailable)?;
        let name = if let Some(actor) = &entity.actor {
            let species = actor
                .species
                .as_deref()
                .filter(|species| !species.is_empty());
            PersonalName {
                name: species
                    .filter(|species| *species != self.rules.human_species)
                    .unwrap_or(&self.rules.person_noun)
                    .into(),
                name_form: Some("count"),
                indefinite_article: None,
            }
        } else {
            PersonalName {
                name: (&entity.name).into(),
                name_form: entity.name_form.as_deref(),
                indefinite_article: entity.indefinite_article.as_deref(),
            }
        };
        Ok(Some(name))
    }
    pub(crate) fn observer_name(&self, id: &str) -> Result<PersonalName<'_>, ReceivedError> {
        let known = if self.observer_id == id {
            self.entities.get(id).map(|entity| &entity.name)
        } else {
            self.current_body_identity(id)?.and_then(|identity| {
                identity
                    .nickname
                    .as_ref()
                    .filter(|name| !name.is_empty())
                    .or_else(|| (!identity.given_name.is_empty()).then_some(&identity.given_name))
            })
        };
        if let Some(name) = known.filter(|name| !name.is_empty()) {
            return Ok(PersonalName {
                name: name.into(),
                name_form: Some("proper"),
                indefinite_article: None,
            });
        }
        if let Some(scope) = &self.scope {
            if let Some(label) = scope.body_label(id)? {
                return Ok(label.into());
            }
        }
        if self
            .entities
            .get(self.observer_id)
            .and_then(|entity| entity.actor.as_ref())
            .is_some_and(|actor| actor.inventory_inspection.is_some())
            || self
                .entities
                .get(id)
                .is_some_and(|entity| entity.item.is_some())
        {
            return Err(unavailable());
        }
        Ok((&self.rules.unidentified).into())
    }
    pub(crate) fn intended_addressee_name(
        &self,
        id: &str,
        role: SpeechTargetRole,
    ) -> Result<PersonalName<'_>, ReceivedError> {
        if role == SpeechTargetRole::Remembered && self.can_address_remembered_subject(id) {
            if let Some(identity) = self.identity_for_entity(id) {
                if let Some(name) = identity
                    .nickname
                    .as_ref()
                    .filter(|name| !name.is_empty())
                    .or_else(|| (!identity.given_name.is_empty()).then_some(&identity.given_name))
                {
                    return Ok(PersonalName {
                        name: name.into(),
                        name_form: Some("proper"),
                        indefinite_article: None,
                    });
                }
            }
        }
        self.observer_name(id)
    }
    pub(crate) fn capture_intended_name(
        &self,
        id: &str,
        role: SpeechTargetRole,
        budget: &ByteBudget,
    ) -> Result<OwnedPersonalName, ReceivedError> {
        let value = self.intended_addressee_name(id, role)?;
        let reservation = budget
            .reserve(size_of::<OwnedPersonalName>() + value.heap_bound()?)
            .map_err(|_| capacity())?;
        Ok(OwnedPersonalName {
            name: value.owned(),
            _reservation: reservation,
        })
    }
    pub(crate) fn capture_names(
        &self,
        ids: &[&str],
        budget: &ByteBudget,
    ) -> Result<CapturedNames, ReceivedError> {
        let mut bytes = heap_sum([
            size_of::<CapturedNames>(),
            self.observer_id.len(),
            map_storage::<String, Named>(ids.len().checked_mul(2).ok_or_else(capacity)?)
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        for id in ids {
            bytes = heap_sum([bytes, id.len(), self.observer_name(id)?.heap_bound()?])
                .ok_or_else(capacity)?;
        }
        let reservation = budget.reserve(bytes).map_err(|_| capacity())?;
        let mut names = IndexMap::new();
        names.try_reserve(ids.len()).map_err(|_| capacity())?;
        for id in ids {
            if !names.contains_key(*id) {
                names.insert((*id).to_owned(), self.observer_name(id)?.owned());
            }
        }
        let life = self
            .entities
            .get(self.observer_id)
            .and_then(|entity| entity.actor.as_ref())
            .map(|actor| actor.physical_life.unwrap_or(0))
            .ok_or_else(unavailable)?;
        Ok(CapturedNames {
            observer: ObserverLife {
                actor_id: self.observer_id.to_owned(),
                physical_life: life,
            },
            names,
            _reservation: reservation,
        })
    }
}
fn named(identity: &ObserverIdentity) -> bool {
    identity
        .nickname
        .as_ref()
        .is_some_and(|name| !name.is_empty())
        || !identity.given_name.is_empty()
}

/// The same observer-local ID owner serves visible strangers, learned voices
/// and explicit personal names. It never joins a private canonical actor name.
pub(crate) fn allocate_individual(
    physical: &mut PhysicalState,
    state: &ReceptionState,
    observer: &str,
) -> Result<String, crate::execution::ExecutionError> {
    loop {
        let id = physical.identity.allocate("individual")?.id;
        if !state
            .observer_identities
            .as_ref()
            .and_then(|root| root.get(observer))
            .is_some_and(|identities| identities.contains_key(&id))
        {
            return Ok(id);
        }
    }
}

#[path = "policy_residency/knowledge.rs"]
mod policy_residency;
