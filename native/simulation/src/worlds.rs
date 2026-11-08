//! Selected trusted world-family composition for the explicitly scoped proof.
//! Installation must verify the family's exact pin before using its law.

/// Select the compiled world family; this is not a fallback for an unfamiliar
/// world's laws. Family rules and words remain in their authored modules below.
pub(crate) fn require_profile(
    profile: &crate::install::WorldProfile,
) -> Result<(), crate::install::InstallError> {
    match (profile.id.as_str(), profile.version) {
        ("grounded-wilderness", 1) => Ok(()),
        _ => Err(crate::install::InstallError::DefinitionBody),
    }
}

#[path = "../../../packages/domain/src/worlds/base/native/recognition.rs"]
pub mod base_recognition;

#[path = "../../../packages/domain/src/worlds/base/native/observed.rs"]
pub mod base_observed;

#[path = "../../../packages/domain/src/worlds/base/native/acoustics.rs"]
pub mod base_acoustics;

#[path = "../../../packages/domain/src/worlds/base/native/knowledge.rs"]
pub mod base_knowledge;

#[path = "../../../packages/domain/src/worlds/base/native/event_disclosure.rs"]
pub mod base_event_disclosure;

#[path = "../../../packages/domain/src/worlds/base/native/movement.rs"]
pub(crate) mod base_movement;
pub(crate) use base_movement::InstalledMovementPolicy;
#[path = "../../../packages/domain/src/worlds/base/native/time.rs"]
pub(crate) mod base_time;
pub(crate) use base_time::InstalledTimeRules;

#[path = "../../../packages/domain/src/worlds/base/native/speech.rs"]
pub(crate) mod base_speech;
pub(crate) use base_speech::SpeechAction as InstalledSpeechAction;

#[path = "../../../packages/domain/src/worlds/base/native/promises.rs"]
pub(crate) mod base_promises;
pub(crate) use base_promises::PromiseRules as InstalledPromiseRules;
#[path = "../../../packages/domain/src/worlds/base/native/appraisals.rs"]
pub(crate) mod base_appraisals;
pub(crate) use base_appraisals::EventAppraisalRules as InstalledEventAppraisalRules;

#[path = "../../../packages/domain/src/worlds/base/native/observation.rs"]
pub(crate) mod base_observation;
pub(crate) use base_observation::ObservationRules as InstalledObservationRules;

#[path = "../../../packages/domain/src/worlds/base/native/ordinary_actions.rs"]
pub(crate) mod base_ordinary_actions;
pub(crate) use base_ordinary_actions::{
    ActionMessage as InstalledActionMessage, OrdinaryActionRules as InstalledOrdinaryActionRules,
};

#[path = "../../../packages/domain/src/worlds/base/native/retained_size.rs"]
mod base_retained_size;

pub use base_acoustics::AcousticExposure as InstalledAcousticExposure;
pub use base_acoustics::AcousticPolicy as InstalledAcousticPolicy;
pub use base_acoustics::HearingDetail as InstalledHearingDetail;
pub use base_event_disclosure::EventDisclosure as InstalledEventDisclosure;
pub use base_knowledge::ObserverIdentity as InstalledObserverIdentity;
pub use base_recognition::IndividualRecognition as InstalledIndividualRecognition;
pub use base_recognition::RecognitionPolicy as InstalledRecognitionPolicy;
pub use base_recognition::VoiceFeatures as InstalledVoiceFeatures;
pub use base_recognition::WildernessEvidenceMeaning as InstalledEvidenceMeaning;
pub(crate) use base_recognition::validate_selected_identities;
pub(crate) use base_recognition::{
    BodyFamiliarityPreparation as InstalledBodyFamiliarityPreparation,
    RecognitionCheckpoint as InstalledRecognitionCheckpoint,
    RecognitionJournal as InstalledRecognitionJournal, VoiceReception, VoiceReceptionParts,
    VoiceReceptionPreparation, retain_recognition_evidence as retain_selected_recognition_evidence,
};
pub type InstalledRecognitionFeatures =
    indexmap::IndexMap<String, base_recognition::RecognitionInterval>;

#[path = "../../../packages/domain/src/worlds/base/native/attention.rs"]
pub mod base_attention;
pub use base_attention::AccountRules as InstalledAccountRules;
pub(crate) use base_attention::{AccountLaw as InstalledAccountLaw, MovementRecordingPhase};
#[path = "../../../packages/domain/src/worlds/base/native/cognition.rs"]
pub(crate) mod base_cognition;
pub(crate) use base_cognition::OccurrenceRules as InstalledOccurrenceRules;

pub use base_knowledge::PersonalNameRules as InstalledPersonalNameRules;
pub(crate) use base_knowledge::{
    CapturedNames, OwnedPersonalName, PersonalNameReader as InstalledPersonalNameReader,
};

pub(crate) use base_recognition::prune_lost_body_individuals as prune_selected_lost_body_individuals;
