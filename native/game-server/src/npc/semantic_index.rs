//! Funded personal-memory indexing through the ordinary provider dispatcher.

use crate::{
    boot::CurrentServer,
    decision_dispatch::{
        CallFailure, DecisionDispatch, PreparedCall, ProviderDisclosure, decode_embeddings,
    },
    provider_transport::ProviderDestination,
    store::{
        AttemptAdmission, AttemptRequest, CommitError, InferenceClass, Store, StoreError,
        recall::semantic::{SemanticClaim, SemanticScope},
    },
    world::{NpcDisclosure, NpcDisclosureTurn, WorldError},
};
use openlegend_simulation::{
    capture::{NpcPersonalSelection, NpcSourceSelection},
    encoding::{json_record, sha256_hex},
    host::ByteBudget,
    runtime::{NativeWorldSession, RuntimeError, RuntimeMemoryIndex},
};
use serde::Serialize;
use std::{mem::size_of, sync::Arc, time::Duration};
use tokio::{
    sync::{Notify, watch},
    time::Instant,
};

pub(crate) struct EmbeddingModel {
    pub(super) destination: ProviderDestination,
    pub(super) model: String,
    pub(super) dimensions: usize,
    pub(super) input_usd_per_million: Option<f64>,
    pub(super) reported_aliases: Arc<[String]>,
    pub(super) amount: u64,
    pub(super) ceiling: u64,
    pub(super) background_ceiling: u64,
    pub(super) timeout: Duration,
}

struct IndexDisclosure {
    read: Arc<RuntimeMemoryIndex>,
    claim: Arc<SemanticClaim>,
}

impl ProviderDisclosure for IndexDisclosure {
    fn reserve<'a>(
        &'a self,
        store: &'a Store,
        request: AttemptRequest,
    ) -> impl std::future::Future<Output = Result<AttemptAdmission, CommitError>> + Send + 'a {
        store.reserve_claimed_model(request, Some(self.claim.clone()))
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
            .disclose_memory_index(&self.read, start)
            .map_err(CallFailure::World)?
        {
            Ok(()) => Ok(()),
            Err(NpcDisclosure::Busy) => Err(CallFailure::Stale("memory-index-publication-busy")),
            Err(NpcDisclosure::Refused(reason)) => Err(CallFailure::Stale(reason)),
        }
    }
}

/// A durable source-change wake owns one round over the installed NPC roster.
/// One actor consumes at most one paid batch per round. Empty queues sleep.
pub(crate) async fn run(
    game: Arc<CurrentServer>,
    dispatch: Arc<DecisionDispatch>,
    model: Option<Arc<EmbeddingModel>>,
    wake: Arc<Notify>,
    mut stop: watch::Receiver<bool>,
) {
    let Some(model) = model.filter(|model| model.background_ceiling >= model.amount) else {
        return;
    };
    let mut roster = Vec::<Arc<SemanticScope>>::new();
    let mut _roster_custody = None;
    let mut round = true;
    while !*stop.borrow() {
        if !round {
            tokio::select! { _ = stop.changed() => return, _ = wake.notified() => {} }
        }
        round = false;
        let result = async {
            let Some(head) = game.store.protected_edit_head().await? else {
                return Ok(false);
            };
            if game.world.capture(NativeWorldSession::clock).await?.paused {
                return Ok(false);
            }
            if roster
                .first()
                .is_none_or(|scope| scope.generation != head.generation)
            {
                let population = game
                    .world
                    .capture(NativeWorldSession::npc_schedule_population)
                    .await?;
                let hard = game
                    .world
                    .capture(NativeWorldSession::recall_hard_bytes)
                    .await?;
                let storage = game
                    .host
                    .budget()
                    .reserve(population.actors.len() * size_of::<Arc<SemanticScope>>())
                    .map_err(RuntimeError::from)?;
                let mut registered = Vec::with_capacity(population.actors.len());
                for actor in &population.actors {
                    if *stop.borrow() {
                        return Ok(false);
                    }
                    let charge = size_of::<SemanticScope>()
                        + 96
                        + actor.len()
                        + population.world.len()
                        + population.generation.len()
                        + model.model.len();
                    let scope = Arc::new(SemanticScope {
                        _custody: game
                            .host
                            .budget()
                            .reserve(charge)
                            .map_err(RuntimeError::from)?,
                        world: population.world.clone(),
                        generation: population.generation.clone(),
                        actor: actor.clone(),
                        model: model.model.clone(),
                        dimensions: model.dimensions as i64,
                        hard_bytes: hard,
                    });
                    game.store
                        .register_semantic(scope.clone())
                        .await
                        .map_err(WorldError::Commit)?;
                    registered.push(scope);
                }
                registered.sort_unstable_by(|left, right| left.actor.cmp(&right.actor));
                roster = registered;
                _roster_custody = Some(storage);
            }
            let Some(anchor) = roster.first() else {
                return Ok(false);
            };
            let mut progress = false;
            let mut after = None::<(String, openlegend_simulation::host::ByteReservation)>;
            while !*stop.borrow() {
                let (cursor, _cursor) = after
                    .take()
                    .map_or((None, None), |(text, storage)| (Some(text), Some(storage)));
                let (mut due, mut custody) =
                    game.store.semantic_due(anchor.clone(), cursor).await?;
                if due.is_empty() {
                    break;
                }
                for actor in &due {
                    if *stop.borrow() {
                        break;
                    }
                    let Ok(index) = roster.binary_search_by(|scope| scope.actor.cmp(actor)) else {
                        continue;
                    };
                    match batch(
                        &game,
                        &dispatch,
                        &model,
                        roster[index].clone(),
                        stop.clone(),
                    )
                    .await
                    {
                        Ok(ran) => progress |= ran,
                        Err(error)
                            if matches!(
                                error.cause().1,
                                CallFailure::Admission
                                    | CallFailure::Existing
                                    | CallFailure::Cancelled
                                    | CallFailure::Stale(_)
                            ) =>
                        {
                            ()
                        }
                        Err(error) => eprintln!("Memory embedding attempt stopped: {error}"),
                    }
                }
                if due.len() < 64 {
                    break;
                }
                let cursor = due.pop().expect("a full due page has a continuation");
                drop(due);
                custody
                    .resize(size_of::<String>() + cursor.capacity())
                    .map_err(RuntimeError::from)?;
                after = Some((cursor, custody));
            }
            Ok::<_, WorldError>(progress)
        }
        .await;
        match result {
            Ok(progress) => round = progress,
            Err(error) => eprintln!("Memory embedding work deferred: {error}"),
        }
    }
}

async fn batch(
    game: &Arc<CurrentServer>,
    dispatch: &Arc<DecisionDispatch>,
    model: &EmbeddingModel,
    scope: Arc<SemanticScope>,
    stop: watch::Receiver<bool>,
) -> Result<bool, CallFailure> {
    let store_failure = |error| CallFailure::World(WorldError::Storage(error));
    let pending = game
        .store
        .pending_semantic(scope.clone())
        .await
        .map_err(store_failure)?;
    if pending.sources.is_empty() {
        return Ok(false);
    }
    let budget = game.host.budget();
    let size = pending
        .custody
        .bytes()
        .checked_add(pending.sources.len() * size_of::<NpcPersonalSelection>())
        .ok_or_else(|| store_failure(StoreError::Capacity))?;
    let selection = budget
        .reserve(size)
        .map_err(|_| store_failure(StoreError::Capacity))?;
    let references = NpcSourceSelection {
        personal: pending
            .sources
            .iter()
            .cloned()
            .map(|reference| NpcPersonalSelection {
                reference,
                through: None,
            })
            .collect(),
        receipts: Vec::new(),
        consolidation_job: None,
    };
    let prefix = game.store.summary_memory_prefix();
    let prefix_custody = budget
        .reserve(prefix.len())
        .map_err(|_| store_failure(StoreError::Capacity))?;
    let prefix = prefix.to_owned();
    let target = scope.clone();
    let read = game
        .world
        .prepare_actor_read(
            game.clone(),
            move |world| {
                let _prefix = prefix_custody;
                world.prepare_memory_index(
                    &target.world,
                    &target.generation,
                    &target.actor,
                    references,
                    selection,
                    prefix,
                    [8_000, 64_000],
                )
            },
            NativeWorldSession::begin_memory_index,
            NativeWorldSession::step_memory_index,
        )
        .await
        .map_err(CallFailure::World)?;
    let read = Arc::new(read);
    if read.ordinals().is_empty() {
        return Ok(false);
    }
    let mut claim_storage = pending.custody;
    claim_storage
        .resize(
            claim_storage.bytes()
                + 512
                + read.ordinals().len()
                    * (size_of::<usize>()
                        + size_of::<&str>()
                        + size_of::<openlegend_simulation::experience::PersonalSourceRef>()),
        )
        .map_err(|_| store_failure(StoreError::Capacity))?;
    let mut claimed = Vec::with_capacity(read.ordinals().len());
    claimed.extend(
        pending
            .sources
            .into_iter()
            .enumerate()
            .filter_map(|(ordinal, source)| {
                read.ordinals()
                    .binary_search(&ordinal)
                    .is_ok()
                    .then_some(source)
            }),
    );
    let texts = read.texts().iter().map(String::as_str).collect::<Vec<_>>();
    let claim = SemanticClaim::new(scope, claimed, claim_storage).map_err(store_failure)?;
    let request_id = format!("memory-index:{}", uuid::Uuid::new_v4());
    let deadline = Instant::now() + model.timeout;
    let (request, context_digest) = model.request(&texts, &request_id, budget)?;
    let count = texts.len();
    let dimensions = model.dimensions;
    let price = model.input_usd_per_million;
    let priced_model = model.model.clone();
    let aliases = model.reported_aliases.clone();
    let decode_budget = budget.clone();
    let vectors = dispatch
        .submit(
            PreparedCall {
                request,
                allowance: AttemptRequest {
                    id: request_id.clone(),
                    actor: claim.scope.actor.clone(),
                    job: request_id.clone(),
                    provider: InferenceClass::OpenAi,
                    category: "preparation",
                    stage: "memory-index",
                    level: None,
                    background: true,
                    amount: model.amount,
                    ceiling: model.background_ceiling,
                },
                requested_model: model.model.clone(),
                context_digest,
                macrofold_billing_mode: None,
                deadline,
                evidence_cut: read.accepted_cut(),
                preview: None,
            },
            IndexDisclosure {
                read: read.clone(),
                claim: claim.clone(),
            },
            stop.clone(),
            move |body, http| {
                decode_embeddings(
                    body,
                    http,
                    count,
                    dimensions,
                    price.map(|price| (priced_model.as_str(), &aliases[..], price)),
                    &decode_budget,
                )
            },
        )
        .await?;
    if *stop.borrow() {
        return Err(CallFailure::Cancelled);
    }
    let turn = game
        .world
        .npc_disclosure_turn()
        .await
        .map_err(CallFailure::World)?;
    match turn
        .disclose_memory_index(&read, || ())
        .map_err(CallFailure::World)?
    {
        Ok(()) => (),
        Err(NpcDisclosure::Busy) => {
            return Err(CallFailure::Stale("memory-index-publication-busy"));
        }
        Err(NpcDisclosure::Refused(reason)) => return Err(CallFailure::Stale(reason)),
    }
    game.store
        .publish_semantic(claim, request_id, vectors, move || {
            !*stop.borrow() && read.sources_current()
        })
        .await
        .map_err(CallFailure::Commit)?;
    Ok(true)
}

impl EmbeddingModel {
    pub(super) fn request(
        &self,
        texts: &impl Serialize,
        id: &str,
        budget: &ByteBudget,
    ) -> Result<(crate::provider_transport::PreparedProviderRequest, String), CallFailure> {
        #[derive(Serialize)]
        struct Input<'a, T> {
            model: &'a str,
            input: &'a T,
            dimensions: usize,
            encoding_format: &'static str,
        }
        let _digest = budget
            .reserve(
                128 + 3 * openlegend_simulation::encoding::json_record_len(texts)
                    .map_err(|_| CallFailure::Invalid)?,
            )
            .map_err(|_| CallFailure::Invalid)?;
        let digest = sha256_hex(
            json_record(texts)
                .map_err(|_| CallFailure::Invalid)?
                .as_bytes(),
        );
        let body = Input {
            model: &self.model,
            input: texts,
            dimensions: self.dimensions,
            encoding_format: "float",
        };
        Ok((self.destination.inference(&body, Some(id), budget)?, digest))
    }
}
