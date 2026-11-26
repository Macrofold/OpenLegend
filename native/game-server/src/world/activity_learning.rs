use super::*;
use crate::boot::CurrentServer;
use crate::store::activity_learning::PreparedActivityHistory;
use openlegend_simulation::runtime::{
    RuntimeActivityLearning, RuntimeActivityLearningStep, RuntimeNpcPreparationStep,
};

impl HostedWorld {
    pub(crate) async fn capture_activity_learning(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        actor: String,
    ) -> Result<RuntimeActivityLearning, WorldError> {
        let actor_storage = self
            .host
            .budget()
            .reserve(actor.len())
            .map_err(RuntimeError::from)?;
        self.prepare_actor_read(
            game,
            move |session| {
                let _actor = actor_storage;
                session.prepare_activity_learning_direct(&actor)
            },
            |_, read| {
                read.key()
                    .ok_or_else(|| RuntimeError::application_refused(StoreError::StaleCut))
            },
            |session, read, _, answer| {
                Ok(match session.step_activity_learning(read, answer)? {
                    RuntimeActivityLearningStep::Continue => RuntimeNpcPreparationStep::Continue,
                    RuntimeActivityLearningStep::Provider(question) => {
                        RuntimeNpcPreparationStep::Provider(question)
                    }
                    RuntimeActivityLearningStep::Complete => RuntimeNpcPreparationStep::Complete,
                })
            },
        )
        .await
    }

    pub(crate) async fn prepare_activity_history(
        self: &Arc<Self>,
        question: RuntimeProvider,
    ) -> Result<(RuntimeProvider, PreparedActivityHistory), WorldError> {
        let store = self.store.clone();
        let (question, prepared) = self
            .call(move |session| {
                let prepared = session.with_activity_history_read(&question, |cut| {
                    store.prepare_activity_history(cut)
                })?;
                Ok((question, prepared))
            })
            .await?;
        Ok((question, prepared.ok_or(WorldError::ProviderKind)??))
    }
}
