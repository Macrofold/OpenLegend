//! One selected player's current Send preconditions. Target routing never
//! supplies authority: the selected world reader proves an acquired role.
use super::*;
use crate::worlds::InstalledPersonalNameReader;
use serde::Serialize;

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum InteractionMode {
    Speak,
    Act,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlayerInteractionFacts<'a> {
    actor_available: bool,
    recipient_available: bool,
    funding_actor_id: &'a str,
    reply: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    recipient_name: Option<&'a crate::text::JsText>,
}

impl Simulation {
    pub(crate) fn player_interaction<'a>(
        &'a self,
        account: &str,
        actor_id: &'a str,
        mode: InteractionMode,
        target_id: Option<&'a str>,
    ) -> Result<PlayerInteractionFacts<'a>, ActorReadError> {
        self.require_player_read(account, actor_id)?;
        let entity = self
            .state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ActorReadError::Denied)?;
        let actor = entity.actor.as_ref().ok_or(ActorReadError::Denied)?;
        let speaking = matches!(mode, InteractionMode::Speak);
        let actor_available = actor.alive
            && !actor.incapacitated
            && entity.actively_participates()
            && (!speaking
                || actor
                    .capabilities
                    .as_ref()
                    .map_or(actor.controller != "native", |c| c.speech))
            && !self
                .state
                .installed
                .capabilities
                .capability_blocked(Some(entity), if speaking { "speech" } else { "actions" })
                .map_err(|error| ActorReadError::Capture(error.into()))?;
        let mut recipient_available = true;
        let mut reply = false;
        let mut recipient_name = None;
        if let Some(target_id) = target_id.filter(|_| speaking) {
            let names = InstalledPersonalNameReader::prepare(
                &self.state.physical,
                &self.state.reception,
                &self.state.installed,
                &self.state.experience,
                actor_id,
            )
            .map_err(|error| ActorReadError::Capture(error.into()))?;
            let target = self.state.physical.entities.get(target_id);
            recipient_available = target
                .and_then(|target| target.actor.as_ref())
                .is_some_and(|target| target.alive)
                && (names.can_address_remembered_subject(target_id)
                    || names
                        .current_body_local_subject(target_id)
                        .map_err(|error| ActorReadError::Capture(error.into()))?
                        .is_some());
            reply = recipient_available
                && target
                    .and_then(|target| target.actor.as_ref())
                    .is_some_and(|target| target.controller == "npc");
            recipient_name = if target_id == actor_id {
                Some(&entity.name)
            } else {
                names
                    .current_body_identity(target_id)
                    .map_err(|error| ActorReadError::Capture(error.into()))?
                    .and_then(|identity| {
                        identity
                            .nickname
                            .as_ref()
                            .filter(|name| !name.is_empty())
                            .or_else(|| {
                                (!identity.given_name.is_empty()).then_some(&identity.given_name)
                            })
                    })
            };
        }
        Ok(PlayerInteractionFacts {
            actor_available,
            recipient_available,
            funding_actor_id: if reply {
                target_id.expect("reply has selected target")
            } else {
                actor_id
            },
            reply,
            recipient_name,
        })
    }
}
