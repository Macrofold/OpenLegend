//! Native event-time facts supplied to the selected world's recording law.
//! No private action or mutable world travels with a witness's account.

use crate::activity::{ActivityOccurrence, ActivityStatus};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum RecordingReason {
    Required,
    Optional,
    None,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum RecordingSource {
    Awareness,
    Memory,
    Summary,
    Confirmation,
}
#[derive(Clone, Copy)]
pub(crate) struct RecordingInput<'a> {
    pub source: RecordingSource,
    pub event_type: Option<&'a str>,
    pub modality: Option<&'a str>,
    pub trigger_kind: Option<&'a str>,
    pub own: bool,
    pub has_exposure: bool,
    pub exposure_kind: Option<&'a str>,
    pub consequence: bool,
}
#[derive(Clone, Copy)]
pub(crate) struct ActivityRecordingContext<'a> {
    pub command_type: &'a str,
    pub status: ActivityStatus,
    pub bound: bool,
    pub effects: bool,
    pub outputs: bool,
    pub spending: bool,
    pub outcome: Option<(bool, &'a str)>,
}
impl<'a> ActivityRecordingContext<'a> {
    pub(crate) fn from_occurrence(entry: &'a ActivityOccurrence) -> Self {
        let command = entry.command.envelope();
        let result = entry.outcome.as_ref();
        Self {
            command_type: entry.command.kind(),
            status: entry.status,
            bound: entry.cooperation.is_some()
                || entry.parent_id.is_some()
                || entry.method_id.is_some()
                || command.cooperation.is_some()
                || command.chosen_purpose.is_some()
                || command.combat_help_id.is_some()
                || !entry.connections.is_empty()
                || entry.incomplete.unwrap_or(false)
                || entry.revoked.unwrap_or(false)
                || result
                    .is_some_and(|result| result.goal_id.is_some() || result.plan_id.is_some()),
            effects: entry
                .effects
                .as_ref()
                .is_some_and(|effects| !effects.is_empty()),
            outputs: !entry.outputs.is_empty()
                || result.is_some_and(|result| {
                    result
                        .outputs
                        .as_ref()
                        .is_some_and(|outputs| !outputs.is_empty())
                        || result.item_id.is_some()
                        || result.entity_id.is_some()
                        || result.recipe_id.is_some()
                }),
            spending: entry
                .outcome
                .as_ref()
                .and_then(|outcome| outcome.spent)
                .is_some_and(|spent| spent > 0),
            outcome: entry
                .outcome
                .as_ref()
                .map(|outcome| (outcome.ok, outcome.code.as_str())),
        }
    }
}
pub(crate) struct AccountRecordingInput<'a> {
    pub source: RecordingSource,
    pub own: bool,
    pub event_type: Option<&'a str>,
    pub activity: Option<ActivityRecordingContext<'a>>,
}

/// Compiled selected-world meaning over actual native facts. The application
/// cannot install callbacks or executable law through this interface.
pub(crate) trait AccountRecordingLaw:
    crate::experience::PersonalEvidenceMeaning + crate::received::TemporalValueMeaning
{
    fn recording_reason(&self, input: RecordingInput<'_>) -> RecordingReason;
    fn account_after_release(
        &self,
        input: AccountRecordingInput<'_>,
    ) -> crate::experience::AccountAfterRelease;
    fn account_priority(&self, header: &crate::experience::PersonalSourceHeader) -> u64;
    fn learning_sources(&self, keys: &[String]) -> Vec<crate::experience::PersonalLearningSource>;
    fn agreement_event(&self, event_type: &str) -> bool;
    fn result_event_type(&self, command_type: &str) -> Option<&str>;
    fn routine_result(
        &self,
        physical: &crate::simulation::PhysicalState,
        experience: &crate::experience::ExperienceState,
        actor_id: &str,
        activity: ActivityRecordingContext<'_>,
    ) -> Result<bool, crate::received::ReceivedError>;
}
