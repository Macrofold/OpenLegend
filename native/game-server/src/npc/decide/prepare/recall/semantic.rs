//! Optional large-history retrieval. The funded query is private to the
//! decision's actor, and ranking returns exact candidate versions only.

use super::{
    super::{about_me, prompt_text},
    *,
};
use crate::{
    authority::{Authority, AuthorizedScope, Capability},
    decision_dispatch::{PreparedCall, ProviderDisclosure, decode_embeddings},
    store::{
        AttemptRequest, CommitError, InferenceClass, StoreError,
        recall::semantic::{SemanticQuery, SemanticScope},
    },
    world::{NpcDisclosure, NpcDisclosureTurn, WorldError},
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    experience::PersonalSourceRef,
    runtime::{RuntimeNpcConsumer, RuntimeNpcDecisionOrigin},
};
use serde::Serialize;
use tokio::sync::watch;

#[derive(Clone)]
struct QueryDisclosure {
    read: Arc<RuntimeNpcRead>,
    consumer: RuntimeNpcConsumer,
    player: Option<(Arc<Authority>, Arc<AuthorizedScope>)>,
    discovery: Option<Arc<crate::npc::discovery::DiscoveryDispatch>>,
}

impl QueryDisclosure {
    async fn recheck(&self, game: &CurrentServer, work: &Work) -> Result<(), CallFailure> {
        let turn = game
            .world
            .npc_disclosure_turn()
            .await
            .map_err(CallFailure::World)?;
        self.start(turn, &work.cancellation, &mut || ())
    }
}

impl ProviderDisclosure for QueryDisclosure {
    fn signed_source(&self) -> Option<&crate::authority::AuthorizedScope> {
        self.player.as_ref().map(|(_, scope)| scope.as_ref())
    }

    fn discovery(&self) -> Option<&crate::npc::discovery::DiscoveryDispatch> {
        self.discovery.as_deref()
    }

    fn start(
        &self,
        turn: NpcDisclosureTurn<'_>,
        stop: &watch::Receiver<bool>,
        start: &mut dyn FnMut(),
    ) -> Result<(), CallFailure> {
        if *stop.borrow() {
            return Err(CallFailure::Cancelled);
        }
        let send = || match turn
            .disclose_memory_query(&self.read, self.consumer, start)
            .map_err(CallFailure::World)?
        {
            Ok(()) => Ok(()),
            Err(NpcDisclosure::Busy) => Err(CallFailure::Stale("memory-query-publication-busy")),
            Err(NpcDisclosure::Refused(reason)) => Err(CallFailure::Stale(reason)),
        };
        match &self.player {
            Some((authority, scope)) => authority
                .current(scope, Capability::Play, true, |_, _| send())
                .map_err(CallFailure::Authority)?,
            None => send(),
        }
    }
}

pub(super) async fn rank(
    game: &Arc<CurrentServer>,
    dispatch: &Arc<DecisionDispatch>,
    model: &EmbeddingModel,
    work: &Work,
    origin: &RuntimeNpcDecisionOrigin<'_>,
) -> Result<Option<(Vec<PersonalSourceRef>, ByteReservation)>, CallFailure> {
    let budget = game.host.budget();
    let scope = Arc::new(SemanticScope {
        _custody: budget
            .reserve(
                size_of::<SemanticScope>()
                    + 96
                    + origin.world_id.len()
                    + origin.generation.len()
                    + origin.actor_id.len()
                    + model.model.len(),
            )
            .map_err(capacity)?,
        world: origin.world_id.to_owned(),
        generation: origin.generation.to_owned(),
        actor: origin.actor_id.to_owned(),
        model: model.model.clone(),
        dimensions: model.dimensions as i64,
        hard_bytes: 0,
    });
    if !game
        .store
        .semantic_query_needed(scope.clone(), origin.at, origin.identity_through)
        .await
        .map_err(store_failure)?
    {
        return Ok(None);
    }
    let query = match query_vector(game, dispatch, model, scope.clone(), work).await {
        Ok(Some(query)) => query,
        Ok(None) => return Ok(None),
        Err(error)
            if matches!(
                error.cause().1,
                CallFailure::Admission
                    | CallFailure::Existing
                    | CallFailure::Refused(_)
                    | CallFailure::Invalid
                    | CallFailure::Transport(_)
                    | CallFailure::DecodeBusy
                    | CallFailure::Stale("memory-query-publication-busy")
            ) =>
        {
            return Ok(None);
        }
        Err(error) => return Err(error),
    };
    ensure_running(work)?;
    let ranked = game
        .store
        .semantic_recall(scope, origin.at, origin.identity_through, query)
        .await
        .map_err(store_failure)?;
    Ok(Some(ranked))
}

async fn query_vector(
    game: &Arc<CurrentServer>,
    dispatch: &Arc<DecisionDispatch>,
    model: &EmbeddingModel,
    scope: Arc<SemanticScope>,
    work: &Work,
) -> Result<Option<Arc<SemanticQuery>>, CallFailure> {
    ensure_running(work)?;
    let budget = game.host.budget();
    let consumer = consumer(work);
    let mut read = game
        .world
        .capture_npc_recall(game.clone(), &work.actor, consumer.as_str(), false)
        .await
        .map_err(CallFailure::World)?;
    let origin = read.decision_origin();
    if origin.generation != scope.generation
        || origin.world_id != scope.world
        || origin.actor_id != scope.actor
    {
        return Err(CallFailure::Stale("memory-query-scope"));
    }
    if !work.source.is_empty() {
        let size = work
            .source
            .iter()
            .try_fold(0usize, |bytes, source| {
                bytes
                    .checked_add(size_of::<NpcPersonalSelection>())?
                    .checked_add(source.id.len())?
                    .checked_add(source.revision.len())
            })
            .ok_or_else(|| capacity(CapacityError))?;
        let custody = budget.reserve(size).map_err(capacity)?;
        let select = NpcSourceSelection {
            personal: work
                .source
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
        read = game
            .world
            .select_npc_sources(game.clone(), read, select, custody)
            .await
            .map_err(CallFailure::World)?;
    }
    let data = if work.source.is_empty() {
        None
    } else {
        Some(read.personal_sources(budget).map_err(packet_failure)?)
    };
    if data
        .as_ref()
        .is_some_and(|data| !data.unavailable_personal.is_empty())
    {
        return Err(CallFailure::Stale("memory-query-source-changed"));
    }
    let own = read
        .current_self()
        .map_err(packet_failure)?
        .prompt()
        .ok_or(CallFailure::Invalid)?;
    let size = own
        .projection_bytes()
        .and_then(|n| {
            n.checked_add(4096 + 8 * data.as_ref().map_or(0, PersonalSources::admitted_bytes))
        })
        .ok_or_else(|| capacity(CapacityError))?;
    let _render = budget.reserve(size).map_err(capacity)?;
    let trigger = work.job.job.player_speech_event_id.as_deref().or_else(|| {
        work.automatic
            .as_ref()
            .and_then(|automatic| automatic.evidence.as_deref())
    });
    let stimulus = if let Some(trigger) = trigger {
        let event = data
            .as_ref()
            .and_then(|data| {
                data.personal.iter().find(|row| {
                    row.value.event_id.as_deref() == Some(trigger) || row.reference.id == trigger
                })
            })
            .ok_or(CallFailure::Stale("memory-query-source-changed"))?;
        personal_description(event)?.0
    } else {
        prompt_text(&work.job.job.request.text).into_owned()
    };
    let goal = own
        .goals
        .first()
        .map(|goal| prompt_text(&goal.objective))
        .unwrap_or_default();
    let identity = about_me(game, own)?;
    let query = format!("{stimulus}\nMy current goal: {goal}\n{identity}");
    if query.len() > 8_000 {
        return Ok(None);
    }
    #[derive(Serialize)]
    struct CacheIdentity<'a> {
        query: &'a str,
        generation: &'a str,
    }
    let digest = sha256_hex(
        json_record(&CacheIdentity {
            query: &query,
            generation: &scope.generation,
        })
        .map_err(invalid)?
        .as_bytes(),
    );
    drop(data);
    let evidence_cut = read.accepted_cut();
    let permit = QueryDisclosure {
        read: Arc::new(read),
        consumer,
        player: work.permit.clone(),
        discovery: work.discovery(),
    };
    if let Some(cached) = game
        .store
        .cached_semantic_query(scope.clone(), digest.clone())
        .await
        .map_err(store_failure)?
    {
        permit.recheck(game, work).await?;
        return Ok(Some(cached));
    }
    let id = format!("{}:memory-query", work.job.job.id);
    let (request, context_digest) = model.request(&[query.as_str()], &id, budget)?;
    let dimensions = model.dimensions;
    let price = model.input_usd_per_million;
    let priced_model = model.model.clone();
    let aliases = model.reported_aliases.clone();
    let decode_budget = budget.clone();
    let vector = dispatch
        .submit(
            PreparedCall {
                request,
                allowance: AttemptRequest {
                    id,
                    actor: work.actor.clone(),
                    job: work.job.job.id.clone(),
                    provider: InferenceClass::OpenAi,
                    category: "preparation",
                    stage: "memory-query",
                    level: None,
                    background: false,
                    amount: model.amount,
                    ceiling: model.ceiling,
                },
                requested_model: model.model.clone(),
                context_digest,
                macrofold_billing_mode: None,
                deadline: work.deadline(),
                evidence_cut,
                preview: None,
            },
            permit.clone(),
            work.cancellation.clone(),
            move |body, http| {
                decode_embeddings(
                    body,
                    http,
                    1,
                    dimensions,
                    price.map(|price| (priced_model.as_str(), &aliases[..], price)),
                    &decode_budget,
                )
            },
        )
        .await?;
    ensure_running(work)?;
    permit.recheck(game, work).await?;
    let vector = SemanticQuery::prepare(vector, scope.dimensions, budget).map_err(store_failure)?;
    let world = game.world.clone();
    let stop = work.cancellation.clone();
    let player = work.permit.clone();
    let read = permit.read.clone();
    let saved = game
        .store
        .save_semantic_query(scope, digest, vector.clone(), move || {
            if *stop.borrow() {
                return false;
            }
            let current = || world.memory_query_current(&read, consumer);
            match &player {
                Some((authority, scope)) => authority
                    .current(scope, Capability::Play, true, |_, _| current())
                    .unwrap_or(false),
                None => current(),
            }
        })
        .await;
    match saved {
        Ok(()) => (),
        // The optional writer cannot wait for a native turn while holding SQL.
        // A busy or changed cut rolls the cache back. Reauthorize outside SQL
        // before using the independently funded answer for this conversation.
        Err(CommitError::RolledBack(StoreError::StaleCut)) => permit.recheck(game, work).await?,
        Err(cause) => return Err(CallFailure::Commit(cause)),
    }
    Ok(Some(vector))
}

fn store_failure(error: StoreError) -> CallFailure {
    CallFailure::World(WorldError::Storage(error))
}
