//! Learning evaluates recorded activity from one resident's own acquisition.
//! The exact guarded batch owns both the before-send attempt and any result.

use super::super::{Director, USEFUL_LIFETIME};
use crate::{
    decision_dispatch::{CallFailure, PreparedCall, ProviderDisclosure, decode_provider_bound},
    decision_render::provider::{self, Judgment, JudgmentState},
    live_save::ProtectedGameplaySave,
    store::{AttemptRequest, InferenceClass, StoreError},
    world::{NpcDisclosure, NpcDisclosureTurn, ProtectedCommit, WorldError},
};
use openlegend_simulation::{
    activity::LearningJudgment,
    encoding::hex_bytes,
    host::ByteReservation,
    runtime::{RuntimeActivityLearning, RuntimeDirectOutput, RuntimeError, RuntimeMaintenanceRead},
    text::JsText,
};
use openlegend_world_host::pool::HostError;
use serde::Deserialize;
use serde_json::{Map, Value, json};
use std::{
    mem::size_of,
    sync::{Arc, OnceLock},
};
use tokio::{
    sync::{OwnedMutexGuard, watch},
    time::Instant,
};

#[derive(Deserialize)]
struct PromptCopy {
    syntax: String,
    question: String,
    criteria: Value,
}

struct JudgmentQuestions {
    values: Value,
    _custody: ByteReservation,
}

struct LearningDisclosure {
    director: Arc<Director>,
    read: Arc<RuntimeActivityLearning>,
    admission: Arc<RuntimeMaintenanceRead>,
    stopped: watch::Receiver<bool>,
    deadline: Instant,
}

impl ProviderDisclosure for Arc<LearningDisclosure> {
    async fn grant_for_send(&self) -> Result<Option<OwnedMutexGuard<()>>, CallFailure> {
        self.publish(Vec::new(), true)
            .await
            .map_err(CallFailure::World)?;
        Ok(None)
    }

    fn start(
        &self,
        turn: NpcDisclosureTurn<'_>,
        stopped: &watch::Receiver<bool>,
        start: &mut dyn FnMut(),
    ) -> Result<(), CallFailure> {
        if *stopped.borrow() {
            return Err(CallFailure::Cancelled);
        }
        match turn
            .disclose_activity_learning(&self.read, &self.admission, start)
            .map_err(CallFailure::World)?
        {
            Ok(()) => Ok(()),
            Err(NpcDisclosure::Busy) => {
                Err(CallFailure::Stale("activity-learning-publication-busy"))
            }
            Err(NpcDisclosure::Refused(reason)) => Err(CallFailure::Stale(reason)),
        }
    }
}

impl LearningDisclosure {
    async fn publish(
        &self,
        judgments: Vec<LearningJudgment>,
        dispatched: bool,
    ) -> Result<(), WorldError> {
        let check = |stop: &watch::Receiver<bool>, deadline| {
            if *stop.borrow() || Instant::now() >= deadline {
                return Err(WorldError::Host(HostError::Cancelled));
            }
            Ok(())
        };
        check(&self.stopped, self.deadline)?;
        let game = &self.director.game;
        let saves = &self.director.saves;
        let _resolution = game.world.begin_source_edit(self.read.actor_id()?)?;
        let _barrier = saves.enter_protected().await?;
        let read = self.read.clone();
        let admission = self.admission.clone();
        let writer = game.store.clone();
        let staging = writer.clone();
        let provider = game.clone();
        let language = game.language().cloned();
        let stopped = self.stopped.clone();
        let before = stopped.clone();
        let deadline = self.deadline;
        let judgment_storage = game
            .host
            .budget()
            .reserve(judgments.capacity() * size_of::<LearningJudgment>())
            .map_err(RuntimeError::from)?;
        let prepared = game
            .world
            .execute_protected(
                move |world| {
                    check(&before, deadline).map_err(RuntimeError::application_refused)?;
                    let _judgment_storage = judgment_storage;
                    world.begin_activity_learning_direct(&read, judgments, dispatched, &admission)
                },
                move |question| {
                    let provider = provider.clone();
                    async move { provider.answer_operation(question).await }
                },
                move |output, budget| {
                    let RuntimeDirectOutput::Prepared(product) = output else {
                        return Err(RuntimeError::application_refused(StoreError::InvalidRecord));
                    };
                    if !product.outcome().ok {
                        return Err(RuntimeError::application_refused(StoreError::StaleCut));
                    }
                    ProtectedGameplaySave::prepare(&product, &staging, budget)
                },
                move || check(&stopped, deadline),
                move |prepared, prefix| -> ProtectedCommit<'_> {
                    Box::pin(async move {
                        let projection = prepared.projection(&writer, language.as_deref());
                        let acknowledged = writer.commit_save(prefix, &[], &projection).await?;
                        prepared.record_commit(&projection);
                        Ok(acknowledged)
                    })
                },
            )
            .await?
            .ok_or(StoreError::StaleCut)?;
        prepared.acknowledged(saves);
        Ok(())
    }
}

pub(super) async fn run(
    director: Arc<Director>,
    actor: String,
    stopped: watch::Receiver<bool>,
) -> Result<(), CallFailure> {
    let game = &director.game;
    let target = actor.clone();
    let admission = game
        .world
        .capture(move |world| world.read_maintenance_direct(target))
        .await
        .map_err(CallFailure::World)?;
    let read = game
        .world
        .capture_activity_learning(game.clone(), actor.clone())
        .await
        .map_err(CallFailure::World)?;
    let ticket_error = |error| CallFailure::World(WorldError::Simulation(error));
    if read.capacity_blocked().map_err(ticket_error)? {
        return Ok(());
    }
    let evidence_cut = read.accepted_cut().map_err(ticket_error)?;
    let read = Arc::new(read);
    let known_source = read.clone();
    let (known, _known_storage) = game
        .world
        .capture(move |world| world.activity_learning_known(&known_source))
        .await
        .map_err(CallFailure::World)?;
    let deadline = Instant::now() + USEFUL_LIFETIME;
    let publication = Arc::new(LearningDisclosure {
        director: director.clone(),
        read: read.clone(),
        admission: Arc::new(admission),
        stopped: stopped.clone(),
        deadline,
    });
    let budget = game.host.budget();
    let _judgments = budget
        .reserve(known.len() * size_of::<LearningJudgment>())
        .map_err(|_| CallFailure::Admission)?;
    let mut judgments = known
        .iter()
        .map(|known| {
            if *known {
                LearningJudgment::Retain
            } else {
                LearningJudgment::Uncertain
            }
        })
        .collect::<Vec<_>>();
    if known.iter().any(|known| !known) {
        let Some(models) = &director.models else {
            return Ok(());
        };
        let model = &models.routes.judgment;
        let ceiling = models.background_ceiling();
        if ceiling < model.amount_micro_usd {
            return Ok(());
        }
        static COPY: OnceLock<PromptCopy> = OnceLock::new();
        let copy = COPY.get_or_init(|| {
            serde_json::from_str(include_str!(
                "../../../../../packages/domain/src/activity-learning-copy.json"
            ))
            .expect("checked activity learning copy")
        });
        let mut offers = read.offered().map_err(ticket_error)?;
        let bytes = offers
            .try_fold(1024usize, |bytes, (_, description)| {
                bytes
                    .checked_add(2048)?
                    .checked_add(description.storage_bytes().checked_mul(8)?)
            })
            .ok_or(CallFailure::Admission)?;
        let custody = budget.reserve(bytes).map_err(|_| CallFailure::Admission)?;
        let mut state: Vec<_> = copy.syntax.encode_utf16().collect();
        let mut questions = Map::new();
        for (index, (_, description)) in read.offered().map_err(ticket_error)?.enumerate() {
            state.extend(format!("\nMethod {}: ", index + 1).encode_utf16());
            state.extend(description.units());
            if !known[index] {
                questions.insert(
                    format!("learn{index}"),
                    json!({
                        "type": "choice",
                        "instructions": copy.question.replace("{number}", &(index + 1).to_string()),
                        "criteria": copy.criteria,
                    }),
                );
            }
        }
        let listed = Arc::new(JudgmentQuestions {
            values: Value::Object(questions),
            _custody: custody,
        });
        let job = format!("activity-learning:{}", uuid::Uuid::new_v4());
        let state = JsText::from_units(state);
        let request_id = format!("{job}:activity-learning");
        let request = model
            .judgment_request(
                &director.dispatch,
                budget,
                &stopped,
                deadline,
                &request_id,
                Judgment {
                    state: JudgmentState::ExactPrompt(&state),
                    questions: &listed.values,
                },
            )
            .await?;
        let context_digest = hex_bytes(&request.digest);
        drop(state);
        let parser = budget.clone();
        let billing = model.billing();
        let result = director
            .dispatch
            .submit(
                PreparedCall {
                    request,
                    allowance: AttemptRequest {
                        id: request_id,
                        actor,
                        job,
                        provider: InferenceClass::Jev,
                        category: "judgment",
                        stage: "activity-learning",
                        level: None,
                        background: true,
                        amount: model.amount_micro_usd,
                        ceiling,
                    },
                    requested_model: model.requested.clone(),
                    context_digest,
                    macrofold_billing_mode: billing.map(|binding| match binding.mode {
                        crate::provider_transport::macrofold::BillingMode::Managed => "managed",
                        crate::provider_transport::macrofold::BillingMode::Byok => "byok",
                    }),
                    deadline,
                    evidence_cut,
                    preview: None,
                },
                publication.clone(),
                stopped,
                decode_provider_bound(billing, true, budget.clone(), move |result| {
                    provider::decode_optional_attention(result, &listed.values, &parser)
                        .map_err(|_| CallFailure::Invalid)
                }),
            )
            .await?;
        for (index, judgment) in judgments
            .iter_mut()
            .enumerate()
            .filter(|(index, _)| !known[*index])
        {
            *judgment = match result.choice(&format!("learn{index}")) {
                Some("retain") => LearningJudgment::Retain,
                Some("decline") => LearningJudgment::Decline,
                _ => LearningJudgment::Uncertain,
            };
        }
    }
    publication
        .publish(judgments, false)
        .await
        .map_err(CallFailure::World)
}
