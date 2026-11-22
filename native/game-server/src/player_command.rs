//! A prior receipt is resolved before new target preparation. A read that
//! spans acceptance or ACK pins that receipt until its final checking turn.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope, Capability, RequestScope, now_ms},
    boot::CurrentServer,
    command_epoch::{RETRY_MS, RequestIdentity},
    live_save::{AcceptedSaveInput, LiveSaves},
    npc::Director,
    player_references::ReferenceIssuer,
    store::{AdmittedReceipt, GameplayReceipt, KnownPlaceViewPage, PlaceViewRequest, StoreError},
    wire,
    world::{ApplicationStart, PlayerHistoryRead, WorldError},
};
use axum::body::Bytes;
use openlegend_simulation::{
    commands::{SpeechTargetRole, StatusOperation},
    encoding::{json_record, sha256_hex},
    gathering::GatheringMode,
    host::{ByteBudget, ByteReservation},
    reception::EncounterExposure,
    runtime::{InteractionMode, NativeWorldSession, RuntimeDirectOutput, RuntimeError, RuntimePlayerCommand},
    state::SurfacePoint,
    text::JsText,
    values::deserialize_present_option,
    worlds::base_observed::SpeechVolume,
    runtime::{FireOperation, PlayerTravelDestination, PlayerTravelIntent, TravelOperation, PlanMode},
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;
mod typed;
pub(crate) use typed::{ActionAttempt, AttemptRecovery};

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
    kind: CommandKind,
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
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    target_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    distance: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    follow_until: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    complete_follow: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    item_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    container_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    fire_operation: Option<FireOperation>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    hearth_plan: Option<crate::player_http::hearth::HearthPlan>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    outing_operation: Option<TravelOperation>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    outing_mode: Option<PlanMode>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    outing_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    destination_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    purpose: Option<JsText>,
    #[serde(
        default,
        deserialize_with = "openlegend_simulation::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    quantity: Option<u64>,
    #[serde(
        default,
        deserialize_with = "openlegend_simulation::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    expected_revision: Option<u64>,
    #[serde(
        default,
        deserialize_with = "openlegend_simulation::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    placement_revision: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    gathering_mode: Option<GatheringMode>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    preparation_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "openlegend_simulation::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    preparation_version: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    preparation_digest: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    inputs: Option<indexmap::IndexMap<String, String>>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    recipe_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    text: Option<JsText>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    volume: Option<SpeechVolume>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    definition_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    effect_operation: Option<StatusOperation>,
    #[serde(rename = "facing", default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    facing_heading: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    handover_operation: Option<openlegend_simulation::handover::GiftOperation>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    offered_items: Option<[openlegend_simulation::handover::GiftSelection; 1]>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    requested_items: Option<[(); 0]>,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    offer_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "openlegend_simulation::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    expected_offer_revision: Option<u64>,
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
enum CommandKind {
    Move,
    Follow,
    Cancel,
    Gather,
    Fish,
    #[serde(rename = "tend-fire")]
    TendFire,
    #[serde(rename = "place-hearth")]
    PlaceHearth,
    Outing,
    Pickup,
    Drop,
    Cook,
    Craft,
    Eat,
    Say,
    #[serde(rename = "status-effect")]
    StatusEffect,
    Equip,
    Unequip,
    #[serde(rename = "inspect-inventory")]
    InspectItem,
    Handover,
}

struct PreparedRequest {
    id: String,
    fingerprint: String,
    recovery_fingerprint: String,
    request: CommandRequest,
    gift: Option<openlegend_simulation::handover::GiftIntent>,
    epoch: u64,
    _custody: ByteReservation,
}

pub(crate) struct PlayerCommands {
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    authority: Arc<Authority>,
    references: Arc<ReferenceIssuer>,
    identity: Arc<Mutex<RequestIdentity>>,
    maintenance: Arc<crate::operator_maintenance::OperatorMaintenance>,
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
        references: Arc<ReferenceIssuer>,
        identity: Arc<Mutex<RequestIdentity>>,
        maintenance: Arc<crate::operator_maintenance::OperatorMaintenance>,
    ) -> Self {
        Self {
            game,
            saves,
            authority,
            references,
            identity,
            maintenance,
        }
    }

    /// Bind the command token to the notice published with it. A view which
    /// captures its native clock on the other side of the transition retries.
    pub(crate) async fn view_epoch(
        &self,
    ) -> (String, u64, Option<Arc<crate::operator_maintenance::Window>>) {
        let identity = self.identity.lock().await;
        let current = self.maintenance.snapshot();
        (
            identity.epoch.token.clone(),
            current.revision,
            current.retained_notice(),
        )
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

    /// The read watch covers pending acceptance during the independent SQL
    /// read. A receipt remains pinned even if that cut is acknowledged meanwhile.
    async fn read_original_receipt(
        &self,
        world: &str,
        id: &str,
        watch: &crate::live_save::ReceiptRead<'_>,
    ) -> Result<Option<ResultOwner>, WorldError> {
        let durable = if watch.accepted()?.is_none() {
            self.game.store.command_receipt(world, id).await?
        } else {
            None
        };
        Ok(watch.accepted()?.map(ResultOwner::Accepted)
            .or_else(|| durable.map(ResultOwner::Durable)))
    }

    pub(crate) async fn command(
        &self,
        scope: Arc<AuthorizedScope>,
        input: CommandRequest,
        recovery: bool,
        body: ByteReservation,
        decisions: &Director,
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
                let mut prior = self.read_original_receipt(world_id, &facts.id, &watch).await?;
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
                self.maintenance.allow_ordinary(permits, &scope)?;
                self.saves.check_admission(tokio::time::Instant::now())?;
                // A recovered receipt above grants no new speech. For a new
                // utterance, use the same allowance gate as the Speak control.
                let speech_reply = if matches!(facts.request.command.kind, CommandKind::Say) {
                    let available = decisions
                        .availability(
                            scope.clone(),
                            self.references.clone(),
                            InteractionMode::Speak,
                            facts.request.command.target_id.clone(),
                        )
                        .await?;
                    if !available.available {
                        let refused = ResultOwner::Refused(
                            available.code,
                            available.reason.unwrap_or("Your character cannot speak now."),
                        );
                        return permits.current(&scope, Capability::Play, true, |scope, _| {
                            report(Some(&refused), &facts, scope, true, false, budget)
                        })?;
                    }
                    Some(available.reply)
                } else {
                    None
                };
                let materials = if matches!(facts.request.command.kind, CommandKind::Gather | CommandKind::PlaceHearth) {
                    Some(self.game.store.construction_materials(
                        world_id, Some(&scope.scope.actor_id),
                    ).await?)
                } else {
                    None
                };
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
                let begin_references = self.references.clone();
                let begin_budget = self.game.host.budget().clone();
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
                                && !(clock.manually_paused
                                    && begin_facts.request.command.permits_manual_pause())
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
                            let raw = &begin_facts.request.command;
                            let target_ref = raw.target_id.as_deref();
                            let own_status = matches!(raw.kind, CommandKind::StatusEffect)
                                && target_ref == Some(begin_scope.scope.actor_id.as_str());
                            let speech_target = match (raw.kind, target_ref) {
                                (CommandKind::Say, Some(contact)) => {
                                    let Some(target) = begin_references.resolve_speech_target(
                                        world, &begin_scope.scope, contact, &begin_budget,
                                    )? else {
                                        return Ok(ApplicationStart::Existing(ResultOwner::Refused(
                                            "invalid-recipient",
                                            "Choose a known person or a person currently in sight.",
                                        )));
                                    };
                                    let current = world.with_player_interaction(
                                        &begin_scope.scope.account_id,
                                        &begin_scope.scope.actor_id,
                                        InteractionMode::Speak,
                                        Some(&target.id),
                                        None,
                                        |facts| {
                                            facts.actor_available
                                                && facts.recipient_available
                                                && Some(facts.reply) == speech_reply
                                        },
                                    )?;
                                    if !current {
                                        return Ok(ApplicationStart::Existing(ResultOwner::Refused(
                                            "stale", "The selected interaction changed. Refresh it.",
                                        )));
                                    }
                                    Some(target)
                                }
                                _ => None,
                            };
                            let target = match target_ref.filter(|_| {
                                !own_status && !matches!(raw.kind, CommandKind::Say)
                            }) {
                                None => None,
                                Some(contact) => {
                                    let selected = if matches!(raw.kind, CommandKind::Pickup) {
                                        begin_references.resolve_ground_pickup(
                                            world, &begin_scope.scope, contact, raw.item_id.as_deref(), &begin_budget,
                                        )?
                                    } else {
                                        begin_references.resolve_contact(
                                            world, &begin_scope.scope, contact, &begin_budget,
                                        )?
                                    };
                                    let Some(target) = selected else {
                                        return Ok(ApplicationStart::Existing(
                                            ResultOwner::Refused(
                                                "stale-contact",
                                                if matches!(raw.kind, CommandKind::StatusEffect | CommandKind::Follow) {
                                                    "Choose a target you can see now."
                                                } else {
                                                    "Choose a resource you can see now."
                                                },
                                            ),
                                        ));
                                    };
                                    Some(target)
                                }
                            };
                            let travel_destination = if let Some(reference) = raw.destination_id.as_deref() {
                                let Some(destination) = begin_references.resolve_contact(
                                    world, &begin_scope.scope, reference, &begin_budget,
                                )? else {
                                    return Ok(ApplicationStart::Existing(ResultOwner::Refused(
                                        "stale-contact", "Choose a destination you can see now.",
                                    )));
                                };
                                Some(destination)
                            } else {
                                None
                            };
                            let command = begin_facts.command(
                                position,
                                target.as_ref().map(|value| value.id.as_str())
                                    .or(own_status.then_some(begin_scope.scope.actor_id.as_str())),
                                speech_target.as_ref().map(|value| (value.id.as_str(), value.role)),
                                travel_destination.as_ref().map(|value| value.id.as_str()),
                            )?;
                            Ok(ApplicationStart::Candidate(world.begin_player_command_with_materials(
                                &begin_facts.id,
                                &begin_scope.scope.actor_id,
                                command,
                                false,
                                materials,
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

impl CommandInput {
    fn permits_manual_pause(&self) -> bool {
        matches!(self.kind, CommandKind::Cancel)
            || matches!((self.kind, self.outing_operation),
                (CommandKind::Outing, Some(TravelOperation::Decline | TravelOperation::Leave)))
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
            || (!matches!(command.kind, CommandKind::Unequip | CommandKind::InspectItem | CommandKind::Outing)
                && command.expected_revision.is_some())
            || (!matches!(command.kind, CommandKind::Outing)
                && (command.outing_operation.is_some() || command.outing_mode.is_some()
                    || command.outing_id.is_some() || command.destination_id.is_some()
                    || command.purpose.is_some()))
            || (!matches!(command.kind, CommandKind::Unequip) && command.placement_revision.is_some())
            || (!matches!(command.kind, CommandKind::InspectItem) && command.container_id.is_some())
            || command.quantity.is_some_and(|quantity| {
                !matches!(command.kind, CommandKind::Pickup | CommandKind::Drop)
                    || quantity == 0 || quantity > openlegend_simulation::identity::MAX_SAFE_INTEGER
            })
            || (!matches!(command.kind, CommandKind::Craft) && command.recipe_id.is_some())
            || (!matches!(command.kind, CommandKind::TendFire) && command.fire_operation.is_some())
            || (!matches!(command.kind, CommandKind::PlaceHearth) && command.hearth_plan.is_some())
            || (!matches!(command.kind, CommandKind::Follow)
                && (command.distance.is_some() || command.follow_until.is_some() || command.complete_follow.is_some()))
            || (!matches!(command.kind, CommandKind::Say)
                && (command.text.is_some() || command.volume.is_some()))
            || (!matches!(command.kind, CommandKind::StatusEffect)
                && (command.definition_id.is_some() || command.effect_operation.is_some()
                    || command.facing_heading.is_some()))
            || (!matches!(command.kind, CommandKind::Cook)
                && (command.preparation_id.is_some()
                    || command.preparation_version.is_some()
                    || command.preparation_digest.is_some()
                    || command.inputs.is_some()))
        {
            return Err(AccessError::Forbidden.into());
        }
        if !matches!(command.kind, CommandKind::Handover)
            && (command.handover_operation.is_some() || command.offered_items.is_some()
                || command.requested_items.is_some() || command.offer_id.is_some()
                || command.expected_offer_revision.is_some())
        {
            return Err(AccessError::Forbidden.into());
        }
        match command.kind {
            CommandKind::Handover
                if command.position.is_none() && command.known_place.is_none()
                    && command.gathering_mode.is_none() && command.expected_action_id.is_none()
                    && command.item_id.is_none() && command.target_id.as_deref().is_some_and(id)
                    && command.gift().is_some_and(|gift| gift.valid()) => Ok(()),
            CommandKind::Outing if command.known_place.is_none() && command.gathering_mode.is_none()
                && command.expected_action_id.is_none() && command.item_id.is_none() =>
            {
                let recipient = command.target_id.as_deref();
                let confirmed = command.outing_id.as_deref().is_some_and(id)
                    && command.expected_revision.is_some()
                    && command.target_id.is_none() && command.destination_id.is_none()
                    && command.position.is_none() && command.purpose.is_none();
                let valid = match command.outing_operation {
                    Some(TravelOperation::Invite) => {
                        recipient.is_some_and(id) && command.outing_mode.is_some()
                            && command.outing_id.is_none() && command.expected_revision.is_none()
                            && match (command.position.as_ref(), command.destination_id.as_deref()) {
                                (Some(point), None) => id(&point.surface_id)
                                    && [point.x, point.y, point.z].into_iter().all(f64::is_finite),
                                (None, Some(reference)) => id(reference),
                                _ => false,
                            }
                    }
                    Some(TravelOperation::Accept) => confirmed && command.outing_mode.is_some(),
                    Some(TravelOperation::Decline | TravelOperation::Leave) =>
                        confirmed && command.outing_mode.is_none(),
                    None => false,
                };
                valid.then_some(()).ok_or_else(|| AccessError::Forbidden.into())
            }
            CommandKind::InspectItem
                if command.position.is_none()
                    && command.known_place.is_none()
                    && command.target_id.is_none()
                    && command.gathering_mode.is_none()
                    && command.expected_action_id.is_none()
                    && command.item_id.as_deref().is_some_and(id)
                    && command.container_id.as_deref().is_some_and(id)
                    && command.expected_revision.is_some() => Ok(()),
            CommandKind::Follow
                if command.position.is_none()
                    && command.expected_action_id.is_none()
                    && command.known_place.is_none()
                    && command.target_id.as_deref().is_some_and(id)
                    && command.item_id.is_none()
                    && command.gathering_mode.is_none()
                    && command.distance.is_none_or(|n| n.is_finite() && n > 0.0)
                    && command.follow_until.is_none_or(|n| n.is_finite() && n >= 0.0)
                    && command.complete_follow != Some(false) => Ok(()),
            CommandKind::Move
                if command.expected_action_id.is_none()
                    && command.target_id.is_none()
                    && command.item_id.is_none()
                    && command.gathering_mode.is_none()
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
            CommandKind::Cancel
                if command.position.is_none()
                    && command.known_place.is_none()
                    && command.target_id.is_none()
                    && command.item_id.is_none()
                    && command.gathering_mode.is_none()
                    && command.expected_action_id.as_deref().is_none_or(id) =>
            {
                Ok(())
            }
            CommandKind::Gather
                if command.position.is_none()
                    && command.known_place.is_none()
                    && command.expected_action_id.is_none()
                    && command.target_id.as_deref().is_some_and(id)
                    && command.item_id.as_deref().is_none_or(id) =>
            {
                let wants_tool = match command.gathering_mode {
                    Some(GatheringMode::CarriedTool | GatheringMode::EquippedTool) => true,
                    Some(GatheringMode::AvailableTools | GatheringMode::BareHands) => false,
                    None => command.item_id.is_some(),
                };
                if wants_tool == command.item_id.is_some() {
                    Ok(())
                } else {
                    Err(AccessError::Forbidden.into())
                }
            }
            CommandKind::Fish | CommandKind::Pickup
                if command.position.is_none()
                    && command.known_place.is_none()
                    && command.expected_action_id.is_none()
                    && command.target_id.as_deref().is_some_and(id)
                    && command.item_id.as_deref().is_none_or(id)
                    && (command.item_id.is_some()
                        || (matches!(command.kind, CommandKind::Pickup) && command.quantity.is_none()))
                    && command.gathering_mode.is_none() =>
            {
                Ok(())
            }
            CommandKind::Drop if command.position.is_none()
                && command.known_place.is_none()
                && command.expected_action_id.is_none()
                && command.target_id.is_none()
                && command.item_id.as_deref().is_some_and(id)
                && command.quantity.is_some()
                && command.gathering_mode.is_none() => Ok(()),
            CommandKind::Craft
                if command.position.is_none() && command.known_place.is_none()
                    && command.target_id.is_none() && command.item_id.is_none()
                    && command.expected_action_id.is_none() && command.gathering_mode.is_none()
                    && command.recipe_id.as_deref().is_some_and(openlegend_simulation::values::is_safe_record_id)
                => Ok(()),
            CommandKind::Say
                if command.position.is_none()
                    && command.known_place.is_none()
                    && command.expected_action_id.is_none()
                    && command.item_id.is_none()
                    && command.gathering_mode.is_none()
                    && command.target_id.as_deref().is_none_or(id)
                    && command.text.is_some() => Ok(()),
            CommandKind::StatusEffect
                if command.position.is_none()
                    && command.known_place.is_none()
                    && command.expected_action_id.is_none()
                    && command.item_id.is_none()
                    && command.gathering_mode.is_none()
                    && command.target_id.as_deref().is_some_and(id)
                    && command.definition_id.as_deref()
                        .is_some_and(openlegend_simulation::values::is_safe_record_id)
                    && command.effect_operation.is_some()
                    && command.facing_heading.is_none_or(f64::is_finite) => Ok(()),
            CommandKind::PlaceHearth
                if command.position.is_none() && command.known_place.is_none()
                    && command.expected_action_id.is_none() && command.gathering_mode.is_none()
                    && command.target_id.is_none() && command.item_id.is_none()
                    && command.hearth_plan.as_ref().is_some_and(|plan| plan.valid()) => Ok(()),
            CommandKind::TendFire
                if command.position.is_none() && command.known_place.is_none()
                    && command.expected_action_id.is_none() && command.gathering_mode.is_none()
                    && command.target_id.as_deref().is_some_and(id)
                    && command.fire_operation.is_some_and(|operation| command.item_id.as_deref()
                        .is_none_or(|item| operation == FireOperation::Fuel && id(item)))
                => Ok(()),
            CommandKind::Cook
                if command.position.is_none()
                    && command.known_place.is_none()
                    && command.expected_action_id.is_none()
                    && command.target_id.as_deref().is_some_and(id)
                    && command.item_id.is_none()
                    && command.gathering_mode.is_none()
                    && command.preparation_id.as_deref().is_some_and(openlegend_simulation::values::is_safe_record_id)
                    && command.preparation_version.is_some_and(|version| version > 0)
                    && command.preparation_digest.as_deref().is_some_and(|digest| {
                        !digest.is_empty() && digest.encode_utf16().count() <= 128
                    })
                    && command.inputs.as_ref().is_some_and(openlegend_simulation::runtime::valid_preparation_inputs) =>
            {
                Ok(())
            }
            CommandKind::Eat | CommandKind::Equip | CommandKind::Unequip
                if command.position.is_none()
                    && command.known_place.is_none()
                    && command.expected_action_id.is_none()
                    && command.target_id.is_none()
                    && command.gathering_mode.is_none()
                    && command.item_id.as_deref().is_some_and(id)
                    && (matches!(command.kind, CommandKind::Eat | CommandKind::Equip)
                        || command.expected_revision.is_some() && command.placement_revision.is_some()) => Ok(()),
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
        let digest_bytes = self.command.text.as_ref().map_or(0, JsText::units_len)
            .checked_mul(6).and_then(|bytes| bytes.checked_add(8192))
            .ok_or(StoreError::Capacity)?;
        let additional = budget.reserve(digest_bytes).map_err(|_| StoreError::Capacity)?;
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
            gift: self.command.gift(),
            request: self,
            epoch,
            _custody: custody,
        })
    }
}

impl CommandInput {
    fn gift(&self) -> Option<openlegend_simulation::handover::GiftIntent> {
        Some(openlegend_simulation::handover::GiftIntent {
            handover_operation: self.handover_operation?,
            offered_items: self.offered_items.clone(),
            requested_items: self.requested_items,
            offer_id: self.offer_id.clone(),
            expected_offer_revision: self.expected_offer_revision,
        })
    }
}

impl PreparedRequest {
    fn command<'a>(
        &'a self,
        destination: Option<&'a SurfacePoint>,
        target: Option<&'a str>,
        speech_target: Option<(&'a str, SpeechTargetRole)>,
        travel_destination: Option<&'a str>,
    ) -> Result<RuntimePlayerCommand<'a>, WorldError> {
        let input = &self.request.command;
        match input.kind {
            CommandKind::Handover => Ok(RuntimePlayerCommand::Handover {
                target: target.ok_or(StoreError::InvalidRecord)?,
                gift: self.gift.as_ref().ok_or(StoreError::InvalidRecord)?,
            }),
            CommandKind::Outing => {
                let operation = input.outing_operation.ok_or(StoreError::InvalidRecord)?;
                let input = if operation == TravelOperation::Invite {
                    let destination = match (travel_destination, destination) {
                        (Some(id), None) => PlayerTravelDestination::Stationary(id),
                        (None, Some(point)) => PlayerTravelDestination::Point(point),
                        _ => return Err(StoreError::InvalidRecord.into()),
                    };
                    PlayerTravelIntent::Invite {
                        recipient: target.ok_or(StoreError::InvalidRecord)?,
                        destination,
                        mode: input.outing_mode.ok_or(StoreError::InvalidRecord)?,
                        purpose: input.purpose.as_ref(),
                    }
                } else {
                    PlayerTravelIntent::Remedy {
                        operation,
                        invitation: input.outing_id.as_deref().ok_or(StoreError::InvalidRecord)?,
                        revision: input.expected_revision.ok_or(StoreError::InvalidRecord)?,
                        mode: input.outing_mode,
                    }
                };
                Ok(RuntimePlayerCommand::Travel(input))
            }
            CommandKind::InspectItem => Ok(RuntimePlayerCommand::InspectItem {
                item: input.item_id.as_deref().ok_or(StoreError::InvalidRecord)?,
                container: input.container_id.as_deref().ok_or(StoreError::InvalidRecord)?,
                expected_revision: input.expected_revision.ok_or(StoreError::InvalidRecord)?,
            }),
            CommandKind::Follow => Ok(RuntimePlayerCommand::Follow {
                target: target.ok_or(StoreError::InvalidRecord)?,
                distance: input.distance,
                until: input.follow_until,
                complete: input.complete_follow,
            }),
            CommandKind::Move => Ok(RuntimePlayerCommand::Move(
                destination.ok_or(StoreError::InvalidRecord)?,
            )),
            CommandKind::Cancel => Ok(RuntimePlayerCommand::Cancel(
                input.expected_action_id.as_deref(),
            )),
            CommandKind::Gather => Ok(RuntimePlayerCommand::Gather {
                target: target.ok_or(StoreError::InvalidRecord)?,
                tool: input.item_id.as_deref(),
                mode: input.gathering_mode,
            }),
            CommandKind::Pickup => Ok(RuntimePlayerCommand::Pickup {
                target: target.ok_or(StoreError::InvalidRecord)?,
                item: input.item_id.as_deref(),
                quantity: input.quantity,
            }),
            CommandKind::Drop => Ok(RuntimePlayerCommand::Drop {
                item: input.item_id.as_deref().ok_or(StoreError::InvalidRecord)?,
                quantity: input.quantity.ok_or(StoreError::InvalidRecord)?,
            }),
            CommandKind::Fish => Ok(RuntimePlayerCommand::Fish {
                target: target.ok_or(StoreError::InvalidRecord)?,
                tool: input.item_id.as_deref().ok_or(StoreError::InvalidRecord)?,
            }),
            CommandKind::Craft => Ok(RuntimePlayerCommand::Craft {
                recipe: input.recipe_id.as_deref().ok_or(StoreError::InvalidRecord)?,
            }),
            CommandKind::Say => Ok(RuntimePlayerCommand::Say {
                text: input.text.as_ref().ok_or(StoreError::InvalidRecord)?,
                target: speech_target,
                volume: input.volume,
            }),
            CommandKind::StatusEffect => Ok(RuntimePlayerCommand::Status {
                target: target.ok_or(StoreError::InvalidRecord)?,
                definition: input.definition_id.as_deref().ok_or(StoreError::InvalidRecord)?,
                operation: input.effect_operation.ok_or(StoreError::InvalidRecord)?,
                facing: input.facing_heading,
            }),
            CommandKind::PlaceHearth => {
                let plan = input.hearth_plan.as_ref().ok_or(StoreError::InvalidRecord)?;
                Ok(RuntimePlayerCommand::PlaceHearth { definition: &plan.definition, site: &plan.site })
            }
            CommandKind::TendFire => Ok(RuntimePlayerCommand::TendFire {
                target: target.ok_or(StoreError::InvalidRecord)?,
                operation: input.fire_operation.ok_or(StoreError::InvalidRecord)?,
                item: input.item_id.as_deref(),
            }),
            CommandKind::Cook => Ok(RuntimePlayerCommand::Cook {
                heat: target.ok_or(StoreError::InvalidRecord)?,
                preparation_id: input.preparation_id.as_deref().ok_or(StoreError::InvalidRecord)?,
                preparation_version: input.preparation_version.ok_or(StoreError::InvalidRecord)?,
                preparation_digest: input.preparation_digest.as_deref().ok_or(StoreError::InvalidRecord)?,
                inputs: input.inputs.as_ref().ok_or(StoreError::InvalidRecord)?,
            }),
            CommandKind::Eat => Ok(RuntimePlayerCommand::Eat(input.item_id.as_deref().ok_or(StoreError::InvalidRecord)?)),
            CommandKind::Equip => Ok(RuntimePlayerCommand::Equip(
                input.item_id.as_deref().ok_or(StoreError::InvalidRecord)?,
            )),
            CommandKind::Unequip => Ok(RuntimePlayerCommand::Unequip {
                item: input.item_id.as_deref().ok_or(StoreError::InvalidRecord)?,
                expected_revision: input.expected_revision.ok_or(StoreError::InvalidRecord)?,
                placement_revision: input.placement_revision.ok_or(StoreError::InvalidRecord)?,
            }),
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
