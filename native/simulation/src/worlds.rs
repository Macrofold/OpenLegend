//! Selected trusted world-family composition for the explicitly scoped proof.
//! Installation must verify the family's exact pin before using its law.

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

#[path = "../../../packages/domain/src/worlds/base/native/speech.rs"]
pub(crate) mod base_speech;
pub(crate) use base_speech::SpeechAction as InstalledSpeechAction;

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
