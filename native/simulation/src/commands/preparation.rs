//! Read-only availability reuses the command owner's actual admission phases.
//! It stops before settlement, activity placement, IDs, events or receipts.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct InvocationLimits {
    pub offset: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum WorkTransitionMode {
    Continue,
    Enqueue,
    Replace,
    Interrupt,
}

pub(crate) enum CommandChoiceAnswer {
    Geometry(GeometryAnswers),
    Display(CompletedActivityDisplay),
}
pub(crate) enum CommandChoiceStep<'a> {
    Geometry(&'a GeometryQueries),
    Display(&'a mut ActivityDisplayCursor),
    Complete(PreparedCommandChoice),
}
pub(crate) struct PreparedCommandChoice {
    outcome: Outcome,
    _reservation: ByteReservation,
}
impl PreparedCommandChoice {
    pub(crate) fn outcome(&self) -> &Outcome {
        &self.outcome
    }
    pub(crate) fn into_parts(self) -> (Outcome, ByteReservation) {
        (self.outcome, self._reservation)
    }
    pub(super) fn new(outcome: Outcome, reservation: ByteReservation) -> Self {
        Self {
            outcome,
            _reservation: reservation,
        }
    }
}
pub(crate) struct CommandChoiceCursor {
    cursor: CommandCursor,
    mode: WorkTransitionMode,
    started: bool,
    done: bool,
}
impl CommandChoiceCursor {
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.cursor.geometry_request()
    }
    pub(crate) fn display_cursor(&mut self) -> Option<&mut ActivityDisplayCursor> {
        self.cursor.display_cursor()
    }
    pub(crate) fn new(
        command: NativeCommand,
        mode: WorkTransitionMode,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let _decoding = budget.reserve(
            crate::experience::encoded_body_bound(command.source_encoding())
                .map_err(|_| ExecutionError::Capacity)?
                .checked_add(command.source_encoding().len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let source = command.source_encoding().to_owned();
        let cursor = CommandCursor::new(
            command,
            source,
            CommandOptions {
                preview: false,
                native_controller: false,
                native_movement: None,
                durable_receipt: false,
            },
            binding,
            budget,
        )?
        .for_preparation(mode);
        Ok(Self {
            cursor,
            mode,
            started: false,
            done: false,
        })
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        self.cursor.abort(core)?;
        self.done = true;
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandChoiceAnswer>,
    ) -> Result<CommandChoiceStep<'a>, ExecutionError> {
        if self.done {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        if !self.started {
            if answer.is_some() {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            self.started = true;
            if self.mode == WorkTransitionMode::Interrupt {
                let prepared = crate::plans::prepare_suspension(
                    core,
                    self.cursor.actor_id(),
                    self.cursor.budget(),
                )?;
                if let Some(outcome) = prepared.outcome {
                    self.done = true;
                    return Ok(CommandChoiceStep::Complete(PreparedCommandChoice::new(
                        outcome,
                        prepared.storage,
                    )));
                }
            }
        }
        let answer = answer.map(|answer| match answer {
            CommandChoiceAnswer::Geometry(answer) => CommandAnswer::Geometry(answer),
            CommandChoiceAnswer::Display(answer) => CommandAnswer::Display(answer),
        });
        let progress = match self.cursor.drive(core, answer) {
            Ok(progress) => progress,
            Err(error) => {
                self.abort(core)?;
                return Err(error);
            }
        };
        Ok(match progress {
            super::run::Progress::Geometry => CommandChoiceStep::Geometry(
                self.cursor
                    .geometry_request()
                    .ok_or(ExecutionError::Invariant)?,
            ),
            super::run::Progress::Display => CommandChoiceStep::Display(
                self.cursor
                    .display_cursor()
                    .ok_or(ExecutionError::Invariant)?,
            ),
            super::run::Progress::Choice(prepared) => {
                self.done = true;
                CommandChoiceStep::Complete(prepared)
            }
            // A new command family must add its genuine read-only boundary
            // before it can be offered; execution is never a preview shortcut.
            _ => return Err(ExecutionError::Invariant),
        })
    }
}
