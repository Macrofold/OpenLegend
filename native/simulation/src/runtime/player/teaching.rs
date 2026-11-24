//! Menu access to the selected player's own recipe grants and one observed
//! recipient. All borrowing and geometry stay inside the contact disclosure.
use super::{GeometryAnswers, GeometryQueries, RuntimeContactMenu};
use crate::host::{ByteBudget, ByteReservation};
use crate::knowledge::recipe_teaching;
use crate::runtime::{RuntimeError, failure};
use crate::simulation::SimulationState;
use crate::state::Entity;
use crate::worlds::{InstalledSpeechAction, base_ordinary_actions::RecipeTeachingMenu};

pub(super) fn has_offers(state: &SimulationState, source: &Entity, target: &Entity) -> bool {
    target
        .actor
        .as_ref()
        .is_some_and(|actor| actor.controller == "npc")
        && !state
            .learned_capabilities
            .known_recipes(&source.id)
            .is_empty()
}

pub struct RuntimeTeaching<'a> {
    state: &'a SimulationState,
    actor: &'a str,
    pub words: &'a RecipeTeachingMenu,
    pub method_clause: &'a str,
    pub reason: Option<&'a str>,
}

impl<'a> RuntimeTeaching<'a> {
    /// Iterate the visible teacher's installed records, never the listener's
    /// private knowledge. The caller funds the finite presentation fields.
    pub fn recipes(&self) -> impl Iterator<Item = (&'a str, &'a str)> {
        self.state
            .learned_capabilities
            .known_recipes(self.actor)
            .iter()
            .filter_map(|id| {
                self.state
                    .installed
                    .retained
                    .recipes
                    .get(id)
                    .map(|body| (id.as_str(), body))
            })
    }
}

impl<'a> RuntimeContactMenu<'a> {
    /// A single sound ray checks normal speech for all recipes in this menu.
    /// The owner retains the answer reservation through the clarity check.
    pub fn teaching(
        &self,
        blocked: Option<&'a str>,
        compute: impl FnOnce(
            &GeometryQueries,
        ) -> Result<(GeometryAnswers, ByteReservation), RuntimeError>,
        budget: &ByteBudget,
    ) -> Result<Option<RuntimeTeaching<'a>>, RuntimeError> {
        let Some(binding) = self.teaching else {
            return Ok(None);
        };
        let rules = &self.state.installed.ordinary_actions.value().teaching;
        let reason = if blocked.is_some() {
            blocked
        } else if self
            .state
            .installed
            .capabilities
            .capability_blocked(Some(self.source), "speech")
            .map_err(failure)?
        {
            Some(
                self.state
                    .installed
                    .ordinary_actions
                    .value()
                    .speech_restricted
                    .message
                    .as_str(),
            )
        } else if !InstalledSpeechAction::allows_speaker(self.source) {
            Some(rules.no_speech.message.as_str())
        } else if !recipe_teaching::listener(self.target) {
            Some(rules.not_heard.message.as_str())
        } else {
            let sound =
                recipe_teaching::sound(self.state, self.source, self.target, binding, budget)
                    .map_err(failure)?;
            let heard = if sound.queries().sound.is_empty() {
                false
            } else {
                let (answers, _storage) = compute(sound.queries())?;
                recipe_teaching::clearly_heard(
                    sound,
                    answers,
                    &self.state.installed,
                    &self.target.id,
                )
                .map_err(failure)?
            };
            (!heard).then_some(rules.not_heard.message.as_str())
        };
        Ok(Some(RuntimeTeaching {
            state: self.state,
            actor: &self.source.id,
            words: &rules.menu,
            method_clause: &rules.method_clause,
            reason,
        }))
    }
}
