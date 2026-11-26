//! Exact owned item lookup and response preparation under one current tab.

use super::*;

mod object_history;

impl HostedWorld {
    pub(crate) async fn disclose_inventory<T>(
        &self,
        authority: &Authority,
        selected: &AuthorizedScope,
        ids: &[String],
        respond: impl FnOnce(&[openlegend_simulation::install::OwnedItem<'_>], &ByteBudget) -> T,
    ) -> Result<T, WorldError> {
        self.disclose_inventory_read(authority, selected, |session, scope, _| {
            session.with_player_inventory(&scope.account_id, &scope.actor_id, ids, respond)
        }).await
    }

    pub(crate) async fn disclose_inventory_read<T>(
        &self,
        authority: &Authority,
        selected: &AuthorizedScope,
        read: impl FnOnce(&NativeWorldSession, &crate::authority::RequestScope, bool) -> Result<T, RuntimeError>,
    ) -> Result<T, WorldError> {
        self.request_advance_publication();
        let _turn = self.enter().await?;
        authority
            .current_view(selected, |scope, controlling| {
                let session = match self.session.try_lock() {
                    Ok(session) => session,
                    Err(std::sync::TryLockError::WouldBlock) => return Err(HostError::Busy.into()),
                    Err(std::sync::TryLockError::Poisoned(_)) => {
                        return Err(HostError::Poisoned.into());
                    }
                };
                read(&session, scope, controlling).map_err(WorldError::from)
            })
            .map_err(WorldError::Access)?
    }
}
