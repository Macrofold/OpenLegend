//! One current permitted living body supplies an exact encounter context.
use super::*;
use crate::capture::EncounterPreference;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum EncounterOperation {
    Speak,
    Stop,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum EncounterFamily {
    Speak,
    Release,
    Attack,
    Ordinary,
}

pub struct EncounterWords<'a> {
    pub label: &'a str,
    pub description: &'a str,
}

pub struct HeldShot<'a> {
    pub action_id: &'a str,
    pub ready: bool,
}

/// Borrowed only during the permitted contact read. No private identity from
/// this binding may escape except through the signed reference owner.
pub struct EncounterContext<'a> {
    pub binding: EncounterPreference<&'a str>,
    pub family: EncounterFamily,
    pub own: Option<&'a OffensiveMethod>,
    pub held: Option<HeldShot<'a>>,
    pub stop: bool,
    pub speak: EncounterWords<'a>,
    pub stop_words: EncounterWords<'a>,
}

pub(crate) fn context<'a>(
    state: &'a SimulationState,
    source: &'a Entity,
    target: &'a Entity,
) -> Option<EncounterContext<'a>> {
    let policy = policy(state)?;
    let own = source.actor.as_ref().filter(|own| own.alive)?;
    let other = target.actor.as_ref().filter(|other| other.alive)?;
    if !source.has_memory()
        || !source.actively_participates()
        || !target.actively_participates()
        || source.id == target.id
    {
        return None;
    }
    let current = current_pair(state, source, target);
    // An old executable preference must not silently attach to a different
    // life or recognition episode's newly observed body.
    if current.is_none()
        && own
            .encounters
            .as_ref()
            .and_then(|saved| saved.pairs.get(&target.id))
            .and_then(|pair| pair.own.as_ref())
            .is_some()
    {
        return None;
    }
    let now = state.physical.header.sim_time;
    let target_life = other.physical_life.unwrap_or(0);
    let held = own
        .action
        .as_ref()
        .filter(|action| {
            action.is_ranged_attack()
                && action.stage == "working"
                && action.target_id.as_deref() == Some(target.id.as_str())
                && action.target_life == Some(target_life)
        })
        .and_then(|action| {
            let aim = action.ranged.as_ref().filter(|aim| aim.manual)?;
            let ammo = action.ammo_item_id.as_deref()?;
            state
                .physical
                .holds
                .matches_item(
                    &source.id,
                    &action.id,
                    &aim.reservation_id,
                    ammo,
                    1,
                    &aim.ammunition,
                )
                .then_some(HeldShot {
                    action_id: action.id.as_str(),
                    ready: action.holds_ready_aim(),
                })
        });
    let retained = current
        .and_then(|pair| pair.own.as_ref())
        .filter(|own| own.until.is_none_or(|until| until > now));
    let speaking = current.is_some_and(|pair| {
        pair.speak.as_ref().is_some_and(|speak| {
            speak.hostile_revision == pair.hostile_revision && speak.controller == own.controller
        })
    });
    let active = current.is_some_and(|pair| {
        !pair.active.is_empty() || pair.incoming_until.is_some_and(|until| until > now)
    });
    let family = crate::worlds::base_context_actions::family(
        speaking,
        held.is_some(),
        active || retained.is_some(),
    );
    let episode = match current {
        Some(pair) => pair.episode.as_deref(),
        None => episode(state, &source.id, &target.id).map(String::as_str),
    };
    Some(EncounterContext {
        binding: EncounterPreference {
            actor_life: own.physical_life.unwrap_or(0),
            target_id: target.id.as_str(),
            target_life,
            episode,
            revision: current.map_or(0, |pair| pair.preference_revision),
            hostile_revision: current.map_or(0, |pair| pair.hostile_revision),
        },
        family,
        own: retained.map(|own| &own.method),
        held,
        stop: retained.is_some(),
        speak: EncounterWords {
            label: &policy.controls.speak.label,
            description: &policy.controls.speak.description,
        },
        stop_words: EncounterWords {
            label: &policy.controls.stop.label,
            description: &policy.controls.stop.description,
        },
    })
}
