//! A player's description can add one physical occurrence. The application
//! holds the original selection across funding and delivery without exposing it.
use super::*;
use crate::{
    commands::{CommandOptions, NativeCommand},
    execution::ExecutionError,
    reception::CurrentBodyReadScope,
    simulation::SimulationState,
    text::JsText,
    worlds::{InstalledEvidenceMeaning, InstalledPersonalNameReader},
};

/// Operator-authored NPC stimuli use the ordinary command and physical
/// reception owners. The application records who authored the intention.
#[derive(Clone,Copy)]
pub enum AuthoredNpcIntention {
    Say(crate::worlds::base_observed::SpeechVolume),
    Act,
}

pub struct PlayerExpressionBinding {
    life: u64,
    target: Option<ExpressionTarget>,
    _storage: ByteReservation,
}

enum ExpressionTarget {
    Visible {
        id: String,
        life: Option<u64>,
        episode: Option<String>,
    },
    Owned(String),
}

impl PlayerExpressionBinding {
    fn target(&self) -> Option<&str> {
        match self.target.as_ref()? {
            ExpressionTarget::Visible { id, .. } | ExpressionTarget::Owned(id) => Some(id),
        }
    }
    pub fn has_target(&self) -> bool {
        self.target.is_some()
    }
}

impl NativeWorldSession {
    /// Bind a submitted selection to the actor and, for a clicked contact, the
    /// original visible episode. Matching opaque browser handles runs at the
    /// caller; only the per-player native observation can supply their facts.
    /// The caller funds the bounded held binding until dispatch and application.
    pub fn prepare_player_expression(
        &self,
        account: &str,
        actor: &str,
        selected_item: Option<&str>,
        mut matches_contact: impl FnMut(&crate::capture::PlayerObservedBody<'_>) -> bool,
        has_selection: bool,
    ) -> Result<Result<PlayerExpressionBinding, &'static str>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let state = &simulation.state;
        let life = match expression_actor(state, actor)? {
            Ok(life) => life,
            Err(reason) => return Ok(Err(reason)),
        };
        let mut storage = self.budget.reserve(256)?;
        let target = if let Some(selected) = selected_item {
            if selected == actor {
                None
            } else if crate::install::owned_item_ancestry(&state.physical, actor, selected, |_| {})
                .map_err(failure)?
                .is_some()
            {
                storage.resize(256 + selected.len())?;
                Some(ExpressionTarget::Owned(selected.to_owned()))
            } else {
                return Ok(Err("target"));
            }
        } else if has_selection {
            let mut target = None;
            simulation
                .visit_accepted_player_contacts(account, actor, &self.budget, |body| {
                    if !matches_contact(&body) {
                        return false;
                    }
                    target = Some(
                        storage
                            .resize(256 + body.source_id.len() + body.episode.map_or(0, str::len))
                            .map(|()| ExpressionTarget::Visible {
                                id: body.source_id.to_owned(),
                                life: body.physical_life,
                                episode: body.episode.map(str::to_owned),
                            }),
                    );
                    true
                })
                .map_err(failure)?;
            let Some(target) = target else {
                return Ok(Err("target"));
            };
            Some(target?)
        } else {
            None
        };
        Ok(Ok(PlayerExpressionBinding {
            life,
            target,
            _storage: storage,
        }))
    }

    pub fn player_expression_current(
        &self,
        account: &str,
        actor: &str,
        binding: &PlayerExpressionBinding,
    ) -> Result<Result<(), &'static str>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let state = &simulation.state;
        match expression_actor(state, actor)? {
            Ok(life) if life == binding.life => (),
            Ok(_) => return Ok(Err("actor-life")),
            Err(reason) => return Ok(Err(reason)),
        }
        let granted = match &binding.target {
            None => true,
            Some(ExpressionTarget::Owned(id)) => {
                crate::install::owned_item_ancestry(&state.physical, actor, id, |_| {})
                    .map_err(failure)?
                    .is_some()
            }
            Some(ExpressionTarget::Visible { id, life, episode }) => {
                visible_current(state, actor, id, *life, episode.as_deref())?
            }
        };
        Ok(if granted { Ok(()) } else { Err("target") })
    }

    /// Recheck the held selection on this same accepted turn before staging
    /// the one ordinary occurrence. No executable proposal is parsed.
    pub fn begin_player_expression(
        &mut self,
        account: &str,
        actor: &str,
        request: &str,
        predicate: &JsText,
        binding: &PlayerExpressionBinding,
    ) -> Result<Result<CandidateKey, &'static str>, RuntimeError> {
        if let Err(reason) = self.player_expression_current(account, actor, binding)? {
            return Ok(Err(reason));
        }
        self.begin_observable_act(actor,request,predicate,binding.target())
    }

    pub fn begin_authored_npc_intention(&mut self, actor:&str, request:&str, text:&JsText,
        target:Option<&str>, intention:AuthoredNpcIntention) -> Result<Result<CandidateKey,&'static str>,RuntimeError> {
        if !self.npc_schedule_enrolled(actor)? {return Ok(Err("npc-unavailable"));}
        let state=&self.session.accepted().map_err(failure)?.state;
        if let Err(reason)=expression_actor(state,actor)? {return Ok(Err(reason));}
        if let Some(id)=target {
            let body=CurrentBodyReadScope::prepare(&state.reception,&state.physical.entities,&state.installed,&state.experience,&InstalledEvidenceMeaning,actor).map_err(failure)?;
            let Some(known)=body else {return Ok(Err("target-unavailable"))};
            if id==actor || known.native_body(id).map_err(failure)?.is_none() {return Ok(Err("target-unavailable"));}
        }
        match intention {
            AuthoredNpcIntention::Say(volume)=>{
                let Some(target)=target else{return Ok(Err("target-required"));};
                self.begin_player_command(request,actor,super::RuntimePlayerCommand::DirectedSpeech {
                    text,target,role:crate::commands::SpeechTargetRole::Body,volume,
                },false).map(Ok)
            }
            AuthoredNpcIntention::Act=>self.begin_observable_act(actor,request,text,target),
        }
    }

    fn begin_observable_act(&mut self,actor:&str,request:&str,predicate:&JsText,target:Option<&str>) -> Result<Result<CandidateKey,&'static str>,RuntimeError> {
        let capacity =
            (request.len() + actor.len() + predicate.storage_bytes() + target.map_or(0, str::len))
                .checked_mul(24)
                .and_then(|bytes| bytes.checked_add(4096))
                .ok_or(CapacityError)?;
        let _workspace = self.budget.reserve(capacity)?;
        let command =
            NativeCommand::bind_player_expression(request, actor, predicate, target)
                .map_err(failure)?;
        self.session
            .begin_command_with_plan(
                crate::commands::CommandStart::Player(command),
                CommandOptions {
                    preview: false,
                    native_controller: false,
                    native_movement: None,
                    trade_evidence: None,
                    durable_receipt: true,
                },
                crate::construction_gather::ConstructionGather::for_command(None),
                None,
                None,
            )
            .map(Ok)
            .map_err(session_failure)
    }
}

fn expression_actor(
    state: &SimulationState,
    actor: &str,
) -> Result<Result<u64, &'static str>, RuntimeError> {
    if state.physical.header.paused {
        return Ok(Err("paused"));
    }
    let entity = state
        .physical
        .entities
        .get(actor)
        .ok_or_else(|| failure(ExecutionError::MissingActor))?;
    let body = entity
        .actor
        .as_ref()
        .ok_or_else(|| failure(ExecutionError::MissingActor))?;
    if !body.alive
        || body.incapacitated
        || !entity.actively_participates()
        || state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "actions")
            .map_err(failure)?
    {
        Ok(Err("actor-unavailable"))
    } else {
        Ok(Ok(body.physical_life.unwrap_or(0)))
    }
}

fn visible_current(
    state: &SimulationState,
    actor: &str,
    id: &str,
    life: Option<u64>,
    episode: Option<&str>,
) -> Result<bool, RuntimeError> {
    let body = CurrentBodyReadScope::prepare(
        &state.reception,
        &state.physical.entities,
        &state.installed,
        &state.experience,
        &InstalledEvidenceMeaning,
        actor,
    )
    .map_err(failure)?;
    let Some(body) = body else {
        return Ok(false);
    };
    let Some(observed) = body.native_body(id).map_err(failure)? else {
        return Ok(false);
    };
    if observed.grant.subject_physical_life != life {
        return Ok(false);
    }
    if life.is_none() {
        return Ok(true);
    }
    let names = InstalledPersonalNameReader::prepare(
        &state.physical,
        &state.reception,
        &state.installed,
        &state.experience,
        actor,
    )
    .map_err(failure)?;
    Ok(names.subject_reference_current(id, episode))
}
