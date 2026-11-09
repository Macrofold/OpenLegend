//! Due interpretation of received facts does not purchase another body sample
//! or familiarity credit. Geometry keeps its distinct actual acquisition owner.
//! See docs/events-perception-and-reactions.md and docs/simulation-time.md.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use std::{mem::size_of, sync::Arc};

pub(crate) enum HeldReceptionStep<'a> {
    Geometry(&'a crate::geometry::GeometryQueries),
    Language(&'a crate::language::CollationRequest),
    Complete(CompletedHeldReception),
}
pub(crate) struct CompletedHeldReception {
    pub observer: String,
    _geometry: Option<CompletedGeometryReception>,
    _reservation: ByteReservation,
}
pub(crate) struct HeldReceptionCursor {
    observer: String,
    before: Option<Arc<CurrentCohort>>,
    active: bool,
    geometry: Option<GeometryReceptionCursor>,
    received: Option<CompletedGeometryReception>,
    reservation: Option<ByteReservation>,
}
fn invalid() -> ExecutionError {
    crate::received::ReceivedError("Held perception continuation is already complete.").into()
}
/// A real selection opportunity closes its own recording lifetime before a
/// later physical phase begins. Held continuation and detail preparation share it.
pub(super) fn select_received_attention(
    core: &mut CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let entity = core
        .state
        .physical
        .entities
        .get(observer)
        .ok_or(ExecutionError::MissingActor)?;
    if !entity.has_memory() {
        return Ok(());
    }
    let life = ObserverLife {
        actor_id: observer.into(),
        physical_life: entity.physical_life().ok_or(ExecutionError::MissingActor)?,
    };
    let mut lifetime = CurrentReceptionLifetime::begin(core, &life, None, None, budget)?;
    lifetime.ensure_prefix(core, budget)?;
    attention_control::update_attention(
        &core.state.physical,
        &mut core.state.reception,
        &core.state.installed,
        &core.state.experience,
        &mut core.journal.current,
        observer,
        attention_control::AttentionUpdate {
            changed_source_ids: Some(&[]),
            ..Default::default()
        },
    )?;
    if let Some(before) = lifetime.before.as_ref() {
        reconcile_current_cohort(core, Arc::clone(before), None, budget)?;
    }
    lifetime.reconciled = true;
    lifetime.finish(core, budget)?;

    Ok(())
}
impl HeldReceptionCursor {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        observer: &str,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(size_of::<Self>() + observer.len())?;
        let due = next_attention_work_at(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            observer,
            budget,
        )?
        .is_some_and(|at| at <= core.state.physical.header.sim_time);
        let work = ContactMeasurements::prepare(core.state, observer, budget)?
            .due_work(core.state, observer, budget)?;
        let active = due || work.geometry;
        let memory = core
            .state
            .physical
            .entities
            .get(observer)
            .is_some_and(|entity| entity.has_memory());
        let before = if active && memory {
            CurrentCohort::capture(
                &core.state.physical,
                &core.state.reception,
                &core.state.installed,
                &core.state.experience,
                observer,
                budget,
            )?
        } else {
            None
        };
        if due && memory {
            select_received_attention(core, observer, budget)?;
        }
        let geometry = if work.geometry {
            Some(GeometryReceptionCursor::prepare(
                core, observer, candidate, budget,
            )?)
        } else {
            None
        };
        Ok(Self {
            observer: observer.into(),
            before,
            active,
            geometry,
            received: None,
            reservation: Some(reservation),
        })
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryReceptionAnswer>,
        budget: &ByteBudget,
    ) -> Result<HeldReceptionStep<'a>, ExecutionError> {
        if self.reservation.is_none() {
            return Err(invalid());
        }
        if let Some(geometry) = self.geometry.as_mut() {
            let kind = match geometry.step(core, answer, budget)? {
                GeometryReceptionStep::Geometry(_) => 0,
                GeometryReceptionStep::Language(_) => 1,
                GeometryReceptionStep::Complete(done) => {
                    self.received = Some(done);
                    2
                }
            };
            if kind == 0 {
                return Ok(HeldReceptionStep::Geometry(
                    self.geometry
                        .as_ref()
                        .and_then(GeometryReceptionCursor::geometry_request)
                        .ok_or_else(invalid)?,
                ));
            }
            if kind == 1 {
                return Ok(HeldReceptionStep::Language(
                    self.geometry
                        .as_ref()
                        .and_then(GeometryReceptionCursor::language_request)
                        .ok_or_else(invalid)?,
                ));
            }
            self.geometry = None;
        } else if answer.is_some() {
            return Err(invalid());
        }
        if self.active {
            let entity = core
                .state
                .physical
                .entities
                .get(&self.observer)
                .ok_or(ExecutionError::MissingActor)?;
            if entity.has_memory() {
                // Interpreting held geometry still enters the current receiving
                // sequence, even when no fresh original observation is needed.
                core.journal.originals.ensure_owner(
                    &mut core.state.reception,
                    entity,
                    core.state.physical.header.sequence,
                )?;
            }
            if let Some(before) = self.before.take() {
                reconcile_current_cohort(core, before, None, budget)?;
            }
            evaluate_attention_relations(core, &self.observer, budget)?;
        }
        let mut reservation = self.reservation.take().ok_or_else(invalid)?;
        // Move the result's ID allocation rather than leaving a second copy in
        // a completed continuation whose owner may retain it until publication.
        reservation.resize(size_of::<CompletedHeldReception>() + self.observer.capacity())?;
        Ok(HeldReceptionStep::Complete(CompletedHeldReception {
            observer: std::mem::take(&mut self.observer),
            _geometry: self.received.take(),
            _reservation: reservation,
        }))
    }
}
