//! A selected finite heat-care family. Accepted heat, inventory and action
//! records remain the physical authority. The installed rule supplies choices.
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::install::{DefinitionIdentity, OwnedItem};
use crate::simulation::{PhysicalState, SimulationState};
use crate::state::{Action, Entity, Heat};
use crate::worlds::InstalledActionMessage;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FireOperation {
    Light,
    Fuel,
    Extinguish,
}

impl FireOperation {
    pub(crate) fn admits_item(self, item: Option<&str>) -> bool {
        item.is_none_or(|id| self == Self::Fuel && crate::values::is_safe_record_id(id))
    }
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct FireWords {
    pub label: String,
    pub start: String,
    pub effect: String,
    pub event_type: String,
    pub description: String,
    pub success: String,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct FireWork {
    work_seconds: f64,
    words: FireWords,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct FuelWork {
    work_seconds: f64,
    seconds_per_unit: f64,
    maximum_fuel_seconds: f64,
    words: FireWords,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Materials {
    fuel: String,
    tinder: String,
    drill_rigid: String,
    drill_shaft: String,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct FireRefusals {
    pub missing_fire: InstalledActionMessage,
    already_lit: InstalledActionMessage,
    no_fuel: InstalledActionMessage,
    missing_ignition: InstalledActionMessage,
    missing_fuel: InstalledActionMessage,
    full: InstalledActionMessage,
    cold: InstalledActionMessage,
    in_use: InstalledActionMessage,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FireMenuWords {
    pub keyword: String,
    pub fuel_item_prefix: String,
    pub fuel_item_suffix: String,
    pub no_fuel: String,
    pub low_fuel: String,
    pub one_hour: String,
    pub hours: String,
    pub duration: String,
    pub fuel_gain: String,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct FireCare {
    id: String,
    version: u64,
    pub host: crate::values::DefinitionPin,
    low_fuel_seconds: f64,
    seconds_per_hour: f64,
    pub category: String,
    pub menu: FireMenuWords,
    materials: Materials,
    light: FireWork,
    fuel: FuelWork,
    extinguish: FireWork,
    pub refusals: FireRefusals,
}

impl DefinitionIdentity for FireCare {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}

impl FireCare {
    pub(crate) fn valid(&self) -> bool {
        let positive = |duration: f64| duration.is_finite() && duration > 0.0;
        self.host.is_valid()
            && [
                self.light.work_seconds,
                self.extinguish.work_seconds,
                self.fuel.work_seconds,
                self.fuel.seconds_per_unit,
                self.fuel.maximum_fuel_seconds,
                self.low_fuel_seconds,
                self.seconds_per_hour,
            ]
            .into_iter()
            .all(positive)
            && self.fuel.seconds_per_unit <= self.fuel.maximum_fuel_seconds
            && self.low_fuel_seconds <= self.fuel.maximum_fuel_seconds
            && [
                FireOperation::Light,
                FireOperation::Fuel,
                FireOperation::Extinguish,
            ]
            .into_iter()
            .all(|operation| crate::values::is_safe_record_id(&self.words(operation).event_type))
    }

    pub(crate) fn words(&self, operation: FireOperation) -> &FireWords {
        match operation {
            FireOperation::Light => &self.light.words,
            FireOperation::Fuel => &self.fuel.words,
            FireOperation::Extinguish => &self.extinguish.words,
        }
    }

    pub(crate) fn work_seconds(&self, operation: FireOperation) -> f64 {
        match operation {
            FireOperation::Light => self.light.work_seconds,
            FireOperation::Fuel => self.fuel.work_seconds,
            FireOperation::Extinguish => self.extinguish.work_seconds,
        }
    }

    pub(crate) fn heat_after(&self, prior: Heat, operation: FireOperation) -> Heat {
        match operation {
            FireOperation::Light => Heat { lit: true, ..prior },
            FireOperation::Fuel => Heat {
                fuel_seconds: prior.fuel_seconds + self.fuel.seconds_per_unit,
                ..prior
            },
            FireOperation::Extinguish => Heat {
                lit: false,
                ..prior
            },
        }
    }

    pub(crate) fn can_add_fuel(&self, heat: Heat) -> bool {
        heat.fuel_seconds + self.fuel.seconds_per_unit <= self.fuel.maximum_fuel_seconds
    }

    pub(crate) fn addition_hours(&self) -> f64 {
        self.fuel.seconds_per_unit / self.seconds_per_hour
    }
    pub(crate) fn capacity_hours(&self) -> f64 {
        self.fuel.maximum_fuel_seconds / self.seconds_per_hour
    }
    pub(crate) fn visible_fuel(&self, heat: Heat) -> VisibleFuel {
        if heat.fuel_seconds <= 0.0 {
            VisibleFuel::Empty
        } else if heat.fuel_seconds < self.low_fuel_seconds {
            VisibleFuel::Low
        } else {
            VisibleFuel::Hours((heat.fuel_seconds / self.seconds_per_hour).round())
        }
    }

    /// This exact operation is safe to quote under a current target reference.
    /// The returned lot is borrowed only until the owning candidate mutates.
    pub(crate) fn evaluate<'a>(
        &'a self,
        state: &'a SimulationState,
        actor: &str,
        fire: &Entity,
        operation: FireOperation,
        owned: MaterialsRead<'a>,
        item: Option<OwnedItem<'a>>,
    ) -> Result<Selection<'a>, &'a InstalledActionMessage> {
        let heat = fire.heat.ok_or(&self.refusals.missing_fire)?;
        match operation {
            FireOperation::Light => {
                if heat.lit {
                    return Err(&self.refusals.already_lit);
                }
                if heat.fuel_seconds == 0.0 {
                    return Err(&self.refusals.no_fuel);
                }
                let tinder = owned.tinder.ok_or(&self.refusals.missing_ignition)?;
                let _drill = owned
                    .drills
                    .into_iter()
                    .flatten()
                    .find(|tool| tool.id != tinder.id || tinder.available_quantity > 1)
                    .ok_or(&self.refusals.missing_ignition)?;
                Ok(Selection {
                    heat,
                    spent: Some(tinder),
                })
            }
            FireOperation::Fuel => {
                let fuel = item.or(owned.fuel).ok_or(&self.refusals.missing_fuel)?;
                if !self.can_add_fuel(heat) {
                    return Err(&self.refusals.full);
                }
                Ok(Selection {
                    heat,
                    spent: Some(fuel),
                })
            }
            FireOperation::Extinguish => {
                if !heat.lit {
                    return Err(&self.refusals.cold);
                }
                // A working cook has already spent ingredients. Restoring a
                // saved approach adds no guard before that cooking work starts.
                if state.physical.entities.ordered_ids().any(|id| {
                    id != actor
                        && state
                            .physical
                            .entities
                            .get(id)
                            .and_then(|body| body.actor.as_ref())
                            .and_then(|body| body.action.as_ref())
                            .is_some_and(|action| {
                                action.is_cooking()
                                    && action.stage == "working"
                                    && action.heat_id.as_deref() == Some(fire.id.as_str())
                            })
                }) {
                    return Err(&self.refusals.in_use);
                }
                Ok(Selection { heat, spent: None })
            }
        }
    }
}

#[derive(Clone, Copy)]
pub(crate) struct Selection<'a> {
    pub heat: Heat,
    pub spent: Option<OwnedItem<'a>>,
}

#[derive(Clone, Copy, Default)]
pub(crate) struct MaterialsRead<'a> {
    fuel: Option<OwnedItem<'a>>,
    tinder: Option<OwnedItem<'a>>,
    drills: [Option<OwnedItem<'a>>; 2],
}

fn prefer<'a>(slot: &mut Option<OwnedItem<'a>>, lot: OwnedItem<'a>) {
    if slot.is_none_or(|previous| crate::encoding::js_string_cmp(lot.id, previous.id).is_lt()) {
        *slot = Some(lot);
    }
}

pub(crate) fn owned_materials<'a>(
    state: &'a SimulationState,
    rule: &FireCare,
    actor: &str,
    mut fuel_choice: impl FnMut(OwnedItem<'a>) -> Result<(), ExecutionError>,
) -> Result<MaterialsRead<'a>, ExecutionError> {
    let mut selected = MaterialsRead::default();
    state.inventory.visit_owned(
        &state.physical,
        &state.installed.retained,
        actor,
        actor,
        &mut |lot| {
            let definition = state
                .installed
                .retained
                .items
                .get(lot.definition_id)
                .ok_or(ExecutionError::Invariant)?;
            if lot.available_quantity == 0 {
                return Ok(());
            }
            let props = &definition.properties;
            let tag = |label: &str| props.iter().any(|defined| defined == label);
            if definition.has_no_container()
                && tag(&rule.materials.drill_rigid)
                && tag(&rule.materials.drill_shaft)
            {
                if selected.drills[0]
                    .is_none_or(|first| crate::encoding::js_string_cmp(lot.id, first.id).is_lt())
                {
                    selected.drills[1] = selected.drills[0].replace(lot);
                } else {
                    prefer(&mut selected.drills[1], lot);
                }
            }
            let fuel = tag(&rule.materials.fuel);
            let tinder = tag(&rule.materials.tinder);
            if (fuel || tinder)
                && definition.can_consume_as_plain_material()
                && can_spend(state, lot)
            {
                if fuel {
                    prefer(&mut selected.fuel, lot);
                    fuel_choice(lot)?;
                }
                if tinder {
                    prefer(&mut selected.tinder, lot);
                }
            }
            Ok(())
        },
    )?;
    Ok(selected)
}

pub(crate) fn exact_fuel<'a>(
    state: &'a SimulationState,
    rule: &FireCare,
    actor: &str,
    id: &str,
) -> Result<Option<OwnedItem<'a>>, ExecutionError> {
    let retained = &state.installed.retained;
    let Some(lot) = crate::install::owned_by(&state.physical, retained, actor, id)? else {
        return Ok(None);
    };
    let definition = &retained.items[lot.definition_id];
    Ok((definition.can_consume_as_plain_material()
        && definition
            .properties
            .iter()
            .any(|tag| tag == rule.materials.fuel.as_str())
        && can_spend(state, lot))
    .then_some(lot))
}

fn can_spend(state: &SimulationState, lot: OwnedItem<'_>) -> bool {
    lot.available_quantity > 0
        && state
            .physical
            .entities
            .get(lot.id)
            .is_some_and(|entity| crate::execution::can_debit_lot(state, entity, 1))
}

#[derive(Clone, Copy)]
pub enum VisibleFuel {
    Empty,
    Low,
    Hours(f64),
}

pub(crate) fn target<'a>(physical: &'a PhysicalState, id: &str) -> Option<&'a Entity> {
    physical.entities.get(id).filter(|fire| {
        fire.heat.is_some()
            && fire.retirement.is_none()
            && fire.actively_participates()
            && fire.world_position().is_some()
    })
}

pub(crate) fn valid_saved(
    action: &Action,
    physical: &PhysicalState,
    rule: Option<&FireCare>,
) -> bool {
    let Some((fire, operation)) = action.target_id.as_deref().zip(action.fire_operation) else {
        return false;
    };
    let Some(rule) = rule else {
        return false;
    };
    target(physical, fire).is_some()
        && operation.admits_item(action.item_id.as_deref())
        && action.consumed.is_empty()
        && action.total_seconds == rule.work_seconds(operation)
}

macro_rules! heap_fields {
    ($kind:ty; $($field:ident),+ $(,)?) => {
        impl HeapBytes for $kind {
            fn heap_bytes(&self) -> Option<usize> { heap_sum([$(self.$field.heap_bytes()?,)+]) }
        }
    };
}
heap_fields!(FireCare; id, host, category, menu, materials, light, fuel, extinguish, refusals);
heap_fields!(FireMenuWords; keyword, fuel_item_prefix, fuel_item_suffix, no_fuel, low_fuel, one_hour, hours, duration, fuel_gain);
heap_fields!(FireWork; words);
heap_fields!(FuelWork; words);
heap_fields!(FireWords; label, start, effect, event_type, description, success);
heap_fields!(Materials; fuel, tinder, drill_rigid, drill_shaft);
heap_fields!(FireRefusals; missing_fire, already_lit, no_fuel, missing_ignition, missing_fuel, full, cold, in_use);
crate::install::definition_layout!(FireCare; arrays []; maps []);

pub(crate) fn select<'a>(
    state: &'a SimulationState,
    actor: &str,
    fire: &Entity,
    operation: FireOperation,
    item: Option<&str>,
) -> Result<Result<Selection<'a>, &'a InstalledActionMessage>, ExecutionError> {
    let rule = state
        .installed
        .fire_care
        .as_ref()
        .ok_or(ExecutionError::UnsupportedFamily)?
        .value();
    let (owned, exact) = match (operation, item) {
        (FireOperation::Light, _)
            if fire
                .heat
                .is_some_and(|heat| heat.lit || heat.fuel_seconds == 0.0) =>
        {
            (MaterialsRead::default(), None)
        }
        (FireOperation::Extinguish, _) => (MaterialsRead::default(), None),
        (FireOperation::Fuel, Some(id)) => (
            MaterialsRead::default(),
            exact_fuel(state, rule, actor, id)?,
        ),
        _ => (owned_materials(state, rule, actor, |_| Ok(()))?, None),
    };
    Ok(rule.evaluate(state, actor, fire, operation, owned, exact))
}

/// The target remains an independently worded participant for each witness.
/// Burning materials are described by definition, never by a private lot ID.
pub(crate) fn stage_event(
    core: &mut crate::execution::CoreMutation<'_>,
    actor: &str,
    fire: &str,
    kind: &str,
    clause: crate::text::JsText,
    action: &str,
    started: bool,
) -> Result<crate::execution::StagedOccurrence, ExecutionError> {
    use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
    use crate::narration::{NameArticle, Narration, NarrationPart, PersonRole};
    use crate::reception::EventScalar;
    let data = if started {
        indexmap::IndexMap::from([("actionType".into(), EventScalar::Text("tend-fire".into()))])
    } else {
        indexmap::IndexMap::from([("actionId".into(), EventScalar::Text(action.into()))])
    };
    core.stage_event(EventEmissionIntent {
        event_type: kind.to_owned(),
        text: EmissionText::Narration(Narration {
            parts: vec![
                NarrationPart::Participant {
                    entity_id: actor.into(),
                    role: PersonRole::Subject,
                    article: None,
                },
                NarrationPart::Literal(" ".into()),
                NarrationPart::Literal(clause),
                NarrationPart::Participant {
                    entity_id: fire.into(),
                    role: PersonRole::Object,
                    article: Some(NameArticle::Definite),
                },
                NarrationPart::Literal(".".into()),
            ],
        }),
        audience: AudienceSelection::Physical,
        source_id: Some(actor.to_owned()),
        target_id: Some(fire.to_owned()),
        data: Some(data),
        scope: EventScope::External,
        origin: None,
        exposure: None,
    })
}
