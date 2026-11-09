//! Held contact deadlines and bounded due acquisition. A scheduler peek never
//! constructs due subject IDs or acquires new evidence. See
//! docs/simulation-time.md#extensible-boundary-ownership.
use super::*;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use crate::simulation::SimulationState;
use indexmap::IndexSet;
use std::mem::size_of;

fn capacity() -> ReceivedError {
    ReceivedError("Perception work preparation exceeds native byte allowance.")
}
struct ContactTicket {
    source: usize,
    at: f64,
}
pub(crate) struct ContactMeasurements {
    pub selected: IndexSet<String>,
    eligible: bool,
    tickets: Vec<ContactTicket>,
    next_at: f64,
    _reservation: ByteReservation,
}
pub(crate) struct MeasurementWork {
    pub next_at: Option<f64>,
    pub geometry: bool,
    pub subjects: IndexSet<String>,
    _reservation: ByteReservation,
}
fn owner<'a>(state: &'a SimulationState, observer: &str) -> Option<&'a PerceptionEvidenceOwner> {
    state.reception.perception_evidence.as_ref()?.get(observer)
}
fn geometry_due_at(state: &SimulationState, observer: &str) -> Option<f64> {
    let geometry = owner(state, observer)?.geometry.as_ref()?;
    (!geometry.finished
        && (geometry.fragments.len() as u64 + geometry.boundaries.len() as u64)
            < state.installed.attention.value().geometry.max_views)
        .then_some(geometry.next_at)
}
impl ContactMeasurements {
    pub(crate) fn prepare(
        state: &SimulationState,
        observer: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ReceivedError> {
        let current = owner(state, observer);
        let active = current.is_some_and(|current| {
            current
                .attention
                .as_ref()
                .is_some_and(|attention| !attention.entries.is_empty())
                || current
                    .geometry
                    .as_ref()
                    .is_some_and(|geometry| !geometry.finished)
        });
        let entries = if active {
            current
                .and_then(|current| current.attention.as_ref())
                .map_or(&[][..], |attention| attention.entries.as_slice())
        } else {
            &[][..]
        };
        let tickets = entries.len().checked_mul(2).ok_or_else(capacity)?;
        let text = entries
            .iter()
            .try_fold(0usize, |sum, entry| sum.checked_add(entry.source_id.len()))
            .ok_or_else(capacity)?;
        let reservation = budget
            .reserve(
                heap_sum([
                    size_of::<Self>(),
                    map_storage::<String, ()>(entries.len()).ok_or_else(capacity)?,
                    text,
                    tickets
                        .checked_mul(size_of::<ContactTicket>())
                        .ok_or_else(capacity)?,
                ])
                .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let mut result = Self {
            selected: IndexSet::with_capacity(entries.len()),
            eligible: false,
            tickets: Vec::with_capacity(tickets),
            next_at: f64::INFINITY,
            _reservation: reservation,
        };
        if !active {
            return Ok(result);
        }
        for entry in entries {
            result.selected.insert(entry.source_id.clone());
        }
        let Some(entity) = state.physical.entities.get(observer) else {
            return Ok(result);
        };
        let Some(actor) = entity.actor.as_ref() else {
            return Ok(result);
        };
        if !actor.alive
            || !entity.actively_participates()
            || (!entity.has_memory()
                && !(actor.controller == "native"
                    && entity
                        .animal
                        .as_ref()
                        .is_some_and(|animal| animal.episode.is_some())))
            || current.is_none_or(|current| current.life != actor.physical_life.unwrap_or(0))
            || super::sensors::vision_parameters(&state.installed, entity).radius <= 0.0
            || state
                .installed
                .capabilities
                .capability_blocked(Some(entity), "perception")
                .map_err(|_| ReceivedError("Perception capability is unavailable."))?
        {
            return Ok(result);
        }
        let Some(scope) = CurrentBodyReadScope::prepare(
            &state.reception,
            &state.physical.entities,
            &state.installed,
            &state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            observer,
        )?
        else {
            return Ok(result);
        };
        let current = current.ok_or(ReceivedError("Perception work has no current owner."))?;
        result.eligible = true;
        for entry in entries {
            let Some(body) = scope.native(
                &entry.source_id,
                "body",
                CurrentFacetSelector {
                    modality: Some(Modality::Sight),
                    ..Default::default()
                },
            )?
            else {
                continue;
            };
            if body.field.id != entry.lease_id || body.metadata.availability.is_some() {
                continue;
            }
            let recognized = match scope.native(
                &entry.source_id,
                "association",
                CurrentFacetSelector {
                    channel: Some(&body.grant.channel),
                    exposure: Some(&body.grant.exposure),
                    modality: None,
                },
            )? {
                Some(association) => scope.received_association(body, association)?,
                None => None,
            };
            let local = body.field.local_subject.as_ref();
            let through = effective_current_check(current, body.grant, body.metadata, false)?
                .map_or(body.metadata.times.expanded().confirmed_through, |check| {
                    check.through
                });
            let mut add = |subject: Option<&ObserverSubject>| -> Result<(), ReceivedError> {
                let Some(ObserverSubject::Individual { individual_id }) = subject else {
                    return Ok(());
                };
                if let Some(at) = state.installed.account_law().attention_contact_at(
                    &state.reception,
                    observer,
                    individual_id,
                    through,
                ) {
                    result.next_at = result.next_at.min(at);
                    result.tickets.push(ContactTicket {
                        source: result
                            .selected
                            .get_index_of(&entry.source_id)
                            .ok_or(ReceivedError("Perception work source is unavailable."))?,
                        at,
                    });
                }
                Ok(())
            };
            add(local)?;
            if recognized.is_some_and(|recognized| {
                matches!(recognized, ObserverSubject::Individual { .. })
                    && Some(recognized) != local
            }) {
                add(recognized)?;
            }
        }
        Ok(result)
    }
    pub(crate) fn next_measurement_at(
        &self,
        state: &SimulationState,
        observer: &str,
    ) -> Option<f64> {
        if !self.eligible {
            return None;
        }
        let next = self
            .next_at
            .min(geometry_due_at(state, observer).unwrap_or(f64::INFINITY));
        next.is_finite().then_some(next)
    }
    pub(crate) fn due_work(
        &self,
        state: &SimulationState,
        observer: &str,
        budget: &ByteBudget,
    ) -> Result<MeasurementWork, ReceivedError> {
        let now = state.physical.header.sim_time;
        let count = if self.eligible {
            self.tickets
                .iter()
                .filter(|ticket| ticket.at <= now)
                .count()
        } else {
            0
        };
        let bytes = if self.eligible {
            self.tickets
                .iter()
                .filter(|ticket| ticket.at <= now)
                .try_fold(0usize, |sum, ticket| {
                    sum.checked_add(self.selected.get_index(ticket.source)?.len())
                })
                .ok_or_else(capacity)?
        } else {
            0
        };
        let reservation = budget
            .reserve(
                heap_sum([
                    size_of::<MeasurementWork>(),
                    map_storage::<String, ()>(count).ok_or_else(capacity)?,
                    bytes,
                ])
                .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let mut subjects = IndexSet::with_capacity(count);
        if self.eligible {
            for ticket in self.tickets.iter().filter(|ticket| ticket.at <= now) {
                subjects.insert(
                    self.selected
                        .get_index(ticket.source)
                        .ok_or(ReceivedError("Perception work source is unavailable."))?
                        .clone(),
                );
            }
        }
        Ok(MeasurementWork {
            next_at: self.next_measurement_at(state, observer),
            geometry: self.eligible && geometry_due_at(state, observer).is_some_and(|at| at <= now),
            subjects,
            _reservation: reservation,
        })
    }
}
pub(crate) fn next_perception_work_at(
    state: &SimulationState,
    observer: &str,
    budget: &ByteBudget,
) -> Result<Option<f64>, ReceivedError> {
    let contacts = ContactMeasurements::prepare(state, observer, budget)?;
    let current = owner(state, observer);
    let geometry = current.and_then(|current| current.geometry.as_ref());
    let next = super::next_attention_work_at(
        &state.physical,
        &state.reception,
        &state.installed,
        observer,
        budget,
    )?
    .unwrap_or(f64::INFINITY)
    .min(
        contacts
            .next_measurement_at(state, observer)
            .unwrap_or(f64::INFINITY),
    )
    .min(
        geometry
            .filter(|geometry| geometry.prior_frame.is_some())
            .map_or(f64::INFINITY, |geometry| {
                geometry.frame_at + state.installed.attention.value().geometry.interval_seconds
            }),
    )
    .min(
        current
            .and_then(|current| current.motion_expires_at)
            .unwrap_or(f64::INFINITY),
    );
    Ok(next.is_finite().then_some(next))
}
