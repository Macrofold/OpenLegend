//! Typed action requests select existing Cancel and Move plan owners. The
//! original wording, mode and selections identify the browser's receipt.

use super::*;
use crate::npc::{human_request, valid_request_id};
use openlegend_simulation::runtime::{PlanMode, TypedWalk};
use std::sync::OnceLock;
mod point_text;
use point_text::PointWords;

enum ParsedAction {
    Stop(Option<Stop>),
    Walk(PointWords),
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActionAttempt {
    request_id: String,
    text: JsText,
    mode: PlanMode,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    target_id: Option<String>,
    // This narrow stage refuses a selected detail, since it cannot apply it.
    #[serde(default, deserialize_with = "deserialize_present_option")]
    slots: Option<Box<RawValue>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AttemptRecovery {
    request_id: String,
    timeline: String,
    text: JsText,
    mode: PlanMode,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    target_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    slots: Option<Box<RawValue>>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    expression: Option<bool>,
}

impl AttemptRecovery {
    pub(crate) fn expression(
        self,
    ) -> Result<Result<Self, (String, crate::npc::ExpressionRequest)>, AccessError> {
        match self.expression {
            None => Ok(Ok(self)),
            Some(true) if self.mode == PlanMode::Enqueue && self.slots.is_none() => {
                Ok(Err((self.timeline, crate::npc::ExpressionRequest {
                    request_id: self.request_id,
                    text: self.text,
                    target_id: self.target_id,
                })))
            }
            _ => Err(AccessError::Forbidden),
        }
    }
}

#[derive(Deserialize)]
struct StopGrammar {
    verbs: Vec<String>,
    unnamed: Vec<String>,
    activities: indexmap::IndexMap<String, String>,
}

struct Stop {
    kind: &'static str,
}

fn parse_stop(text: &str) -> Option<Option<Stop>> {
    static GRAMMAR: OnceLock<StopGrammar> = OnceLock::new();
    let grammar = GRAMMAR.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../../packages/domain/src/typed-stop.json"
        ))
        .expect("the build contains the engine's stop grammar")
    });
    let (verb, phrase) = text.split_once(' ').unwrap_or((text, ""));
    if !grammar.verbs.iter().any(|known| known == verb) {
        return None;
    }
    if grammar.unnamed.iter().any(|known| known == phrase) {
        return Some(None);
    }
    let kind = grammar.activities.get(phrase)?;
    Some(Some(Stop { kind }))
}

struct ExactAttempt {
    input: ActionAttempt,
    id: String,
    fingerprint: String,
    _custody: ByteReservation,
}

impl ExactAttempt {
    fn prepare(
        mut input: ActionAttempt,
        scope: &RequestScope,
        mut custody: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, WorldError> {
        if !valid_request_id(&input.request_id)
            || input
                .target_id
                .as_deref()
                .is_some_and(|id| !valid_request_id(id))
        {
            return Err(AccessError::Forbidden.into());
        }
        let workspace = budget
            .reserve(4096 + input.text.storage_bytes() * 6)
            .map_err(|_| StoreError::Capacity)?;
        custody.merge(workspace).map_err(|_| StoreError::Capacity)?;
        input.text = input.text.trimmed();
        if !(1..=500).contains(&input.text.units_len()) {
            return Err(AccessError::Forbidden.into());
        }
        let id = format!("action:{}", human_request(scope, &input.request_id)?);
        let text = json_record(&(
            "action",
            &scope.world_id,
            &scope.timeline_id,
            &scope.actor_id,
            &input,
        ))
        .map_err(|_| StoreError::InvalidRecord)?;
        Ok(Self {
            input,
            id,
            fingerprint: sha256_hex(text.as_bytes()),
            _custody: custody,
        })
    }

    fn receipt(
        &self,
        outcome: &openlegend_simulation::commands::Outcome,
    ) -> Result<GameplayReceipt, RuntimeError> {
        let result = json_record(outcome).map_err(RuntimeError::application_refused)?;
        Ok(GameplayReceipt {
            id: self.id.clone(),
            // A typed request identifies original intent across connection and
            // command epochs. No token can make this request executable again.
            epoch: 0,
            fingerprint: self.fingerprint.clone(),
            recovery_fingerprint: Some(self.fingerprint.clone()),
            expires_at: openlegend_simulation::identity::MAX_SAFE_INTEGER,
            result: RawValue::from_string(result).map_err(RuntimeError::application_refused)?,
        })
    }
}

#[derive(Serialize)]
struct Refusal<'a> {
    ok: bool,
    code: &'static str,
    message: &'a str,
}

fn refuse(code: &'static str, message: &str, budget: &ByteBudget) -> Result<Bytes, WorldError> {
    wire::encode(
        &Refusal {
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

fn original_result(
    result: Option<&GameplayReceipt>,
    input: &ExactAttempt,
    scope: &RequestScope,
    recovery: bool,
    budget: &ByteBudget,
) -> Result<Bytes, WorldError> {
    if result.is_some_and(|receipt| receipt.fingerprint != input.fingerprint) {
        return refuse(
            "idempotency-conflict",
            "The saved action does not match that original request. Nothing was resubmitted.",
            budget,
        );
    }
    if !recovery {
        let receipt = result.ok_or(AccessError::Changed)?;
        return wire::encode(receipt.result.as_ref(), b"", b"", budget).map_err(WorldError::Wire);
    }
    #[derive(Serialize)]
    struct Recovery<'a> {
        ok: bool,
        scope: &'a str,
        status: &'static str,
        message: &'static str,
        #[serde(skip_serializing_if = "Option::is_none")]
        result: Option<&'a RawValue>,
    }
    let scope = scope.key().map_err(|_| StoreError::InvalidRecord)?;
    let result = result.map(|receipt| receipt.result.as_ref());
    wire::encode(
        &Recovery {
            ok: true,
            scope: &scope,
            status: if result.is_some() {
                "resolved"
            } else {
                "unknown"
            },
            message: if result.is_some() {
                "The original action result was found."
            } else {
                "The original action has no confirmed record yet. Nothing was resubmitted."
            },
            result,
        },
        b"",
        b"",
        budget,
    )
    .map_err(WorldError::Wire)
}

impl PlayerCommands {
    pub(crate) async fn recover_action_attempt(
        &self,
        scope: Arc<AuthorizedScope>,
        input: AttemptRecovery,
        body: ByteReservation,
    ) -> Result<Bytes, WorldError> {
        let budget = self.game.host.budget();
        self.authority
            .current(&scope, Capability::Play, false, |_, _| ())?;
        if !valid_request_id(&input.timeline) {
            return Err(AccessError::Forbidden.into());
        }
        if input.timeline != scope.scope.timeline_id {
            return refuse(
                "stale-world",
                "This action belongs to an earlier world timeline.",
                budget,
            );
        }
        self.typed_action_attempt(
            scope,
            ActionAttempt {
                request_id: input.request_id,
                text: input.text,
                mode: input.mode,
                target_id: input.target_id,
                slots: input.slots,
            },
            true,
            body,
        )
        .await
    }

    pub(crate) async fn typed_action_attempt(
        &self,
        scope: Arc<AuthorizedScope>,
        input: ActionAttempt,
        recovery: bool,
        body: ByteReservation,
    ) -> Result<Bytes, WorldError> {
        self.authority
            .current(&scope, Capability::Play, !recovery, |_, _| ())?;
        let budget = self.game.host.budget();
        let input = Arc::new(ExactAttempt::prepare(input, &scope.scope, body, budget)?);
        let watch = self.saves.read_receipt(&input.id)?;
        let prior = self
            .read_original_receipt(&scope.scope.world_id, &input.id, &watch)
            .await?;
        if recovery || prior.is_some() {
            return self
                .authority
                .current(&scope, Capability::Play, !recovery, |scope, _| {
                    original_result(
                        prior.as_ref().and_then(ResultOwner::receipt),
                        &input,
                        scope,
                        recovery,
                        budget,
                    )
                })?;
        }
        self.maintenance.allow_ordinary(&self.authority, &scope)?;
        if input.input.target_id.is_some() || input.input.slots.is_some() {
            return self
                .authority
                .current(&scope, Capability::Play, true, |_, _| {
                    refuse(
                        "invalid-action",
                        "Clear the selected target and extra details for this typed action.",
                        budget,
                    )
                })?;
        }
        let action = {
            let language = self.game.language().ok_or(WorldError::ProviderKind)?;
            let (cleaned, _language_work) = language
                .normalize_intention(&input.input.text, budget)
                .map_err(WorldError::Language)?;
            let text = cleaned.as_unicode().map(|text| {
                openlegend_simulation::encoding::js_trim(text.trim_end_matches(['.', '!']))
            });
            match text {
                Some(text) => match parse_stop(text) {
                    Some(stop) => Some(ParsedAction::Stop(stop)),
                    None => point_text::parse(text, budget)?.map(ParsedAction::Walk),
                },
                None => None,
            }
        };
        let Some(action) = action else {
            return self.authority.current(&scope, Capability::Play, true, |_, _| {
                refuse("ai-unavailable",
                    "Type a stop request or a destination such as “walk to 17, 14”. Use the action controls for other requests.", budget)
            })?;
        };
        let _ordinary = self.saves.enter_ordinary().await;
        self.saves.check_admission(tokio::time::Instant::now())?;
        let begin_scope = scope.clone();
        let begin_authority = self.authority.clone();
        let finish_scope = scope.clone();
        let finish_authority = self.authority.clone();
        let admit = input.clone();
        let prepare = input.clone();
        let stage = self.saves.clone();
        let watch_new = self.saves.clone();
        let accept = self.saves.clone();
        let game = self.game.clone();
        self.game.world.request_advance_publication();
        let result = self
            .game
            .world
            .execute_and_publish(
                #[cfg(feature = "profile-campaign")]
                openlegend_simulation::profile::sites::TURN_COMMAND,
                move |world| {
                    begin_authority.current(&begin_scope, Capability::Play, true, |_, _| ())?;
                    if let Some(existing) = watch_new.watched_receipt(&admit.id)? {
                        return Ok(ApplicationStart::Existing(ResultOwner::Accepted(existing)));
                    }
                    if world.clock()?.paused {
                        return Ok(ApplicationStart::Existing(ResultOwner::Refused(
                            "paused",
                            "Resume before attempting a typed action.",
                        )));
                    }
                    let actor = &begin_scope.scope.actor_id;
                    let account = &begin_scope.scope.account_id;
                    match &action {
                        ParsedAction::Stop(stop) => {
                            let (available, matches) = world.player_typed_stop_current(
                                account,
                                actor,
                                stop.as_ref().map(|activity| activity.kind),
                            )?;
                            if !available {
                                return Ok(ApplicationStart::Existing(ResultOwner::Refused(
                                    "actor-unavailable",
                                    "Your character cannot act now.",
                                )));
                            }
                            if !matches {
                                return Ok(ApplicationStart::Existing(ResultOwner::Refused(
                                    "invalid-action",
                                    "That action is no longer running. Nothing was stopped.",
                                )));
                            }
                            Ok(ApplicationStart::Candidate(world.begin_player_command(
                                &admit.id,
                                actor,
                                RuntimePlayerCommand::Cancel(None),
                                false,
                            )?))
                        }
                        ParsedAction::Walk(point) => match world.begin_player_typed_walk(
                            &admit.id,
                            account,
                            actor,
                            TypedWalk {
                                x: point.x,
                                z: point.z,
                                support: point.support.as_deref(),
                                mode: admit.input.mode,
                            },
                        )? {
                            Ok(candidate) => Ok(ApplicationStart::Candidate(candidate)),
                            Err(reason) => Ok(ApplicationStart::Existing(ResultOwner::Refused(
                                "invalid-action",
                                reason.message,
                            ))),
                        },
                    }
                },
                move |question| {
                    let game = game.clone();
                    async move { game.answer_operation(question).await }
                },
                move |output, _| {
                    let RuntimeDirectOutput::Prepared(product) = output else {
                        return Err(RuntimeError::application_refused(
                            "Typed action did not produce a command result",
                        ));
                    };
                    let receipt = prepare.receipt(product.outcome())?;
                    Ok(ResultOwner::Accepted(stage.stage(&product, Some(receipt))?))
                },
                move |fence, key, _| {
                    finish_authority.current(&finish_scope, Capability::Play, true, |_, _| {
                        Ok(fence.settle(key, true)?)
                    })?
                },
                move |result| {
                    if let ResultOwner::Accepted(value) = result {
                        accept.accept(value);
                    }
                },
            )
            .await?;
        self.authority
            .current(&scope, Capability::Play, true, |scope, _| {
                if let Some(ResultOwner::Refused(code, message)) = result.as_ref() {
                    return refuse(code, message, budget);
                }
                original_result(
                    result.as_ref().and_then(ResultOwner::receipt),
                    &input,
                    scope,
                    false,
                    budget,
                )
            })?
    }
}
