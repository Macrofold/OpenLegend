//! Desktop approval binds a browser session and grant until the code exchange.

use super::{
    Access, AccessError, Authority, SessionSeed, TokenHash, digest_text, now_ms,
    session_world_grant,
};
use openlegend_simulation::host::ByteReservation;
use std::sync::Arc;
use tokio::time::Instant;

#[derive(Clone)]
pub(crate) struct DesktopBrowser {
    key: TokenHash,
    access: Arc<Access>,
    grant_revision: u64,
}

impl DesktopBrowser {
    pub(crate) fn account_id(&self) -> &str {
        &self.access.account
    }

    pub(crate) fn same_approval(&self, current: &Self) -> bool {
        self.key == current.key
            && self.access.session == current.access.session
            && self.access.session_revision == current.access.session_revision
            && self.access.account == current.access.account
            && self.grant_revision == current.grant_revision
    }
}

impl Authority {
    /// Resolve the same world grant offered to this browser at normal entry.
    pub(crate) async fn desktop_browser(&self, token: &str) -> Result<DesktopBrowser, AccessError> {
        let (key, access) = self.access(token).await?;
        let grant_revision = self
            .current_session(key, &access, |current| {
                session_world_grant(current).map(|grant| grant.revision)
            })?
            .ok_or(AccessError::Forbidden)?;
        Ok(DesktopBrowser {
            key,
            access,
            grant_revision,
        })
    }

    /// Bind or publish an approval before releasing the browser's session lease.
    pub(crate) fn current_desktop_browser<T>(
        &self,
        browser: &DesktopBrowser,
        publish: impl FnOnce() -> T,
    ) -> Result<T, AccessError> {
        self.current_session(browser.key, &browser.access, |current| {
            if session_world_grant(current).map(|grant| grant.revision)
                != Some(browser.grant_revision)
            {
                return Err(AccessError::Changed);
            }
            Ok(publish())
        })?
    }

    /// Serialize issuance with logout and grant changes. Lock the qualifying
    /// SQL rows in the same transaction as the new session, including when
    /// another listener sharing the database changes the browser session.
    pub(crate) async fn desktop_session(
        &self,
        browser: DesktopBrowser,
        deadline: Instant,
        custody: ByteReservation,
    ) -> Result<String, AccessError> {
        let store = self.store.clone();
        let world = self.world_id.clone();
        let duration = self.duration_ms;
        let limit = self.session_capacity;
        self.finish_session_change(async move {
            let _custody = custody;
            if deadline <= Instant::now() {
                return Err(AccessError::Changed);
            }
            let session = SessionSeed::new()?;
            let issued = store
                .operational(move |tx| {
                    Box::pin(async move {
                        let hash = digest_text(browser.key);
                        let access = &browser.access;
                        let session_revision = access.session_revision as i64;
                        let grant_revision = browser.grant_revision as i64;
                        let selected = tx
                            .query_opt(
                                "SELECT s.expires_at FROM auth_sessions s JOIN auth_grants g \
                     ON g.world_id=$1 AND g.account_id=s.account_id \
                     WHERE s.id=$2 AND s.token_hash=$3 AND s.account_id=$4 \
                     AND s.revision=$5 AND g.revision=$6 FOR UPDATE OF s,g",
                                &[
                                    &world,
                                    &access.session,
                                    &hash,
                                    &access.account,
                                    &session_revision,
                                    &grant_revision,
                                ],
                            )
                            .await?;
                        let now = now_ms();
                        let Some(row) = selected else { return Ok(None) };
                        if row.try_get::<_, i64>(0)? <= now || deadline <= Instant::now() {
                            return Ok(None);
                        }
                        session
                            .insert(tx, &access.account, now, duration, limit)
                            .await
                            .map(Some)
                    })
                })
                .await?;
            issued.ok_or(AccessError::Changed)
        })
        .await
    }
}
