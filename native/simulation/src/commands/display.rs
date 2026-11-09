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
use serde::Serialize;
use serde_json::value::RawValue;
use std::mem::size_of;

#[derive(Serialize)]
struct Profile {
    id: String,
    version: u64,
}
#[derive(Serialize)]
pub(crate) struct ActivityDisplayRequest {
    pub binding: GeometryBinding,
    profile: Profile,
    input: Box<RawValue>,
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
    Format(&'a ActivityDisplayRequest),
    Complete(CompletedActivityDisplay),
}
pub(crate) struct CompletedActivityDisplay {
    command_source: String,
    view: ActivityView,
    reservation: ByteReservation,
}
impl CompletedActivityDisplay {
    pub(super) fn into_view(
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
struct Actor {
    position: Point,
    heading: f64,
}
#[derive(Serialize)]
struct Target<'a> {
    name: &'a JsText,
    position: Point,
    #[serde(skip_serializing_if = "Option::is_none")]
    health: Option<&'a AttributeView>,
}
#[derive(Serialize)]
struct Effect<'a> {
    label: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    activate: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    deactivate: Option<&'a str>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Purpose<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<&'a JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    chosen_purpose: Option<&'a JsText>,
}
#[derive(Serialize)]
#[serde(tag = "type")]
enum Command<'a> {
    #[serde(rename = "move")]
    Move {
        #[serde(flatten)]
        purpose: Purpose<'a>,
        destination: Point,
    },
    #[serde(rename = "say")]
    Say {
        #[serde(flatten)]
        purpose: Purpose<'a>,
        text: &'a JsText,
    },
    #[serde(rename = "status-effect")]
    Status {
        #[serde(flatten)]
        purpose: Purpose<'a>,
        operation: &'static str,
    },
    #[serde(rename = "follow")]
    Follow {
        #[serde(flatten)]
        purpose: Purpose<'a>,
        #[serde(skip_serializing_if = "Option::is_none")]
        distance: Option<f64>,
    },
    #[serde(rename = "strike")]
    Strike {
        #[serde(flatten)]
        purpose: Purpose<'a>,
    },
}
#[derive(Serialize)]
struct Input<'a> {
    command: Command<'a>,
    actor: Actor,
    #[serde(skip_serializing_if = "Option::is_none")]
    target: Option<Target<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    effect: Option<Effect<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    strike: Option<&'a crate::worlds::base_decision_offers::NativeStrikeRead>,
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
    request: Option<ActivityDisplayRequest>,
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
            NativeCommand::Cancel { .. }
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
    ) -> Result<ActivityDisplayRequest, ExecutionError> {
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
        let target = if let (Some(target), Some(name)) = (target, name.as_ref()) {
            Some(Target {
                name,
                position: target
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                health,
            })
        } else {
            None
        };
        let envelope = self.command.envelope();
        let purpose = Purpose {
            purpose: envelope.purpose.as_ref(),
            chosen_purpose: envelope
                .chosen_purpose
                .as_ref()
                .map(|purpose| &purpose.description),
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
            NativeCommand::Say { text, .. } => Command::Say { purpose, text },
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
            NativeCommand::Cancel { .. }
            | NativeCommand::InspectInventory { .. }
            | NativeCommand::InspectActivities { .. } => {
                return Err(ExecutionError::UnsupportedFamily);
            }
        };
        let effect = match &self.command {
            NativeCommand::StatusEffect { definition_id, .. } => state
                .installed
                .status_policy
                .definitions
                .iter()
                .find(|definition| &definition.id == definition_id)
                .map(|definition| Effect {
                    label: &definition.label,
                    activate: definition
                        .actions
                        .as_ref()
                        .map(|actions| actions.activate.as_str()),
                    deactivate: definition
                        .actions
                        .as_ref()
                        .map(|actions| actions.deactivate.as_str()),
                }),
            _ => None,
        };
        let input = Input {
            command,
            actor: Actor {
                position: actor
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                heading: actor.spatial.heading,
            },
            target,
            effect,
            strike: if let NativeCommand::Strike { definition_id, .. } = &self.command {
                state
                    .installed
                    .retained
                    .native_strike_read
                    .get(definition_id)
            } else {
                None
            },
        };
        let length =
            crate::encoding::json_record_len(&input).map_err(|_| ExecutionError::Invariant)?;
        let reservation = budget.reserve(
            length
                .checked_mul(2)
                .and_then(|n| {
                    n.checked_add(
                        size_of::<ActivityDisplayRequest>()
                            + state.installed.content.profile.id.len(),
                    )
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let encoded =
            crate::encoding::json_record(&input).map_err(|_| ExecutionError::Invariant)?;
        let profile = Profile {
            id: state.installed.content.profile.id.clone(),
            version: state.installed.content.profile.version,
        };
        let input = RawValue::from_string(encoded).map_err(|_| ExecutionError::Invariant)?;
        let binding = GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        Ok(ActivityDisplayRequest {
            binding,
            profile,
            input,
            _reservation: reservation,
        })
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
