//! A lesson requires a listener who can retain the method and hear ordinary
//! speech clearly. The menu and authoritative command use this same read.
use crate::execution::ExecutionError;
use crate::geometry::{GeometryAnswers, GeometryBinding};
use crate::host::ByteBudget;
use crate::reception::{AcousticEmission, SoundBatch, sound_origin};
use crate::simulation::SimulationState;
use crate::state::Entity;
use crate::worlds::{InstalledHearingDetail, base_observed::SpeechVolume};

pub(crate) fn listener(entity: &Entity) -> bool {
    entity.has_memory()
        && entity
            .actor
            .as_ref()
            .is_some_and(|actor| actor.alive && !actor.incapacitated)
}

/// Prepare only one sound ray and its exact exposure binding. The caller keeps
/// the funded batch through geometry, then consumes it once to check clarity.
pub(crate) fn sound(
    state: &SimulationState,
    speaker: &Entity,
    target: &Entity,
    binding: GeometryBinding,
    budget: &ByteBudget,
) -> Result<SoundBatch, ExecutionError> {
    let origin = sound_origin(speaker).ok_or(ExecutionError::InvalidPosition)?;
    let _emitter = budget.reserve(speaker.id.len())?;
    SoundBatch::prepare(
        &state.physical,
        &state.installed,
        &AcousticEmission {
            origin,
            emitter_id: Some(speaker.id.clone()),
            source_level_db_spl_at1m: state
                .installed
                .acoustics
                .value()
                .source_level(SpeechVolume::Normal),
        },
        &[target.id.as_str()],
        binding,
        budget,
    )
    .map_err(ExecutionError::Sensor)
}

pub(crate) fn clearly_heard(
    sound: SoundBatch,
    answers: GeometryAnswers,
    installed: &crate::simulation::InstalledWorld,
    target: &str,
) -> Result<bool, ExecutionError> {
    Ok(sound
        .finish(answers, &installed.acoustics)
        .map_err(ExecutionError::Sensor)?
        .exposure(target)
        .is_some_and(|exposure| exposure.detail == InstalledHearingDetail::Clear))
}
