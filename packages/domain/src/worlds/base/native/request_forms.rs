//! Turn the selected world's closed form into one ordinary command. The caller
//! resolves the actor's issued references; none of these form values is a grant.
use super::base_decision_offers::{FieldKind, InstalledRequest};
use crate::{
    commands::NativeCommand, records::SqlCell, simulation::SimulationState,
    values::is_safe_record_id,
};
use serde_json::{Value, json};

#[path = "request_forms/fields.rs"]
pub mod fields;
#[path = "request_forms/outings.rs"]
mod outings;
#[path = "request_forms/work.rs"]
pub(crate) mod work;

fn fields_valid(
    state: &SimulationState,
    form: &InstalledRequest,
    fields: &indexmap::IndexMap<String, SqlCell>,
) -> bool {
    fields.len() == form.fields.len()
        && form.fields.iter().all(|(name, descriptor)| {
            let Some(value) = fields.get(name) else {
                return false;
            };
            match descriptor.kind {
                FieldKind::Integer | FieldKind::Time => value.as_f64().is_some_and(|number| {
                    number.is_finite()
                        && (descriptor.kind != FieldKind::Integer
                            || number.fract() == 0.
                                && number.abs() <= crate::identity::MAX_SAFE_INTEGER as f64)
                        && (descriptor.kind != FieldKind::Time
                            || descriptor.minimum_duration.is_none_or(|duration| {
                                number - state.physical.header.sim_time >= duration
                            }) && descriptor.maximum_duration.is_none_or(|duration| {
                                number - state.physical.header.sim_time <= duration
                            }))
                        && descriptor.minimum.is_none_or(|min| number >= min)
                        && descriptor.maximum.is_none_or(|max| number <= max)
                }),
                FieldKind::Mode => value
                    .as_str()
                    .is_some_and(|v| matches!(v, "enqueue" | "replace" | "interrupt")),
                FieldKind::Choice => value.as_str().is_some_and(|v| {
                    !v.is_empty()
                        && descriptor.choices.as_ref().is_some_and(|choices| {
                            choices.iter().any(|c| c.value == v)
                                || outings::supports(&form.id)
                                || choices.is_empty()
                                    && matches!(
                                        form.id.as_str(),
                                        "base:release-current-shot"
                                            | "base:treat-own-scar"
                                            | "base:request-coaching"
                                            | "base:place-fire"
                                    )
                        })
                }),
                FieldKind::Entity | FieldKind::Definition => {
                    value.as_str().is_some_and(is_safe_record_id)
                }
            }
        })
}

/// The native decoder and ordinary command preview own the final physical,
/// permission and timing checks, including after an NPC's response was held.
fn validate<'a>(
    state: &SimulationState,
    actor: &str,
    form: &InstalledRequest,
    args: &'a SqlCell,
    budget: &crate::host::ByteBudget,
) -> Option<&'a indexmap::IndexMap<String, SqlCell>> {
    let fields = args.as_object()?;
    if !fields_valid(state, form, fields) {
        return None;
    }
    for (role, descriptor) in &form.fields {
        if descriptor.kind != FieldKind::Entity {
            continue;
        }
        let selected = fields.get(role)?.as_str()?;
        let permitted = state.physical.entities.get(selected).is_some_and(|target| {
            let carried = target.item.is_some()
                && crate::install::owned_by(
                    &state.physical,
                    &state.installed.retained,
                    actor,
                    &target.id,
                )
                .ok()
                .flatten()
                .is_some();
            entity_role(state, actor, form, role, target, carried)
        });
        if permitted {
            continue;
        }
        if !is_remembered_place(role, descriptor) {
            return None;
        }
        let mut recognized = false;
        outings::visit_choices(state, actor, form, role, fields, budget, |value, _, _| {
            recognized |= value == selected;
            Ok(())
        })
        .ok()?;
        if !recognized {
            return None;
        }
    }
    Some(fields)
}
pub(crate) fn is_remembered_place(
    role: &str,
    descriptor: &super::base_decision_offers::RequestField,
) -> bool {
    role == "destinationId"
        && descriptor
            .discovery
            .as_ref()
            .is_some_and(|rule| rule.source == "known-places")
}
pub(crate) fn compile_work(
    state: &SimulationState,
    actor: &str,
    id: &str,
    form: &InstalledRequest,
    args: &SqlCell,
    budget: &crate::host::ByteBudget,
) -> Result<
    Option<(
        crate::plans::RequestedActivityInput,
        crate::host::ByteReservation,
    )>,
    crate::execution::ExecutionError,
> {
    if validate(state, actor, form, args, budget).is_none() {
        return Ok(None);
    }
    work::compile(state, actor, id, form, args, budget)
}
pub(crate) fn compile(
    state: &SimulationState,
    actor: &str,
    id: &str,
    form: &InstalledRequest,
    args: &SqlCell,
    budget: &crate::host::ByteBudget,
) -> Option<NativeCommand> {
    let fields = validate(state, actor, form, args, budget)?;
    if outings::supports(&form.id) {
        return outings::compile(state, actor, id, form, fields, budget);
    }
    if form.id == "base:move-possession" && form.commands.as_slice() == ["transfer-item"] {
        let item_id = fields.get("itemId")?.as_str()?;
        let target_id = fields.get("targetId")?.as_str()?;
        let item = state.physical.entities.get(item_id)?;
        let target = state.physical.entities.get(target_id)?;
        let lot = item.item.as_ref()?;
        let source = crate::install::inventory_parent(item)?;
        let own = |id: &str| {
            id == actor
                || crate::install::owned_by(&state.physical, &state.installed.retained, actor, id)
                    .ok()
                    .flatten()
                    .is_some()
        };
        let world_storage = match (own(source), own(target_id)) {
            (true, true) => None,
            (true, false) => Some(target_id),
            (false, true) => Some(source),
            (false, false) => return None,
        };
        let selection = crate::execution::OwnedMove {
            arrangement: crate::execution::OwnedArrangement::Move,
            item_id,
            target_id,
            quantity: fields.get("quantity")?.as_u64()?,
            expected_revision: lot.revision,
            placement_revision: crate::handover::placement_revision(item)?,
            expected_contents_revision: item
                .container
                .as_ref()
                .map(|_| item.inventory_revision.unwrap_or_default()),
            target_revision: target.inventory_revision.unwrap_or_default(),
            world_storage,
        };
        return crate::commands::player::bind_transfer(id, actor, selection, None, false)
            .ok()
            .map(|(command, _)| command);
    }
    let command = compile_input(state, actor, id, form, fields)?;
    // The canonical native decoder binds original receipt bytes and actor
    // attribution together. Player-only flags are never supplied here.
    serde_json::from_str(&crate::encoding::json_value(&command).ok()?).ok()
}
fn compile_input(
    state: &SimulationState,
    actor: &str,
    id: &str,
    form: &InstalledRequest,
    fields: &indexmap::IndexMap<String, SqlCell>,
) -> Option<Value> {
    let [kind] = form.commands.as_slice() else {
        return None;
    };
    let mut c = json!({"type":kind,"actorId":actor,"id":id});
    let text = |name: &str| fields.get(name)?.as_str();
    let amount = |name: &str| fields.get(name)?.as_u64();
    let entity = |name: &str| state.physical.entities.get(text(name)?);
    let target = || entity("targetId");
    let item = || entity("itemId");
    let lot = || item()?.item.as_ref();
    let live = || target()?.physical_life();
    let put = |c: &mut Value, names: &[&str]| -> Option<()> {
        for &name in names {
            c[name] = text(name)?.into();
        }
        Some(())
    };
    match (form.id.as_str(), kind.as_str()) {
        ("base:inspect-possessions", "inspect-inventory") => {}
        ("base:inspect-past-work", "inspect-activities") => {
            c["after"] = (-1).into();
            c["methodAfter"] = 0.into();
        }
        ("base:inspect-container", "inspect-inventory") => put(&mut c, &["containerId"])?,
        ("base:inspect-item", "inspect-inventory") => {
            put(&mut c, &["itemId"])?;
            let parent = crate::install::inventory_parent(item()?)?;
            c["expectedRevision"] = state
                .physical
                .entities
                .get(parent)?
                .inventory_revision
                .unwrap_or_default()
                .into();
            c["containerId"] = parent.into();
        }
        ("base:equip-possession", "equip") => put(&mut c, &["itemId"])?,
        ("base:unequip-possession", "unequip")
        | ("base:learn-inspected-record", "learn-record") => {
            put(&mut c, &["itemId"])?;
            c["expectedRevision"] = lot()?.revision.into();
            c["placementRevision"] = crate::handover::placement_revision(item()?)?.into();
            if kind == "learn-record" {
                c["recordPin"] = json!(lot()?.definition_pin);
            }
        }
        ("base:transfer-stock", "transfer-stock") => {
            let def = state.installed.retained.items.get(text("definitionId")?)?;
            put(&mut c, &["sourceId", "destinationId", "definitionId"])?;
            c["definitionVersion"] = def.pin.version.into();
            c["definitionDigest"] = def.pin.digest.as_str().into();
            c["quantity"] = amount("quantity")?.into();
            c["minimumHeld"] = amount("minimumHeld")?.into();
        }
        ("base:offer-possession", "handover") => {
            put(&mut c, &["targetId"])?;
            c["handoverOperation"] = "offer".into();
            c["requestedItems"] = json!([]);
            c["offeredItems"] = json!([{"itemId":text("itemId")?,"quantity":amount("quantity")?,"expectedRevision":lot()?.revision,"placementRevision":crate::handover::placement_revision(item()?)?}]);
        }
        ("base:guard-person" | "base:guard-facing", "guard") => {
            put(&mut c, &["itemId"])?;
            c["autoEquip"] = true.into();
            if form.id == "base:guard-person" {
                put(&mut c, &["targetId"])?;
                c["targetLife"] = live()?.into();
            } else {
                c["facing"] = state.physical.entities.get(actor)?.spatial.heading.into();
            }
        }
        ("base:body-strike" | "base:weapon-strike", "strike") => {
            put(&mut c, &["targetId"])?;
            if form.id == "base:weapon-strike" {
                if let Some(life) = live() {
                    c["targetLife"] = life.into();
                }
            }
            c["definitionId"] = if form.id == "base:body-strike" {
                text("methodId")?
            } else {
                put(&mut c, &["weaponItemId"])?;
                c["autoEquip"] = true.into();
                &entity("weaponItemId")?.item.as_ref()?.definition_pin.id
            }
            .into();
        }
        ("base:hunt", "hunt") | ("base:aim", "aim") | ("base:shoot-once", "shoot-once") => {
            put(&mut c, &["weaponItemId", "ammoItemId"])?;
            c["autoEquip"] = true.into();
            c["rangedTarget"] = json!({"kind":"subject","id":text("targetId")?,"life":live()?});
        }
        ("base:release-current-shot", "release-shot") => {
            let action = state
                .physical
                .entities
                .get(actor)?
                .actor
                .as_ref()?
                .action
                .as_ref()?;
            if action.id != text("aimId")? || action.ranged.is_none() {
                return None;
            }
            put(&mut c, &["aimId"])?;
        }
        ("base:practice-shot", "practice-shot") => {
            put(&mut c, &["targetId", "weaponItemId", "ammoItemId"])?
        }
        ("base:fish-once", "fish") => put(&mut c, &["targetId", "itemId"])?,
        ("base:harvest-remains", "harvest") | ("base:feed-from-source", "feed") => {
            put(&mut c, &["targetId"])?
        }
        ("base:request-coaching", "coaching") => {
            put(&mut c, &["targetId", "attributeId"])?;
            c["operation"] = "request".into();
            c["targetLife"] = live()?.into();
        }
        ("base:teach-method", "teach") => {
            put(&mut c, &["targetId", "recipeId"])?;
            c["targetLife"] = live()?.into();
        }
        ("base:evade-direction", "evade") => {
            let actor = state.physical.entities.get(actor)?;
            let (profile, _) = crate::movement::evasion::profile(&state.installed, actor)?;
            let selected = text("direction")?;
            let directions = &state
                .installed
                .occurrence_rules
                .value()
                .evasion
                .as_ref()?
                .directions;
            let direction = directions.iter().find(|d| d.label == selected)?;
            let (surface, point, _) = crate::movement::evasion::destination(
                &state.installed,
                actor,
                direction,
                profile.maximum_distance,
            )?;
            c["destination"] = json!({"x":point.x,"y":point.y,"z":point.z,"surfaceId":surface});
        }
        ("base:treat-own-scar", "treat-scar") => put(&mut c, &["targetId", "scarId"])?,
        ("base:fire-light" | "base:fire-fuel" | "base:fire-extinguish", "tend-fire") => {
            put(&mut c, &["targetId"])?;
            c["operation"] = form.id.strip_prefix("base:fire-")?.into();
            if c["operation"] == "fuel" {
                put(&mut c, &["itemId"])?;
            }
        }
        (family, "cook") => {
            let prep = state
                .installed
                .retained
                .preparations
                .get(family.strip_prefix("base:prepare:")?)?;
            put(&mut c, &["heatId"])?;
            c["preparationId"] = prep.pin.id.as_str().into();
            c["preparationVersion"] = prep.pin.version.into();
            c["preparationDigest"] = prep.pin.digest.as_str().into();
            let mut inputs = serde_json::Map::new();
            for ingredient in &prep.definition.inputs {
                inputs.insert(
                    ingredient.role.clone(),
                    text(&format!("input:{}", ingredient.role))?.into(),
                );
            }
            c["inputs"] = Value::Object(inputs);
        }
        (family, "status-effect") => {
            let (def, op) = family.strip_prefix("base:state:")?.rsplit_once(':')?;
            if !matches!(op, "activate" | "deactivate") {
                return None;
            }
            put(&mut c, &["targetId"])?;
            c["definitionId"] = def.into();
            c["operation"] = op.into();
        }
        _ => return None,
    };
    Some(c)
}

/// Select from this actor's already perceived body or its custody page. Dependent
/// roles are evaluated only after the parent value is known in this same scope.
pub(crate) fn entity_role(
    state: &SimulationState,
    actor: &str,
    form: &InstalledRequest,
    field: &str,
    target: &crate::state::Entity,
    carried: bool,
) -> bool {
    if work::supports(&form.id) {
        return work::entity_role(state, actor, form, field, target, carried);
    }
    if outings::supports(&form.id) {
        return outings::entity_role(state, actor, form, field, target, carried);
    }
    let family = form.id.as_str();
    let mine = target.id == actor;
    let living = target.actor.as_ref().is_some_and(|p| p.alive) && target.actively_participates();
    let item = target
        .item
        .as_ref()
        .and_then(|lot| state.installed.retained.items.get(&lot.definition_pin.id));
    match field {
        "heatId" | "fireId" => target.heat.is_some(),
        "containerId" => {
            target.container.is_some()
                || target.kind == state.installed.observation_rules.value().pile_kind
        }
        "recipientId" | "opponentId" => living && !mine,
        "instrumentId" => mine || carried && item.is_some_and(|i| i.equips_for_gathering()),
        "sourceId" => match family {
            "base:repeat-gather" | "base:camp-supply-method" => {
                crate::gathering::source(state, &target.id).is_some()
            }
            _ => mine || target.container.is_some(),
        },
        "destinationId" => mine || target.container.is_some(),
        "weaponItemId" => {
            carried
                && item.is_some_and(|i| {
                    if family == "base:weapon-strike" {
                        i.equips_for(crate::install::EquipmentUse::Melee)
                    } else {
                        i.ranged_weapon.is_some()
                    }
                })
        }
        "ammoItemId" => carried && item.is_some_and(|i| i.ammunition.is_some()),
        "toolId" => carried && item.is_some(),
        "itemId" => match family {
            "base:equip-possession" => {
                carried && item.is_some_and(|i| i.equipment_ports().is_some())
            }
            "base:unequip-possession" => {
                carried
                    && matches!(&target.placement,Some(crate::state::Placement::Attached{parent_entity_id,..}) if parent_entity_id==actor)
            }
            "base:learn-inspected-record" => {
                item.is_some_and(|i| i.recipe_record.is_some())
                    && state
                        .physical
                        .entities
                        .get(actor)
                        .and_then(|p| p.actor.as_ref()?.inventory_inspection.as_ref())
                        .is_some_and(|page| page.item_ids.contains(&target.id))
            }
            "base:guard-person" | "base:guard-facing" => {
                carried && item.is_some_and(|i| i.can_guard())
            }
            "base:fish-once" => carried && item.is_some_and(|i| i.fishing_kind().is_some()),
            "base:use-gate" | "base:impact-structure" => false, // structural references use their installed part and assembly revision
            _ => carried && item.is_some(),
        },
        "targetId" => match family {
            "base:request-coaching"
            | "base:teach-method"
            | "base:offer-possession"
            | "base:guard-person" => living && !mine,
            "base:hunt" => !mine && target.animal.is_some(),
            "base:aim" | "base:shoot-once" | "base:body-strike" | "base:weapon-strike" => {
                !mine && (living || target.animal.is_some())
            }
            "base:practice-shot" => target.practice_target.is_some(),
            "base:harvest-remains" => target
                .remains
                .as_ref()
                .is_some_and(|r| r.phase == "fresh" && !r.harvested && !r.yields.is_empty()),
            "base:feed-from-source" => {
                crate::native_controller::feeding::source_candidate(state, target)
            }
            "base:fish-once" => target.resource.as_ref().is_some_and(|r| r.cast.is_some()),
            "base:fire-light" | "base:fire-fuel" | "base:fire-extinguish" => target.heat.is_some(),
            "base:move-possession" => mine || target.container.is_some(),
            "base:treat-own-scar" => {
                crate::body::scar_treatment::installed(state).is_some_and(|(policy, _)| {
                    target.kind == policy.rest_kind && target.world_position().is_some()
                })
            }
            id if id.starts_with("base:state:") => mine,
            _ => false,
        },
        key if key.starts_with("input:") => {
            carried
                && item.is_some_and(|i| {
                    state
                        .installed
                        .retained
                        .preparations
                        .get(family.strip_prefix("base:prepare:").unwrap_or(""))
                        .is_some_and(|prep| {
                            prep.definition.inputs.iter().any(|input| {
                                input.role == key[6..] && input.definition_id == i.pin.id
                            })
                        })
                })
        }
        _ => false,
    }
}
