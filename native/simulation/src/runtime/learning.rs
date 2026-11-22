//! Opaque learning preparation may survive model waits and repeated dispatch /
//! judgment publication. Only its native batch supplies occurrences or methods.
use super::*;
use crate::capture::maintenance::{MaintenanceAdmission, MaintenancePurpose, available};
use std::mem::size_of;

pub struct RuntimeActivityLearning {
    key: Option<CandidateKey>,
    batch: Option<Arc<crate::activity::PreparedActivityLearning>>,
    privacy_revision: u64,
    host_generation: u64,
    _storage: ByteReservation,
}
pub enum RuntimeActivityLearningStep {
    Continue,
    Provider(RuntimeProvider),
    Complete,
}
impl RuntimeActivityLearning {
    pub fn key(&self) -> Option<CandidateKey> {
        self.key
    }
    fn prepared(&self) -> Result<&crate::activity::PreparedActivityLearning, RuntimeError> {
        self.batch
            .as_deref()
            .ok_or_else(|| failure("learning preparation is unfinished"))
    }
    pub fn actor_id(&self) -> Result<&str, RuntimeError> {
        Ok(self.prepared()?.actor_id())
    }
    pub fn accepted_cut(&self) -> Result<u64, RuntimeError> {
        Ok(self.prepared()?.accepted_cut())
    }
    pub fn capacity_blocked(&self) -> Result<bool, RuntimeError> {
        Ok(self.prepared()?.capacity_blocked())
    }
    pub fn offered(
        &self,
    ) -> Result<impl ExactSizeIterator<Item = (&str, &crate::text::JsText)>, RuntimeError> {
        Ok(self.prepared()?.offered())
    }
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        RuntimeJson::encode(
            self.batch
                .as_ref()
                .ok_or_else(|| failure("learning preparation is unfinished"))?,
            budget,
        )
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Actor {
    actor_id: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Publication {
    judgments: Vec<crate::activity::LearningJudgment>,
    dispatched: bool,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    admission: Option<MaintenanceAdmission>,
}
impl NativeWorldSession {
    pub fn activity_learning_due(&self, actor: &str) -> Result<Option<String>, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let due = !state.physical.header.paused
            && state
                .activity
                .learning
                .get(actor)
                .is_some_and(|cursor| !cursor.pending.is_empty())
            && learning_idle(state, actor)
            && available(state, actor, MaintenancePurpose::Maintenance).map_err(failure)?;
        Ok(due.then(|| state.generation.clone()))
    }

    pub fn prepare_activity_learning(
        &mut self,
        input: &[u8],
    ) -> Result<RuntimeActivityLearning, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let Actor { actor_id } = serde_json::from_slice(input).map_err(failure)?;
        self.prepare_activity_learning_direct(&actor_id)
    }

    pub fn prepare_activity_learning_direct(
        &mut self,
        actor_id: &str,
    ) -> Result<RuntimeActivityLearning, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let privacy_revision = state
            .experience
            .actor(actor_id)
            .map_or(0, |actor| actor.privacy.revision());
        let storage = self
            .budget
            .reserve(size_of::<RuntimeActivityLearning>())
            .map_err(failure)?;
        let key = self
            .session
            .begin_learning_preparation(actor_id)
            .map_err(failure)?;
        Ok(RuntimeActivityLearning {
            key: Some(key),
            batch: None,
            privacy_revision,
            host_generation: key.generation,
            _storage: storage,
        })
    }
    pub fn step_activity_learning(
        &mut self,
        read: &mut RuntimeActivityLearning,
        answer: Option<(&RuntimeProvider, RuntimeProviderInput)>,
    ) -> Result<RuntimeActivityLearningStep, RuntimeError> {
        let key = read
            .key
            .filter(|key| self.session.is_learning_preparation(*key))
            .ok_or_else(|| failure("learning preparation is stale"))?;
        let answer = provider_response(answer, &self.budget)?;
        let step = self.session.step(
            key,
            answer,
            crate::experience::HistorySettings {
                policy_id: &self.history_policy_id,
                policy_revision: self.history_policy_revision,
            },
        );
        let step = match step {
            Ok(value) => value,
            Err(error) => {
                if !self.session.is_learning_preparation(key) {
                    read.key = None;
                }
                return Err(failure(error));
            }
        };
        Ok(match step {
            SessionStep::Continue => RuntimeActivityLearningStep::Continue,
            SessionStep::Question(question) => match self.prepare_provider(key, question) {
                Ok(provider) => RuntimeActivityLearningStep::Provider(provider),
                Err(error) => {
                    read.key = None;
                    return Err(error);
                }
            },
            SessionStep::LearningBatch(batch) => {
                read.key = None;
                read.batch = Some(batch);
                RuntimeActivityLearningStep::Complete
            }
            _ => {
                return Err(failure(
                    "learning preparation returned an executable completion",
                ));
            }
        })
    }
    pub fn cancel_activity_learning(
        &mut self,
        read: &RuntimeActivityLearning,
    ) -> Result<(), RuntimeError> {
        if let Some(key) = read
            .key
            .filter(|key| self.session.is_learning_preparation(*key))
        {
            self.session.cancel(key).map_err(failure)?;
        }
        Ok(())
    }
    pub fn begin_activity_learning_publication(
        &mut self,
        read: &RuntimeActivityLearning,
        input: &[u8],
        admission: Option<&RuntimeMaintenanceRead>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if !self.work_is_current(read.host_generation) {
            return Err(stale("activity-learning-maintenance-boundary"));
        }
        if read.key.is_some() {
            return Err(failure("learning preparation is unfinished"));
        }
        let _decode = decode_preparation(input, &self.budget)?;
        let publication: Publication = serde_json::from_slice(input).map_err(failure)?;
        let admission = match (admission, publication.admission) {
            (None, None) => None,
            (Some(read), Some(admission)) => Some((Arc::clone(&read.read), admission)),
            _ => {
                return Err(failure(
                    "learning publication lost its maintenance admission",
                ));
            }
        };
        let request = crate::activity::LearningPublicationRequest {
            judgments: publication.judgments,
            dispatched: publication.dispatched,
            protected: false,
        };
        self.session
            .begin_learning_publication(
                Arc::clone(
                    read.batch
                        .as_ref()
                        .ok_or_else(|| failure("learning preparation is unfinished"))?,
                ),
                request,
                admission,
            )
            .map_err(failure)
    }
    pub fn acquired_activity_signatures(&self, input: &[u8]) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let Actor { actor_id } = serde_json::from_slice(input).map_err(failure)?;
        let (signatures, storage) = crate::activity::learning_signatures(
            &self.session.accepted().map_err(failure)?.state,
            &actor_id,
            &self.budget,
        )
        .map_err(failure)?;
        let output = RuntimeJson::encode(&signatures, &self.budget)?;
        drop(storage);
        Ok(output)
    }

    pub fn activity_learning_known(
        &self,
        read: &RuntimeActivityLearning,
    ) -> Result<(Vec<bool>, ByteReservation), RuntimeError> {
        self.require_active()?;
        let (existing, _storage) = crate::activity::learning_signatures(
            &self.session.accepted().map_err(failure)?.state,
            read.actor_id()?,
            &self.budget,
        )
        .map_err(failure)?;
        let offers = read.offered()?;
        let storage = self.budget.reserve(offers.len() * size_of::<bool>())?;
        Ok((
            offers
                .map(|(signature, _)| existing.contains(&signature))
                .collect(),
            storage,
        ))
    }

    pub fn begin_activity_learning_direct(
        &mut self,
        read: &RuntimeActivityLearning,
        judgments: Vec<crate::activity::LearningJudgment>,
        dispatched: bool,
        admission: &RuntimeMaintenanceRead,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if !self.work_is_current(read.host_generation) {
            return Err(stale("activity-learning-maintenance-boundary"));
        }
        let request = crate::activity::LearningPublicationRequest {
            judgments,
            dispatched,
            protected: true,
        };
        let state = &self.session.accepted().map_err(failure)?.state;
        if state
            .experience
            .actor(read.actor_id()?)
            .map_or(0, |actor| actor.privacy.revision())
            != read.privacy_revision
        {
            return Err(failure("activity learning sources changed"));
        }
        let batch = read
            .batch
            .clone()
            .ok_or_else(|| failure("learning preparation is unfinished"))?;
        self.session
            .begin_learning_publication(
                batch,
                request,
                Some((admission.read.clone(), learning_admission())),
            )
            .map_err(failure)
    }

    pub fn activity_learning_publication(
        &self,
        read: &RuntimeActivityLearning,
        admission: &RuntimeMaintenanceRead,
    ) -> Result<Option<RuntimeMaintenancePublication>, RuntimeError> {
        self.require_active()?;
        let state = &self.session.publication_read().map_err(failure)?.state;
        let actor = read.actor_id()?;
        let privacy = state
            .experience
            .actor(actor)
            .map_or(0, |actor| actor.privacy.revision());
        if state.physical.header.paused
            || !self.work_is_current(read.host_generation)
            || privacy != read.privacy_revision
            || !learning_idle(state, actor)
            || !admission
                .read
                .current(state, &learning_admission())
                .map_err(failure)?
            || !read
                .prepared()?
                .source_results_current(state, &self.budget)
                .map_err(failure)?
        {
            return Ok(None);
        }
        let storage = self
            .budget
            .reserve(size_of::<RuntimeMaintenancePublication>())?;
        RuntimeMaintenancePublication::admit(self.session.fence(), storage).map(Some)
    }
}

fn learning_admission() -> MaintenanceAdmission {
    MaintenanceAdmission {
        purpose: MaintenancePurpose::Maintenance,
        requires_body: true,
        dream_episode: None,
    }
}

fn learning_idle(state: &crate::simulation::SimulationState, actor: &str) -> bool {
    state
        .physical
        .entities
        .get(actor)
        .and_then(|entity| entity.actor.as_ref())
        .is_some_and(|actor| {
            actor.action.is_none()
                && !actor
                    .agency
                    .plan
                    .as_ref()
                    .is_some_and(|plan| plan.status == crate::plans::PlanStatus::Active)
        })
}
