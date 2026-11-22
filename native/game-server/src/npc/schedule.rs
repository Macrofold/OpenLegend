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
    host::{ByteBudget, ByteReservation, CapacityError},
    records::ChangedRows,
    runtime::{NpcQueueInputs, RuntimeDirectOutput, RuntimeError},
};
use serde_json::json;
use std::{
    borrow::Cow,
    cmp::Ordering,
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tokio::{
    sync::{Notify, watch},
    time::Instant,
};

mod select;

pub(crate) struct ScheduleInbox {
    policy: Arc<crate::decision_render::DecisionPolicy>,
    budget: ByteBudget,
    queued: Mutex<Wake>,
    ordinary: bool,
    maintenance: Mutex<Wake>,
    maintenance_ready: Notify,
}

pub(crate) struct ScheduleWake(Mutex<Option<(Wake, Wake)>>);

#[derive(Default)]
pub(super) struct Wake {
    pub(super) all: bool,
    pub(super) actors: IndexMap<String, ActorWake>,
}

pub(super) struct ActorWake {
    pub(super) custody: ByteReservation,
    pub(super) reflection: bool,
}

impl ScheduleInbox {
    pub(crate) fn new(
        policy: Arc<crate::decision_render::DecisionPolicy>,
        budget: ByteBudget,
        ordinary: bool,
    ) -> Self {
        Self {
            policy,
            budget,
            queued: Mutex::new(Wake::default()),
            ordinary,
            maintenance: Mutex::new(Wake::default()),
            maintenance_ready: Notify::new(),
        }
    }

    /// Stage ownership from canonical changes at the existing pre-Ready
    /// application boundary. Only row identities are read; row bodies stay
    /// with their actual persistence and private evidence owners.
    pub(crate) fn stage(&self, changes: &ChangedRows) -> Result<ScheduleWake, RuntimeError> {
        let mut wake = Wake::default();
        let mut maintenance = Wake::default();
        let policy = &self.policy.scheduling;
        for (table, rows) in &changes.writes {
            if table.starts_with("config_") && !policy.actor_paths.contains_key(table) {
                wake.all = self.ordinary;
                maintenance.all = true;
            }
            for row in rows {
                self.actor(&mut wake, &mut maintenance, table, &row.id)?;
            }
        }
        for (table, ids) in &changes.deletes {
            for id in ids {
                self.actor(&mut wake, &mut maintenance, table, id)?;
            }
        }
        Ok(ScheduleWake(Mutex::new(Some((wake, maintenance)))))
    }

    fn actor(
        &self,
        wake: &mut Wake,
        maintenance: &mut Wake,
        table: &str,
        id: &str,
    ) -> Result<(), RuntimeError> {
        let changes_review = matches!(
            table,
            "sim_actors"
                | "sim_entities"
                | "sim_actor_conditions"
                | "sim_processes"
                | "sim_status_effects"
                | "mind_state"
                | "mind_awareness"
                | "mind_memories"
                | "mind_summaries"
                | "mind_privacy_revisions"
                | "activity_learning"
        );
        if !self.ordinary && !changes_review {
            return Ok(());
        }
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
        if let Some(actor) = index.and_then(|index| path.get(index)).map(Cow::as_ref) {
            if self.ordinary {
                wake.insert(actor, &self.budget)?;
            }
            if changes_review {
                maintenance.insert(actor, &self.budget)?;
            }
        }
        Ok(())
    }

    /// Consume at accepted publication, before another cut can be accepted.
    /// Newer wakes for the same resident reuse the pending ownership.
    pub(crate) fn accept(&self, wake: &ScheduleWake) {
        let Some((wake, maintenance)) = wake.0.lock().expect("NPC wake ownership").take() else {
            return;
        };
        if self.ordinary {
            self.queued.lock().expect("NPC wake queue").merge(wake);
        }
        self.notify_maintenance(maintenance);
    }

    pub(super) fn notify_maintenance(&self, maintenance: Wake) {
        if maintenance.all || !maintenance.actors.is_empty() {
            self.maintenance
                .lock()
                .expect("maintenance wake queue")
                .merge(maintenance);
            self.maintenance_ready.notify_one();
        }
    }

    fn take(&self) -> Wake {
        std::mem::take(&mut *self.queued.lock().expect("NPC wake queue"))
    }

    pub(super) fn take_maintenance(&self) -> Wake {
        std::mem::take(&mut *self.maintenance.lock().expect("maintenance wake queue"))
    }

    pub(super) async fn maintenance_ready(&self) {
        self.maintenance_ready.notified().await;
    }

    pub(super) fn reflection_wake(&self, actor: &str) -> Result<Wake, RuntimeError> {
        let mut wake = Wake::default();
        wake.insert(actor, &self.budget)?;
        wake.actors
            .get_mut(actor)
            .expect("inserted actor wake")
            .reflection = true;
        Ok(wake)
    }
}

impl Wake {
    fn insert(&mut self, actor: &str, budget: &ByteBudget) -> Result<(), RuntimeError> {
        if !self.actors.contains_key(actor) {
            let held = budget.reserve(512 + actor.len())?;
            self.actors.try_reserve(1).map_err(|_| CapacityError)?;
            self.actors.insert(
                actor.to_owned(),
                ActorWake {
                    custody: held,
                    reflection: false,
                },
            );
        }
        Ok(())
    }

    fn merge(&mut self, next: Self) {
        self.all |= next.all;
        for (actor, wake) in next.actors {
            self.actors
                .entry(actor)
                .and_modify(|held| held.reflection |= wake.reflection)
                .or_insert(wake);
        }
    }
}

struct ResidentWork {
    observed: NpcQueueInputs,
    wake: WakeTimes,
    first_cut: u64,
    dirty_since: Option<Instant>,
    order: u64,
    _entry_custody: ByteReservation,
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
    fn refresh(
        &mut self,
        observed: NpcQueueInputs,
        policy: &SchedulingPolicy,
        budget: &ByteBudget,
    ) -> Result<(), RuntimeError> {
        let actor = &observed.actor_id;
        if !observed.enrolled
            || observed.generation != self.generation
            || observed.world_id != self.world
        {
            self.work.remove(actor);
            return Ok(());
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
            } else {
                previous.observed.awareness_through = observed.awareness_through;
            }
        } else {
            let storage = budget.reserve(actor.len().checked_add(512).ok_or(CapacityError)?)?;
            self.work.try_reserve(1).map_err(|_| CapacityError)?;
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
                    _entry_custody: storage,
                },
            );
        }
        Ok(())
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
            // A pass can be committing the next opportunity and its durable
            // job together. Stop between passes so COMMIT keeps its owner.
            let result = self.scheduling_pass(&inbox, &mut queue).await;
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
        queue.dirty.extend(
            wake.actors
                .into_iter()
                .map(|(actor, wake)| (actor, wake.custody)),
        );
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
            let selection = policy.selection;
            let actor_id = actor.clone();
            let read = self
                .game
                .world
                .capture(move |session| {
                    if session.npc_schedule_enrolled(&actor_id)? {
                        session
                            .read_npc_queue_inputs_direct(actor_id, baseline, selection)
                            .map(Some)
                    } else {
                        Ok(None)
                    }
                })
                .await?;
            let Some(inputs) = read else {
                queue.work.remove(actor);
                queue.dirty.shift_remove_index(0);
                continue;
            };
            if let Some(reservation) = inputs.discovery_reservation.as_ref()
                && self.slots.available(&inputs.actor_id)?
            {
                let dispatched = self.game.store.discovery_spent(reservation.clone()).await?;
                self.change_discovery(&inputs.actor_id, &inputs.generation, json!({"type":"settle-discovery","reservation":reservation,"dispatched":dispatched})).await?;
            }
            queue.refresh(inputs, policy, &inbox.budget)?;
            queue.dirty.shift_remove_index(0);
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
            if let Some(wake) = self.inspect_work(work, policy, inbox).await? {
                queue.acknowledge(&actor, wake);
            }
        }
        Ok(())
    }

    async fn inspect_work(
        self: &Arc<Self>,
        work: &ResidentWork,
        policy: &SchedulingPolicy,
        inbox: &ScheduleInbox,
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
        let actor = observed.actor_id.clone();
        let after = prior.cursor.watermark.unwrap_or(0);
        let weighed = Some(observed.awareness_through);
        let selection = policy.selection;
        let (trigger, facts) = self
            .game
            .world
            .capture(move |session| session.read_npc_schedule(actor, after, weighed, selection))
            .await?;
        if !trigger.matches_queue(observed) {
            return Ok(None);
        }
        let _selection = facts
            .reserve_selection(self.game.host.budget())
            .map_err(RuntimeError::from)?;
        let trigger = Arc::new(trigger);
        let plan = select::Inspection::new(facts);
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
        let (at, accepted_cut, sequence) = (plan.at(), plan.through(), plan.sequence());
        drop(plan);
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
                    .accept_thought(world, generation, actor, prior, cursor, None, None)
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
                    text: proposal.text,
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
                .max(sequence)
                .min(durably_known),
        );
        let cue = proposal
            .reflection_cue
            .filter(|_| {
                self.models
                    .as_ref()
                    .is_some_and(|models| models.routes.fast.is_some())
            })
            .map(|index| sources.references[index].clone());
        let mut reflection_wake = Wake::default();
        if cue.is_some() && self.reflection_model.is_some() {
            reflection_wake = inbox.reflection_wake(&actor)?;
        }
        store
            .accept_thought(
                world,
                generation.clone(),
                actor.clone(),
                prior,
                cursor,
                Some(job.clone()),
                cue,
            )
            .await
            .map_err(WorldError::Commit)?;
        inbox.notify_maintenance(reflection_wake);
        if proposal.discovery.is_some() {
            wake.discovery_at = policy.next_discovery_check(at);
        }
        let controller = self.clone();
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
