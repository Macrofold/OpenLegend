//! One selected player capture and its final scoped disclosure fence. No native
//! read borrow survives a provider/SQL await; the immutable evidence owner does.
use super::*;
use crate::capture::{
    CapturedPlayerControls, PlayerControlFacts, PlayerControlPreparation, PlayerPerception,
    PlayerSelfFacts,
};
pub use crate::commands::player::RuntimePlayerCommand;
use crate::geometry::{GeometryAnswers, GeometryBinding};
use crate::host::{CapacityError, PublicationLease};
use crate::simulation::AcceptedActorRead;
pub use crate::simulation::{InteractionMode, PlayerInteractionFacts};
use indexmap::IndexMap;
use serde_json::value::RawValue;
use std::mem::size_of;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PlayerInputRequest {
    account_id: String,
    actor_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PlayerInteractionInput {
    mode: crate::simulation::InteractionMode,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    target_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    utterance_event_id: Option<String>,
}

pub struct RuntimePlayerRead {
    account: String,
    actor: String,
    read: AcceptedActorRead,
    events: crate::experience::CapturedPlayerEvents,
    preparation: Option<PlayerControlPreparation>,
    controls: Option<CapturedPlayerControls>,
    clock: RuntimeClock,
    view_source: Option<RuntimePlayerViewSource>,
    narrator: Option<RuntimeNarratorFence>,
    _custody: ByteReservation,
}

struct RuntimeNarratorFence {
    privacy_revision: u64,
    temporal: Vec<(crate::received::TemporalReceiptLocator, f64)>,
    _custody: ByteReservation,
}

/// Finite data from the same accepted read as the stand-alone view. Saved
/// presentation presence is a requirement for the application's asset grant.
pub struct RuntimePlayerViewSource {
    pub history_order: u64,
    pub privacy_revision: u64,
    pub memory_cut: u64,
    pub places_revision: u64,
    pub inventory_revision: u64,
    recent_story_age: f64,
    presentation_release: Option<Box<RawValue>>,
    pub presentation_release_revision: Option<u64>,
    milestones: IndexMap<String, bool>,
    _custody: ByteReservation,
}

impl RuntimePlayerViewSource {
    /// Borrow the saved presentation reference from this exact accepted cut.
    /// Application projection still needs the current asset catalog grant.
    pub fn presentation_release(&self) -> Option<&RawValue> {
        self.presentation_release.as_deref()
    }

    pub fn milestone_done(&self, id: &str) -> bool {
        self.milestones.get(id).copied().unwrap_or(false)
    }
}

pub use crate::simulation::PlayerInputState as RuntimePlayerInputState;
pub struct RuntimePlayerPublication {
    can_use_inventory: bool,
    _lease: PublicationLease,
}
impl RuntimePlayerPublication {
    pub fn can_use_inventory(&self) -> bool {
        self.can_use_inventory
    }
}
impl NativeWorldSession {
    /// Admit a decoded browser movement or stop on the same command journal
    /// used by the bridge. Authorization and receipt lookup belong to the
    /// application caller. Only the saved learner record and replay signature
    /// are encoded. The cursor independently admits the retained command.
    pub fn begin_player_command(
        &mut self,
        id: &str,
        actor: &str,
        command: RuntimePlayerCommand<'_>,
        preview: bool,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        // Size the live input copies and both small escaped JSON records.
        let bytes = id
            .len()
            .checked_add(actor.len())
            .and_then(|n| n.checked_add(command.selected_text_bytes()))
            .and_then(|n| n.checked_mul(24))
            .and_then(|n| n.checked_add(4096))
            .ok_or(CapacityError)?;
        let _workspace = self.budget.reserve(bytes)?;
        let (command, signature) = command.bind(id, actor).map_err(failure)?;
        self.session
            .begin_command(
                command,
                signature,
                crate::commands::CommandOptions {
                    preview,
                    native_controller: false,
                    native_movement: None,
                    durable_receipt: !preview,
                },
            )
            .map_err(session_failure)
    }

    /// The application verifies external catalog retention before adopting
    /// the cold writer. Simulation does not interpret these asset references.
    pub fn saved_presentation_release(&self) -> (Option<&RawValue>, Option<u64>) {
        let host = self.session.player_view_settings();
        (
            host.presentation_release.as_deref(),
            host.presentation_release_revision,
        )
    }

    pub fn player_input(&self, input: &[u8]) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: PlayerInputRequest = serde_json::from_slice(input).map_err(failure)?;
        let facts = self.player_input_direct(&input.account_id, &input.actor_id)?;
        RuntimeJson::encode(&facts, &self.budget)
    }

    /// Reuse authoritative binding, life and steering predicates without
    /// preparing presentation, observation history or an addon packet.
    pub fn player_input_direct(
        &self,
        account: &str,
        actor: &str,
    ) -> Result<RuntimePlayerInputState, RuntimeError> {
        self.require_active()?;
        self.session
            .accepted()
            .map_err(failure)?
            .player_input(account, actor)
            .map_err(failure)
    }
    pub fn player_interaction(
        &self,
        read: &RuntimePlayerRead,
        input: &[u8],
    ) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: PlayerInteractionInput = serde_json::from_slice(input).map_err(failure)?;
        if input
            .target_id
            .as_deref()
            .is_some_and(|id| !crate::values::is_safe_record_id(id))
            || input
                .utterance_event_id
                .as_deref()
                .is_some_and(|id| !crate::values::is_safe_record_id(id))
        {
            return Err(failure("invalid selected interaction recipient"));
        }
        self.with_player_interaction(
            &read.account,
            &read.actor,
            input.mode,
            input.target_id.as_deref(),
            input.utterance_event_id.as_deref(),
            |facts| RuntimeJson::encode(&facts, &self.budget),
        )?
    }

    /// Resolve the same current and remembered roles emitted to the browser,
    /// without preparing history or presentation control geometry. Only a
    /// caller-funded selection may survive the accepted read.
    pub fn with_player_targets(
        &self,
        account: &str,
        actor: &str,
        body: impl FnMut(crate::capture::PlayerObservedBody<'_>) -> bool,
        person: impl FnMut(&str) -> bool,
    ) -> Result<(), RuntimeError> {
        self.require_active()?;
        self.session
            .accepted()
            .map_err(failure)?
            .with_player_targets(account, actor, &self.budget, body, person)
            .map_err(failure)
    }

    /// Inspect the authoritative actor, recipient and payer in one accepted
    /// read. The callback must fund anything it retains past the read.
    pub fn with_player_interaction<T>(
        &self,
        account: &str,
        actor: &str,
        mode: InteractionMode,
        target: Option<&str>,
        utterance: Option<&str>,
        consume: impl FnOnce(PlayerInteractionFacts<'_>) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let facts = self
            .session
            .accepted()
            .map_err(failure)?
            .player_interaction(account, actor, mode, target, &self.budget, utterance)
            .map_err(failure)?;
        Ok(consume(facts))
    }
    /// Look up the exact requested owned lots without constructing a player
    /// view. The callback must finish encoding/handoff within this lease.
    pub fn with_player_inventory<T>(
        &self,
        account: &str,
        actor: &str,
        ids: &[String],
        consume: impl FnOnce(&[crate::install::OwnedItem<'_>], &ByteBudget) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        if ids.len() > crate::install::shortcut_limit()
            || ids.iter().any(|id| !crate::values::is_safe_record_id(id))
        {
            return Err(failure("invalid owned shortcut selection"));
        }
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let bytes = ids
            .len()
            .checked_mul(std::mem::size_of::<crate::install::OwnedItem<'_>>())
            .ok_or(crate::host::CapacityError)?;
        let _custody = self.budget.reserve(bytes)?;
        let mut items = Vec::with_capacity(ids.len());
        let state = &simulation.state;
        for (index, id) in ids.iter().enumerate() {
            if !ids[..index].contains(id)
                && let Some(item) = crate::install::owned_by(
                    &state.physical.entities,
                    &state.installed.retained,
                    actor,
                    id,
                )
                .map_err(failure)?
            {
                items.push(item);
            }
        }
        Ok(consume(&items, &self.budget))
    }

    pub fn read_player(
        &mut self,
        account: &str,
        actor: &str,
        event_window: usize,
    ) -> Result<RuntimePlayerRead, RuntimeError> {
        self.read_player_via(account, actor, event_window, false, |simulation, budget| {
            simulation
                .read_player(account, actor, budget)
                .map(|read| (read, ()))
        })
        .map(|(read, ())| read)
    }

    /// Prepare only the caller's independently funded representation of the
    /// self fields. Other permitted evidence and the final disclosure fence
    /// remain on exactly the same actor cut as the encoded facade.
    pub fn read_player_direct<T>(
        &mut self,
        account: &str,
        actor: &str,
        event_window: usize,
        prepare: impl FnOnce(PlayerSelfFacts<'_>, &ByteBudget) -> Result<T, CapacityError>,
    ) -> Result<(RuntimePlayerRead, T), RuntimeError> {
        self.read_player_via(account, actor, event_window, true, |simulation, budget| {
            simulation.read_player_direct(account, actor, budget, prepare)
        })
    }

    fn read_player_via<T>(
        &mut self,
        account: &str,
        actor: &str,
        event_window: usize,
        app_view: bool,
        capture: impl FnOnce(
            &crate::simulation::Simulation,
            &ByteBudget,
        )
            -> Result<(AcceptedActorRead, T), crate::simulation::ActorReadError>,
    ) -> Result<(RuntimePlayerRead, T), RuntimeError> {
        self.require_active()?;
        let clock = self.clock()?;
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|serial| *serial <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let simulation = self.session.accepted().map_err(failure)?;
        let (read, prepared) = capture(simulation, &self.budget).map_err(failure)?;
        let events = simulation
            .read_player_events(account, actor, event_window, &self.budget)
            .map_err(failure)?;
        let state = &simulation.state;
        let view_source = app_view
            .then(|| capture_view_source(&self.session, state, actor, &self.budget))
            .transpose()?;
        let binding = GeometryBinding::new(
            CandidateKey {
                id: 0,
                base_cut: state.accepted_cut,
                generation: self.session.operational_generation(),
            },
            state.installed.geometry.spatial.revision,
            serial,
        );
        let preparation = PlayerControlPreparation::prepare(state, actor, binding, &self.budget)
            .map_err(failure)?;
        let custody = self
            .budget
            .reserve(
                size_of::<RuntimePlayerRead>()
                    .checked_add(account.len())
                    .and_then(|n| n.checked_add(actor.len()))
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        self.next_read_serial = serial;
        let (preparation, controls) = if preparation.queries().is_empty() {
            (
                None,
                Some(preparation.finish_without_geometry().map_err(failure)?),
            )
        } else {
            (Some(preparation), None)
        };
        Ok((
            RuntimePlayerRead {
                account: account.to_owned(),
                actor: actor.to_owned(),
                read,
                events,
                preparation,
                controls,
                clock,
                view_source,
                narrator: None,
                _custody: custody,
            },
            prepared,
        ))
    }
    /// Called in the serialized publication lane. The returned gate excludes
    /// native acceptance only until Node's immediate operational check/send.
    /// It is not held during asynchronous view construction or socket draining.
    pub fn player_publication(
        &self,
        read: &RuntimePlayerRead,
        selected_event_ids: &[String],
        paused: bool,
        controlling: bool,
    ) -> Result<Option<RuntimePlayerPublication>, RuntimeError> {
        let simulation = self.session.accepted().map_err(failure)?;
        if read.controls.is_none() {
            return Err(failure("player control preparation is unfinished"));
        }
        if let Some(source) = &read.view_source {
            let current = self.session.player_view_settings();
            let current_release = current.presentation_release.as_deref().map(RawValue::get);
            if current_release != source.presentation_release().map(RawValue::get)
                || current.presentation_release_revision != source.presentation_release_revision
            {
                return Ok(None);
            }
        }
        if let Some(narrator) = &read.narrator {
            let state = &simulation.state;
            let privacy = state
                .experience
                .actor(&read.actor)
                .map_or(0, |actor| actor.privacy.revision());
            let recent = state
                .installed
                .attention
                .value()
                .retention
                .recent
                .max_age_seconds;
            if narrator.privacy_revision != privacy
                || !super::private_history::durable_temporal_current(
                    state,
                    &read.actor,
                    narrator.temporal.iter().map(|(receipt, at)| (receipt, *at)),
                )
                || narrator.temporal.iter().any(|(_, at)| {
                    !crate::received::temporal_recent_at(
                        *at,
                        state.physical.header.sim_time,
                        recent,
                    )
                })
            {
                return Ok(None);
            }
        }
        if !simulation
            .player_read_still_permitted(&read.account, &read.actor, &read.read)
            .map_err(failure)?
            || !simulation
                .player_events_still_permitted(
                    &read.account,
                    &read.actor,
                    &read.events,
                    selected_event_ids,
                    &self.budget,
                )
                .map_err(failure)?
        {
            return Ok(None);
        }
        let can_use_inventory = simulation
            .player_inventory_available(&read.account, &read.actor, paused, controlling)
            .map_err(failure)?;
        let lease = self.session.fence().begin_publication().map_err(failure)?;
        Ok(Some(RuntimePlayerPublication {
            can_use_inventory,
            _lease: lease,
        }))
    }
}
impl RuntimePlayerRead {
    /// The exact accepted owner for a host control preview prepared after
    /// capturing this view. No other caller may infer authority from the cut.
    pub fn accepted_cut(&self) -> u64 {
        self.read.accepted_cut
    }

    /// Attach the stored narrator's exact personal-source witness to this
    /// already selected view. The physical reader owns a separate small copy
    /// until the final native disclosure or the caller drops this attempt.
    pub fn bind_narrator(
        &mut self,
        privacy_revision: u64,
        temporal: &[(crate::received::TemporalReceiptLocator, f64)],
        budget: &ByteBudget,
    ) -> Result<bool, RuntimeError> {
        if self.narrator.is_some() {
            return Err(failure("narration already bound"));
        }
        let view = self.view_source()?;
        if privacy_revision != view.privacy_revision
            || temporal.iter().any(|(receipt, at)| {
                receipt.actor_id != self.actor
                    || !crate::received::temporal_recent_at(
                        *at,
                        self.clock.at,
                        view.recent_story_age,
                    )
            })
        {
            return Ok(false);
        }
        let bytes = temporal
            .iter()
            .try_fold(0usize, |used, (receipt, _)| {
                used.checked_add(std::mem::size_of::<(
                    crate::received::TemporalReceiptLocator,
                    f64,
                )>())?
                .checked_add(receipt.actor_id.len())?
                .checked_add(receipt.epoch.len())
            })
            .ok_or_else(|| failure("narration source capacity"))?;
        let custody = budget.reserve(bytes)?;
        self.narrator = Some(RuntimeNarratorFence {
            privacy_revision,
            temporal: temporal.to_vec(),
            _custody: custody,
        });
        Ok(true)
    }

    pub fn view_source(&self) -> Result<&RuntimePlayerViewSource, RuntimeError> {
        self.view_source
            .as_ref()
            .ok_or_else(|| failure("application view metadata was not captured"))
    }
    /// These controls and clock came from the accepted cut used for the view.
    pub fn clock(&self) -> RuntimeClock {
        self.clock
    }

    /// Compare the scope retained by this capture without exposing its IDs or
    /// granting current permission to disclose it.
    pub fn belongs_to(&self, account: &str, actor: &str) -> bool {
        self.account == account && self.actor == actor
    }

    /// Borrow this reader's independently funded accounts at its exact cut.
    /// The original evidence remains pinned until the read ends. Pass every
    /// selected event ID to `player_publication` for final current disclosure.
    pub fn event_payload(&self) -> &str {
        self.events.json()
    }

    /// Use the same completed cut as the encoded caller. Missing geometry is
    /// an unfinished operation, never an implicitly unavailable control.
    pub fn control_facts(&self) -> Result<&PlayerControlFacts, RuntimeError> {
        self.controls
            .as_ref()
            .map(CapturedPlayerControls::facts)
            .ok_or_else(|| failure("control geometry is still required"))
    }

    /// Borrow only the selected, ordered current contacts and their existing
    /// evidence. No JSON, body copies or additional world lookups are involved.
    pub fn perception(&self) -> Result<PlayerPerception<'_>, RuntimeError> {
        PlayerPerception::new(&self.read.perception).map_err(failure)
    }

    pub fn control_question(
        &self,
        budget: &ByteBudget,
    ) -> Result<Option<RuntimeJson>, RuntimeError> {
        self.control_queries()
            .map(|queries| RuntimeJson::encode(queries, budget))
            .transpose()
    }

    /// The capture owns this immutable input through its control preparation.
    pub fn control_queries(&self) -> Option<&crate::geometry::GeometryQueries> {
        self.preparation
            .as_ref()
            .map(PlayerControlPreparation::queries)
    }
    pub fn finish_controls(
        &mut self,
        bytes: &[u8],
        budget: &ByteBudget,
    ) -> Result<(), RuntimeError> {
        let _decode = decode_preparation(bytes, budget)?;
        let answers: GeometryAnswers = serde_json::from_slice(bytes).map_err(failure)?;
        self.apply_controls(answers)
    }

    /// Reuse the control validator with a typed physical answer instead of
    /// serializing its path through the addon.
    pub fn finish_controls_direct(
        &mut self,
        answers: GeometryAnswers,
        custody: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<(), RuntimeError> {
        if !budget.owns(&custody) || !custody.shares_owner(&self._custody) {
            return Err(failure("control answer belongs to another native budget"));
        }
        let result = self.apply_controls(answers);
        drop(custody);
        result
    }

    fn apply_controls(&mut self, answers: GeometryAnswers) -> Result<(), RuntimeError> {
        let preparation = self
            .preparation
            .take()
            .ok_or_else(|| failure("control preparation already finished"))?;
        self.controls = Some(preparation.finish(answers).map_err(failure)?);
        Ok(())
    }
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let own = self
            .read
            .encoded_self()
            .ok_or_else(|| failure("this player read supplied its self facts directly"))?;
        let controls = self
            .controls
            .as_ref()
            .ok_or_else(|| failure("control geometry is still required"))?;
        let (perception, _perception_custody) = self
            .read
            .perception
            .write_json(budget)
            .map_err(|error| session_failure(error.into()))?;
        let (controls, _controls_custody) = controls
            .write_json(budget)
            .map_err(|error| session_failure(error.into()))?;
        // Every member is already encoded by its semantic owner. Joining those
        // complete encodings avoids decoding a private graph just to re-encode it.
        let parts = [
            b"{\"self\":".as_slice(),
            own.as_bytes(),
            b",\"perception\":",
            perception.as_bytes(),
            b",\"events\":",
            self.events.json().as_bytes(),
            b",\"controls\":",
            controls.as_bytes(),
            b"}",
        ];
        RuntimeJson::join(&parts, budget)
    }
}

fn capture_view_source(
    session: &crate::simulation::Session,
    state: &crate::simulation::SimulationState,
    actor: &str,
    budget: &ByteBudget,
) -> Result<RuntimePlayerViewSource, RuntimeError> {
    use crate::host::retained_size::map_storage;
    let host = session.player_view_settings();
    let milestones = host
        .actor_milestones
        .as_ref()
        .and_then(|rows| rows.get(actor));
    let bytes = milestones
        .map_or(Some(0), |rows| {
            rows.keys()
                .try_fold(map_storage::<String, bool>(rows.len())?, |sum, key| {
                    sum.checked_add(key.len())
                })
        })
        .and_then(|bytes| {
            bytes.checked_add(
                host.presentation_release
                    .as_ref()
                    .map_or(0, |release| release.get().len()),
            )
        })
        .ok_or_else(|| failure("capacity"))?;
    let custody = budget.reserve(bytes).map_err(failure)?;
    Ok(RuntimePlayerViewSource {
        history_order: state.occurrences.next_hot_ordinal(),
        privacy_revision: state
            .experience
            .actor(actor)
            .map_or(0, |history| history.privacy.revision()),
        // This display hint can advance with the accepted cut. It cannot
        // substitute for the exact source/permission check on a memory read.
        memory_cut: state.accepted_cut,
        places_revision: state.experience.known_place_revision(actor),
        inventory_revision: state.administration.object_membership.revision,
        recent_story_age: state
            .installed
            .attention
            .value()
            .retention
            .recent
            .max_age_seconds,
        presentation_release: host.presentation_release.clone(),
        presentation_release_revision: host.presentation_release_revision,
        milestones: milestones.cloned().unwrap_or_default(),
        _custody: custody,
    })
}
