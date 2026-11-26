//! Load an authorized inventory history cut without occupying the world turn.

use super::*;
use crate::store::object_history::ObjectHistoryRows;

impl HostedWorld {
    pub(crate) async fn object_history(
        self: &Arc<Self>,
        authority: Arc<Authority>,
        selected: Arc<AuthorizedScope>,
        after: String,
        object: Option<String>,
        publish: impl FnOnce(ObjectHistoryRows, &ByteBudget) -> Result<axum::body::Bytes, RuntimeError>,
    ) -> Result<Option<axum::body::Bytes>, WorldError> {
        let read = {
            let _turn = self.enter().await?;
            let (authority, scope, position, filter) = (
                authority.clone(),
                selected.clone(),
                after.clone(),
                object.clone(),
            );
            self.call(move |session| {
                Ok(authority.current_view(&scope, |permit, _| {
                    session
                        .capture_object_history(
                            &permit.account_id,
                            &permit.actor_id,
                            &position,
                            filter.as_deref(),
                        )?
                        .ok_or_else(|| WorldError::Access(AccessError::Forbidden))
                }))
            })
            .await???
        };
        let (origin, rows) = self.store.read_object_history(read, after, object).await?;
        self.disclose_inventory_read(&authority, &selected, |session, scope, _| {
            session
                .publish_object_history(&scope.account_id, &scope.actor_id, &origin, || {
                    publish(rows, self.host.budget())
                })?
                .transpose()
        })
        .await
    }
}
