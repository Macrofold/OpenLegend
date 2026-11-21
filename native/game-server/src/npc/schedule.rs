//! Select optional model work from the native received record. Queue entries
//! are coalesced wakeups; only the original Rust trigger and source references
//! can authorize preparation or pay for a provider attempt.
use super::{
    Director,
    decide::AutomaticTrigger,
    slots::{Admission, SlotPriority},
};
use crate::{
    authority::now_ms,
    decision_render::SchedulingPolicy,
    player_events::SpeechReplyStatus,
    store::{AdmittedJob, CommitError, ConversationJob, JobRequest, StoreError},
    world::{ApplicationStart, WorldError},
};
use indexmap::IndexMap;
use openlegend_simulation::{
    encoding::json_tree_allocation_bound,
    host::{ByteBudget, ByteReservation, CapacityError},
    records::ChangedRows,
    runtime::{RuntimeDirectOutput, RuntimeError},
};
use serde::Deserialize;
use serde_json::json;
use std::{
    borrow::Cow,
    cmp::Ordering,
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tokio::{sync::watch, time::Instant};

mod select;

pub(crate) struct ScheduleInbox {
    policy: Arc<crate::decision_render::DecisionPolicy>,
    budget: ByteBudget,
    queued: Mutex<Wake>,
}

pub(crate) struct ScheduleWake(Mutex<Option<Wake>>);

#[derive(Default)]
struct Wake {
    all: bool,
    actors: IndexMap<String, ByteReservation>,
}

impl ScheduleInbox {
    pub(crate) fn new(
        policy: Arc<crate::decision_render::DecisionPolicy>,
        budget: ByteBudget,
    ) -> Self {
        Self {
            policy,
            budget,
            queued: Mutex::new(Wake::default()),
        }
    }

    /// Stage ownership from canonical changes at the existing pre-Ready
    /// application boundary. Only row identities are read; row bodies stay
    /// with their actual persistence and private evidence owners.
    pub(crate) fn stage(&self, changes: &ChangedRows) -> Result<ScheduleWake, RuntimeError> {
        let mut wake = Wake::default();
        let policy = &self.policy.scheduling;
        for (table, rows) in &changes.writes {
            if table.starts_with("config_") && !policy.actor_paths.contains_key(table) {
                wake.all = true;
            }
            for row in rows {
                self.actor(&mut wake, table, &row.id)?;
            }
        }
        for (table, ids) in &changes.deletes {
            for id in ids {
                self.actor(&mut wake, table, id)?;
            }
        }
        Ok(ScheduleWake(Mutex::new(Some(wake))))
    }

    fn actor(&self, wake: &mut Wake, table: &str, id: &str) -> Result<(), RuntimeError> {
        // Source's fallback applies specifically to identities of physical
        // entities. Other shared owners cannot wake a fabricated actor.
        let field = self.policy.scheduling.actor_paths.get(table).copied();
        let _parsing = self
            .budget
            .reserve(128 + id.len().checked_mul(8).ok_or(CapacityError)?)?;
        let path: Vec<Cow<'_, str>> =
            serde_json::from_str(id).map_err(RuntimeError::application_refused)?;
        let index = field.or_else(|| {
            path.get(1)
                .is_some_and(|value| value == "entities")
                .then_some(2)
        });
        if let Some(actor) = index.and_then(|index| path.get(index)).map(Cow::as_ref)
            && !wake.actors.contains_key(actor)
        {
            let held = self.budget.reserve(512 + actor.len())?;
            wake.actors.try_reserve(1).map_err(|_| CapacityError)?;
            wake.actors.insert(actor.to_owned(), held);
        }
        Ok(())
    }

    /// Consume at accepted publication, before another cut can be accepted.
    /// Newer wakes for the same resident reuse the pending ownership.
    pub(crate) fn accept(&self, wake: &ScheduleWake) {
        let Some(wake) = wake.0.lock().expect("NPC wake ownership").take() else {
            return;
        };
        let mut queued = self.queued.lock().expect("NPC wake queue");
        queued.all |= wake.all;
        queued.actors.extend(wake.actors);
    }

    fn take(&self) -> Wake {
        std::mem::take(&mut *self.queued.lock().expect("NPC wake queue"))
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Inputs {
    actor_id: String,
    world_id: String,
    generation: String,
    accepted_cut: u64,
    at: f64,
    enrolled: bool,
    eligible: bool,
    values: Vec<String>,
    dependency_token: String,
    awareness_through: u64,
    urgency: f64,
    discovery: Option<Discovery>,
}

#[derive(Deserialize)]
struct Discovery {
    state: String,
    reservation: Option<String>,
}

struct ResidentWork {
    observed: Inputs,
    wake: WakeTimes,
    first_cut: u64,
    dirty_since: Option<Instant>,
    order: u64,
    _custody: ByteReservation,
}

#[derive(Clone, Copy)]
struct WakeTimes {
    inspect_at: f64,
    discovery_at: f64,
}

#[derive(Default)]
struct Queue {
    world: String,
    generation: String,
    next_order: u64,
    work: HashMap<String, ResidentWork>,
    dirty: IndexMap<String, ByteReservation>,
}

impl Queue {
    fn refresh(&mut self, observed: Inputs, custody: ByteReservation, policy: &SchedulingPolicy) {
        let actor = &observed.actor_id;
        if !observed.enrolled
            || observed.generation != self.generation
            || observed.world_id != self.world
        {
            self.work.remove(actor);
            return;
        }
        if let Some(previous) = self.work.get_mut(actor) {
            if previous.observed.values != observed.values
                || previous.observed.dependency_token != observed.dependency_token
            {
                if previous.dirty_since.is_none() {
                    previous.dirty_since = Some(Instant::now());
                    previous.first_cut = observed.accepted_cut;
                }
                let urgency = previous.observed.urgency.max(observed.urgency);
                previous.observed = observed;
                previous.observed.urgency = urgency;
                previous._custody = custody;
            } else {
                previous.observed.awareness_through = observed.awareness_through;
            }
        } else {
            self.next_order += 1;
            self.work.insert(
                actor.clone(),
                ResidentWork {
                    first_cut: observed.accepted_cut,
                    wake: WakeTimes {
                        inspect_at: f64::INFINITY,
                        discovery_at: policy.next_discovery_check(observed.at),
                    },
                    observed,
                    dirty_since: Some(Instant::now()),
                    order: self.next_order,
                    _custody: custody,
                },
            );
        }
    }

    fn acknowledge(&mut self, actor: &str, wake: WakeTimes) {
        if let Some(work) = self.work.get_mut(actor) {
            work.dirty_since = None;
            work.observed.urgency = 0.;
            work.wake = wake;
        }
    }
}

impl Director {
    pub(crate) async fn run_schedule(
        self: Arc<Self>,
        inbox: Arc<ScheduleInbox>,
        mut stop: watch::Receiver<bool>,
    ) {
        let Some(models) = self.models.as_ref() else {
            return;
        };
        if models.routes.ceiling_micro_usd == 0 {
            return;
        }
        let mut publications = self.saves.subscribe();
        let mut queue = Queue::default();
        loop {
            if *stop.borrow() {
                return;
            }
            let result = tokio::select! {
                biased;
                _ = stop.changed() => return,
                result = self.scheduling_pass(&inbox, &mut queue) => result,
            };
            match result {
                Ok(())
                | Err(WorldError::Host(
                    openlegend_world_host::pool::HostError::Busy
                    | openlegend_world_host::pool::HostError::Capacity,
                ))
                | Err(WorldError::Fence(openlegend_simulation::host::FenceError::Busy))
                | Err(WorldError::Storage(StoreError::Capacity | StoreError::StaleCut))
                | Err(WorldError::Commit(CommitError::RolledBack(
                    StoreError::Capacity | StoreError::StaleCut,
                ))) => {
                    // A refused attempt leaves the wake unacknowledged. Only
                    // a confirmed rollback is eligible for a later pass.
                }
                Err(WorldError::Simulation(error)) if error.is_busy() || error.is_capacity() => {}
                Err(error) => {
                    eprintln!("NPC scheduling stopped: {error}");
                    return;
                }
            }
            tokio::select! {
                _ = stop.changed() => return,
                changed = publications.changed() => if changed.is_err() { return; },
            }
        }
    }

    async fn scheduling_pass(
        self: &Arc<Self>,
        inbox: &ScheduleInbox,
        queue: &mut Queue,
    ) -> Result<(), WorldError> {
        let policy = &self.game.cognition.scheduling;
        let (generation, clock) = self
            .game
            .world
            .capture(|session| {
                Ok((
                    session.accepted_progress()?.generation.to_owned(),
                    session.clock()?,
                ))
            })
            .await?;
        let wake = inbox.take();
        let complete = wake.all;
        queue.dirty.extend(wake.actors);
        if queue.generation != generation || complete || queue.world.is_empty() {
            let population = self
                .game
                .world
                .capture(|session| session.npc_schedule_population())
                .await?;
            if queue.generation != population.generation {
                *queue = Queue {
                    world: population.world.clone(),
                    generation: population.generation.clone(),
                    ..Queue::default()
                };
            }
            for actor in &population.actors {
                if !queue.dirty.contains_key(actor) {
                    queue.dirty.insert(
                        actor.clone(),
                        inbox
                            .budget
                            .reserve(512 + actor.len())
                            .map_err(RuntimeError::from)?,
                    );
                }
            }
        }
        if clock.paused {
            return Ok(());
        }

        for _ in 0..policy.reads_per_pass {
            let Some((actor, _wake)) = queue.dirty.get_index(0) else {
                break;
            };
            let baseline = queue
                .work
                .get(actor)
                .map(|work| work.observed.awareness_through);
            let bytes =
                request(&actor, 0, baseline, policy).map_err(RuntimeError::application_refused)?;
            let actor_id = actor.clone();
            let read = self
                .game
                .world
                .capture(move |session| {
                    if session.npc_schedule_enrolled(&actor_id)? {
                        session.read_npc_queue_inputs(&bytes).map(Some)
                    } else {
                        Ok(None)
                    }
                })
                .await?;
            let Some(read) = read else {
                queue.work.remove(actor);
                queue.dirty.shift_remove_index(0);
                continue;
            };
            let text =
                std::str::from_utf8(read.bytes()).map_err(RuntimeError::application_refused)?;
            let custody = self
                .game
                .host
                .budget()
                .reserve(
                    json_tree_allocation_bound(text)
                        .ok_or(CapacityError)
                        .map_err(RuntimeError::from)?
                        + 512,
                )
                .map_err(RuntimeError::from)?;
            let inputs: Inputs =
                serde_json::from_str(text).map_err(RuntimeError::application_refused)?;
            if let Some(discovery) = inputs.discovery.as_ref()
                && discovery.state == "reserved"
                && let Some(reservation) = discovery.reservation.as_ref()
                && self.slots.available(&inputs.actor_id)?
            {
                let dispatched = self.game.store.discovery_spent(reservation.clone()).await?;
                self.change_discovery(&inputs.actor_id, &inputs.generation, json!({"type":"settle-discovery","reservation":reservation,"dispatched":dispatched})).await?;
            }
            queue.dirty.shift_remove_index(0);
            queue.refresh(inputs, custody, policy);
        }

        let reserve_bytes = queue
            .work
            .len()
            .checked_mul(2 * std::mem::size_of::<&ResidentWork>())
            .ok_or(CapacityError)
            .map_err(RuntimeError::from)?;
        let _selection = self
            .game
            .host
            .budget()
            .reserve(reserve_bytes)
            .map_err(RuntimeError::from)?;
        let mut ready = queue
            .work
            .values()
            .filter(|work| {
                work.observed.eligible
                    && (work.dirty_since.is_some() || work.wake.inspect_at <= clock.at)
            })
            .collect::<Vec<_>>();
        let now = Instant::now();
        let ages = |work: &ResidentWork| {
            work.dirty_since
                .map_or(0, |at| now.saturating_duration_since(at).as_millis())
        };
        let priority = |work: &ResidentWork| {
            work.observed.urgency >= policy.urgent || ages(work) >= policy.aging_ms as u128
        };
        ready.sort_by(|a, b| {
            priority(b)
                .cmp(&priority(a))
                .then_with(|| match (a.dirty_since, b.dirty_since) {
                    (Some(a), Some(b)) => a.cmp(&b),
                    _ => Ordering::Equal,
                })
                .then_with(|| a.order.cmp(&b.order))
        });
        let work = ready.into_iter().find(|work| {
            self.slots
                .available_for_background(
                    &work.observed.actor_id,
                    work.observed.urgency >= policy.urgent,
                )
                .unwrap_or(false)
        });
        if let Some(work) = work {
            let actor = work.observed.actor_id.clone();
            if let Some(wake) = self.inspect_work(work, policy).await? {
                queue.acknowledge(&actor, wake);
            }
        }
        Ok(())
    }

    async fn inspect_work(
        self: &Arc<Self>,
        work: &ResidentWork,
        policy: &SchedulingPolicy,
    ) -> Result<Option<WakeTimes>, WorldError> {
        let observed = &work.observed;
        self.game
            .world
            .when_durable(work.first_cut, Instant::now())
            .await?;
        let store = &self.game.store;
        let prior = store
            .thought_read(
                observed.world_id.clone(),
                observed.generation.clone(),
                observed.actor_id.clone(),
            )
            .await?;
        let bytes = request(
            &observed.actor_id,
            prior.cursor.watermark.unwrap_or(0),
            Some(observed.awareness_through),
            policy,
        )
        .map_err(RuntimeError::application_refused)?;
        let trigger = Arc::new(
            self.game
                .world
                .capture(move |session| session.read_npc_trigger(&bytes))
                .await?,
        );
        let plan = trigger
            .with_schedule_facts(|text| select::Inspection::read(text, self.game.host.budget()))?;
        if !plan.matches(observed) {
            return Ok(None);
        }
        let speech_ids = plan.speech_ids();
        let prior = if speech_ids.is_empty() {
            prior
        } else {
            store
                .thought_speech(
                    observed.world_id.clone(),
                    observed.generation.clone(),
                    observed.actor_id.clone(),
                    prior,
                    speech_ids,
                )
                .await?
        };
        let proposal = plan
            .propose(
                policy,
                &prior,
                trigger.schedule_causes(),
                work.wake.discovery_at,
            )
            .map_err(RuntimeError::application_refused)?;
        let read = trigger.clone();
        let actor = observed.actor_id.clone();
        let wanted = proposal.references.clone();
        let Some(mut sources) = self
            .game
            .world
            .capture(move |session| session.npc_schedule_sources(&read, &actor, &wanted))
            .await?
        else {
            return Ok(None);
        };

        let mut wake = WakeTimes {
            inspect_at: proposal.next_at,
            discovery_at: work.wake.discovery_at,
        };
        let mut cursor = prior.cursor.clone();
        cursor.fingerprint = Some(proposal.fingerprint.clone());
        cursor.semantic_revision = Some(proposal.semantic_revision.clone());
        cursor.at = now_ms();
        let world = observed.world_id.clone();
        let generation = observed.generation.clone();
        let actor = observed.actor_id.clone();
        if !proposal.attempt {
            if cursor.semantic_revision != prior.cursor.semantic_revision || proposal.skipped {
                if proposal.skipped {
                    cursor.skipped_opportunity = Some(proposal.opportunity);
                }
                store
                    .accept_thought(world, generation, actor, prior, cursor, None)
                    .await
                    .map_err(WorldError::Commit)?;
            }
            return Ok(Some(wake));
        }
        let id = format!("thought-{}", uuid::Uuid::new_v4());
        let priority = if observed.urgency >= policy.urgent {
            SlotPriority::Foreground
        } else {
            SlotPriority::Ordinary
        };
        let Admission::Accepted(slot) =
            self.slots
                .select(&actor, &id, None, &generation, priority)?
        else {
            return Ok(None);
        };
        if let Some(interval) = proposal.discovery
            && !self
                .change_discovery(
                    &actor,
                    &generation,
                    json!({"type":"reserve-discovery","interval":interval,"reservation":id}),
                )
                .await?
        {
            return Ok(None);
        }
        let job = AdmittedJob::new(
            ConversationJob {
                id: id.clone(),
                fingerprint: proposal.fingerprint,
                kind: "thought".to_owned(),
                status: SpeechReplyStatus::Queued,
                message: "Considering a semantic event.".into(),
                authority: None,
                player_speech_event_id: None,
                retry_of: None,
                request: JobRequest {
                    text: proposal.text.into(),
                    npc_id: actor.clone(),
                    volume: None,
                },
                created_at: cursor.at,
                completed_at: None,
                outcome: None,
            },
            self.game.host.budget(),
        )?;
        cursor.attempted_opportunity = Some(proposal.opportunity);
        cursor.attempted_job_id = Some(id.clone());
        cursor.review_key = proposal.review_key;
        let durably_known = self
            .game
            .world
            .capture(|session| session.npc_schedule_durable_identity())
            .await?;
        cursor.watermark = Some(
            prior
                .cursor
                .watermark
                .unwrap_or(0)
                .max(plan.sequence())
                .min(durably_known),
        );
        store
            .accept_thought(
                world,
                generation.clone(),
                actor.clone(),
                prior,
                cursor,
                Some(job.clone()),
            )
            .await
            .map_err(WorldError::Commit)?;
        if proposal.discovery.is_some() {
            wake.discovery_at = policy.next_discovery_check(plan.at());
        }
        let controller = self.clone();
        let accepted_cut = plan.through();
        let automatic = AutomaticTrigger {
            read: trigger,
            evidence: proposal.evidence,
            causes: proposal.causes,
        };
        self.start_job(async move {
            controller
                .run(
                    slot,
                    job,
                    std::mem::take(&mut sources.references),
                    accepted_cut,
                    None,
                    Some(automatic),
                )
                .await;
            drop(sources);
            if proposal.discovery.is_some()
                && let Ok(dispatched) = controller.game.store.discovery_spent(id.clone()).await
            {
                // A failed admission leaves the accepted reservation under
                // the next sparse recovery pass, with the same attempt ID.
                let _ = controller
                    .change_discovery(
                        &actor,
                        &generation,
                        json!({"type":"settle-discovery","reservation":id,"dispatched":dispatched}),
                    )
                    .await;
            }
        })?;
        Ok(Some(wake))
    }

    async fn change_discovery(
        &self,
        actor: &str,
        generation: &str,
        operation: serde_json::Value,
    ) -> Result<bool, WorldError> {
        let _ordinary = self.saves.enter_ordinary().await;
        self.saves.check_admission(Instant::now())?;
        let generation = generation.to_owned();
        let request = serde_json::to_vec(&json!({"actorId": actor,"operation":operation}))
            .map_err(RuntimeError::application_refused)?;
        let game = self.game.clone();
        let stage = self.saves.clone();
        let accepted = self.saves.clone();
        self.game.world.request_advance_publication();
        let published = self
            .game
            .world
            .execute_and_publish(
                #[cfg(feature = "profile-campaign")]
                openlegend_simulation::profile::sites::TURN_NPC,
                move |session| {
                    let scope = session.accepted_progress()?;
                    if scope.generation != generation || scope.paused {
                        return Ok(ApplicationStart::Existing((false, None)));
                    }
                    Ok(ApplicationStart::Candidate(
                        session.begin_npc_intake(&request)?,
                    ))
                },
                move |question| {
                    let game = game.clone();
                    async move { game.answer_operation(question).await }
                },
                move |output, _| {
                    let RuntimeDirectOutput::Prepared(products) = output else {
                        return Err(RuntimeError::application_refused(
                            "NPC discovery prepared no result",
                        ));
                    };
                    Ok((products.outcome().ok, Some(stage.stage(&products, None)?)))
                },
                |fence, key, _| Ok(fence.settle(key, true)?),
                move |(_, save)| {
                    if let Some(save) = save {
                        accepted.accept(save);
                    }
                },
            )
            .await?;
        Ok(published.is_some_and(|(accepted, _)| accepted))
    }
}

fn request(
    actor: &str,
    after: u64,
    weighed: Option<u64>,
    policy: &SchedulingPolicy,
) -> Result<Vec<u8>, serde_json::Error> {
    let mut request = json!({"actorId":actor,"afterSequence":after,"selection":policy.selection});
    if let Some(weighed) = weighed {
        request["weighedThrough"] = json!(weighed);
    }
    serde_json::to_vec(&request)
}
