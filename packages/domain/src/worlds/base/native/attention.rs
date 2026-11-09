//! Bundled-world lasting-account meaning. Every event/command/result name and
//! rank comes from the same authored descriptor used by TypeScript hooks.

use crate::activity::ActivityStatus;
use crate::attention::{
    AccountRecordingInput, ActivityRecordingContext, RecordingInput, RecordingReason,
    RecordingSource,
};
use crate::experience::{
    AccountAfterRelease, CognitionPolicy, ExperienceState, PersonalSourceHeader,
    PersonalSourceKind, RetentionReason,
};
use crate::install::DefinitionIdentity;
use crate::received::ReceivedError;
use crate::simulation::PhysicalState;
use crate::values::deserialize_safe_integer;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AccountRules {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub required_events: Vec<String>,
    pub ignored_events: Vec<String>,
    pub optional_events: Vec<String>,
    pub routine_command_type: String,
    pub routine_running_events: Vec<String>,
    pub routine_commitment_events: Vec<String>,
    pub routine_arrival_event: String,
    pub completed_code: String,
    pub cancelled_code: String,
    pub result_events: IndexMap<String, String>,
    pub agreement_events: Vec<String>,
    pub priority: AccountPriority,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub fallback_priority: u64,
    pub focus_attribute: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AccountPriority {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub deliberate: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub consequence: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub learning: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub interpretation: u64,
}
impl DefinitionIdentity for AccountRules {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}
pub(crate) struct AccountLaw<'a> {
    rules: &'a AccountRules,
    cognition: &'a CognitionPolicy,
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum MovementRecordingPhase {
    Departure,
    Arrival,
    Result,
}
impl<'a> AccountLaw<'a> {
    /// An existing individual's credit deadline requests contact only while
    /// it is later than the body's held confirmation. It grants no new sample.
    pub(crate) fn attention_contact_at(
        &self,
        reception: &crate::reception::ReceptionState,
        observer: &str,
        individual: &str,
        confirmed_through: f64,
    ) -> Option<f64> {
        let identity = reception
            .observer_identities
            .as_ref()?
            .get(observer)?
            .get(individual)?;
        let at = identity.familiarity.as_ref()?.next_credit_at?;
        (identity.seed_only != Some(true) && at > confirmed_through).then_some(at)
    }
    pub(crate) fn attention_contact_due(
        &self,
        reception: &crate::reception::ReceptionState,
        observer: &str,
        subject: &crate::reception::ObserverSubject,
        at: f64,
    ) -> bool {
        self.attention_identity(reception, observer, Some(subject))
            .is_some_and(|(_, identity)| {
                identity.seed_only != Some(true)
                    && identity
                        .familiarity
                        .as_ref()
                        .and_then(|state| state.next_credit_at)
                        .is_none_or(|next| at >= next)
            })
    }
    pub(crate) fn attention_familiarity(
        &self,
        reception: &crate::reception::ReceptionState,
        observer: &str,
        subject: Option<&crate::reception::ObserverSubject>,
    ) -> f64 {
        self.attention_identity(reception, observer, subject)
            .filter(|(_, identity)| identity.seed_only != Some(true))
            .map_or(0.0, |(_, identity)| {
                crate::worlds::base_recognition::individual_familiarity(identity)
            })
    }
    pub(crate) fn attention_identity<'b>(
        &self,
        reception: &'b crate::reception::ReceptionState,
        observer: &str,
        subject: Option<&crate::reception::ObserverSubject>,
    ) -> Option<(&'b str, &'b crate::worlds::InstalledObserverIdentity)> {
        let records = reception.observer_identities.as_ref()?.get(observer)?;
        match subject? {
            crate::reception::ObserverSubject::Individual { individual_id } => records
                .get_key_value(individual_id)
                .map(|(key, identity)| (key.as_str(), identity)),
            crate::reception::ObserverSubject::Entity { entity_id } => {
                let mut first: Option<(&str, &crate::worlds::InstalledObserverIdentity)> = None;
                for (key, identity) in records {
                    if identity.seed_only == Some(true)
                        || identity.canonical_id.as_ref() != Some(entity_id)
                    {
                        continue;
                    }
                    if first.is_none_or(|(prior, _)| {
                        crate::encoding::js_property_cmp(key, prior).is_lt()
                    }) {
                        first = Some((key, identity));
                    }
                }
                first
            }
        }
    }
    pub(crate) fn attention_capacity(
        &self,
        physical: &PhysicalState,
        installed: &crate::simulation::InstalledWorld,
        observer: &crate::state::Entity,
    ) -> Result<f64, ReceivedError> {
        if let Some(capacity) = observer
            .actor
            .as_ref()
            .and_then(|actor| actor.attention_capacity)
        {
            return Ok(capacity as f64);
        }
        let value = match installed.attributes.get(&self.rules.focus_attribute) {
            Some(definition) => crate::status::read_attribute(
                observer,
                definition.value(),
                physical.pending_values.as_ref(),
            )
            .map_err(|_| ReceivedError("Selected attention ability is unavailable."))?,
            None => None,
        };
        let value = match value {
            None => 50.0,
            Some(crate::values::AttributeValue::Number(value))
                if value.is_finite() && (0.0..=100.0).contains(&value) =>
            {
                value
            }
            _ => return Err(ReceivedError("Selected attention ability is unavailable.")),
        };
        Ok((5.0 + value / 10.0).round())
    }
    pub(crate) fn affects_observation(
        &self,
        observer: &crate::state::Entity,
        attribute_id: &str,
    ) -> bool {
        observer.has_memory()
            && observer.actor.as_ref().is_some_and(|actor| {
                (actor.attention_capacity.is_none() && attribute_id == self.rules.focus_attribute)
                    || actor
                        .individual_recognition
                        .as_ref()
                        .is_some_and(|recognition| recognition.attribute_id == attribute_id)
            })
    }
    pub(crate) fn new(rules: &'a AccountRules, cognition: &'a CognitionPolicy) -> Self {
        Self { rules, cognition }
    }
    pub(crate) fn recording_reason(&self, input: RecordingInput<'_>) -> RecordingReason {
        if input.source == RecordingSource::Confirmation {
            return RecordingReason::None;
        }
        if input.has_exposure
            || input.event_type.is_some_and(|event| {
                self.rules
                    .required_events
                    .iter()
                    .any(|candidate| candidate == event)
            })
        {
            return RecordingReason::Required;
        }
        if input.own && input.consequence
            || input.event_type.is_some_and(|event| {
                self.cognition
                    .significant_event_types
                    .iter()
                    .any(|candidate| candidate == event)
            })
        {
            return RecordingReason::Required;
        }
        if input.event_type.is_some_and(|event| {
            self.rules
                .ignored_events
                .iter()
                .any(|candidate| candidate == event)
        }) {
            return RecordingReason::None;
        }
        if input.event_type.is_some_and(|event| {
            self.rules
                .optional_events
                .iter()
                .any(|candidate| candidate == event)
        }) || input.source == RecordingSource::Summary
            || input.source == RecordingSource::Memory && input.own
            || input.consequence
        {
            RecordingReason::Optional
        } else {
            RecordingReason::None
        }
    }
    pub(crate) fn account_after_release(
        &self,
        input: AccountRecordingInput<'_>,
    ) -> AccountAfterRelease {
        let Some(activity) = input
            .activity
            .filter(|activity| input.own && self.ordinary(*activity))
        else {
            return AccountAfterRelease::Impression;
        };
        if input.source == RecordingSource::Awareness
            && activity.status == ActivityStatus::Running
            && input.event_type.is_some_and(|event| {
                self.rules
                    .routine_running_events
                    .iter()
                    .any(|candidate| candidate == event)
            })
        {
            return AccountAfterRelease::Discard;
        }
        if input.source == RecordingSource::Memory
            && (self.completed(activity) || self.cancelled(activity))
        {
            return AccountAfterRelease::Discard;
        }
        AccountAfterRelease::Impression
    }
    pub(crate) fn account_priority(&self, header: &PersonalSourceHeader) -> u64 {
        let reason = if header.reference.kind == PersonalSourceKind::Memory {
            header
                .impression
                .as_ref()
                .map(|impression| impression.reason)
                .or_else(|| header.retention.as_ref().map(|retention| retention.reason))
        } else {
            header.retention.as_ref().map(|retention| retention.reason)
        };
        match reason {
            Some(RetentionReason::Deliberate) => self.rules.priority.deliberate,
            Some(RetentionReason::Consequence) => self.rules.priority.consequence,
            Some(RetentionReason::Learning) => self.rules.priority.learning,
            Some(RetentionReason::Interpretation) => self.rules.priority.interpretation,
            None => self.rules.fallback_priority,
        }
    }
    pub(crate) fn agreement_event(&self, event_type: &str) -> bool {
        self.rules
            .agreement_events
            .iter()
            .any(|event| event == event_type)
    }
    pub(crate) fn result_event_type(&self, command_type: &str) -> Option<&str> {
        self.rules
            .result_events
            .get(command_type)
            .map(String::as_str)
    }
    fn ordinary(&self, activity: ActivityRecordingContext<'_>) -> bool {
        activity.command_type == self.rules.routine_command_type
            && !activity.bound
            && !activity.effects
            && !activity.outputs
            && !activity.spending
    }
    fn completed(&self, activity: ActivityRecordingContext<'_>) -> bool {
        activity.status == ActivityStatus::Completed
            && activity.outcome == Some((true, self.rules.completed_code.as_str()))
    }
    fn cancelled(&self, activity: ActivityRecordingContext<'_>) -> bool {
        activity.status == ActivityStatus::Cancelled
            && activity.outcome == Some((false, self.rules.cancelled_code.as_str()))
    }
    pub(crate) fn routine_result(
        &self,
        physical: &PhysicalState,
        experience: &ExperienceState,
        actor_id: &str,
        activity: ActivityRecordingContext<'_>,
    ) -> Result<bool, ReceivedError> {
        self.routine_movement(
            physical,
            experience,
            actor_id,
            activity,
            MovementRecordingPhase::Result,
            None,
        )
    }
    /// Arrival's optional fact must be supplied by the actual fresh receiver
    /// audience owner when this installed world's ordinary arrival is consumed.
    pub(crate) fn routine_movement(
        &self,
        physical: &PhysicalState,
        experience: &ExperienceState,
        actor_id: &str,
        activity: ActivityRecordingContext<'_>,
        phase: MovementRecordingPhase,
        reciprocal_external_audience: Option<bool>,
    ) -> Result<bool, ReceivedError> {
        if !self.ordinary(activity) {
            return Ok(false);
        }
        let source = physical
            .entities
            .get(actor_id)
            .ok_or(ReceivedError("Routine movement has no physical actor."))?;
        let actor = source
            .actor
            .as_ref()
            .ok_or(ReceivedError("Routine movement has no actor."))?;
        // The concrete encounter owner has not yet been imported. Its absence
        // is a real fact; a supplied active family must never become false.
        if actor.encounters.is_some() {
            return Err(ReceivedError(
                "Native routine movement has an unsupported encounter family.",
            ));
        }
        if experience
            .has_commitment_completion(
                actor_id,
                self.rules
                    .routine_commitment_events
                    .iter()
                    .map(String::as_str),
            )
            .map_err(|_| ReceivedError("Routine movement commitment coverage is unavailable."))?
        {
            return Ok(false);
        }
        if phase == MovementRecordingPhase::Arrival
            && self
                .cognition
                .significant_event_types
                .iter()
                .any(|event| event == &self.rules.routine_arrival_event)
        {
            if reciprocal_external_audience.ok_or(ReceivedError(
                "Routine arrival requires its actual external audience.",
            ))? {
                return Ok(false);
            }
        }
        if phase == MovementRecordingPhase::Departure {
            return Ok(activity.status == ActivityStatus::Running);
        }
        Ok(self.completed(activity)
            || phase == MovementRecordingPhase::Result && self.cancelled(activity))
    }
}

impl crate::experience::PersonalEvidenceMeaning for AccountLaw<'_> {
    fn recognition_source_ids(&self, keys: &[String]) -> Vec<String> {
        crate::worlds::base_recognition::recognition_support_sources(keys)
            .iter()
            .map(|source| source.id().to_owned())
            .collect()
    }
}
impl crate::received::TemporalValueMeaning for AccountLaw<'_> {
    fn recognition_support_source_ids(
        &self,
        keys: &[String],
    ) -> Result<Vec<String>, ReceivedError> {
        crate::worlds::base_recognition::recognition_support_source_ids(keys)
            .map_err(|_| ReceivedError("Invalid selected recognition source alias."))
    }
}
impl crate::attention::AccountRecordingLaw for AccountLaw<'_> {
    fn recording_reason(&self, input: RecordingInput<'_>) -> RecordingReason {
        AccountLaw::recording_reason(self, input)
    }
    fn account_after_release(&self, input: AccountRecordingInput<'_>) -> AccountAfterRelease {
        AccountLaw::account_after_release(self, input)
    }
    fn account_priority(&self, header: &PersonalSourceHeader) -> u64 {
        AccountLaw::account_priority(self, header)
    }
    fn result_event_type(&self, command_type: &str) -> Option<&str> {
        AccountLaw::result_event_type(self, command_type)
    }
    fn agreement_event(&self, event_type: &str) -> bool {
        AccountLaw::agreement_event(self, event_type)
    }
    fn learning_sources(&self, keys: &[String]) -> Vec<crate::experience::PersonalLearningSource> {
        use crate::worlds::base_recognition::{PersonalSupportFamily, RecognitionSupportSource};
        crate::worlds::base_recognition::recognition_support_sources(keys)
            .into_iter()
            .map(|source| match source {
                RecognitionSupportSource::Personal { kind, id } => {
                    crate::experience::PersonalLearningSource::Personal {
                        kind: match kind {
                            PersonalSupportFamily::Awareness => PersonalSourceKind::Awareness,
                            PersonalSupportFamily::Memory => PersonalSourceKind::Memory,
                            PersonalSupportFamily::Summary => PersonalSourceKind::Summary,
                        },
                        id,
                    }
                }
                RecognitionSupportSource::Evidence(source) => {
                    crate::experience::PersonalLearningSource::Evidence(source)
                }
            })
            .collect()
    }
    fn routine_result(
        &self,
        physical: &PhysicalState,
        experience: &ExperienceState,
        actor_id: &str,
        activity: ActivityRecordingContext<'_>,
    ) -> Result<bool, ReceivedError> {
        AccountLaw::routine_result(self, physical, experience, actor_id, activity)
    }
}
