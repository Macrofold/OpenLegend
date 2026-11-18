//! A prior receipt is resolved before new target preparation. A read that
//! spans acceptance or ACK pins that receipt until its final checking turn.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope, Capability, RequestScope, now_ms},
    boot::CurrentServer,
    command_epoch::{RETRY_MS, RequestIdentity},
    live_save::{AcceptedSaveInput, LiveSaves},
    store::{AdmittedReceipt, GameplayReceipt, StoreError},
    wire,
    world::{ApplicationStart, WorldError},
};
use axum::body::Bytes;
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::{ByteBudget, ByteReservation},
    runtime::{RuntimeDirectOutput, RuntimeError},
    state::SurfacePoint,
    values::deserialize_present_option,
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CommandRequest {
    command_id: String,
    command_epoch: String,
    command: CommandInput,
}

// Deliberately select only the ordinary operations whose real semantic
// binders exist in this listener. Unknown fields cannot alter an executed
// operation, including flags for an unimplemented gesture or known-place read.
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CommandInput {
    #[serde(rename = "type")]
    kind: MoveOrCancel,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    position: Option<SurfacePoint>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    expected_action_id: Option<String>,
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
enum MoveOrCancel {
    Move,
    Cancel,
}

struct PreparedRequest {
    id: String,
    fingerprint: String,
    recovery_fingerprint: String,
    request: CommandRequest,
    epoch: u64,
    _custody: ByteReservation,
}

pub(crate) struct PlayerCommands {
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    authority: Arc<Authority>,
    identity: Mutex<RequestIdentity>,
}

enum ResultOwner {
    Accepted(Arc<AcceptedSaveInput>),
    Durable(AdmittedReceipt),
    Refused(&'static str, &'static str),
}

impl ResultOwner {
    fn receipt(&self) -> Option<&GameplayReceipt> {
        match self {
            Self::Accepted(value) => value.receipt(),
            Self::Durable(value) => Some(value.receipt()),
            Self::Refused(_, _) => None,
        }
    }
}

impl PlayerCommands {
    pub(crate) fn new(
        game: Arc<CurrentServer>,
        saves: Arc<LiveSaves>,
        authority: Arc<Authority>,
        identity: RequestIdentity,
    ) -> Self {
        Self {
            game,
            saves,
            authority,
            identity: Mutex::new(identity),
        }
    }

    pub(crate) async fn epoch(&self) -> String {
        self.identity.lock().await.epoch.token.clone()
    }

    pub(crate) async fn command(
        &self,
        scope: Arc<AuthorizedScope>,
        input: CommandRequest,
        recovery: bool,
        body: ByteReservation,
    ) -> Result<Bytes, WorldError> {
        let permits = &self.authority;
        permits.current(&scope, Capability::Play, !recovery, |_, _| ())?;
        input.check()?;
        let world_id = &scope.scope.world_id;
        if !recovery && self.identity.lock().await.due() {
            let _protected = self.saves.enter_protected().await?;
            let mut identity = self.identity.lock().await;
            identity
                .refresh(&self.game.store, world_id)
                .await
                .map_err(WorldError::Commit)?;
        }
        let _intake = self.saves.enter_ordinary().await;
        let epoch = {
            let identity = self.identity.lock().await;
            (
                identity.epoch.generation,
                identity.epoch.token == input.command_epoch,
            )
        };
        let budget = self.game.host.budget();
        let facts = Arc::new(input.prepare(&scope.scope, epoch.0, body, budget)?);
        let watch = self.saves.read_receipt(&facts.id)?;
        let durable = if watch.accepted()?.is_none() {
            self.game.store.command_receipt(world_id, &facts.id).await?
        } else {
            None
        };
        let mut prior = watch
            .accepted()?
            .map(ResultOwner::Accepted)
            .or_else(|| durable.map(ResultOwner::Durable));
        if recovery || prior.is_some() || !epoch.1 {
            return permits.current(&scope, Capability::Play, !recovery, |scope, _| {
                report(prior.as_ref(), &facts, scope, epoch.1, recovery, budget)
            })?;
        }
        self.saves.check_admission(tokio::time::Instant::now())?;
        let prepare = facts.clone();
        let begin_facts = facts.clone();
        let begin_saves = self.saves.clone();
        let begin_scope = scope.clone();
        let begin_authority = permits.clone();
        let accept = self.saves.clone();
        let stage = self.saves.clone();
        let game = self.game.clone();
        let finish_scope = scope.clone();
        let finish_authority = permits.clone();
        self.game.world.request_advance_publication();
        prior = self
            .game
            .world
            .execute_and_publish(
                move |world| {
                    begin_authority.current(&begin_scope, Capability::Play, true, |_, _| ())?;
                    if let Some(value) = begin_saves.watched_receipt(&begin_facts.id)? {
                        return Ok(ApplicationStart::Existing(ResultOwner::Accepted(value)));
                    }
                    let clock = world.clock()?;
                    if clock.paused
                        && !(matches!(begin_facts.request.command.kind, MoveOrCancel::Cancel)
                            && clock.manually_paused)
                    {
                        return Ok(ApplicationStart::Existing(ResultOwner::Refused(
                            "paused",
                            "Resume the world to act.",
                        )));
                    }
                    world.player_input_direct(
                        &begin_scope.scope.account_id,
                        &begin_scope.scope.actor_id,
                    )?;
                    let (command, signature) = begin_facts.command(&begin_scope.scope.actor_id)?;
                    Ok(ApplicationStart::Candidate(world.begin_command(
                        command.as_bytes(),
                        signature,
                        true,
                    )?))
                },
                move |question| {
                    let game = game.clone();
                    async move { game.answer_operation(question).await }
                },
                move |output, _| {
                    let RuntimeDirectOutput::Prepared(product) = output else {
                        unreachable!("ordinary command cannot preview")
                    };
                    let value = json_record(product.outcome())
                        .map_err(RuntimeError::application_refused)?;
                    let receipt = GameplayReceipt {
                        id: prepare.id.clone(),
                        epoch: prepare.epoch,
                        fingerprint: prepare.fingerprint.clone(),
                        recovery_fingerprint: Some(prepare.recovery_fingerprint.clone()),
                        expires_at: now_ms().saturating_add(RETRY_MS) as u64,
                        result: RawValue::from_string(value)
                            .map_err(RuntimeError::application_refused)?,
                    };
                    Ok(ResultOwner::Accepted(stage.stage(&product, Some(receipt))?))
                },
                move |fence, key, _| {
                    Ok(finish_authority.current(
                        &finish_scope,
                        Capability::Play,
                        true,
                        |_, _| fence.settle(key, true),
                    )??)
                },
                move |result| {
                    if let ResultOwner::Accepted(value) = result {
                        accept.accept(value);
                    }
                },
            )
            .await?;
        permits.current(&scope, Capability::Play, true, |scope, _| {
            report(prior.as_ref(), &facts, scope, epoch.1, false, budget)
        })?
    }
}

impl CommandRequest {
    fn check(&self) -> Result<(), WorldError> {
        fn id(text: &str) -> bool {
            !text.is_empty()
                && text.len() <= 120
                && text.bytes().all(|byte| {
                    byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b'.' | b':')
                })
        }
        let command = &self.command;
        if !id(&self.command_id)
            || self.command_id.starts_with("gameplay:")
            || Uuid::parse_str(&self.command_epoch).is_err()
        {
            return Err(AccessError::Forbidden.into());
        }
        match command.kind {
            MoveOrCancel::Move
                if command.expected_action_id.is_none()
                    && command.position.as_ref().is_some_and(|point| {
                        id(&point.surface_id)
                            && [point.x, point.y, point.z].iter().all(|n| n.is_finite())
                    }) =>
            {
                Ok(())
            }
            MoveOrCancel::Cancel
                if command.position.is_none()
                    && command.expected_action_id.as_deref().is_none_or(id) =>
            {
                Ok(())
            }
            _ => Err(AccessError::Forbidden.into()),
        }
    }

    fn prepare(
        self,
        scope: &RequestScope,
        epoch: u64,
        mut custody: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<PreparedRequest, WorldError> {
        let additional = budget.reserve(8192).map_err(|_| StoreError::Capacity)?;
        custody
            .merge(additional)
            .map_err(|_| StoreError::Capacity)?;
        #[derive(Serialize)]
        struct Original<'a> {
            actor: &'a str,
            input: &'a CommandInput,
            scope: &'a RequestScope,
        }
        #[derive(Serialize)]
        struct Recovery<'a, T> {
            input: &'a CommandInput,
            scope: T,
        }
        let body = |value: Result<String, serde_json::Error>| {
            value.map_err(|_| WorldError::Storage(StoreError::InvalidRecord))
        };
        let id = sha256_hex(body(json_record(&self.command_id))?.as_bytes());
        let fingerprint = sha256_hex(
            body(json_record(&Original {
                actor: &scope.actor_id,
                input: &self.command,
                scope,
            }))?
            .as_bytes(),
        );
        let recovery_fingerprint = sha256_hex(
            body(json_record(&Recovery {
                input: &self.command,
                scope: scope.recovery_fields(),
            }))?
            .as_bytes(),
        );
        Ok(PreparedRequest {
            id: format!("gameplay:{}:{}:{id}", scope.account_id, self.command_epoch),
            fingerprint,
            recovery_fingerprint,
            request: self,
            epoch,
            _custody: custody,
        })
    }
}

impl PreparedRequest {
    fn command(&self, actor: &str) -> Result<(String, String), WorldError> {
        let input = &self.request.command;
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Operation<'a> {
            id: &'a str,
            actor_id: &'a str,
            human_initiated: bool,
            #[serde(rename = "type")]
            kind: MoveOrCancel,
            #[serde(skip_serializing_if = "Option::is_none")]
            destination: Option<&'a SurfacePoint>,
            #[serde(skip_serializing_if = "Option::is_none")]
            expected_action_id: Option<&'a str>,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Point<'a> {
            surface_id: &'a str,
            x: f64,
            y: f64,
            z: f64,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Canonical<'a> {
            actor_id: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            destination: Option<Point<'a>>,
            #[serde(skip_serializing_if = "Option::is_none")]
            expected_action_id: Option<&'a str>,
            human_initiated: bool,
            id: &'a str,
            #[serde(rename = "type")]
            kind: MoveOrCancel,
        }
        let operation = Operation {
            id: &self.id,
            actor_id: actor,
            human_initiated: true,
            kind: input.kind,
            destination: input.position.as_ref(),
            expected_action_id: input.expected_action_id.as_deref(),
        };
        let canonical = Canonical {
            actor_id: actor,
            destination: operation.destination.map(|at| Point {
                surface_id: &at.surface_id,
                x: at.x,
                y: at.y,
                z: at.z,
            }),
            expected_action_id: operation.expected_action_id,
            human_initiated: true,
            id: &self.id,
            kind: input.kind,
        };
        let encode = |error| WorldError::Simulation(RuntimeError::application_refused(error));
        Ok((
            json_record(&operation).map_err(encode)?,
            json_record(&canonical).map_err(encode)?,
        ))
    }
}

fn report(
    owner: Option<&ResultOwner>,
    input: &PreparedRequest,
    scope: &RequestScope,
    fresh_epoch: bool,
    recovery: bool,
    budget: &ByteBudget,
) -> Result<Bytes, WorldError> {
    let receipt = owner.and_then(ResultOwner::receipt);
    let now = now_ms() as u64;
    if recovery {
        let scope_key = scope.key().map_err(|_| StoreError::InvalidRecord)?;
        let (status, message, result) = match receipt {
            None => (
                if fresh_epoch { "unknown" } else { "expired" },
                Some(
                    "The original result is not available. This does not confirm whether it happened.",
                ),
                None,
            ),
            Some(receipt)
                if receipt.recovery_fingerprint.as_deref() != Some(&input.recovery_fingerprint) =>
            {
                (
                    "unavailable",
                    Some("This result is unavailable for the current access and original request."),
                    None,
                )
            }
            Some(receipt) if now >= receipt.expires_at => (
                "expired",
                Some("The original result has expired. Its outcome remains unconfirmed."),
                None,
            ),
            Some(receipt) => ("resolved", None, Some(receipt.result.as_ref())),
        };
        #[derive(Serialize)]
        struct Recovery<'a> {
            ok: bool,
            scope: &'a str,
            status: &'static str,
            #[serde(skip_serializing_if = "Option::is_none")]
            message: Option<&'static str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            result: Option<&'a RawValue>,
        }
        return wire::encode(
            &Recovery {
                ok: result.is_some(),
                scope: &scope_key,
                status,
                message,
                result,
            },
            b"",
            b"",
            budget,
        )
        .map_err(WorldError::Wire);
    }
    let (code, message) = match receipt {
        Some(receipt) if now >= receipt.expires_at => {
            ("expired", "This command retry window has expired.")
        }
        Some(receipt) if receipt.fingerprint != input.fingerprint => (
            "idempotency-conflict",
            "That command ID was used for different input.",
        ),
        Some(receipt) => {
            return wire::encode(receipt.result.as_ref(), b"", b"", budget)
                .map_err(WorldError::Wire);
        }
        None if !fresh_epoch => (
            "expired",
            "This command epoch has closed. Refresh before issuing a new action.",
        ),
        None => match owner {
            Some(ResultOwner::Refused(code, message)) => (*code, *message),
            _ => return Err(AccessError::Changed.into()),
        },
    };
    #[derive(Serialize)]
    struct Refused {
        ok: bool,
        code: &'static str,
        message: &'static str,
    }
    wire::encode(
        &Refused {
            ok: false,
            code,
            message,
        },
        b"",
        b"",
        budget,
    )
    .map_err(WorldError::Wire)
}
