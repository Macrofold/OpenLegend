//! The recipe catalogue reads only one actor's current known method and
//! its accessible materials under the ordinary disclosure lease.
use super::*;
use crate::manufacturing::{self, MaterialChoice, ToolRequest};
use crate::text::JsText;

pub struct RuntimeManufactureOffer<'a> {
    pub name: &'a JsText,
    pub description: &'a JsText,
    pub work_seconds: f64,
    pub sequence: u64,
    pub paused: bool,
    pub can_act: bool,
    pub missing: Option<(u64, &'a JsText)>,
    pub missing_tool: bool,
    pub tool: Option<(&'a str, &'a str)>,
}

#[derive(serde::Deserialize)]
pub struct RuntimeKnownRecipe<'a> {
    pub version: u64,
    #[serde(borrow)]
    pub name: &'a serde_json::value::RawValue,
    #[serde(borrow)]
    pub digest: &'a serde_json::value::RawValue,
}

impl RuntimeKnownRecipe<'_> {
    fn matches(&self, expected: &str) -> bool {
        crate::encoding::sha256_hex(self.digest.get().as_bytes()) == expected
    }
}

pub struct RuntimePlayerRecipeReferences<'a> {
    state: &'a crate::simulation::SimulationState,
    actor: &'a str,
}

impl RuntimePlayerRecipeReferences<'_> {
    fn record(&self, id: &str) -> Option<&str> {
        self.state.installed.retained.recipes.get(id).filter(|_| {
            self.state
                .learned_capabilities
                .known_recipes(self.actor)
                .iter()
                .any(|known| known == id)
        })
    }

    pub fn known(&self, id: &str, expected: Option<&str>) -> bool {
        self.record(id).is_some_and(|recipe| {
            expected.is_none_or(|expected| {
                serde_json::from_str::<RuntimeKnownRecipe<'_>>(recipe)
                    .is_ok_and(|record| record.matches(expected))
            })
        })
    }

    /// Check an explicit saved choice against the currently installed policy,
    /// the character's present life, known technique, version and exact digest.
    /// The caller copies any selected text under its own allocation allowance.
    pub fn reusable(
        &self,
        reference: (&str, u64, &str),
        origin: (&str, u64),
        allow_paused: bool,
    ) -> Result<(u64, RuntimeKnownRecipe<'_>), &'static str> {
        #[derive(serde::Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Policy {
            revision: u64,
            player_locked: bool,
            agent_locked: bool,
            last_player_lock: u64,
            last_agent_lock: u64,
        }
        let retained = &self.state.installed.retained;
        let policy: Policy = serde_json::from_str(retained.invention_policy.payload())
            .map_err(|_| "invention-authority")?;
        let (locked, last_lock) = match origin.0 {
            "player" => (policy.player_locked, policy.last_player_lock),
            "agent" => (policy.agent_locked, policy.last_agent_lock),
            _ => return Err("invention-authority"),
        };
        if origin.1 == 0 || origin.1 > policy.revision {
            return Err("invention-authority");
        }
        if locked {
            return Err("invention-locked");
        }
        if origin.1 < last_lock {
            return Err("invention-revoked");
        }
        let (id, version, digest) = reference;
        let recipe = self
            .record(id)
            .and_then(|record| serde_json::from_str::<RuntimeKnownRecipe<'_>>(record).ok())
            .filter(|recipe| recipe.version == version && recipe.matches(digest))
            .ok_or("stale")?;
        if self.state.physical.header.paused && !allow_paused {
            return Err("paused");
        }
        let actor = self
            .state
            .physical
            .entities
            .get(self.actor)
            .and_then(|entity| entity.actor.as_ref())
            .filter(|actor| actor.alive && !actor.incapacitated)
            .ok_or("actor")?;
        Ok((actor.physical_life.unwrap_or_default(), recipe))
    }
}

impl NativeWorldSession {
    /// Recheck recipe references for a bounded retained history or explicit
    /// reuse at publication. This borrows current installed rows without a
    /// full player capture, material availability query or world mutation.
    pub fn with_player_recipe_references<T>(
        &self,
        account: &str,
        actor: &str,
        publish: impl FnOnce(RuntimePlayerRecipeReferences<'_>) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let _lease = self
            .session
            .fence()
            .begin_publication()
            .map_err(fence_failure)?;
        Ok(publish(RuntimePlayerRecipeReferences {
            state: &simulation.state,
            actor,
        }))
    }

    pub fn with_player_manufacture_offer<T>(
        &self,
        account: &str,
        actor: &str,
        recipe: &str,
        use_offer: impl FnOnce(RuntimeManufactureOffer<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let state = &simulation.state;
        if !state
            .learned_capabilities
            .known_recipes(actor)
            .iter()
            .any(|id| id == recipe)
        {
            return Ok(None);
        }
        let Some(method) = state.installed.retained.manufacture.get(recipe) else {
            return Ok(None);
        };
        ManufactureOffers::new(state, actor, &self.budget)?
            .publish(method, use_offer)
            .map(Some)
    }
}

/// Visit the caller's installed known recipes and prepare each one's material
/// and tool prerequisites. The enclosing catalogue owns the accepted scope
/// and publication lease. Each offer borrows temporary stock until its
/// callback returns; the caller must fund any row it keeps.
pub(super) fn visit_known_manufacture(
    state: &crate::simulation::SimulationState,
    actor: &str,
    budget: &ByteBudget,
    mut visit: impl FnMut(&str, RuntimeManufactureOffer<'_>) -> Result<(), RuntimeError>,
) -> Result<(), RuntimeError> {
    let known = state.learned_capabilities.known_recipes(actor);
    if known.is_empty() {
        return Ok(());
    }
    let offers = ManufactureOffers::new(state, actor, budget)?;
    for id in known {
        if let Some(method) = state.installed.retained.manufacture.get(id) {
            offers.publish(method, |offer| visit(id, offer))?;
        }
    }
    Ok(())
}

struct ManufactureOffers<'a> {
    state: &'a crate::simulation::SimulationState,
    actor: &'a str,
    budget: &'a ByteBudget,
    can_act: bool,
}

impl<'a> ManufactureOffers<'a> {
    fn new(
        state: &'a crate::simulation::SimulationState,
        actor: &'a str,
        budget: &'a ByteBudget,
    ) -> Result<Self, RuntimeError> {
        let body = state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("manufacture actor unavailable"))?;
        let action_state = body
            .actor
            .as_ref()
            .ok_or_else(|| failure("manufacture actor unavailable"))?;
        let can_act = body.actively_participates()
            && action_state.alive
            && !action_state.incapacitated
            && !state
                .installed
                .capabilities
                .capability_blocked(Some(body), "actions")
                .map_err(failure)?;
        Ok(Self {
            state,
            actor,
            budget,
            can_act,
        })
    }

    fn publish<T>(
        &self,
        method: &manufacturing::InstalledMethod,
        use_offer: impl FnOnce(RuntimeManufactureOffer<'_>) -> Result<T, RuntimeError>,
    ) -> Result<T, RuntimeError> {
        let state = self.state;
        let stock =
            manufacturing::materials(state, self.actor, method, ToolRequest::Offer, self.budget)
                .map_err(failure)?;
        let (missing, missing_tool, tool) = match &stock {
            MaterialChoice::Available(stock) => (
                None,
                false,
                stock
                    .tool
                    .as_ref()
                    .map(|tool| (tool.role.as_str(), tool.item_id.as_str())),
            ),
            MaterialChoice::Missing(row) => (
                Some((
                    row.quantity,
                    &state.installed.retained.items[&row.definition_id]
                        .named
                        .name,
                )),
                false,
                None,
            ),
            MaterialChoice::MissingTool => (None, true, None),
        };
        use_offer(RuntimeManufactureOffer {
            name: &method.name,
            description: &method.description,
            work_seconds: method.work_seconds,
            sequence: state.physical.header.sequence,
            paused: state.physical.header.paused,
            can_act: self.can_act,
            missing,
            missing_tool,
            tool,
        })
    }
}
