//! Both typed action routes use the existing command and receipt service.

use super::*;
use crate::player_command::{ActionAttempt, AttemptRecovery};

pub(super) async fn access(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let access = match scope(&state.authority, &parts.headers, None).await {
        Ok(access) => Arc::new(access),
        Err(error) => return access_failure(error),
    };
    let budget = state.game.host.budget();
    let result = if parts.uri.path() == "/api/action-attempt/receipt" {
        let (input, custody): (AttemptRecovery, _) = match json(&parts.headers, body, budget).await
        {
            Ok(input) => input,
            Err(response) => return response,
        };
        let input = match input.expression() {
            Ok(Ok(input)) => input,
            Ok(Err((timeline, input))) => return super::expression::receipt(&state, access, timeline, input, custody).await,
            Err(error) => return access_failure(error),
        };
        state
            .commands
            .recover_action_attempt(access, input, custody)
            .await
    } else {
        let (input, custody): (ActionAttempt, _) = match json(&parts.headers, body, budget).await {
            Ok(input) => input,
            Err(response) => return response,
        };
        state
            .commands
            .typed_action_attempt(access, input, false, custody)
            .await
    };
    match result {
        Ok(bytes) => json_response(StatusCode::OK, bytes),
        Err(error) => failed(error),
    }
}
