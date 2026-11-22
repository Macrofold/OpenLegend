//! Hold only the inspected actor's cut while PostgreSQL reads exact rows,
//! then hand off one permitted private page under the live disclosure lease.

use super::*;
use openlegend_simulation::{activity::RuntimeActivityPage, text::JsText};

impl HostedWorld {
    pub(crate) async fn activity_history(
        self: &Arc<Self>,
        authority: Arc<Authority>,
        scope: Arc<AuthorizedScope>,
        actor: &str,
        after: i64,
        method_after: usize,
        historical_account: impl Fn(&JsText) -> JsText,
        encode: impl FnOnce(RuntimeActivityPage<'_>, &ByteBudget) -> Result<Bytes, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        let (mut read, prepared) = {
            let _turn = self.enter().await?;
            let (authority, scope, actor, store) = (
                authority.clone(),
                scope.clone(),
                actor.to_owned(),
                self.store.clone(),
            );
            self.call(move |session| {
                Ok(authority.current_private_view(
                    &scope,
                    actor != scope.scope.actor_id,
                    |permit, _| {
                        let (read, prepared) = session
                            .capture_activity_inspection(
                                &permit.account_id,
                                &permit.actor_id,
                                &actor,
                                after,
                                |cut| store.prepare_activity_rows(cut),
                            )?
                            .ok_or(AccessError::Forbidden)?;
                        Ok::<_, WorldError>((read, prepared?))
                    },
                ))
            })
            .await???
        };
        let (rows, custody) = self.store.read_activity_rows(prepared).await?;
        let store = self.store.clone();
        let (mut read, recent) = {
            let _turn = self.enter().await?;
            self.call(move |session| {
                let recent = session.prepare_activity_inspection_results(
                    &mut read,
                    rows,
                    custody,
                    |cut| store.prepare_recent_sources(cut),
                )?;
                Ok((read, recent))
            })
            .await?
        };
        if let Some(recent) = recent.ok_or(WorldError::ProjectionChanged)? {
            let rows = self.store.read_source_rows(recent?).await?;
            read = self
                .capture(move |session| {
                    let current = rows
                        .admit(|rows| session.admit_activity_inspection_results(&mut read, rows))?;
                    Ok(current.then_some(read))
                })
                .await?
                .ok_or(WorldError::ProjectionChanged)?;
        }

        let _turn = self.enter().await?;
        self.with_private_reader(&authority, &scope, actor, |session, _| {
            self.with_unedited_history(actor, || {
                let payload = session.publish_activity_inspection(
                    &read,
                    method_after,
                    historical_account,
                    |page| encode(page, self.host.budget()),
                )?;
                Ok(match payload {
                    Some(bytes) => PlayerDisclosure::Published(bytes?),
                    None => PlayerDisclosure::Changed,
                })
            })
            .map(|result| result.unwrap_or(PlayerDisclosure::Changed))
        })
    }
}
