//! Answer the originating operation's finite activity display request. The
//! selected world's formatter receives only facts already captured by Rust.

use crate::world::WorldError;
use openlegend_simulation::{activity::ActivityView, state::Point, text::JsText};
use serde::Deserialize;
use serde_json::value::RawValue;

use authored::{EffectWords, ObservedActor, ObservedTarget, OrdinaryAction, StrikeRead};
use openlegend_simulation::worlds::activity_display as authored;

#[derive(Deserialize)]
struct Profile<'a> {
    id: &'a str,
    version: u64,
}

#[derive(Deserialize)]
struct DisplayRequest<'a> {
    #[serde(borrow)]
    profile: Profile<'a>,
    input: DisplayInput,
}

#[derive(Deserialize)]
struct DisplayInput {
    command: DisplayCommand,
    actor: Option<ObservedActor>,
    target: Option<ObservedTarget>,
    effect: Option<EffectWords>,
    strike: Option<StrikeRead>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DisplayCommand {
    #[serde(rename = "type")]
    kind: Kind,
    destination: Option<Point>,
    text: Option<JsText>,
    purpose: Option<JsText>,
    chosen_purpose: Option<JsText>,
    operation: Option<StatusOperation>,
}

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Kind {
    Move,
    Say,
    Follow,
    StatusEffect,
    Strike,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum StatusOperation {
    Activate,
    Deactivate,
}

pub(crate) fn format(request: &RawValue) -> Result<ActivityView, WorldError> {
    let request: DisplayRequest<'_> =
        serde_json::from_str(request.get()).map_err(|_| WorldError::ProviderKind)?;
    let DisplayInput {
        command,
        actor,
        target,
        effect,
        strike,
    } = request.input;
    let profile = (request.profile.id, request.profile.version);
    let action = match command.kind {
        Kind::Move => OrdinaryAction::Move(command.destination.ok_or(WorldError::ProviderKind)?),
        Kind::Say => OrdinaryAction::Say(command.text.ok_or(WorldError::ProviderKind)?),
        Kind::Follow => OrdinaryAction::Follow,
        Kind::StatusEffect => OrdinaryAction::Status {
            activate: matches!(
                command.operation.ok_or(WorldError::ProviderKind)?,
                StatusOperation::Activate
            ),
            effect,
        },
        Kind::Strike => OrdinaryAction::Strike(strike),
    };
    authored::format(
        profile,
        action,
        command.purpose,
        command.chosen_purpose,
        actor,
        target,
    )
    .ok_or(WorldError::ProviderKind)
}
