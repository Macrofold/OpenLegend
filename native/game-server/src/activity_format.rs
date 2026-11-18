//! Answer the originating operation's finite activity display request. The
//! selected world's formatter receives only facts already captured by Rust.

use crate::world::WorldError;
use openlegend_simulation::{activity::ActivityView, state::Point, text::JsText};
use serde::Deserialize;
use serde_json::value::RawValue;

#[path = "../../../packages/domain/src/worlds/base/native/move_display.rs"]
mod move_display;

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
    command: MoveCommand,
    actor: ActorPosition,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MoveCommand {
    #[serde(rename = "type")]
    _kind: MoveKind,
    destination: Point,
    purpose: Option<JsText>,
    chosen_purpose: Option<JsText>,
}

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
enum MoveKind {
    Move,
}

#[derive(Deserialize)]
struct ActorPosition {
    position: Point,
}

pub(crate) fn format(request: &RawValue) -> Result<ActivityView, WorldError> {
    let request: DisplayRequest<'_> =
        serde_json::from_str(request.get()).map_err(|_| WorldError::ProviderKind)?;
    let command = request.input.command;
    move_display::format(
        (request.profile.id, request.profile.version),
        command.purpose,
        command.chosen_purpose,
        request.input.actor.position,
        command.destination,
    )
    .ok_or(WorldError::ProviderKind)
}
