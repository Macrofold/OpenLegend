//! Saved application controls use the ordinary private checkpoint and a
//! protected SQL prefix. They do not advance gameplay sequence or native time.
use super::DriveError;
use crate::commands::Outcome;
use crate::execution::CoreMutation;
use crate::geometry::GeometryBinding;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::text::JsText;
use serde::{Deserialize, Serialize};
use std::mem::size_of;

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ControlFormat {
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
    request: Option<ControlFormat>,
    started: bool,
    _storage: ByteReservation,
}
pub(crate) struct CompletedHostControl {
    pub(crate) outcome: Outcome,
    _storage: ByteReservation,
}
/// Live controls and current-world startup use the same journaled host scalar.
/// CandidateJournal's clock snapshot restores it on every refusal.
pub(super) fn set_paused(core: &mut CoreMutation<'_>, paused: bool) {
    core.state.physical.header.paused = paused;
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
            request: Some(ControlFormat {
                binding,
                paused,
                speed,
            }),
            started: false,
            _storage: budget
                .reserve(size_of::<Self>())
                .map_err(|_| DriveError::Capacity)?,
        })
    }
    pub(super) fn presentation(budget: &ByteBudget) -> Result<Self, DriveError> {
        Ok(Self {
            request: None,
            started: false,
            _storage: budget
                .reserve(size_of::<Self>())
                .map_err(|_| DriveError::Capacity)?,
        })
    }

    pub(super) fn updates_presentation(&self) -> bool {
        self.request.is_none()
    }

    pub(super) fn format(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<&ControlFormat, DriveError> {
        if self.started {
            return Err(DriveError::StaleResponse);
        }
        let request = self.request.as_ref().ok_or(DriveError::StaleResponse)?;
        set_paused(core, request.paused);
        self.started = true;
        Ok(request)
    }
    pub(super) fn complete(
        &mut self,
        answer: ControlAnswer,
        budget: &ByteBudget,
    ) -> Result<CompletedHostControl, DriveError> {
        if !self.started
            || self
                .request
                .as_ref()
                .is_none_or(|request| answer.binding != request.binding)
        {
            return Err(DriveError::StaleResponse);
        }
        Self::completed(answer.message, budget)
    }

    pub(super) fn finish_presentation(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<CompletedHostControl, DriveError> {
        if self.started || !self.updates_presentation() {
            return Err(DriveError::StaleResponse);
        }
        self.started = true;
        Self::completed(JsText::default(), budget)
    }

    fn completed(message: JsText, budget: &ByteBudget) -> Result<CompletedHostControl, DriveError> {
        let bytes = size_of::<CompletedHostControl>()
            .checked_add(message.heap_bytes().ok_or(DriveError::Capacity)?)
            .and_then(|n| n.checked_add("control".len()))
            .ok_or(DriveError::Capacity)?;
        let storage = budget.reserve(bytes).map_err(|_| DriveError::Capacity)?;
        Ok(CompletedHostControl {
            outcome: Outcome {
                spent: None,
                outputs: None,
                ok: true,
                code: "control".to_owned(),
                message,
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
}
