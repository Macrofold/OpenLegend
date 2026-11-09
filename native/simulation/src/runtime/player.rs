//! One selected player capture and its final scoped disclosure fence. No native
//! read borrow survives a provider/SQL await; the immutable evidence owner does.
use super::*;
use crate::capture::{CapturedPlayerControls, PlayerControlPreparation};
use crate::geometry::{GeometryAnswers, GeometryBinding};
use crate::host::PublicationLease;
use crate::simulation::AcceptedActorRead;
use std::mem::size_of;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PlayerInteractionInput {
    mode: crate::simulation::InteractionMode,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    target_id: Option<String>,
}

pub struct RuntimePlayerRead {
    account: String,
    actor: String,
    read: AcceptedActorRead,
    events: crate::experience::CapturedPlayerEvents,
    preparation: Option<PlayerControlPreparation>,
    controls: Option<CapturedPlayerControls>,
    _custody: ByteReservation,
}
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
        self.require_active()?;
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|serial| *serial <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let simulation = self.session.accepted().map_err(failure)?;
        let read = simulation
            .read_player(account, actor, &self.budget)
            .map_err(failure)?;
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
        Ok(RuntimePlayerRead {
            account: account.to_owned(),
            actor: actor.to_owned(),
            read,
            events,
            preparation,
            controls,
            _custody: custody,
        })
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
    pub fn control_question(
        &self,
        budget: &ByteBudget,
    ) -> Result<Option<RuntimeJson>, RuntimeError> {
        self.preparation
            .as_ref()
            .map(|preparation| RuntimeJson::encode(preparation.queries(), budget))
            .transpose()
    }
    pub fn finish_controls(
        &mut self,
        bytes: &[u8],
        budget: &ByteBudget,
    ) -> Result<(), RuntimeError> {
        let _decode = decode_preparation(bytes, budget)?;
        let answers: GeometryAnswers = serde_json::from_slice(bytes).map_err(failure)?;
        let preparation = self
            .preparation
            .take()
            .ok_or_else(|| failure("control preparation already finished"))?;
        self.controls = Some(preparation.finish(answers).map_err(failure)?);
        Ok(())
    }
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
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
            self.read.own_json().as_bytes(),
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
