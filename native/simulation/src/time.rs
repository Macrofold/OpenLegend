//! One ordered native advance lane. Participant membership is preparation over
//! canonical components; it contains no cloned world or new mutation authority.
pub(crate) mod local_clock;
mod participants;
pub(crate) use participants::{NativeParticipants, ParticipantPreparation};
mod travel;
use travel::MotionTravelBounds;
mod prediction;
mod projectiles;
pub(crate) use prediction::MechanicalForecast;
mod flight;
mod motion;
pub(crate) use motion::{next_animal_review, private_motion_seconds};
mod actions;
pub(crate) use actions::SliceActions;
mod endpoint;
mod gifts;
pub(crate) use endpoint::{EndpointAnswer, EndpointCursor, EndpointStep};
mod input;
mod movement;
pub(crate) use input::can_steer;
pub use input::{AdmittedWorldInput, Direction, ReleaseInput, SteeringInput};
pub(crate) use movement::MotionSliceCursor;
mod advance;
mod navigation;
pub(crate) use navigation::{
    PendingActionNavigation, PreparedActionNavigation, action_navigation_pending,
    action_navigation_wait, action_route_request_current,
};
mod reconcile;
mod sensing;
pub(crate) use advance::{
    AcceptedAdvanceContinuation, AdvanceAnswer, AdvanceContinuation, AdvanceCursor, AdvanceError,
    AdvanceStep, CompletedAdvance,
};
