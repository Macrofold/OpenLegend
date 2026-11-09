//! Memoryless native sight has its real current-evidence and response duties.
//! A quiet animal only checks sources whose acoustic continuity it already owns.
use super::*;
use crate::execution::{CoreMutation, ExecutionError, PhysicalMutation};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::native_danger::DangerBatch;
use std::mem::size_of;

enum Acquisition {
    Danger(DangerBatch),
    Known(SightBatch),
}
impl Acquisition {
    fn queries(&self) -> &GeometryQueries {
        match self {
            Self::Danger(batch) => batch.queries(),
            Self::Known(batch) => batch.queries(),
        }
    }
}
pub(crate) enum NativeExposureStep<'a> {
    Geometry(&'a GeometryQueries),
    Complete(CompletedNativeExposure),
}
pub(crate) struct CompletedNativeExposure {
    pub observer: String,
    _visual: Option<CompletedNativeVisual>,
    _reservation: ByteReservation,
}
pub(crate) struct NativeExposureCursor {
    observer: String,
    acquisition: Option<Acquisition>,
    reservation: Option<ByteReservation>,
}
fn invalid() -> ExecutionError {
    crate::received::ReceivedError("Native exposure lost its actual pending acquisition.").into()
}
impl NativeExposureCursor {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        observer: &str,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(observer)
            .ok_or(ExecutionError::MissingActor)?;
        if entity.has_memory()
            || entity
                .actor
                .as_ref()
                .is_none_or(|actor| actor.controller != "native")
            || entity.animal.is_none()
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let reservation = budget.reserve(size_of::<Self>() + observer.len())?;
        let binding = GeometryBinding::new(
            candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let acquisition = if entity
            .animal
            .as_ref()
            .is_some_and(|animal| animal.episode.is_some())
        {
            Acquisition::Danger(DangerBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                observer,
                binding,
                budget,
            )?)
        } else {
            let known = core
                .state
                .reception
                .perception_episodes
                .as_ref()
                .and_then(|rows| rows.get(observer));
            let count = known.map_or(0, |rows| rows.len());
            let _keys = budget.reserve(
                count
                    .checked_mul(size_of::<&str>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let targets = known
                .into_iter()
                .flat_map(|rows| rows.keys().map(String::as_str))
                .collect::<Vec<_>>();
            Acquisition::Known(
                SightBatch::prepare(
                    &core.state.physical,
                    &core.state.installed,
                    observer,
                    &targets,
                    binding,
                    budget,
                )
                .map_err(ExecutionError::Sensor)?,
            )
        };
        Ok(Self {
            observer: observer.into(),
            acquisition: Some(acquisition),
            reservation: Some(reservation),
        })
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<NativeExposureStep<'a>, ExecutionError> {
        let needs_answer = answer.is_none()
            && !self
                .acquisition
                .as_ref()
                .ok_or_else(invalid)?
                .queries()
                .is_empty();
        if needs_answer {
            return Ok(NativeExposureStep::Geometry(
                self.acquisition.as_ref().ok_or_else(invalid)?.queries(),
            ));
        }
        let installed = core.state.installed.clone();
        let (sight, assessment) = match self.acquisition.take().ok_or_else(invalid)? {
            Acquisition::Known(batch) => {
                let sight = match answer {
                    Some(answer) => batch.finish(answer),
                    None => {
                        let binding = batch.queries().binding;
                        batch.finish_sight(binding, &[])
                    }
                }
                .map_err(ExecutionError::Sensor)?;
                (sight, None)
            }
            Acquisition::Danger(batch) => {
                let (assessment, sight) = match answer {
                    Some(answer) => batch.finish(answer),
                    None => {
                        let binding = batch.queries().binding;
                        batch.finish_sight(binding, &[])
                    }
                }?;
                (sight, Some(assessment))
            }
        };
        let visual = if assessment.is_some() {
            Some(receive_native_visual(core, &sight, budget)?)
        } else {
            None
        };
        // Source retires only a continuity binding which this animal can no
        // longer see. Hidden death/removal supplies no replacement identity.
        let episodes = core
            .state
            .reception
            .perception_episodes
            .as_ref()
            .and_then(|rows| rows.get(&self.observer));
        let count = episodes.map_or(0, |rows| rows.len());
        let bytes = episodes.into_iter().flat_map(|rows| rows.keys()).try_fold(
            count
                .checked_mul(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
            |sum, id| sum.checked_add(id.len()).ok_or(ExecutionError::Capacity),
        )?;
        let _retiring = budget.reserve(bytes)?;
        let lost = episodes
            .into_iter()
            .flat_map(|rows| rows.keys())
            .filter(|id| sight.seen(id) != Some(true))
            .cloned()
            .collect::<Vec<_>>();
        for id in lost {
            core.journal
                .episodes
                .remove_subject(&mut core.state.reception, &self.observer, &id)?;
        }
        if let Some(assessment) = assessment {
            let assessment = assessment.reconcile(
                &mut PhysicalMutation {
                    state: &mut core.state.physical,
                    journal: &mut core.journal.physical,
                },
                &installed,
                &mut core.journal.meters,
                &sight,
            )?;
            crate::native_controller::reconcile_exposure(
                &mut PhysicalMutation {
                    state: &mut core.state.physical,
                    journal: &mut core.journal.physical,
                },
                &installed,
                &mut core.journal.meters,
                &self.observer,
                &assessment,
                installed.spatial.epsilon,
            )?;
        }
        let mut reservation = self.reservation.take().ok_or_else(invalid)?;
        reservation.resize(size_of::<CompletedNativeExposure>() + self.observer.capacity())?;
        Ok(NativeExposureStep::Complete(CompletedNativeExposure {
            observer: std::mem::take(&mut self.observer),
            _visual: visual,
            _reservation: reservation,
        }))
    }
}
