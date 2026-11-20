//! One authorized tab's private history capture and final checked handoff.

use super::*;
use crate::store::{KnownPlaceViewPage, PreparedKnownPlaceRead};
use axum::body::Bytes;
use openlegend_simulation::received::TemporalReceiptLocator;
use openlegend_simulation::runtime::{RuntimePlayerTranscriptRead, RuntimePrivateHistoryRead};

pub(crate) struct PlayerHistoryRead {
    scope: Arc<AuthorizedScope>,
    read: RuntimePrivateHistoryRead,
}

impl HostedWorld {
    /// Select the original durable history revision under current player
    /// authority, then release the world turn before SQL reads its accounts.
    pub(crate) async fn capture_transcript(
        self: &Arc<Self>,
        authority: Arc<Authority>,
        scope: Arc<AuthorizedScope>,
    ) -> Result<RuntimePlayerTranscriptRead, WorldError> {
        self.request_advance_publication();
        let _turn = self.enter().await?;
        self.call(move |session| {
            let selected = authority.current_view(&scope, |selected, _| {
                session.read_player_transcript(&selected.account_id, &selected.actor_id)
            });
            Ok(selected
                .map_err(WorldError::from)
                .and_then(|result| result.map_err(Into::into)))
        })
        .await?
    }

    /// Select and encode this independently held page while player authority,
    /// the original privacy witness and the native publication lease agree.
    pub(crate) async fn disclose_transcript(
        &self,
        authority: &Authority,
        scope: &AuthorizedScope,
        selected: &RuntimePlayerTranscriptRead,
        temporal: &[(&TemporalReceiptLocator, f64)],
        expires_at: Option<f64>,
        publish: impl FnOnce(
            &NativeWorldSession,
            &openlegend_simulation::runtime::RuntimePrivateHistoryPublication,
            &ByteBudget,
        ) -> Result<Bytes, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        self.request_advance_publication();
        let _turn = self.enter().await?;
        authority
            .current_view(scope, |permit, _| {
                let edits = self
                    .pending_source_edits
                    .lock()
                    .map_err(|_| HostError::Poisoned)?;
                if edits.contains(permit.actor_id.as_str()) {
                    return Ok(PlayerDisclosure::Changed);
                }
                let session = match self.session.try_lock() {
                    Ok(session) => session,
                    Err(std::sync::TryLockError::WouldBlock) => return Ok(PlayerDisclosure::Busy),
                    Err(std::sync::TryLockError::Poisoned(_)) => {
                        return Err(HostError::Poisoned.into());
                    }
                };
                let Some(lease) = session.transcript_publication(
                    &permit.account_id,
                    selected,
                    temporal,
                    expires_at,
                )?
                else {
                    return Ok(PlayerDisclosure::Changed);
                };
                let bytes = publish(&session, &lease, self.host.budget())?;
                drop(lease);
                Ok(PlayerDisclosure::Published(bytes))
            })
            .map_err(WorldError::Access)?
    }

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
        self.disclose_history_at(authority, selected, None, publish)
    }

    /// An inspected movement preview is valid only at the accepted cut where
    /// it ran. The original private source must still be eligible there.
    pub(crate) fn disclose_history_at(
        &self,
        authority: &Authority,
        selected: &PlayerHistoryRead,
        preview_cut: Option<u64>,
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
                let _turn = super::held_turn(
                    _turn,
                    #[cfg(feature = "profile-campaign")]
                    openlegend_simulation::profile::sites::TURN_VIEW,
                );
                let session = match self.session.try_lock() {
                    Ok(session) => session,
                    Err(std::sync::TryLockError::WouldBlock) => return Ok(PlayerDisclosure::Busy),
                    Err(std::sync::TryLockError::Poisoned(_)) => {
                        return Err(HostError::Poisoned.into());
                    }
                };
                if let Some(preview_cut) = preview_cut
                    && session.accepted_progress()?.through_cut != preview_cut
                {
                    return Ok(PlayerDisclosure::Changed);
                }
                Ok(self
                    .with_current_player_history(&session, selected, |session| {
                        publish(session, self.host.budget())
                    })?
                    .map_or(PlayerDisclosure::Changed, PlayerDisclosure::Published))
            })
            .map_err(WorldError::Access)?
    }

    /// Borrow the selected private proof while the existing world turn
    /// remains held. The synchronous callback cannot move the world.
    pub(crate) fn with_current_player_history<T>(
        &self,
        session: &NativeWorldSession,
        selected: &PlayerHistoryRead,
        consume: impl FnOnce(&NativeWorldSession) -> Result<T, WorldError>,
    ) -> Result<Option<T>, WorldError> {
        self.with_unedited_history(&selected.scope.scope.actor_id, || {
            let Some(_lease) = session.history_publication(&selected.read)? else {
                return Ok(None);
            };
            consume(session).map(Some)
        })
        .map(Option::flatten)
    }

    /// Source edits establish a refusal before their protected save obtains
    /// the world turn. Serialize new effects and disclosure with that intent.
    pub(crate) fn with_unedited_history<T>(
        &self,
        actor: &str,
        consume: impl FnOnce() -> Result<T, WorldError>,
    ) -> Result<Option<T>, WorldError> {
        self.with_unedited_sources(&[actor], consume)
    }

    pub(crate) fn with_unedited_sources<T>(
        &self,
        actors: &[&str],
        consume: impl FnOnce() -> Result<T, WorldError>,
    ) -> Result<Option<T>, WorldError> {
        let pending = self
            .pending_source_edits
            .lock()
            .map_err(|_| HostError::Poisoned)?;
        if actors.iter().any(|actor| pending.contains(*actor)) {
            return Ok(None);
        }
        consume().map(Some)
    }
}
