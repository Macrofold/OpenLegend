//! Base's diet selection for witnessed ground food. The physical owners
//! supply exposed stock and run the accepted feeding action.
use crate::host::retained_size::heap_record;
use crate::native_response::{AnchorFood, EmptyFoodSource, FoodSourceKind, ForagingContinuation};
use crate::spatial::distance;
use crate::state::{Point, Resource, SurfacePoint};
use crate::values::{DefinitionPin, deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexMap;
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ResourceFeedingTerms {
    pub started: String,
    pub completed: String,
    pub out_of_reach: String,
    pub unavailable: String,
    pub cannot_consume: String,
    pub consumed_first: String,
    pub event_type: String,
    pub description_prefix: String,
    pub description_suffix: String,
}

pub(crate) fn feeding_terms() -> &'static ResourceFeedingTerms {
    static TERMS: LazyLock<ResourceFeedingTerms> = LazyLock::new(|| {
        serde_json::from_str(include_str!("../config/feeding-terms.json"))
            .expect("Base feeding terms must match the compiled world recipe")
    });
    &TERMS
}

/// Base's foraging choice uses the installed daylight boundaries.
pub(crate) fn foraging_night(named_times: &IndexMap<String, f64>, hour: f64) -> Option<bool> {
    let dusk = *named_times.get("dusk")?;
    let dawn = *named_times.get("dawn")?;
    Some(if dusk < dawn {
        hour >= dusk && hour < dawn
    } else {
        hour >= dusk || hour < dawn
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ResourceForagingProfile {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    #[serde(rename = "family")]
    _family: PerceivedForager,
    pub fullness: Fullness,
    pub diet: Vec<ResourceDiet>,
    pub routine: Routine,
}

#[derive(Debug, Deserialize)]
enum PerceivedForager {
    #[serde(rename = "perceived-forager")]
    Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Fullness {
    pub attribute_id: String,
    initial: f64,
    drain_per_game_second: f64,
    seek_below_day: f64,
    seek_below_night: f64,
    stop_at: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ResourceDiet {
    pub definition_id: String,
    pub sources: Vec<FoodSourceKind>,
    pub work_seconds: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Routine {
    pub choice_game_seconds: f64,
    pub idle_at_home_when_fed_in_daylight: bool,
}

#[derive(Debug, Deserialize)]
pub(crate) struct FoodDefinition {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    pub nutrition: f64,
    pub name: crate::text::JsText,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    pub portable: Option<bool>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    pub icon: Option<String>,
}

pub(crate) struct InstalledFood {
    pub pin: DefinitionPin,
    pub definition: FoodDefinition,
}

pub(crate) struct InstalledForagingProfile {
    pub pin: DefinitionPin,
    pub profile: ResourceForagingProfile,
}

/// This data can outlive the buffers and comparison input used to verify the
/// authored rows. The retained installed definition owner funds its backing.
#[derive(Default)]
pub(crate) struct InstalledForaging {
    pub profiles: IndexMap<String, InstalledForagingProfile>,
    pub food: IndexMap<String, InstalledFood>,
}

impl ResourceForagingProfile {
    pub(crate) fn pinned(self, key: &str, canonical: &str) -> Option<InstalledForagingProfile> {
        let limits = &self.fullness;
        if self.id != key
            || !is_safe_record_id(&self.id)
            || self.version == 0
            || !is_safe_record_id(&limits.attribute_id)
            || !limits.initial.is_finite()
            || limits.initial < 0.0
            || !limits.drain_per_game_second.is_finite()
            || limits.drain_per_game_second <= 0.0
            || !limits.stop_at.is_finite()
            || ![limits.seek_below_day, limits.seek_below_night]
                .into_iter()
                .all(|threshold| {
                    threshold.is_finite() && threshold >= 0.0 && threshold < limits.stop_at
                })
            || !self.routine.choice_game_seconds.is_finite()
            || self.routine.choice_game_seconds <= 0.0
            || self.diet.is_empty()
            || self.diet.iter().enumerate().any(|(index, meal)| {
                !is_safe_record_id(&meal.definition_id)
                    || meal.sources.is_empty()
                    || meal
                        .sources
                        .iter()
                        .enumerate()
                        .any(|(index, source)| meal.sources[..index].contains(source))
                    || !meal.work_seconds.is_finite()
                    || meal.work_seconds <= 0.0
                    || self.diet[..index]
                        .iter()
                        .any(|previous| previous.definition_id == meal.definition_id)
            })
        {
            return None;
        }
        let pin = DefinitionPin {
            id: self.id.clone(),
            version: self.version,
            digest: crate::encoding::content_label(canonical),
        };
        Some(InstalledForagingProfile { pin, profile: self })
    }

    /// Build the eligible home/anchor roster without consuming saved RNG. The
    /// caller draws exactly once when the final roster has multiple entries.
    pub(crate) fn routine_choices<'a>(
        &self,
        state: &'a ForagingContinuation,
        position: Point,
        hungry: bool,
        night: bool,
        reach: f64,
    ) -> [Option<&'a SurfacePoint>; 4] {
        let mut result = [None; 4];
        if !hungry && !night && self.routine.idle_at_home_when_fed_in_daylight {
            if distance(position, state.home.point()) > reach {
                result[0] = Some(&state.home);
            }
            return result;
        }
        let at_food = |index| {
            state
                .anchor_food
                .iter()
                .flatten()
                .any(|last| last.anchor == index && self.diet_rank(&last.food.id).is_some())
        };
        let eligible = state
            .anchors
            .iter()
            .enumerate()
            .filter(|(_, point)| distance(position, point.point()) > reach);
        let prefer_food = eligible.clone().any(|(index, _)| at_food(index as u64));
        for (slot, (_, point)) in result
            .iter_mut()
            .zip(eligible.filter(|(index, _)| !prefer_food || at_food(*index as u64)))
        {
            *slot = Some(point);
        }
        result
    }

    pub(crate) fn diet_rank(&self, food: &str) -> Option<usize> {
        self.diet.iter().position(|meal| meal.definition_id == food)
    }

    pub(crate) fn diet_for(&self, food: &str, source: FoodSourceKind) -> Option<&ResourceDiet> {
        self.diet
            .iter()
            .find(|meal| meal.definition_id == food && meal.sources.contains(&source))
    }
}

impl FoodDefinition {
    pub(crate) fn pinned(self, key: &str, canonical: &str) -> Option<InstalledFood> {
        if self.id != key
            || !is_safe_record_id(&self.id)
            || self.version == 0
            || !self.nutrition.is_finite()
            || self.nutrition <= 0.0
        {
            return None;
        }
        let pin = DefinitionPin {
            id: self.id.clone(),
            version: self.version,
            digest: crate::encoding::content_label(canonical),
        };
        Some(InstalledFood {
            pin,
            definition: self,
        })
    }
}

impl Fullness {
    pub(crate) fn hungry(&self, fullness: f64, night: bool, feeding: bool) -> bool {
        let seek_below = if night {
            self.seek_below_night
        } else {
            self.seek_below_day
        };
        fullness < seek_below || (feeding && fullness < self.stop_at)
    }
}

pub(crate) struct FoodSighting<'a> {
    pub id: &'a str,
    pub position: Point,
    pub stock: Option<&'a Resource>,
    pub food: Option<&'a InstalledFood>,
    pub item_id: Option<&'a str>,
}

/// Consume only products of the existing detector, preserving the established
/// anchor order. A sighting funds any retained copies before reaching this
/// method. A hidden source cannot clear a remembered depletion or move food.
pub(crate) fn perceive_food<'a>(
    profile: &ResourceForagingProfile,
    next: &mut ForagingContinuation,
    seen: &[FoodSighting<'a>],
    at: f64,
    origin: Point,
    reach: f64,
    pursue: bool,
    ranks: &crate::language::CollationRanks,
) -> Result<Option<(&'a str, Option<&'a str>)>, crate::execution::ExecutionError> {
    use crate::execution::ExecutionError;
    let mut observations = next.anchor_food.take().unwrap_or_default();
    observations.retain(|prior| seen.iter().all(|seen| seen.id != prior.source_id));
    let mut chosen = None;
    for FoodSighting {
        id,
        position,
        stock,
        food,
        item_id,
    } in seen
    {
        if let Some(stock) = stock {
            if stock.quantity == 0 {
                let old = EmptyFoodSource {
                    at,
                    revision: stock.revision.unwrap_or(0),
                };
                if let Some(value) = next.empty_sources.get_mut(*id) {
                    *value = old;
                } else {
                    next.empty_sources.insert((*id).into(), old);
                }
            } else {
                next.empty_sources.shift_remove(*id);
            }
        }
        let Some(food) = food else {
            continue;
        };
        let rank = profile
            .diet_rank(&food.pin.id)
            .ok_or(ExecutionError::Invariant)?;
        for (anchor, point) in next.anchors.iter().enumerate() {
            if distance(point.point(), *position) > reach {
                continue;
            }
            let anchor = anchor as u64;
            let current = observations.iter_mut().find(|row| row.anchor == anchor);
            let replace = match current.as_ref() {
                None => true,
                Some(prior) => match profile.diet_rank(&prior.food.id) {
                    None => true,
                    Some(n) if rank != n => rank < n,
                    Some(_) if prior.at != at => prior.at < at,
                    Some(_) => ranks
                        .compare(id, &prior.source_id)
                        .map_err(|_| ExecutionError::Invariant)?
                        .is_lt(),
                },
            };
            if replace {
                let value = AnchorFood {
                    anchor,
                    source_id: (*id).into(),
                    food: food.pin.clone(),
                    at,
                };
                match current {
                    Some(prior) => *prior = value,
                    None => observations.push(value),
                }
            }
        }
        if pursue {
            let separation = distance(origin, *position);
            let replace = match chosen {
                None => true,
                Some((_, _, previous, _)) if rank != previous => rank < previous,
                Some((_, _, _, previous)) if separation != previous => separation < previous,
                Some((prior, _, _, _)) => ranks
                    .compare(id, prior)
                    .map_err(|_| ExecutionError::Invariant)?
                    .is_lt(),
            };
            if replace {
                chosen = Some((*id, *item_id, rank, separation));
            }
        }
    }
    next.anchor_food = (!observations.is_empty()).then_some(observations);
    Ok(chosen.map(|(id, item_id, _, _)| (id, item_id)))
}

heap_record!(ResourceForagingProfile { id, fullness, diet });
heap_record!(Fullness { attribute_id });
heap_record!(ResourceDiet {
    definition_id,
    sources
});
heap_record!(FoodSourceKind {});
heap_record!(FoodDefinition { id, name, icon });
heap_record!(InstalledForaging { profiles, food });
heap_record!(InstalledFood { pin, definition });
heap_record!(InstalledForagingProfile { pin, profile });
