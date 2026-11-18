//! One authorized tab's private history capture and final checked handoff.

use super::*;
use crate::store::{KnownPlaceViewPage, PreparedKnownPlaceRead};
use axum::body::Bytes;
use openlegend_simulation::runtime::RuntimePrivateHistoryRead;

pub(crate) struct PlayerHistoryRead {
    scope: Arc<AuthorizedScope>,
    read: RuntimePrivateHistoryRead,
}

impl HostedWorld {
    /// Pin the exact accepted memory inputs before awaiting their SQL owner.
    /// The world turn ends once the privately funded result exists.
    pub(crate) async fn capture_known_place_view(
        self: &Arc<Self>,
        authority: Arc<Authority>,
        scope: Arc<AuthorizedScope>,
        maximum_rows: u64,
    ) -> Result<(PlayerHistoryRead, PreparedKnownPlaceRead), WorldError> {
        let _turn = self.enter().await?;
        let store = self.store.clone();
        self.call(move |session| {
            let result = authority.current_view(&scope, |selected, _| {
                session.read_player_known_places(
                    &selected.account_id,
                    &selected.actor_id,
                    maximum_rows,
                    |read| store.prepare_known_place_view_read(read),
                )
            });
            Ok(match result {
                Ok(Ok((read, Ok(cut)))) => Ok((PlayerHistoryRead { scope, read }, cut)),
                Ok(Ok((_, Err(error)))) => Err(error.into()),
                Ok(Err(error)) => Err(error.into()),
                Err(error) => Err(error.into()),
            })
        })
        .await?
    }

    /// Prove the selected current personal/support bodies before holding them
    /// for final disclosure. SQL and the HTTP request never mutate the world.
    pub(crate) async fn admit_known_place_view(
        self: &Arc<Self>,
        mut selected: PlayerHistoryRead,
        mut page: KnownPlaceViewPage,
    ) -> Result<(PlayerHistoryRead, KnownPlaceViewPage), WorldError> {
        let _turn = self.enter().await?;
        self.call(move |session| {
            let values = page.take_witnesses().map_err(WorldError::from);
            Ok(values.and_then(|(personal, supports, custody)| {
                session.admit_history_places_direct(
                    &mut selected.read,
                    &page.places,
                    personal,
                    supports,
                    custody,
                )?;
                Ok((selected, page))
            }))
        })
        .await?
    }

    /// Check the original tab and native privacy at the actual transport
    /// handoff. Keep selection, encoding and the funded outgoing bytes in one
    /// synchronous disclosure turn and never loan the authority past it.
    pub(crate) fn disclose_history(
        &self,
        authority: &Authority,
        selected: &PlayerHistoryRead,
        publish: impl FnOnce(&NativeWorldSession, &ByteBudget) -> Result<Bytes, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        authority
            .current_view(&selected.scope, |_, _| {
                if self.closing.load(Ordering::Acquire) {
                    return Err(HostError::Closed.into());
                }
                let Ok(_turn) = self.turn.try_lock() else {
                    return Ok(PlayerDisclosure::Busy);
                };
                let session = match self.session.try_lock() {
                    Ok(session) => session,
                    Err(std::sync::TryLockError::WouldBlock) => return Ok(PlayerDisclosure::Busy),
                    Err(std::sync::TryLockError::Poisoned(_)) => {
                        return Err(HostError::Poisoned.into());
                    }
                };
                let Some(lease) = session.history_publication(&selected.read)? else {
                    return Ok(PlayerDisclosure::Changed);
                };
                let bytes = publish(&session, self.host.budget())?;
                drop(lease);
                Ok(PlayerDisclosure::Published(bytes))
            })
            .map_err(WorldError::Access)?
    }
}
