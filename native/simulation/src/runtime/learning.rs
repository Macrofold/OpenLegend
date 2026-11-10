//! Opaque learning preparation may survive model waits and repeated dispatch /
//! judgment publication. Only its native batch supplies occurrences or methods.
use super::*;
use crate::capture::maintenance::MaintenanceAdmission;
use std::mem::size_of;

pub struct RuntimeActivityLearning {
    key: Option<CandidateKey>,
    batch: Option<Arc<crate::activity::PreparedActivityLearning>>,
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
    pub fn prepare_activity_learning(
        &mut self,
        input: &[u8],
    ) -> Result<RuntimeActivityLearning, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let Actor { actor_id } = serde_json::from_slice(input).map_err(failure)?;
        let storage = self
            .budget
            .reserve(size_of::<RuntimeActivityLearning>())
            .map_err(failure)?;
        let key = self
            .session
            .begin_learning_preparation(&actor_id)
            .map_err(failure)?;
        Ok(RuntimeActivityLearning {
            key: Some(key),
            batch: None,
            _storage: storage,
        })
    }
    pub fn step_activity_learning(
        &mut self,
        read: &mut RuntimeActivityLearning,
        answer: Option<(&RuntimeProvider, String)>,
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
}
