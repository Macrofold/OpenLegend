//! One ordered native advance lane. Participant membership is preparation over
//! canonical components; it contains no cloned world or new mutation authority.
mod participants;
pub(crate) use participants::{NativeParticipants, ParticipantPreparation};
mod travel;
use travel::MotionTravelBounds;
mod prediction;
pub(crate) use prediction::MechanicalForecast;
mod motion;
pub(crate) use motion::{next_animal_review, private_motion_seconds};
