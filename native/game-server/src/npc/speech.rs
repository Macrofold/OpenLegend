//! Bind the existing public contact or remembered-person role, then receive
//! the player's speech through the real command and personal-evidence owners.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope, Capability, RequestScope, now_ms},
    boot::CurrentServer,
    live_save::{AcceptedSaveInput, LiveSaves},
    player_events::SpeechReplyStatus,
    player_references::{ReferenceIssuer, ResolvedSpeechTarget},
    store::{AdmittedJob, ConversationJob, JobRequest, StoreError},
    world::{ApplicationStart, WorldError},
};
use openlegend_simulation::{
    commands::{Outcome, SpeechTargetRole},
    encoding::{json_record, sha256_hex},
    experience::PersonalSourceRef,
    host::ByteReservation,
    narration::{NameArticle, name_phrase},
    reception::EventScalar,
    runtime::{
        InteractionMode, NativeWorldSession, RuntimeDirectOutput, RuntimeError, RuntimePlayerCommand,
    },
    text::JsText,
    values::deserialize_present_option,
    worlds::base_observed::SpeechVolume,
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::sync::Arc;
use tokio::{sync::watch, time::Instant};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ChatRequest {
    pub request_id: String,
    pub text: JsText,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub npc_id: Option<String>,
    #[serde(default = "normal")]
    pub volume: SpeechVolume,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub candidate: Option<Box<RawValue>>,
}

fn normal() -> SpeechVolume {
    SpeechVolume::Normal
}

pub(crate) fn valid_request_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 120
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b'.' | b':'))
}

pub(crate) fn human_request(scope: &RequestScope, id: &str) -> Result<String, WorldError> {
    #[derive(Serialize)]
    struct Identity<'a> {
        account: &'a str,
        world: &'a str,
        id: &'a str,
    }
    let input = encode(&Identity {
        account: &scope.account_id,
        world: &scope.world_id,
        id,
    })?;
    Ok(format!("human:{}", sha256_hex(input.as_bytes())))
}

fn encode<T: Serialize>(input: &T) -> Result<String, WorldError> {
    json_record(input).map_err(|_| StoreError::InvalidRecord.into())
}

pub(super) struct Speech {
    pub(super) job_id: String,
    pub(super) fingerprint: String,
    pub(super) scope: Arc<AuthorizedScope>,
    pub(super) request: ChatRequest,
    _custody: ByteReservation,
}

impl Speech {
    pub(super) fn new(
        mut request: ChatRequest,
        scope: Arc<AuthorizedScope>,
        mut custody: ByteReservation,
        game: &CurrentServer,
    ) -> Result<Self, WorldError> {
        request.text = request.text.trimmed();
        if !valid_request_id(&request.request_id)
            || request
                .npc_id
                .as_deref()
                .is_some_and(|value| !valid_request_id(value))
            || !(1..=1000).contains(&request.text.units_len())
        {
            return Err(AccessError::Forbidden.into());
        }
        let extra = game
            .host
            .budget()
            .reserve(4096)
            .map_err(|_| StoreError::Capacity)?;
        custody.merge(extra).map_err(|_| StoreError::Capacity)?;
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Fingerprint<'a> {
            kind: &'static str,
            volume: SpeechVolume,
            text: &'a JsText,
            #[serde(skip_serializing_if = "Option::is_none")]
            target_id: Option<&'a str>,
            world_id: &'a str,
            actor_id: &'a str,
            authority: &'a RequestScope,
        }
        let fields = &scope.scope;
        let job_id = human_request(fields, &request.request_id)?;
        let fingerprint = sha256_hex(
            encode(&Fingerprint {
                kind: "chat",
                volume: request.volume,
                text: &request.text,
                target_id: request.npc_id.as_deref(),
                world_id: &fields.world_id,
                actor_id: &fields.actor_id,
                authority: fields,
            })?
            .as_bytes(),
        );
        Ok(Self {
            job_id,
            fingerprint,
            scope,
            request,
            _custody: custody,
        })
    }
}

pub(super) struct Target {
    pub(super) actor: String,
    role: SpeechTargetRole,
    pub(super) reply: bool,
    pub(super) name: JsText,
    _custody: ByteReservation,
}

#[derive(Clone, Copy)]
pub(super) enum SpeechRefusal {
    SelectPerson,
    Unavailable,
    InvalidRecipient,
    Paused,
    Actor,
    Cancelled,
}

impl SpeechRefusal {
    pub(super) fn report(self) -> (&'static str, &'static str) {
        match self {
            Self::SelectPerson => (
                "resident-unavailable",
                "Select a person for this conversation.",
            ),
            Self::Unavailable => (
                "resident-unavailable",
                "Select an available resident for this conversation.",
            ),
            Self::InvalidRecipient => (
                "invalid-recipient",
                "Choose a known person or a person currently in sight.",
            ),
            Self::Paused => ("paused", "Resume the world to send."),
            Self::Actor => ("actor-unavailable", "Your character cannot speak now."),
            Self::Cancelled => ("cancelled", "Your message was not sent."),
        }
    }
}

pub(super) fn target_in_world(
    session: &NativeWorldSession,
    scope: &RequestScope,
    refs: &ReferenceIssuer,
    selected: Option<&str>,
    budget: &openlegend_simulation::host::ByteBudget,
) -> Result<Result<Target, SpeechRefusal>, RuntimeError> {
    let Some(selected) = selected else {
        return Ok(Err(SpeechRefusal::SelectPerson));
    };
    if session.clock()?.paused {
        return Ok(Err(SpeechRefusal::Paused));
    }
    draft_target_in_world(session, scope, refs, selected, budget)
}

/// Opening an editable draft may preserve a preference during manual pause.
/// It still resolves the same permitted recipient, with no transport or spend.
pub(super) fn draft_target_in_world(
    session: &NativeWorldSession,
    scope: &RequestScope,
    refs: &ReferenceIssuer,
    selected: &str,
    budget: &openlegend_simulation::host::ByteBudget,
) -> Result<Result<Target, SpeechRefusal>, RuntimeError> {
    let Some(ResolvedSpeechTarget { id: actor, role, mut custody }) =
        refs.resolve_speech_target(session, scope, selected, budget)? else {
        return Ok(Err(SpeechRefusal::InvalidRecipient));
    };
    let facts = session.with_player_interaction(
        &scope.account_id,
        &scope.actor_id,
        InteractionMode::Speak,
        Some(&actor),
        None,
        |facts| -> Result<_, RuntimeError> {
            if !facts.actor_available {
                return Ok(Err(SpeechRefusal::Actor));
            }
            if !facts.recipient_available || (facts.reply && facts.funding_actor_id != actor) {
                return Ok(Err(SpeechRefusal::Unavailable));
            }
            let description = facts.recipient_description().ok_or_else(|| {
                RuntimeError::application_refused("missing permitted recipient name")
            })?;
            let name = name_phrase(description, NameArticle::Definite, true);
            custody.resize(actor.len().saturating_add(name.storage_bytes()))?;
            Ok(Ok((name, facts.reply)))
        },
    )??;
    Ok(facts.map(|(name, reply)| Target {
        actor,
        role,
        reply,
        name,
        _custody: custody,
    }))
}

pub(super) async fn target(
    game: &Arc<CurrentServer>,
    speech: Arc<Speech>,
    authority: Arc<Authority>,
    references: Arc<ReferenceIssuer>,
) -> Result<Result<Target, SpeechRefusal>, WorldError> {
    let budget = game.host.budget().clone();
    let result = game
        .world
        .capture(move |session| {
            Ok(
                authority.current(&speech.scope, Capability::Play, true, |scope, _| {
                    target_in_world(
                        session,
                        scope,
                        &references,
                        speech.request.npc_id.as_deref(),
                        &budget,
                    )
                }),
            )
        })
        .await???;
    Ok(result.and_then(|target| {
        if target.reply { Ok(target) } else { Err(SpeechRefusal::Unavailable) }
    }))
}

pub(super) enum Spoken {
    Refused(SpeechRefusal),
    Outcome(Outcome, Arc<AcceptedSaveInput>),
    Accepted {
        job: Arc<AdmittedJob>,
        source: Option<SpeechSource>,
        cut: u64,
        save: Arc<AcceptedSaveInput>,
    },
}

pub(super) struct SpeechSource {
    pub(super) reference: PersonalSourceRef,
    pub(super) _custody: ByteReservation,
}

/// Rebind the recipient after the spending and scheduling waits. The actual
/// addressed awareness determines whether this accepted speech can start AI.
pub(super) async fn speak(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    authority: Arc<Authority>,
    references: Arc<ReferenceIssuer>,
    speech: Arc<Speech>,
    selected: Arc<Target>,
    stopped: watch::Receiver<bool>,
) -> Result<Spoken, WorldError> {
    let _intake = saves.enter_ordinary().await;
    saves.check_admission(Instant::now())?;
    let begin = speech.clone();
    let check = authority.clone();
    let first_stop = stopped.clone();
    let first_target = selected.clone();
    let budget = game.host.budget().clone();
    let provider = game.clone();
    let stage_input = speech.clone();
    let finish_saves = saves.clone();
    let accepted = saves.clone();
    let utterance = Arc::new(format!("{}:player", speech.job_id));
    let occurrence_id = utterance.clone();
    game.world.request_advance_publication();
    game.world.execute_and_publish(
        #[cfg(feature = "profile-campaign")]
        openlegend_simulation::profile::sites::TURN_NPC,
        move |session| {
            if *first_stop.borrow() {
                return Ok(ApplicationStart::Existing(Spoken::Refused(SpeechRefusal::Cancelled)));
            }
            check.current(&begin.scope, Capability::Play, true, |scope, _| {
                let current = match target_in_world(session, scope, &references, begin.request.npc_id.as_deref(), &budget)? {
                    Ok(current) => current,
                    Err(refusal) => return Ok(ApplicationStart::Existing(Spoken::Refused(refusal))),
                };
                if !current.reply || current.actor != first_target.actor || current.role != first_target.role {
                    return Ok(ApplicationStart::Existing(Spoken::Refused(SpeechRefusal::InvalidRecipient)));
                }
                let command = RuntimePlayerCommand::DirectedSpeech {
                    text: &begin.request.text,
                    target: &current.actor,
                    role: current.role,
                    volume: begin.request.volume,
                };
                Ok(ApplicationStart::Candidate(session.begin_player_command(
                    &utterance, &scope.actor_id, command, false,
                )?))
            })?
        },
        move |question| { let provider = provider.clone(); async move { provider.answer_operation(question).await } },
        move |output, budget| {
            let RuntimeDirectOutput::Prepared(product) = output else { unreachable!("speech is not a preview") };
            let speaker = &stage_input.scope.scope.actor_id;
            let outcome = product.outcome();
            if !outcome.ok {
                return Ok(Spoken::Outcome(outcome.clone(), finish_saves.stage(&product, None)?));
            }
            let event = product.events().find(|event| {
                event.actor_id.as_deref() == Some(speaker)
                    && matches!(event.data.as_ref().and_then(|data| data.get("utteranceId")),
                        Some(EventScalar::Text(id)) if id == occurrence_id.as_str())
            }).ok_or_else(|| RuntimeError::application_refused("speech receipt has no new occurrence"))?;
            let source = product.addressed_speech_source(&event.id, &selected.actor, speaker)
                .map(|reference| Ok::<_, RuntimeError>(SpeechSource {
                    _custody: budget.reserve(128 + reference.id.len() + reference.revision.len())?,
                    reference: reference.clone(),
                })).transpose()?;
            let heard = source.is_some();
            let now = now_ms();
            let message = if heard {
                let mut text = selected.name.clone();
                text.push_str(" is considering your words.");
                text
            } else {
                "Spoken. No conversational reply was requested.".into()
            };
            let job = AdmittedJob::new(ConversationJob {
                id: stage_input.job_id.clone(), fingerprint: stage_input.fingerprint.clone(), kind: "chat".into(),
                status: if heard { SpeechReplyStatus::Queued } else { SpeechReplyStatus::Completed },
                message, authority: Some(stage_input.scope.scope.clone()), player_speech_event_id: Some(event.id.clone()),
                retry_of: None,
                request: JobRequest { composer:None, text: stage_input.request.text.clone(), npc_id: selected.actor.clone(), volume: Some(stage_input.request.volume) },
                created_at: now, completed_at: (!heard).then_some(now), outcome: None,
            }, budget).map_err(RuntimeError::application_refused)?;
            let cut = product.progress().through_cut;
            let save = finish_saves.stage_with_job(&product, None, Some(job.clone()))?;
            Ok(Spoken::Accepted { job, source, cut, save })
        },
        move |fence, key, _| {
            if *stopped.borrow() { return Ok(fence.settle(key, false)?); }
            Ok(authority.current(&speech.scope, Capability::Play, true, |_, _| fence.settle(key, true))??)
        },
        move |spoken| match spoken {
            Spoken::Accepted { save, .. } | Spoken::Outcome(_, save) => accepted.accept(save),
            Spoken::Refused(_) => {},
        },
    ).await.map(|result| result.unwrap_or(Spoken::Refused(SpeechRefusal::Cancelled)))
}
