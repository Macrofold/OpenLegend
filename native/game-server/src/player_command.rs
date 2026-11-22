//! A prior receipt is resolved before new target preparation. A read that
//! spans acceptance or ACK pins that receipt until its final checking turn.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope, Capability, RequestScope, now_ms},
    boot::CurrentServer,
    command_epoch::{RETRY_MS, RequestIdentity},
    live_save::{AcceptedSaveInput, LiveSaves},
    store::{AdmittedReceipt, GameplayReceipt, KnownPlaceViewPage, PlaceViewRequest, StoreError},
    wire,
    world::{ApplicationStart, PlayerHistoryRead, WorldError},
};
use axum::body::Bytes;
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::{ByteBudget, ByteReservation},
    reception::EncounterExposure,
    runtime::{NativeWorldSession, RuntimeDirectOutput, RuntimeError, RuntimePlayerCommand},
    state::SurfacePoint,
    values::deserialize_present_option,
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CommandRequest {
    command_id: String,
    command_epoch: String,
    command: CommandInput,
}

// Deliberately select only the ordinary operations whose real semantic
// binders exist in this listener. Unknown fields cannot alter an executed
// operation.
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CommandInput {
    #[serde(rename = "type")]
    kind: MoveOrCancel,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    position: Option<SurfacePoint>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    expected_action_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    known_place: Option<PlaceReference>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PlaceReference {
    pub(crate) id: String,
    pub(crate) source_id: String,
    pub(crate) revision: String,
}

impl PlaceReference {
    pub(crate) fn valid(&self) -> bool {
        let id = |value: &str| !value.is_empty() && value.encode_utf16().count() <= 180;
        id(&self.id)
            && id(&self.source_id)
            && self.revision.len() == 64
            && self.revision.bytes().all(|byte| byte.is_ascii_hexdigit())
    }
}

pub(crate) const KNOWN_PLACE_UNAVAILABLE: &str = "This remembered destination cannot be used now. Refresh Known places or inspect it again when you can.";

/// Own the single selected source and its independently admitted personal
/// evidence after the SQL transaction and save can release their own pins.
pub(crate) struct SelectedKnownPlace {
    pub(crate) evidence: PlayerHistoryRead,
    pub(crate) page: KnownPlaceViewPage,
}

impl SelectedKnownPlace {
    /// Use the exact SQL snapshot selected under the tab's initial scope.
    /// Later use requires a fresh native/source and authority check.
    pub(crate) async fn read(
        game: &CurrentServer,
        authority: &Arc<Authority>,
        scope: &Arc<AuthorizedScope>,
        reference: &PlaceReference,
    ) -> Result<Option<Self>, WorldError> {
        let (selected, cut) = game
            .world
            .capture_known_place_view(authority.clone(), scope.clone(), 1)
            .await?;
        let page = game
            .store
            .read_known_place_view(
                cut,
                PlaceViewRequest {
                    id: Some(reference.id.clone()),
                    after: None,
                    search: None,
                },
            )
            .await?;
        let exact = page
            .places
            .first()
            .zip(page.references.first())
            .is_some_and(|(place, source)| {
                place.capsule.place_id == reference.id
                    && source.source_id == reference.source_id
                    && source.revision == reference.revision
            });
        if !exact {
            return Ok(None);
        }
        let (evidence, page) = game.world.admit_known_place_view(selected, page).await?;
        Ok(Some(Self { evidence, page }))
    }

    pub(crate) fn destination(
        &self,
        session: &NativeWorldSession,
        scope: &RequestScope,
    ) -> Result<Option<&SurfacePoint>, WorldError> {
        let [place] = self.page.places.as_slice() else {
            return Err(StoreError::InvalidRecord.into());
        };
        let [source] = self.page.references.as_slice() else {
            return Err(StoreError::InvalidRecord.into());
        };
        let EncounterExposure::Place { point, .. } = &place.exposure else {
            return Err(StoreError::InvalidRecord.into());
        };
        if source.correction.is_some() {
            return Ok(None);
        }
        let current = session.with_player_place_facts(
            &scope.account_id,
            &scope.actor_id,
            std::iter::once((place.capsule.place_id.as_str(), Some(&place.exposure))),
            |facts| facts[0].current == Some(true),
        )?;
        Ok(current.then_some(point))
    }
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
enum MoveOrCancel {
    Move,
    Cancel,
}

struct PreparedRequest {
    id: String,
    fingerprint: String,
    recovery_fingerprint: String,
    request: CommandRequest,
    epoch: u64,
    _custody: ByteReservation,
}

pub(crate) struct PlayerCommands {
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    authority: Arc<Authority>,
    identity: Mutex<RequestIdentity>,
}

enum ResultOwner {
    Accepted(Arc<AcceptedSaveInput>),
    Durable(AdmittedReceipt),
    Refused(&'static str, &'static str),
}

impl ResultOwner {
    fn receipt(&self) -> Option<&GameplayReceipt> {
        match self {
            Self::Accepted(value) => value.receipt(),
            Self::Durable(value) => Some(value.receipt()),
            Self::Refused(_, _) => None,
        }
    }
}

impl PlayerCommands {
    pub(crate) fn new(
        game: Arc<CurrentServer>,
        saves: Arc<LiveSaves>,
        authority: Arc<Authority>,
        identity: RequestIdentity,
    ) -> Self {
        Self {
            game,
            saves,
            authority,
            identity: Mutex::new(identity),
        }
    }

    pub(crate) async fn epoch(&self) -> String {
        self.identity.lock().await.epoch.token.clone()
    }

    /// Paused work follows the ordinary checked Stop command through a
    /// rolled-back preview. The result stays bound to the displayed cut.
    pub(crate) async fn preview_paused_stop(
        &self,
        scope: Arc<AuthorizedScope>,
        cut: u64,
    ) -> Result<crate::player_view::PausedStop, WorldError> {
        let authority = self.authority.clone();
        let provider = self.game.clone();
        let preview = self
            .game
            .world
            .execute_and_publish(
                #[cfg(feature = "profile-campaign")]
                openlegend_simulation::profile::sites::TURN_COMMAND,
                move |world| {
                    authority.current(&scope, Capability::Play, true, |_, _| ())?;
                    if world.accepted_progress()?.through_cut != cut || !world.clock()?.paused {
                        return Err(WorldError::ProjectionChanged);
                    }
                    Ok(ApplicationStart::Candidate(world.begin_player_command(
                        &Uuid::new_v4().to_string(),
                        &scope.scope.actor_id,
                        RuntimePlayerCommand::Cancel(None),
                        true,
                    )?))
                },
                move |question| {
                    let game = provider.clone();
                    async move { game.answer_operation(question).await }
                },
                move |output, budget| {
                    let RuntimeDirectOutput::Preview(value) = output else {
                        return Err(RuntimeError::application_refused(
                            "Stop preview did not roll back",
                        ));
                    };
                    let custody = budget.reserve(value.message.storage_bytes() + 128)?;
                    Ok(crate::player_view::PausedStop {
                        ok: value.ok,
                        message: value.message.clone(),
                        cut,
                        _custody: custody,
                    })
                },
                |fence, key, _| Ok(fence.settle(key, false)?),
                |_| {},
            )
            .await?;
        preview.ok_or(WorldError::ProjectionChanged)
    }

    pub(crate) async fn command(
        &self,
        scope: Arc<AuthorizedScope>,
        input: CommandRequest,
        recovery: bool,
        body: ByteReservation,
    ) -> Result<Bytes, WorldError> {
        openlegend_simulation::profile_body!(
            COMMAND,
            {
                let permits = &self.authority;
                permits.current(&scope, Capability::Play, !recovery, |_, _| ())?;
                input.check()?;
                let world_id = &scope.scope.world_id;
                if !recovery && self.identity.lock().await.due() {
                    let _protected = self.saves.enter_protected().await?;
                    let mut identity = self.identity.lock().await;
                    identity
                        .refresh(&self.game.store, world_id)
                        .await
                        .map_err(WorldError::Commit)?;
                }
                // Recovering an existing result cannot admit a mutation. Do not keep
                // a protected save waiting for this independent receipt read.
                let _intake = if recovery {
                    None
                } else {
                    Some(self.saves.enter_ordinary().await)
                };
                let epoch = {
                    let identity = self.identity.lock().await;
                    (
                        identity.epoch.generation,
                        identity.epoch.token == input.command_epoch,
                    )
                };
                let budget = self.game.host.budget();
                let facts = Arc::new(input.prepare(&scope.scope, epoch.0, body, budget)?);
                let watch = self.saves.read_receipt(&facts.id)?;
                let durable = if watch.accepted()?.is_none() {
                    self.game.store.command_receipt(world_id, &facts.id).await?
                } else {
                    None
                };
                let mut prior = watch
                    .accepted()?
                    .map(ResultOwner::Accepted)
                    .or_else(|| durable.map(ResultOwner::Durable));
                if recovery || prior.is_some() || !epoch.1 {
                    let fresh_epoch = if recovery && prior.is_none() {
                        self.identity.lock().await.epoch.token == facts.request.command_epoch
                    } else {
                        epoch.1
                    };
                    return permits.current(&scope, Capability::Play, !recovery, |scope, _| {
                        report(prior.as_ref(), &facts, scope, fresh_epoch, recovery, budget)
                    })?;
                }
                self.saves.check_admission(tokio::time::Instant::now())?;
                let reference = facts.request.command.known_place.as_ref();
                let remembered = reference.is_some();
                let selected_place = match reference {
                    Some(reference) => {
                        match SelectedKnownPlace::read(&self.game, permits, &scope, reference).await
                        {
                            Err(WorldError::Storage(StoreError::StaleCut)) => None,
                            value => value?,
                        }
                    }
                    None => None,
                };
                let prepare = facts.clone();
                let begin_facts = facts.clone();
                let begin_saves = self.saves.clone();
                let begin_scope = scope.clone();
                let begin_authority = permits.clone();
                let accept = self.saves.clone();
                let stage = self.saves.clone();
                let game = self.game.clone();
                let finish_scope = scope.clone();
                let finish_authority = permits.clone();
                let place_world = self.game.world.clone();
                let finish_world = place_world.clone();
                self.game.world.request_advance_publication();
                prior = self
                    .game
                    .world
                    .execute_and_publish(
                        #[cfg(feature = "profile-campaign")]
                        openlegend_simulation::profile::sites::TURN_COMMAND,
                        move |world| {
                            begin_authority.current(
                                &begin_scope,
                                Capability::Play,
                                true,
                                |_, _| (),
                            )?;
                            if let Some(value) = begin_saves.watched_receipt(&begin_facts.id)? {
                                return Ok(ApplicationStart::Existing(ResultOwner::Accepted(
                                    value,
                                )));
                            }
                            let clock = world.clock()?;
                            if clock.paused
                                && !(matches!(
                                    begin_facts.request.command.kind,
                                    MoveOrCancel::Cancel
                                ) && clock.manually_paused)
                            {
                                return Ok(ApplicationStart::Existing(ResultOwner::Refused(
                                    "paused",
                                    "Resume the world to act.",
                                )));
                            }
                            world.player_input_direct(
                                &begin_scope.scope.account_id,
                                &begin_scope.scope.actor_id,
                            )?;
                            let position = if remembered {
                                let stale = || {
                                    ApplicationStart::Existing(ResultOwner::Refused(
                                        "stale-place",
                                        KNOWN_PLACE_UNAVAILABLE,
                                    ))
                                };
                                let Some(place) = selected_place.as_ref() else {
                                    return Ok(stale());
                                };
                                let Some(position) = place_world
                                    .with_current_player_history(world, &place.evidence, |world| {
                                        place.destination(world, &begin_scope.scope)
                                    })?
                                    .flatten()
                                else {
                                    return Ok(stale());
                                };
                                Some(position)
                            } else {
                                begin_facts.request.command.position.as_ref()
                            };
                            let command = begin_facts.command(position)?;
                            Ok(ApplicationStart::Candidate(world.begin_player_command(
                                &begin_facts.id,
                                &begin_scope.scope.actor_id,
                                command,
                                false,
                            )?))
                        },
                        move |question| {
                            let game = game.clone();
                            async move { game.answer_operation(question).await }
                        },
                        move |output, _| {
                            let RuntimeDirectOutput::Prepared(product) = output else {
                                unreachable!("ordinary command cannot preview")
                            };
                            let value = json_record(product.outcome())
                                .map_err(RuntimeError::application_refused)?;
                            let receipt = GameplayReceipt {
                                id: prepare.id.clone(),
                                epoch: prepare.epoch,
                                fingerprint: prepare.fingerprint.clone(),
                                recovery_fingerprint: Some(prepare.recovery_fingerprint.clone()),
                                expires_at: now_ms().saturating_add(RETRY_MS) as u64,
                                result: RawValue::from_string(value)
                                    .map_err(RuntimeError::application_refused)?,
                            };
                            Ok(ResultOwner::Accepted(stage.stage(&product, Some(receipt))?))
                        },
                        move |fence, key, _| {
                            finish_authority.current(
                                &finish_scope,
                                Capability::Play,
                                true,
                                |scope, _| {
                                    if remembered {
                                        return finish_world
                                            .with_unedited_history(&scope.actor_id, || {
                                                Ok(fence.settle(key, true)?)
                                            })?
                                            .ok_or(WorldError::ProjectionChanged);
                                    }
                                    Ok(fence.settle(key, true)?)
                                },
                            )?
                        },
                        move |result| {
                            if let ResultOwner::Accepted(value) = result {
                                accept.accept(value);
                            }
                        },
                    )
                    .await?;
                permits.current(&scope, Capability::Play, true, |scope, _| {
                    report(prior.as_ref(), &facts, scope, epoch.1, false, budget)
                })?
            },
            WorldError::profile_outcome
        )
    }
}

impl CommandRequest {
    fn check(&self) -> Result<(), WorldError> {
        fn id(text: &str) -> bool {
            !text.is_empty()
                && text.len() <= 120
                && text.bytes().all(|byte| {
                    byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b'.' | b':')
                })
        }
        let command = &self.command;
        if !id(&self.command_id)
            || self.command_id.starts_with("gameplay:")
            || Uuid::parse_str(&self.command_epoch).is_err()
        {
            return Err(AccessError::Forbidden.into());
        }
        match command.kind {
            MoveOrCancel::Move
                if command.expected_action_id.is_none()
                    && (command
                        .known_place
                        .as_ref()
                        .is_some_and(PlaceReference::valid)
                        && command.position.is_none()
                        || command.known_place.is_none()
                            && command.position.as_ref().is_some_and(|point| {
                                id(&point.surface_id)
                                    && [point.x, point.y, point.z].iter().all(|n| n.is_finite())
                            })) =>
            {
                Ok(())
            }
            MoveOrCancel::Cancel
                if command.position.is_none()
                    && command.known_place.is_none()
                    && command.expected_action_id.as_deref().is_none_or(id) =>
            {
                Ok(())
            }
            _ => Err(AccessError::Forbidden.into()),
        }
    }

    fn prepare(
        self,
        scope: &RequestScope,
        epoch: u64,
        mut custody: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<PreparedRequest, WorldError> {
        let additional = budget.reserve(8192).map_err(|_| StoreError::Capacity)?;
        custody
            .merge(additional)
            .map_err(|_| StoreError::Capacity)?;
        #[derive(Serialize)]
        struct Original<'a> {
            actor: &'a str,
            input: &'a CommandInput,
            scope: &'a RequestScope,
        }
        #[derive(Serialize)]
        struct Recovery<'a, T> {
            input: &'a CommandInput,
            scope: T,
        }
        let body = |value: Result<String, serde_json::Error>| {
            value.map_err(|_| WorldError::Storage(StoreError::InvalidRecord))
        };
        let id = sha256_hex(body(json_record(&self.command_id))?.as_bytes());
        let fingerprint = sha256_hex(
            body(json_record(&Original {
                actor: &scope.actor_id,
                input: &self.command,
                scope,
            }))?
            .as_bytes(),
        );
        let recovery_fingerprint = sha256_hex(
            body(json_record(&Recovery {
                input: &self.command,
                scope: scope.recovery_fields(),
            }))?
            .as_bytes(),
        );
        Ok(PreparedRequest {
            id: format!("gameplay:{}:{}:{id}", scope.account_id, self.command_epoch),
            fingerprint,
            recovery_fingerprint,
            request: self,
            epoch,
            _custody: custody,
        })
    }
}

impl PreparedRequest {
    fn command<'a>(
        &'a self,
        destination: Option<&'a SurfacePoint>,
    ) -> Result<RuntimePlayerCommand<'a>, WorldError> {
        let input = &self.request.command;
        match input.kind {
            MoveOrCancel::Move => Ok(RuntimePlayerCommand::Move(
                destination.ok_or(StoreError::InvalidRecord)?,
            )),
            MoveOrCancel::Cancel => Ok(RuntimePlayerCommand::Cancel(
                input.expected_action_id.as_deref(),
            )),
        }
    }
}

fn report(
    owner: Option<&ResultOwner>,
    input: &PreparedRequest,
    scope: &RequestScope,
    fresh_epoch: bool,
    recovery: bool,
    budget: &ByteBudget,
) -> Result<Bytes, WorldError> {
    let receipt = owner.and_then(ResultOwner::receipt);
    let now = now_ms() as u64;
    if recovery {
        let scope_key = scope.key().map_err(|_| StoreError::InvalidRecord)?;
        let (status, message, result) = match receipt {
            None => (
                if fresh_epoch { "unknown" } else { "expired" },
                Some(
                    "The original result is not available. This does not confirm whether it happened.",
                ),
                None,
            ),
            Some(receipt)
                if receipt.recovery_fingerprint.as_deref() != Some(&input.recovery_fingerprint) =>
            {
                (
                    "unavailable",
                    Some("This result is unavailable for the current access and original request."),
                    None,
                )
            }
            Some(receipt) if now >= receipt.expires_at => (
                "expired",
                Some("The original result has expired. Its outcome remains unconfirmed."),
                None,
            ),
            Some(receipt) => ("resolved", None, Some(receipt.result.as_ref())),
        };
        #[derive(Serialize)]
        struct Recovery<'a> {
            ok: bool,
            scope: &'a str,
            status: &'static str,
            #[serde(skip_serializing_if = "Option::is_none")]
            message: Option<&'static str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            result: Option<&'a RawValue>,
        }
        return wire::encode(
            &Recovery {
                ok: result.is_some(),
                scope: &scope_key,
                status,
                message,
                result,
            },
            b"",
            b"",
            budget,
        )
        .map_err(WorldError::Wire);
    }
    let (code, message) = match receipt {
        Some(receipt) if now >= receipt.expires_at => {
            ("expired", "This command retry window has expired.")
        }
        Some(receipt) if receipt.fingerprint != input.fingerprint => (
            "idempotency-conflict",
            "That command ID was used for different input.",
        ),
        Some(receipt) => {
            return wire::encode(receipt.result.as_ref(), b"", b"", budget)
                .map_err(WorldError::Wire);
        }
        None if !fresh_epoch => (
            "expired",
            "This command epoch has closed. Refresh before issuing a new action.",
        ),
        None => match owner {
            Some(ResultOwner::Refused(code, message)) => (*code, *message),
            _ => return Err(AccessError::Changed.into()),
        },
    };
    #[derive(Serialize)]
    struct Refused {
        ok: bool,
        code: &'static str,
        message: &'static str,
    }
    wire::encode(
        &Refused {
            ok: false,
            code,
            message,
        },
        b"",
        b"",
        budget,
    )
    .map_err(WorldError::Wire)
}
