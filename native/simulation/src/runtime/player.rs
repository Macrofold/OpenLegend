//! One selected player capture and its final scoped disclosure fence. No native
//! read borrow survives a provider/SQL await; the immutable evidence owner does.
use super::*;
use crate::capture::{
    CapturedPlayerControls, PlayerControlFacts, PlayerControlPreparation, PlayerPerception,
    PlayerSelfFacts,
};
use crate::geometry::{GeometryAnswers, GeometryBinding};
use crate::host::{CapacityError, PublicationLease};
use crate::simulation::AcceptedActorRead;
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
    _custody: ByteReservation,
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
        let simulation = self.session.accepted().map_err(failure)?;
        let facts = simulation
            .player_interaction(
                &read.account,
                &read.actor,
                input.mode,
                input.target_id.as_deref(),
                &self.budget,
                input.utterance_event_id.as_deref(),
            )
            .map_err(failure)?;
        RuntimeJson::encode(&facts, &self.budget)
    }
    pub fn read_player(
        &mut self,
        account: &str,
        actor: &str,
        event_window: usize,
    ) -> Result<RuntimePlayerRead, RuntimeError> {
        self.read_player_via(account, actor, event_window, |simulation, budget| {
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
        self.read_player_via(account, actor, event_window, |simulation, budget| {
            simulation.read_player_direct(account, actor, budget, prepare)
        })
    }

    fn read_player_via<T>(
        &mut self,
        account: &str,
        actor: &str,
        event_window: usize,
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
        let (perception, _perception_custody) =
            self.read.perception.write_json(budget).map_err(failure)?;
        let (controls, _controls_custody) = controls.write_json(budget).map_err(failure)?;
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
