//! Saved application controls use the ordinary private checkpoint and a
//! protected SQL prefix. They do not advance gameplay sequence or native time.
use super::{DriveError, ProviderKind};
use crate::commands::Outcome;
use crate::execution::CoreMutation;
use crate::geometry::GeometryBinding;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::text::JsText;
use serde::{Deserialize, Serialize};
use std::mem::size_of;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ControlFormat {
    pub binding: GeometryBinding,
    pub paused: bool,
    pub speed: f64,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct ControlAnswer {
    pub binding: GeometryBinding,
    pub message: JsText,
}
pub(super) struct HostControlCursor {
    request: ControlFormat,
    started: bool,
    _storage: ByteReservation,
}
pub(crate) struct CompletedHostControl {
    pub(crate) outcome: Outcome,
    _storage: ByteReservation,
}
impl HostControlCursor {
    pub(super) fn new(
        binding: GeometryBinding,
        paused: bool,
        speed: f64,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        // The server checks its selected speed menu and creator permission.
        // This boundary protects a usable current-format saved clock scalar.
        if !speed.is_finite() || speed <= 0.0 {
            return Err(DriveError::MalformedResponse);
        }
        Ok(Self {
            request: ControlFormat {
                binding,
                paused,
                speed,
            },
            started: false,
            _storage: budget
                .reserve(size_of::<Self>())
                .map_err(|_| DriveError::Capacity)?,
        })
    }
    pub(super) fn format(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<&ControlFormat, DriveError> {
        if self.started {
            return Err(DriveError::StaleResponse);
        }
        // CandidateJournal's clock snapshot restores this on every refusal.
        core.state.physical.header.paused = self.request.paused;
        self.started = true;
        Ok(&self.request)
    }
    pub(super) fn complete(
        &mut self,
        answer: ControlAnswer,
        budget: &ByteBudget,
    ) -> Result<CompletedHostControl, DriveError> {
        if !self.started || answer.binding != self.request.binding {
            return Err(DriveError::StaleResponse);
        }
        let bytes = size_of::<CompletedHostControl>()
            .checked_add(answer.message.heap_bytes().ok_or(DriveError::Capacity)?)
            .and_then(|n| n.checked_add("control".len()))
            .ok_or(DriveError::Capacity)?;
        let storage = budget.reserve(bytes).map_err(|_| DriveError::Capacity)?;
        Ok(CompletedHostControl {
            outcome: Outcome {
                spent: None,
                outputs: None,
                ok: true,
                code: "control".to_owned(),
                message: answer.message,
                recipe_id: None,
                item_id: None,
                entity_id: None,
                goal_id: None,
                plan_id: None,
                action_id: None,
            },
            _storage: storage,
        })
    }
    pub(super) fn kind(&self) -> ProviderKind {
        ProviderKind::Control
    }
}
