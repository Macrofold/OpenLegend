//! Exact owned item lookup and response preparation under one current tab.

use super::*;

impl HostedWorld {
    pub(crate) async fn disclose_inventory<T>(
        &self,
        authority: &Authority,
        selected: &AuthorizedScope,
        ids: &[String],
        respond: impl FnOnce(&[openlegend_simulation::install::OwnedItem<'_>], &ByteBudget) -> T,
    ) -> Result<T, WorldError> {
        self.request_advance_publication();
        let _turn = self.enter().await?;
        authority
            .current_view(selected, |scope, _| {
                let session = match self.session.try_lock() {
                    Ok(session) => session,
                    Err(std::sync::TryLockError::WouldBlock) => return Err(HostError::Busy.into()),
                    Err(std::sync::TryLockError::Poisoned(_)) => {
                        return Err(HostError::Poisoned.into());
                    }
                };
                session
                    .with_player_inventory(&scope.account_id, &scope.actor_id, ids, respond)
                    .map_err(WorldError::from)
            })
            .map_err(WorldError::Access)?
    }
}
