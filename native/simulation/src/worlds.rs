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

#[path = "../../../packages/domain/src/worlds/base/native/retained_size.rs"]
mod base_retained_size;

pub use base_acoustics::AcousticExposure as InstalledAcousticExposure;
pub use base_acoustics::AcousticPolicy as InstalledAcousticPolicy;
pub use base_acoustics::HearingDetail as InstalledHearingDetail;
pub use base_event_disclosure::EventDisclosure as InstalledEventDisclosure;
pub use base_knowledge::ObserverIdentity as InstalledObserverIdentity;
pub use base_recognition::IndividualRecognition as InstalledIndividualRecognition;
pub use base_recognition::VoiceFeatures as InstalledVoiceFeatures;
pub use base_recognition::WildernessEvidenceMeaning as InstalledEvidenceMeaning;
pub type InstalledRecognitionFeatures =
    indexmap::IndexMap<String, base_recognition::RecognitionInterval>;
