//! The Map tab's private editor uses the same authority and durable-save
//! boundary as the owner notepad.

use super::*;
use openlegend_simulation::runtime::{MapMarkerEdit, MarkerChange};

use openlegend_simulation::values::{deserialize_present_option, deserialize_present_safe_integer};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Input {
    id: String,
    world_id: String,
    generation: String,
    #[serde(deserialize_with = "deserialize_present_safe_integer")]
    expected_revision: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    remove: Option<bool>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    x: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    z: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    label: Option<JsText>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    icon: Option<String>,
}

impl Input {
    fn into_request(self) -> Option<(String, String, MapMarkerEdit)> {
        if [
            self.id.as_str(),
            self.world_id.as_str(),
            self.generation.as_str(),
        ]
        .into_iter()
        .any(|value| {
            value.is_empty()
                || value.len() > 120
                || !value.bytes().all(|byte| {
                    byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':')
                })
        }) {
            return None;
        }
        let change = match (self.remove, self.x, self.z, self.label, self.icon) {
            (None, Some(x), Some(z), Some(label), Some(icon))
                if label.units_len() <= 400
                    && !icon.is_empty()
                    && icon.encode_utf16().count() <= 120 =>
            {
                MarkerChange::Place { x, z, label, icon }
            }
            (Some(true), None, None, None, None) => MarkerChange::Remove,
            _ => return None,
        };
        Some((
            self.world_id,
            self.generation,
            MapMarkerEdit {
                id: self.id,
                expected_revision: self.expected_revision?,
                change,
            },
        ))
    }
}

pub(in crate::player_http) async fn edit(
    State(state): State<PlayerRoutes>,
    request: Request,
) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => Arc::new(selected),
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (Input, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    let Some((world, generation, edit)) = input.into_request() else {
        return request_error();
    };
    let edited = execute_edit(
        &state,
        selected.clone(),
        world,
        Some(generation),
        true,
        move |session, scope| {
            Ok(session.begin_owner_map_marker(&scope.account_id, &scope.actor_id, edit)?)
        },
    )
    .await;
    match edited {
        Ok(Some(result)) => {
            match state
                .authority
                .current(&selected, Capability::Play, true, |_, _| {
                    wire::encode(&result.outcome, b"", b"", state.game.host.budget())
                        .map(|bytes| json_response(StatusCode::OK, bytes))
                }) {
                Ok(Ok(response)) => response,
                Ok(Err(_)) => busy(),
                Err(error) => access_failure(error),
            }
        }
        Ok(None) => refusal(
            StatusCode::SERVICE_UNAVAILABLE,
            "map-save-unconfirmed",
            "The marker’s save hasn’t been confirmed. Refresh the map to check.",
        ),
        Err(WorldError::ProjectionChanged) => refusal(
            StatusCode::CONFLICT,
            "stale-world",
            "The world changed. Reopen your map.",
        ),
        Err(error) => failed(error),
    }
}
