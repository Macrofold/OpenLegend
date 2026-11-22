//! An ending can update the other person's private agreement only when both
//! currently see and clearly hear one another. The pair uses the same actual
//! sound propagation owner as speech, without creating an audible occurrence.
use super::*;
use crate::{
    execution::CoreMutation,
    geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SightRay},
    reception::{AcousticEmission, SensorError, SightBatch, SoundBatch, sound_origin},
    worlds::{InstalledHearingDetail, InstalledPersonalNameReader, base_observed::SpeechVolume},
};

pub(crate) struct MutualHearing {
    queries: GeometryQueries,
    directions: [SoundBatch; 2],
    sight: [SightBatch; 2],
    _custody: ByteReservation,
}

fn sensor_error(error: SensorError) -> ExecutionError {
    match error {
        SensorError::Capacity => ExecutionError::Capacity,
        _ => ExecutionError::Invariant,
    }
}

pub(crate) fn sees(
    core: &CoreMutation<'_>,
    observer: &str,
    other: &str,
) -> Result<bool, ExecutionError> {
    let state = &core.state;
    let names = InstalledPersonalNameReader::prepare(
        &state.physical,
        &state.reception,
        &state.installed,
        &state.experience,
        observer,
    )?;
    Ok(names.current_body_grant(other)?.is_some())
}

impl MutualHearing {
    /// Resolve the two actual sight and hearing checks at the same candidate
    /// cut. An inactive or already out-of-range listener grants no audience.
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        actors: [&str; 2],
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let [first, second] = actors;
        let physical = &core.state.physical;
        if actors.iter().any(|id| {
            physical.entities.get(id).is_none_or(|entity| {
                !entity.actively_participates()
                    || entity.actor.as_ref().is_none_or(|body| !body.alive)
            })
        }) {
            return Ok(None);
        }
        let installed = &core.state.installed;
        let level = installed
            .acoustics
            .value()
            .source_level(SpeechVolume::Normal);
        let prepare = |from, to| {
            let origin = physical
                .entities
                .get(from)
                .and_then(sound_origin)
                .ok_or(ExecutionError::Invariant)?;
            SoundBatch::prepare(
                physical,
                installed,
                &AcousticEmission {
                    origin,
                    emitter_id: None,
                    source_level_db_spl_at1m: level,
                },
                &[to],
                binding,
                budget,
            )
            .map_err(sensor_error)
        };
        let directions = [prepare(first, second)?, prepare(second, first)?];
        if directions
            .iter()
            .any(|batch| batch.queries().sound.is_empty())
        {
            return Ok(None);
        }
        let sight = [
            SightBatch::prepare(physical, installed, first, &[second], binding, budget)
                .map_err(sensor_error)?,
            SightBatch::prepare(physical, installed, second, &[first], binding, budget)
                .map_err(sensor_error)?,
        ];
        let rays = sight
            .iter()
            .map(|batch| batch.queries().sight.len())
            .sum::<usize>();
        let custody = budget.reserve(size_of::<Self>() + (2 + rays) * size_of::<SightRay>())?;
        let mut queries = GeometryQueries::new(binding);
        queries
            .sound
            .try_reserve_exact(2)
            .map_err(|_| ExecutionError::Capacity)?;
        queries
            .sight
            .try_reserve_exact(rays)
            .map_err(|_| ExecutionError::Capacity)?;
        for batch in &directions {
            queries.sound.extend_from_slice(&batch.queries().sound);
        }
        for batch in &sight {
            queries.sight.extend_from_slice(&batch.queries().sight);
        }
        Ok(Some(Self {
            queries,
            directions,
            sight,
            _custody: custody,
        }))
    }

    pub(crate) fn queries(&self) -> &GeometryQueries {
        &self.queries
    }

    pub(crate) fn finish(
        self,
        core: &CoreMutation<'_>,
        actors: [&str; 2],
        answer: GeometryAnswers,
    ) -> Result<bool, ExecutionError> {
        self.queries
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let mut start = 0;
        for (batch, target) in self.sight.into_iter().zip(actors.into_iter().rev()) {
            let stop = start + batch.queries().sight.len();
            let seen = batch
                .finish_sight(answer.binding, &answer.sight[start..stop])
                .map_err(sensor_error)?;
            if seen.seen(target) != Some(true) {
                return Ok(false);
            }
            start = stop;
        }
        let acoustic = &core.state.installed.acoustics;
        for (batch, value) in self.directions.into_iter().zip(answer.sound) {
            let sound = batch
                .finish_exposure(answer.binding, &[value], acoustic)
                .map_err(sensor_error)?;
            if sound
                .iter()
                .next()
                .is_none_or(|(_, exposure)| exposure.detail != InstalledHearingDetail::Clear)
            {
                return Ok(false);
            }
        }
        Ok(true)
    }
}
