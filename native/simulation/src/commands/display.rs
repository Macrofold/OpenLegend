//! One command's permitted pre-effect display facts. Physical sight selects a
//! target; personal names and health come from their actual scoped owners. The
//! existing selected-world Node formatter owns wording and number formatting.
use super::{NativeCommand, StatusOperation};
use crate::activity::ActivityView;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::reception::{AttributeView, CurrentBodyReadScope, SightBatch};
use crate::state::Point;
use crate::text::JsText;
use crate::worlds::activity_display as authored;
use serde::Serialize;
use std::mem::size_of;
use std::sync::Arc;

#[derive(Serialize)]
struct Profile {
    id: String,
    version: u64,
}
#[derive(Serialize)]
pub(crate) struct ActivityDisplayRequest {
    pub binding: GeometryBinding,
    profile: Profile,
    input: Input,
    #[serde(skip)]
    _reservation: ByteReservation,
}
pub(crate) enum ActivityDisplayAnswer {
    Geometry(GeometryAnswers),
    Formatted {
        binding: GeometryBinding,
        view: ActivityView,
    },
}
pub(crate) enum ActivityDisplayStep<'a> {
    Geometry(&'a GeometryQueries),
    Format(&'a Arc<ActivityDisplayRequest>),
    Complete(CompletedActivityDisplay),
}
pub(crate) struct CompletedActivityDisplay {
    command_source: String,
    view: ActivityView,
    reservation: ByteReservation,
}
impl CompletedActivityDisplay {
    pub(crate) fn into_view(
        self,
        command: &NativeCommand,
    ) -> Result<(ActivityView, ByteReservation), ExecutionError> {
        if self.command_source != command.source_encoding() {
            return Err(ExecutionError::Invariant);
        }
        Ok((self.view, self.reservation))
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Purpose {
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    chosen_purpose: Option<JsText>,
}
#[derive(Serialize)]
#[serde(tag = "type")]
enum Command {
    #[serde(rename = "move")]
    Move {
        #[serde(flatten)]
        purpose: Purpose,
        destination: Point,
    },
    #[serde(rename = "say")]
    Say {
        #[serde(flatten)]
        purpose: Purpose,
        text: JsText,
    },
    #[serde(rename = "status-effect")]
    Status {
        #[serde(flatten)]
        purpose: Purpose,
        operation: &'static str,
    },
    #[serde(rename = "follow")]
    Follow {
        #[serde(flatten)]
        purpose: Purpose,
        #[serde(skip_serializing_if = "Option::is_none")]
        distance: Option<f64>,
    },
    #[serde(rename = "strike")]
    Strike {
        #[serde(flatten)]
        purpose: Purpose,
    },
}
#[derive(Serialize)]
struct Input {
    command: Command,
    actor: authored::ObservedActor,
    #[serde(skip_serializing_if = "Option::is_none")]
    target: Option<authored::ObservedTarget>,
    #[serde(skip_serializing_if = "Option::is_none")]
    effect: Option<authored::EffectWords>,
    #[serde(skip_serializing_if = "Option::is_none")]
    strike: Option<authored::StrikeRead>,
}
impl ActivityDisplayRequest {
    /// Render only the selected facts under a separate output allowance. The
    /// original snapshot stays with its pending operation through this call.
    pub(crate) fn format(
        &self,
        budget: &ByteBudget,
    ) -> Result<(ActivityView, ByteReservation), ExecutionError> {
        let workspace = budget.reserve(
            self._reservation
                .bytes()
                .checked_mul(12)
                .and_then(|bytes| bytes.checked_add(4096))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        use authored::OrdinaryAction as Action;
        let (purpose, action) = match &self.input.command {
            Command::Move {
                purpose,
                destination,
            } => (purpose, Action::Move(*destination)),
            Command::Say { purpose, text } => (purpose, Action::Say(text.clone())),
            Command::Follow { purpose, .. } => (purpose, Action::Follow),
            Command::Status { purpose, operation } => (
                purpose,
                Action::Status {
                    activate: *operation == "activate",
                    effect: self.input.effect.clone(),
                },
            ),
            Command::Strike { purpose } => (purpose, Action::Strike(self.input.strike)),
        };
        let view = authored::format(
            (&self.profile.id, self.profile.version),
            action,
            purpose.purpose.clone(),
            purpose.chosen_purpose.clone(),
            Some(self.input.actor),
            self.input.target.clone(),
        )
        .ok_or(ExecutionError::UnsupportedFamily)?;
        Ok((view, workspace))
    }
}
enum Phase {
    Sight,
    Format,
    Done,
}
pub(crate) struct ActivityDisplayCursor {
    command: NativeCommand,
    candidate: CandidateKey,
    seen: bool,
    sight: Option<SightBatch>,
    request: Option<Arc<ActivityDisplayRequest>>,
    phase: Phase,
    _reservation: ByteReservation,
}
impl ActivityDisplayCursor {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        command: &NativeCommand,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if matches!(
            command,
            NativeCommand::Outing { .. }
                | NativeCommand::Handover { .. }
                | NativeCommand::Feed { .. }
                | NativeCommand::Gather { .. }
                | NativeCommand::Fish { .. }
                | NativeCommand::Pickup { .. }
                | NativeCommand::TendFire { .. }
                | NativeCommand::PlaceHearth { .. }
                | NativeCommand::Craft { .. }
                | NativeCommand::Cook { .. }
                | NativeCommand::Equipment { .. }
                | NativeCommand::Eat { .. }
                | NativeCommand::Cancel { .. }
                | NativeCommand::WithdrawAttempt { .. }
                | NativeCommand::InspectInventory { .. }
                | NativeCommand::InspectActivities { .. }
        ) {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let bytes = heap_sum([
            size_of::<Self>(),
            command.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        let target = target_id(command);
        let actor = &command.envelope().actor_id;
        if core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
            .is_none()
        {
            return Err(ExecutionError::MissingActor);
        }
        let seen =
            target.is_some_and(|id| id == actor && core.state.physical.entities.get(id).is_some());
        let sight = if let Some(target) =
            target.filter(|id| *id != actor && core.state.physical.entities.get(id).is_some())
        {
            let binding = GeometryBinding::new(
                candidate,
                core.state.installed.geometry.spatial.revision,
                core.journal.next_provider_serial()?,
            );
            Some(
                SightBatch::prepare(
                    &core.state.physical,
                    &core.state.installed,
                    actor,
                    &[target],
                    binding,
                    budget,
                )
                .map_err(ExecutionError::Sensor)?,
            )
        } else {
            None
        };
        let phase = if sight.is_some() {
            Phase::Sight
        } else {
            Phase::Format
        };
        Ok(Self {
            command: command.clone(),
            candidate,
            seen,
            sight,
            request: None,
            phase,
            _reservation: reservation,
        })
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ActivityDisplayAnswer>,
        budget: &ByteBudget,
    ) -> Result<ActivityDisplayStep<'a>, ExecutionError> {
        match answer {
            Some(ActivityDisplayAnswer::Geometry(answer)) if matches!(self.phase, Phase::Sight) => {
                let sight = self
                    .sight
                    .take()
                    .ok_or(ExecutionError::Invariant)?
                    .finish(answer)
                    .map_err(ExecutionError::Sensor)?;
                self.seen = target_id(&self.command)
                    .and_then(|id| sight.seen(id))
                    .unwrap_or(false);
                self.phase = Phase::Format;
            }
            Some(ActivityDisplayAnswer::Formatted { binding, view })
                if matches!(self.phase, Phase::Format) =>
            {
                if self
                    .request
                    .as_ref()
                    .is_none_or(|request| request.binding != binding)
                {
                    return Err(ExecutionError::Invariant);
                }
                let source_bytes = self.command.source_encoding().len();
                let reservation = budget.reserve(
                    view.heap_bytes()
                        .and_then(|n| n.checked_add(source_bytes))
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                let command_source = self.command.source_encoding().to_owned();
                self.phase = Phase::Done;
                self.request = None;
                return Ok(ActivityDisplayStep::Complete(CompletedActivityDisplay {
                    command_source,
                    view,
                    reservation,
                }));
            }
            Some(_) => return Err(ExecutionError::Invariant),
            None => {}
        }
        match self.phase {
            Phase::Sight => Ok(ActivityDisplayStep::Geometry(
                self.sight
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .queries(),
            )),
            Phase::Format => {
                if self.request.is_none() {
                    self.request = Some(self.prepare_request(core, budget)?);
                }
                Ok(ActivityDisplayStep::Format(
                    self.request.as_ref().ok_or(ExecutionError::Invariant)?,
                ))
            }
            Phase::Done => Err(ExecutionError::Invariant),
        }
    }
    fn prepare_request(
        &self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<Arc<ActivityDisplayRequest>, ExecutionError> {
        let state = &core.state;
        let actor_id = &self.command.envelope().actor_id;
        let actor = state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let target = target_id(&self.command)
            .filter(|_| self.seen)
            .and_then(|id| state.physical.entities.get(id));
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor_id,
        )?;
        let captured = if let Some(target) = target {
            Some(names.capture_names(&[&target.id], budget)?)
        } else {
            None
        };
        let name = captured
            .as_ref()
            .and_then(|names| target.and_then(|target| names.get(&target.id)));
        let _text = budget.reserve(
            name.map_or(Some(0), HeapBytes::heap_bytes)
                .and_then(|n| n.checked_mul(8))
                .and_then(|n| n.checked_add(128))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let name = name.map(|name| {
            crate::narration::name_phrase(name, crate::narration::NameArticle::None, false)
        });
        let own_attributes = if target.is_some_and(|target| target.id == *actor_id) {
            Some(crate::status::project_attributes(
                actor,
                &state.installed.attributes,
                state.physical.pending_values.as_ref(),
                crate::status::AttributeAudience::Owner,
                budget,
            )?)
        } else {
            None
        };
        let scope = CurrentBodyReadScope::prepare(
            &state.reception,
            &state.physical.entities,
            &state.installed,
            &state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            actor_id,
        )?;
        let attributes = if let Some(own) = &own_attributes {
            Some(own.rows())
        } else if let (Some(scope), Some(target)) = (&scope, target) {
            if scope.native_body(&target.id)?.is_some() {
                scope.observed_attributes(&target.id)?
            } else {
                None
            }
        } else {
            None
        };
        let health = attributes
            .and_then(|values| values.iter().find(|value| value.body_health == Some(true)));
        let envelope = self.command.envelope();
        let effect_definition = match &self.command {
            NativeCommand::StatusEffect { definition_id, .. } => state
                .installed
                .status_policy
                .definitions
                .iter()
                .find(|definition| &definition.id == definition_id),
            _ => None,
        };
        let effect_bytes = effect_definition
            .map_or(Some(0), |definition| {
                let actions = definition.actions.as_ref();
                let words = actions.map_or(Some(0), |actions| {
                    actions.activate.len().checked_add(actions.deactivate.len())
                })?;
                definition.label.len().checked_add(words)?.checked_mul(3)
            })
            .ok_or(ExecutionError::Capacity)?;
        let speech = match &self.command {
            NativeCommand::Say { text, .. } => text.storage_bytes(),
            _ => 0,
        };
        let bound = heap_sum([
            size_of::<ActivityDisplayRequest>() + 2 * size_of::<usize>(),
            state.installed.content.profile.id.len(),
            name.as_ref().map_or(0, JsText::storage_bytes),
            health
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?,
            envelope.purpose.as_ref().map_or(0, JsText::storage_bytes),
            envelope
                .chosen_purpose
                .as_ref()
                .map_or(0, |purpose| purpose.description.storage_bytes()),
            effect_bytes,
            speech,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bound)?;
        let target = if let (Some(target), Some(name)) = (target, name) {
            Some(authored::ObservedTarget {
                name,
                position: target
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                health: health.cloned(),
            })
        } else {
            None
        };
        let purpose = Purpose {
            purpose: envelope.purpose.clone(),
            chosen_purpose: envelope
                .chosen_purpose
                .as_ref()
                .map(|purpose| purpose.description.clone()),
        };
        let command = match &self.command {
            NativeCommand::Move { destination, .. } => Command::Move {
                purpose,
                destination: Point {
                    x: destination.x,
                    y: destination.y,
                    z: destination.z,
                },
            },
            NativeCommand::Say { text, .. } => Command::Say {
                purpose,
                text: text.clone(),
            },
            NativeCommand::StatusEffect { operation, .. } => Command::Status {
                purpose,
                operation: if *operation == StatusOperation::Activate {
                    "activate"
                } else {
                    "deactivate"
                },
            },
            NativeCommand::Follow { distance, .. } => Command::Follow {
                purpose,
                distance: *distance,
            },
            NativeCommand::Strike { .. } => Command::Strike { purpose },
            NativeCommand::Outing { .. }
            | NativeCommand::Feed { .. }
            | NativeCommand::Gather { .. }
            | NativeCommand::Fish { .. }
            | NativeCommand::Pickup { .. }
            | NativeCommand::Drop { .. }
            | NativeCommand::TendFire { .. }
            | NativeCommand::PlaceHearth { .. }
            | NativeCommand::Cook { .. }
            | NativeCommand::Craft { .. }
            | NativeCommand::Eat { .. }
            | NativeCommand::Equipment { .. }
            | NativeCommand::Cancel { .. }
            | NativeCommand::WithdrawAttempt { .. }
            | NativeCommand::InspectInventory { .. }
            | NativeCommand::InspectActivities { .. }
            | NativeCommand::Handover { .. } => {
                return Err(ExecutionError::UnsupportedFamily);
            }
        };
        let effect = effect_definition.map(|definition| authored::EffectWords {
            label: definition.label.as_str().into(),
            activate: definition
                .actions
                .as_ref()
                .map(|actions| actions.activate.as_str().into()),
            deactivate: definition
                .actions
                .as_ref()
                .map(|actions| actions.deactivate.as_str().into()),
        });
        let strike = match &self.command {
            NativeCommand::Strike { definition_id, .. } => state
                .installed
                .retained
                .native_strike_read
                .get(definition_id)
                .map(|strike| authored::StrikeRead {
                    damage: strike.damage,
                    range: strike.range,
                    approach_range: strike.approach_range,
                    work_seconds: strike.work_seconds,
                    recovery_seconds: strike.recovery_seconds,
                    accuracy: strike.accuracy,
                }),
            _ => None,
        };
        let input = Input {
            command,
            actor: authored::ObservedActor {
                position: actor
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                heading: actor.spatial.heading,
            },
            target,
            effect,
            strike,
        };
        let profile = Profile {
            id: state.installed.content.profile.id.clone(),
            version: state.installed.content.profile.version,
        };
        let binding = GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        Ok(Arc::new(ActivityDisplayRequest {
            binding,
            profile,
            input,
            _reservation: reservation,
        }))
    }
}
fn target_id(command: &NativeCommand) -> Option<&str> {
    match command {
        NativeCommand::Say { target_id, .. } => target_id.as_deref(),
        NativeCommand::StatusEffect { target_id, .. } => Some(target_id),
        NativeCommand::Follow { target_id, .. } | NativeCommand::Strike { target_id, .. } => {
            Some(target_id)
        }
        _ => None,
    }
}
