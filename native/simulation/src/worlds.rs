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

pub use base_acoustics::AcousticPolicy as InstalledAcousticPolicy;
pub use base_knowledge::ObserverIdentity as InstalledObserverIdentity;
pub use base_recognition::VoiceFeatures as InstalledVoiceFeatures;
pub use base_recognition::WildernessEvidenceMeaning as InstalledEvidenceMeaning;
