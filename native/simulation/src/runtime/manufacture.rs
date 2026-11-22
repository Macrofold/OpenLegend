//! The recipe catalogue reads only one actor's current known method and
//! its accessible materials under the ordinary disclosure lease.
use super::*;
use crate::manufacturing::{self, MaterialChoice};
use crate::text::JsText;

pub struct RuntimeManufactureOffer<'a> {
    pub name: &'a JsText,
    pub description: &'a JsText,
    pub work_seconds: f64,
    pub sequence: u64,
    pub paused: bool,
    pub can_act: bool,
    pub missing: Option<(u64, &'a JsText)>,
}

impl NativeWorldSession {
    /// Recheck recipe references for a bounded retained history at publication.
    /// The callback borrows current installed rows and learns neither new
    /// methods nor material availability. A digest comparison scans the
    /// selected canonical row and borrows only its serialized `digest` member.
    pub fn with_player_recipe_references<T>(
        &self,
        account: &str,
        actor: &str,
        publish: impl FnOnce(&dyn Fn(&str, Option<&str>) -> bool) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let state = &simulation.state;
        let known = state.learned_capabilities.known_recipes(actor);
        let recipes = &state.installed.retained.recipes;
        #[derive(serde::Deserialize)]
        struct Digest<'a> {
            #[serde(borrow)]
            digest: &'a serde_json::value::RawValue,
        }
        Ok(publish(&|id, expected| {
            let Some(recipe) = recipes
                .get(id)
                .filter(|_| known.iter().any(|known| known == id))
            else {
                return false;
            };
            expected.is_none_or(|expected| {
                serde_json::from_str::<Digest<'_>>(recipe).is_ok_and(|record| {
                    crate::encoding::sha256_hex(record.digest.get().as_bytes()) == expected
                })
            })
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
        let installed = &state.installed;
        let Some(method) = installed.retained.manufacture.get(recipe) else {
            return Ok(None);
        };
        let body = state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("manufacture actor unavailable"))?;
        let actor = body
            .actor
            .as_ref()
            .ok_or_else(|| failure("manufacture actor unavailable"))?;
        let can_act = body.actively_participates()
            && actor.alive
            && !actor.incapacitated
            && !installed
                .capabilities
                .capability_blocked(Some(body), "actions")
                .map_err(failure)?;
        let missing = match manufacturing::materials(state, &body.id, method, &self.budget)
            .map_err(failure)?
        {
            MaterialChoice::Available(_) => None,
            MaterialChoice::Missing(row) => Some((
                row.quantity,
                &installed.retained.items[&row.definition_id].named.name,
            )),
        };
        use_offer(RuntimeManufactureOffer {
            name: &method.name,
            description: &method.description,
            work_seconds: method.work_seconds,
            sequence: state.physical.header.sequence,
            paused: state.physical.header.paused,
            can_act,
            missing,
        })
        .map(Some)
    }
}
