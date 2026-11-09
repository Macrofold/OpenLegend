//! Real zero-time and maintenance owners share the outer advance's occurrence
//! and personal-result duties. This adapter supplies no effects of its own.
use crate::activity::PendingActivityResult;
use crate::body::{BodyAnswer, RemainsCursor, RemainsStep};
use crate::conditions::{ConditionReconcileCursor, ConditionReconcileStep};
use crate::events::CompletedOccurrence;
use crate::execution::{
    CoreMutation, ExecutionError, StagedOccurrence, StatusActivationAnswer, StatusReconcileCursor,
    StatusReconcileStep,
};
use crate::experience::AcquiredActivityResult;
use crate::geometry::{GeometryAnswers, GeometryQueries};
use crate::movement::{MoveAdvanceAnswer, MoveAdvanceCursor, MoveAdvanceStep};
use crate::reception::EndedCurrentEvidence;

pub(super) enum ReconcileCursor {
    Status(StatusReconcileCursor),
    Conditions(ConditionReconcileCursor),
    Action(MoveAdvanceCursor),
    Remains(RemainsCursor),
}
pub(super) enum ReconcileAnswer {
    Occurrence(CompletedOccurrence),
    Personal(AcquiredActivityResult),
    Geometry(GeometryAnswers),
    Ended(EndedCurrentEvidence),
}
pub(super) enum ReconcileStep<'a> {
    Occurrence(StagedOccurrence),
    Personal(&'a PendingActivityResult),
    Geometry(&'a GeometryQueries),
    EndEvidence {
        observer: &'a str,
        life: u64,
        at: f64,
    },
    Complete,
}
impl ReconcileCursor {
    pub(super) fn geometry_request(&self) -> Option<&GeometryQueries> {
        match self {
            Self::Action(cursor) => cursor.queries().ok(),
            _ => None,
        }
    }
    pub(super) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ReconcileAnswer>,
    ) -> Result<ReconcileStep<'a>, ExecutionError> {
        let invalid = || ExecutionError::UnfinishedOccurrence;
        Ok(match self {
            Self::Status(cursor) => {
                let input = match answer {
                    None => None,
                    Some(ReconcileAnswer::Occurrence(value)) => {
                        Some(StatusActivationAnswer::Occurrence(value))
                    }
                    Some(ReconcileAnswer::Personal(value)) => {
                        Some(StatusActivationAnswer::Personal(value))
                    }
                    Some(ReconcileAnswer::Ended(value)) => {
                        Some(StatusActivationAnswer::EvidenceEnded(value))
                    }
                    _ => return Err(invalid()),
                };
                match cursor.step(core, input)? {
                    StatusReconcileStep::Occurrence(value) => ReconcileStep::Occurrence(value),
                    StatusReconcileStep::Personal(value) => ReconcileStep::Personal(value),
                    StatusReconcileStep::EndEvidence {
                        observer_id,
                        physical_life,
                        at,
                    } => ReconcileStep::EndEvidence {
                        observer: observer_id,
                        life: physical_life,
                        at,
                    },
                    StatusReconcileStep::Complete => ReconcileStep::Complete,
                }
            }
            Self::Conditions(cursor) => {
                let input = match answer {
                    None => None,
                    Some(ReconcileAnswer::Occurrence(value)) => Some(value),
                    _ => return Err(invalid()),
                };
                match cursor.step(core, input)? {
                    ConditionReconcileStep::Occurrence(value) => ReconcileStep::Occurrence(value),
                    ConditionReconcileStep::Complete => ReconcileStep::Complete,
                }
            }
            Self::Action(cursor) => {
                let input = match answer {
                    None => None,
                    Some(ReconcileAnswer::Occurrence(value)) => {
                        Some(MoveAdvanceAnswer::Occurrence(value))
                    }
                    Some(ReconcileAnswer::Personal(value)) => {
                        Some(MoveAdvanceAnswer::Personal(value))
                    }
                    Some(ReconcileAnswer::Geometry(value)) => {
                        Some(MoveAdvanceAnswer::Geometry(value))
                    }
                    _ => return Err(invalid()),
                };
                match cursor.step(core, input)? {
                    MoveAdvanceStep::Occurrence(value) => ReconcileStep::Occurrence(value),
                    MoveAdvanceStep::Personal(value) => ReconcileStep::Personal(value),
                    MoveAdvanceStep::Geometry(value) => ReconcileStep::Geometry(value),
                    MoveAdvanceStep::Complete => ReconcileStep::Complete,
                }
            }
            Self::Remains(cursor) => {
                let input = match answer {
                    None => None,
                    Some(ReconcileAnswer::Occurrence(value)) => Some(BodyAnswer::Occurrence(value)),
                    Some(ReconcileAnswer::Personal(value)) => Some(BodyAnswer::Personal(value)),
                    _ => return Err(invalid()),
                };
                match cursor.step(core, input)? {
                    RemainsStep::Occurrence(value) => ReconcileStep::Occurrence(value),
                    RemainsStep::Personal(value) => ReconcileStep::Personal(value),
                    RemainsStep::Complete { .. } => ReconcileStep::Complete,
                }
            }
        })
    }
}
