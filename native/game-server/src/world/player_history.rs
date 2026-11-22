//! One authorized tab's private history capture and final checked handoff.

use super::*;
use crate::authority::RequestScope;

mod activity;
use crate::store::recall::browse::{MemoryBrowseCut, MemoryPage};
use crate::store::{KnownPlaceViewPage, PreparedKnownPlaceRead, PreparedSourceCut};
use axum::body::Bytes;
use openlegend_simulation::received::TemporalReceiptLocator;
use openlegend_simulation::runtime::{
    RuntimePlayerTranscriptRead, RuntimePrivateHistoryRead, RuntimeRecentBrowse, RuntimeRecentPosition,
};

pub(crate) struct PlayerHistoryRead {
    scope: Arc<AuthorizedScope>,
    read: RuntimePrivateHistoryRead,
}

impl HostedWorld {
    /// Pin the accepted observer and bounded logical address window. The
    /// existing source cursor resolves those addresses through the ordinary
    /// reader and its pending-save overlay outside this selection.
    pub(crate) async fn capture_recent_browse(
        self: &Arc<Self>,
        authority: Arc<Authority>,
        scope: Arc<AuthorizedScope>,
        actor: String,
        before: Option<RuntimeRecentPosition>,
    ) -> Result<(PlayerHistoryRead, RuntimeRecentBrowse, PreparedSourceCut), WorldError> {
        let _turn = self.enter().await?;
        let store = self.store.clone();
        self.call(move |session| {
            let result = authority.current_private_view(
                &scope,
                actor != scope.scope.actor_id,
                |permit, _| {
                    let (read, cut) = session
                        .read_recent_browse(&permit.account_id, &permit.actor_id, &actor, before)?
                        .ok_or(AccessError::Forbidden)?;
                    let storage = session.with_recent_source_read(&read, &cut, |source| {
                        store.prepare_recent_sources(source)
                    })??;
                    Ok::<_, WorldError>((read, cut, storage))
                },
            );
            Ok(result
                .map_err(WorldError::Access)
                .and_then(|result| result)
                .map(|(read, cut, storage)| (PlayerHistoryRead { scope, read }, cut, storage)))
        })
        .await?
    }

    pub(crate) async fn admit_recent_browse(
        self: &Arc<Self>,
        mut selected: PlayerHistoryRead,
        mut cut: RuntimeRecentBrowse,
        storage: PreparedSourceCut,
    ) -> Result<(PlayerHistoryRead, RuntimeRecentBrowse), WorldError> {
        let rows = self.store.read_source_rows(storage).await?;
        self.capture(move |session| {
            let current = rows.admit(|rows| {
                session.admit_recent_source_rows(&mut selected.read, &mut cut, rows)
            })?;
            Ok(current.then_some((selected, cut)))
        }).await?.ok_or(WorldError::ProjectionChanged)
    }

    /// Capture this tab's private recollection read before the SQL wait.
    /// A god inspector keeps the same exact actor and grant at disclosure.
    pub(crate) async fn capture_recollections(
        self: &Arc<Self>,
        authority: Arc<Authority>,
        scope: Arc<AuthorizedScope>,
        actor: String,
    ) -> Result<(PlayerHistoryRead, Arc<MemoryBrowseCut>), WorldError> {
        self.capture_recollections_with(authority, scope, actor, |_, _| Ok(()))
            .await
            .map(|(read, cut, ())| (read, cut))
    }

    /// Prepare a small extra product from this exact accepted private read
    /// before yielding to the durable page query.
    pub(crate) async fn capture_recollections_with<T: Send + 'static>(
        self: &Arc<Self>,
        authority: Arc<Authority>,
        scope: Arc<AuthorizedScope>,
        actor: String,
        prepare: impl FnOnce(&NativeWorldSession, &RequestScope) -> Result<T, WorldError>
        + Send
        + 'static,
    ) -> Result<(PlayerHistoryRead, Arc<MemoryBrowseCut>, T), WorldError> {
        let _turn = self.enter().await?;
        let budget = self.host.budget().clone();
        self.call(move |session| {
            let result = authority.current_private_view(
                &scope,
                actor != scope.scope.actor_id,
                |permit, _| {
                    let (read, cut) = session
                        .read_personal_browse(
                            &permit.account_id,
                            &permit.actor_id,
                            &actor,
                            |cut| {
                                let custody = budget.reserve(
                                    512 + cut.world.len() + cut.actor.len() + cut.generation.len(),
                                )?;
                                Ok::<_, openlegend_simulation::host::CapacityError>(
                                    MemoryBrowseCut {
                                        world: cut.world.to_owned(),
                                        generation: cut.generation.to_owned(),
                                        actor: cut.actor.to_owned(),
                                        revision: cut.durable_revision,
                                        privacy_revision: cut.privacy_revision,
                                        at: cut.at,
                                        identity_through: cut.identity_through,
                                        _custody: custody,
                                    },
                                )
                            },
                        )?
                        .ok_or(AccessError::Forbidden)?;
                    let cut = cut.map_err(HostError::from)?;
                    let product = prepare(session, permit)?;
                    Ok::<_, WorldError>((read, Arc::new(cut), product))
                },
            );
            Ok(result
                .map_err(WorldError::from)
                .and_then(|result| result)
                .map(|(read, cut, product)| (PlayerHistoryRead { scope, read }, cut, product)))
        })
        .await?
    }

    /// Give only the selected exact references to the real native history
    /// preparation. Its application bridge takes ownership of the scoped
    /// source overlay before asking PostgreSQL for the required bodies.
    pub(crate) async fn admit_recollections(
        self: &Arc<Self>,
        game: Arc<crate::boot::CurrentServer>,
        selected: PlayerHistoryRead,
        page: MemoryPage,
    ) -> Result<PlayerHistoryRead, WorldError> {
        self.prepare_actor_read(
            game,
            |_| Ok(selected),
            move |session, selected| {
                let _storage = page.custody;
                session.begin_history_sources_direct(
                    &mut selected.read,
                    openlegend_simulation::capture::NpcSourceSelection {
                        receipts: Vec::new(),
                        personal: page
                            .references
                            .into_iter()
                            .map(
                                |reference| openlegend_simulation::capture::NpcPersonalSelection {
                                    reference,
                                    through: None,
                                },
                            )
                            .collect(),
                        consolidation_job: None,
                    },
                )
            },
            |session, selected, key, answer| {
                session.step_history_sources(&mut selected.read, key, answer)
            },
        )
        .await
        .map_err(|error| match &error {
            WorldError::Simulation(runtime)
                if runtime.stale_reason() == Some("private-history-scope") =>
            {
                WorldError::ProjectionChanged
            }
            _ => error,
        })
    }

    /// A requested HTTP page can wait for the bounded world turn after its
    /// store read, without repeating that read or locking authority while it
    /// waits. The callback checks the original sources and encodes synchronously.
    pub(crate) async fn disclose_private_history(
        &self,
        authority: &Authority,
        selected: &PlayerHistoryRead,
        publish: impl FnOnce(&ByteBudget) -> Result<Bytes, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        let _turn = self.enter().await?;
        self.with_private_reader(
            authority,
            &selected.scope,
            selected.read.actor_id(),
            |session, _| {
                Ok(self
                    .with_current_player_history(session, selected, |_| publish(self.host.budget()))?
                    .map_or(PlayerDisclosure::Changed, PlayerDisclosure::Published))
            },
        )
    }

    /// The caller already pinned live promises or loaded saved bodies outside
    /// the turn. Recheck both owners and prepare the reply before disclosing.
    pub(crate) async fn disclose_promises<'a>(
        &self,
        authority: &Authority,
        selected: &PlayerHistoryRead,
        references: impl IntoIterator<Item = &'a openlegend_simulation::experience::PersonalSourceRef>,
        publish: impl FnOnce(
            openlegend_simulation::runtime::RuntimePromisePresentation<'_>,
            &ByteBudget,
        ) -> Result<Bytes, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        let _turn = self.enter().await?;
        let actor = selected.read.actor_id();
        self.with_private_reader(authority, &selected.scope, actor, |session, _| {
            Ok(self
                .with_unedited_history(actor, || {
                    session
                        .with_player_promise_presentation(&selected.read, references, |prepared| {
                            publish(prepared, self.host.budget())
                        })?
                        .transpose()
                })?
                .flatten()
                .map_or(PlayerDisclosure::Changed, PlayerDisclosure::Published))
        })
    }

    /// The caller owns a world turn. Keep the same session and app grant
    /// throughout the native private read and actual response preparation.
    fn with_private_reader<T>(
        &self,
        authority: &Authority,
        scope: &AuthorizedScope,
        actor: &str,
        read: impl FnOnce(&NativeWorldSession, bool) -> Result<T, WorldError>,
    ) -> Result<T, WorldError> {
        authority
            .current_private_view(scope, actor != scope.scope.actor_id, |permit, controlling| {
                let session = match self.session.try_lock() {
                    Ok(session) => session,
                    Err(std::sync::TryLockError::WouldBlock) => return Err(HostError::Busy.into()),
                    Err(std::sync::TryLockError::Poisoned(_)) => {
                        return Err(HostError::Poisoned.into());
                    }
                };
                if !session.private_history_permitted(&permit.account_id, &permit.actor_id, actor)?
                {
                    return Err(AccessError::Forbidden.into());
                }
                read(&session, controlling)
            })
            .map_err(WorldError::Access)?
    }

    /// The note projection is resident. Enter the ordinary bounded aperture
    /// and keep the recognized owner, pending privacy edits and encoded
    /// response in the same synchronous read.
    pub(crate) async fn disclose_private_notes(
        &self,
        authority: &Authority,
        scope: &AuthorizedScope,
        actor: &str,
        publish: impl FnOnce(&NativeWorldSession, &ByteBudget, bool) -> Result<Bytes, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        let _turn = self.enter().await?;
        self.with_private_reader(authority, scope, actor, |session, controlling| {
            Ok(self
                .with_unedited_history(actor, || publish(session, self.host.budget(), controlling))?
                .map_or(PlayerDisclosure::Changed, PlayerDisclosure::Published))
        })
    }

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
                session
                    .admit_history_places_direct(
                        &mut selected.read,
                        &page.places,
                        personal,
                        supports,
                        custody,
                    )
                    .map_err(|error| {
                        if error.stale_reason().is_some() {
                            WorldError::ProjectionChanged
                        } else {
                            error.into()
                        }
                    })?;
                Ok((selected, page))
            }))
        })
        .await?
    }

    /// Check the original tab and native privacy at the actual transport
    /// handoff. The admitted selection can wait for its turn without repeating
    /// SQL. Reauthorization and encoding remain synchronous within that turn.
    pub(crate) async fn disclose_history(
        self: &Arc<Self>,
        authority: &Authority,
        selected: &PlayerHistoryRead,
        publish: impl FnOnce(&NativeWorldSession, &ByteBudget) -> Result<Bytes, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        self.disclose_history_at(authority, selected, None, publish).await
    }

    /// An inspected movement preview is valid only at the accepted cut where
    /// it ran. The original private source must still be eligible there.
    pub(crate) async fn disclose_history_at(
        self: &Arc<Self>,
        authority: &Authority,
        selected: &PlayerHistoryRead,
        preview_cut: Option<u64>,
        publish: impl FnOnce(&NativeWorldSession, &ByteBudget) -> Result<Bytes, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        let _turn = self.clone().player_disclosure_turn().await?;
        authority
            .current_private_view(
                &selected.scope,
                selected.read.actor_id() != selected.scope.scope.actor_id,
                |permit, _| {
                    if self.closing.load(Ordering::Acquire) {
                        return Err(HostError::Closed.into());
                    }
                    let session = match self.session.try_lock() {
                        Ok(session) => session,
                        Err(std::sync::TryLockError::WouldBlock) => {
                            return Ok(PlayerDisclosure::Busy);
                        }
                        Err(std::sync::TryLockError::Poisoned(_)) => {
                            return Err(HostError::Poisoned.into());
                        }
                    };
                    if !session.private_history_permitted(
                        &permit.account_id,
                        &permit.actor_id,
                        selected.read.actor_id(),
                    )? {
                        return Err(AccessError::Forbidden.into());
                    }
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
                },
            )
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
        self.with_unedited_history(selected.read.actor_id(), || {
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

impl PlayerHistoryRead {
    pub(crate) fn sources(&self) -> &RuntimePrivateHistoryRead {
        &self.read
    }
}
