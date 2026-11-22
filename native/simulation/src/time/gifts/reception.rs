//! Apply the installed sight and clear ordinary-speech checks in both
//! directions before a changed offer is disclosed to its other participant.

use super::*;
use crate::{
    reception::{AcousticEmission, SightBatch, SoundBatch, sound_origin},
    worlds::{InstalledHearingDetail, base_observed::SpeechVolume},
};

#[derive(Clone, Copy)]
pub(super) enum Phase {
    SightFromSender,
    SightFromRecipient,
    HearSender,
    HearRecipient,
}

enum Probe {
    Sight(Box<SightBatch>),
    Sound(Box<SoundBatch>),
}

pub(super) enum ReceptionStep {
    Prepare(Phase),
    Complete(bool),
}

pub(super) struct MutualReception {
    phase: Phase,
    probe: Probe,
}

impl Phase {
    fn parties(self, offer: &GiftOffer) -> (&str, &str) {
        match self {
            Self::SightFromSender | Self::HearRecipient => (&offer.offerer_id, &offer.recipient_id),
            Self::SightFromRecipient | Self::HearSender => (&offer.recipient_id, &offer.offerer_id),
        }
    }

    fn is_sight(self) -> bool {
        matches!(self, Self::SightFromSender | Self::SightFromRecipient)
    }
}

impl MutualReception {
    pub(super) fn prepare(
        core: &mut CoreMutation<'_>,
        offer: &GiftOffer,
        mut binding: GeometryBinding,
        phase: Phase,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let (observer, source) = phase.parties(offer);
        let physical = &core.state.physical;
        let installed = &core.state.installed;
        let Some((viewer, speaker)) = physical
            .entities
            .get(observer)
            .zip(physical.entities.get(source))
            .filter(|(viewer, speaker)| {
                [*viewer, *speaker].into_iter().all(|person| {
                    person.actively_participates()
                        && person.actor.as_ref().is_some_and(|actor| actor.alive)
                })
            })
        else {
            return Ok(None);
        };
        binding.serial = core.journal.next_provider_serial()?;
        let probe = if phase.is_sight() {
            Probe::Sight(Box::new(
                SightBatch::prepare(physical, installed, observer, &[source], binding, budget)
                    .map_err(ExecutionError::Sensor)?,
            ))
        } else {
            let origin = sound_origin(speaker).ok_or(ExecutionError::InvalidPosition)?;
            let _emission = budget.reserve(source.len())?;
            let emission = AcousticEmission {
                origin,
                emitter_id: Some(source.to_owned()),
                source_level_db_spl_at1m: installed
                    .acoustics
                    .value()
                    .source_level(SpeechVolume::Normal),
            };
            Probe::Sound(Box::new(
                SoundBatch::prepare(
                    physical,
                    installed,
                    &emission,
                    &[&viewer.id],
                    binding,
                    budget,
                )
                .map_err(ExecutionError::Sensor)?,
            ))
        };
        Ok(Some(Self { phase, probe }))
    }

    pub(super) fn queries(&self) -> &GeometryQueries {
        match &self.probe {
            Probe::Sight(probe) => probe.queries(),
            Probe::Sound(probe) => probe.queries(),
        }
    }

    pub(super) fn finish(
        self,
        core: &CoreMutation<'_>,
        answer: GeometryAnswers,
        offer: &GiftOffer,
    ) -> Result<ReceptionStep, ExecutionError> {
        let (observer, source) = self.phase.parties(offer);
        let current = match self.probe {
            Probe::Sight(probe) => {
                probe
                    .finish(answer)
                    .map_err(ExecutionError::Sensor)?
                    .seen(source)
                    == Some(true)
            }
            Probe::Sound(probe) => probe
                .finish(answer, &core.state.installed.acoustics)
                .map_err(ExecutionError::Sensor)?
                .exposure(observer)
                .is_some_and(|exposure| exposure.detail == InstalledHearingDetail::Clear),
        };
        if !current {
            return Ok(ReceptionStep::Complete(false));
        }
        Ok(match self.phase {
            Phase::SightFromSender => ReceptionStep::Prepare(Phase::SightFromRecipient),
            Phase::SightFromRecipient => ReceptionStep::Prepare(Phase::HearSender),
            Phase::HearSender => ReceptionStep::Prepare(Phase::HearRecipient),
            Phase::HearRecipient => ReceptionStep::Complete(true),
        })
    }
}
