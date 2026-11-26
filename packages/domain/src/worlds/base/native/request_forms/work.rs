//! The base world's signed work selections compile to the ordinary actor plan.
//! One leaf is bound against current stock and executed by the ordinary command owner.
use super::{InstalledRequest, SimulationState, SqlCell};
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation, retained_size::HeapBytes};
use crate::plans::{ActivityExecution, PlanMode, RequestedActivityInput};
use crate::state::Entity;
use serde_json::{Value, json};

pub(crate) fn supports(family: &str) -> bool {
    matches!(
        family,
        "base:repeat-gather"
            | "base:repeat-craft"
            | "base:eat-meal"
            | "base:camp-supply-method"
            | "base:fire-watch"
    )
}

fn inspected(state: &SimulationState, actor: &str, target: &Entity) -> bool {
    state
        .physical
        .entities
        .get(actor)
        .and_then(|owner| owner.actor.as_ref()?.inventory_inspection.as_ref())
        .is_some_and(|page| {
            page.container_id.as_deref() == Some(&target.id)
                && page.revision == target.inventory_revision.unwrap_or_default()
        })
}

pub(super) fn entity_role(
    state: &SimulationState,
    actor: &str,
    form: &InstalledRequest,
    field: &str,
    target: &Entity,
    carried: bool,
) -> bool {
    match (form.id.as_str(), field) {
        ("base:repeat-gather" | "base:camp-supply-method", "sourceId") => {
            crate::gathering::source(state, &target.id).is_some()
        }
        ("base:repeat-gather", "instrumentId") => {
            target.id == actor
                || carried
                    && target
                        .item
                        .as_ref()
                        .and_then(|item| {
                            state.installed.retained.items.get(&item.definition_pin.id)
                        })
                        .is_some_and(|item| item.gathering_tool_yield().is_some())
        }
        ("base:eat-meal", "sourceId") => {
            target.id == actor
                || target.container.is_some() && carried && inspected(state, actor, target)
        }
        ("base:fire-watch", "sourceId") if target.id == actor => true,
        ("base:fire-watch", "sourceId") | ("base:camp-supply-method", "containerId") => {
            target.container.is_some()
                && crate::install::inventory_bag_access(target, actor)
                && (carried || inspected(state, actor, target))
        }
        (_, "fireId") => target.heat.is_some(),
        _ => false,
    }
}

fn literal(value: impl Into<Value>) -> Value {
    json!({"literal": value.into()})
}
fn role(value: &str) -> Value {
    json!({"role":value})
}
fn leaf(key: &str, name: &str, kind: &str, args: Value, requires: &Value) -> Value {
    json!({"kind":"invoke","key":key,"name":name,"command":kind,"args":args,"requirements":requires})
}
fn sequence(title: &str, children: Vec<Value>) -> Value {
    json!({"kind":"sequence","name":title,"children":children})
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkPolicy<'a> {
    id: &'a str,
    version: u64,
    maximum_batches: u64,
    count_label: &'a str,
    gather_label: &'a str,
}

fn exact_policy<'a>(
    state: &'a SimulationState,
) -> Option<(WorkPolicy<'a>, crate::values::DefinitionPin)> {
    let canonical = state
        .installed
        .retained
        .work_batch_policy
        .as_ref()?
        .payload();
    let data: WorkPolicy = serde_json::from_str(canonical).ok()?;
    let pin = crate::values::DefinitionPin {
        id: data.id.into(),
        version: data.version,
        digest: crate::encoding::content_label(canonical),
    };
    Some((data, pin))
}

struct Graph {
    title: String,
    children: Vec<Value>,
    bindings: Value,
    quantity: Option<(String, u64, String)>,
}

fn batches(
    state: &SimulationState,
    actor: &str,
    form: &InstalledRequest,
    args: &SqlCell,
    budget: &ByteBudget,
) -> Result<Option<Graph>, ExecutionError> {
    let Some((policy, work_pin)) = exact_policy(state) else {
        return Ok(None);
    };
    let Some(count) = args
        .get("batches")
        .and_then(SqlCell::as_u64)
        .filter(|count| {
            *count > 0
                && *count <= policy.maximum_batches
                && *count <= state.activity.limits.iterations
        })
    else {
        return Ok(None);
    };
    let mut bindings = json!({});
    let mut requirements = vec![json!({"kind":"work-policy","definition":work_pin})];
    let command;
    let name;
    let mut params;
    if form.id == "base:repeat-gather" {
        command = "gather";
        let Some(source) = args
            .get("sourceId")
            .and_then(SqlCell::as_str)
            .and_then(|id| crate::gathering::source(state, id))
        else {
            return Ok(None);
        };
        bindings["source"] = json!(source.entity.id);
        requirements.push(json!({"kind":"source","role":"source","definition":source.definition.pin,"workSeconds":source.stock.work_seconds}));
        let Some(instrument) = args.get("instrumentId").and_then(SqlCell::as_str) else {
            return Ok(None);
        };
        params = json!({"targetId":role("source"),"gatheringMode":literal("bare-hands")});
        if instrument != actor {
            let Some((pin, _)) = crate::gathering::exact_tool(
                state,
                actor,
                instrument,
                crate::gathering::GatheringMode::CarriedTool,
                &source.definition.pin.id,
            )?
            else {
                return Ok(None);
            };
            bindings["tool"] = json!(instrument);
            params["itemId"] = role("tool");
            params["gatheringMode"] = literal("carried-tool");
            requirements.push(json!({"kind":"item","role":"tool","definition":pin}));
        }
        name = policy.gather_label.replace(
            "{source}",
            source
                .entity
                .name
                .as_unicode()
                .unwrap_or(policy.gather_label),
        );
    } else {
        command = "craft";
        let Some(method) = args
            .get("recipeId")
            .and_then(SqlCell::as_str)
            .and_then(|id| state.installed.retained.manufacture.get(id))
            .filter(|m| {
                state
                    .learned_capabilities
                    .known_recipes(actor)
                    .contains(&m.pin.id)
            })
        else {
            return Ok(None);
        };
        let crate::manufacturing::MaterialChoice::Available(stock) =
            crate::manufacturing::materials(
                state,
                actor,
                method,
                crate::manufacturing::ToolRequest::Offer,
                budget,
            )?
        else {
            return Ok(None);
        };
        requirements.push(json!({"kind":"recipe","definition":method.pin}));
        params = json!({"recipeId":literal(method.pin.id.as_str())});
        if let Some(tool) = stock.tool {
            bindings["tool"] = json!(tool.item_id);
            params[format!("tool:{}", tool.role)] = role("tool");
            requirements.push(json!({"kind":"item","role":"tool","definition":tool.definition}));
        }
        let Some(title) = method.name.as_unicode() else {
            return Ok(None);
        };
        name = title.into();
    }
    let requires = Value::Array(requirements);
    let title = format!("{name} × {count}");
    let children = (1..=count)
        .map(|at| {
            leaf(
                &format!("batch-{at}"),
                &format!("{name} ({at}/{count})"),
                command,
                params.clone(),
                &requires,
            )
        })
        .collect();
    Ok(Some(Graph {
        title,
        children,
        bindings,
        quantity: Some((command.into(), count, policy.count_label.into())),
    }))
}

pub(crate) fn compile(
    state: &SimulationState,
    actor: &str,
    id: &str,
    form: &InstalledRequest,
    args: &SqlCell,
    budget: &ByteBudget,
) -> Result<Option<(RequestedActivityInput, ByteReservation)>, ExecutionError> {
    if !supports(&form.id) {
        return Ok(None);
    }
    let mode = match args.get("mode").and_then(SqlCell::as_str) {
        Some("enqueue") => PlanMode::Enqueue,
        Some("replace") => PlanMode::Replace,
        Some("interrupt") => PlanMode::Interrupt,
        _ => return Ok(None),
    };
    let count = args
        .get("batches")
        .or_else(|| args.get("units"))
        .or_else(|| args.get("maxUnits"))
        .and_then(SqlCell::as_u64)
        .unwrap_or(1);
    let input = args.heap_bytes().ok_or(ExecutionError::Capacity)?;
    let _build = budget.reserve(
        (input + 8192)
            .checked_mul(usize::try_from(count).map_err(|_| ExecutionError::Capacity)? + 1)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let graph = match form.id.as_str() {
        "base:repeat-gather" | "base:repeat-craft" => batches(state, actor, form, args, budget)?,
        _ => other(state, actor, form, args, budget)?,
    };
    let Some(mut graph) = graph else {
        return Ok(None);
    };
    graph.bindings["requestFamily"] = json!(form.id);
    graph.bindings["requestHost"] = json!(form.host.digest);
    let root = SqlCell::from(sequence(&graph.title, graph.children));
    let (execution, storage) = ActivityExecution::initial_selected_sequence(
        graph.title.into(),
        root,
        SqlCell::from(graph.bindings),
        graph.quantity,
        budget,
    )?;
    Ok(Some((
        RequestedActivityInput {
            id: id.into(),
            actor_id: actor.into(),
            mode,
            execution,
        },
        storage,
    )))
}

fn other(
    state: &SimulationState,
    actor: &str,
    form: &InstalledRequest,
    args: &SqlCell,
    budget: &ByteBudget,
) -> Result<Option<Graph>, ExecutionError> {
    let field = |name| args.get(name).and_then(SqlCell::as_str);
    let number = |name| args.get(name).and_then(SqlCell::as_u64);
    let Some(food_or_fuel) =
        field("definitionId").and_then(|id| state.installed.retained.items.get(id))
    else {
        return Ok(None);
    };
    let Some(source) = field("sourceId") else {
        return Ok(None);
    };
    let pin = &food_or_fuel.pin;
    let mut bindings = json!({"self":actor,"source":source});
    let item_requirement = json!({"kind":"item-definition","definition":pin});
    let mut children = Vec::new();
    if form.id == "base:eat-meal" {
        let Some(body) = state.installed.body_policy.as_ref() else {
            return Ok(None);
        };
        let Some(person) = state.physical.entities.get(actor) else {
            return Ok(None);
        };
        let Some(eater) =
            crate::consumption::Eater::current(&state.installed, &state.physical, person)?
        else {
            return Ok(None);
        };
        let Some(policy) = &eater.policy.meal else {
            return Ok(None);
        };
        let Some(units) = number("units").filter(|n| *n > 0 && *n <= policy.maximum_units) else {
            return Ok(None);
        };
        if eater.before >= eater.maximum
            || eater.portion(food_or_fuel).is_err()
            || stock(state, actor, source, pin, 0, false)?.is_none()
        {
            return Ok(None);
        }
        let requirements = json!([item_requirement,{"kind":"body-policy","definition":body.pin()}]);
        let Some(food) = food_or_fuel.named.name.as_unicode() else {
            return Ok(None);
        };
        let title = format!("{}: {food} × {units}", policy.meal_label);
        let args = json!({"sourceId":role("source"),"definitionId":literal(pin.id.as_str())});
        for at in 1..=units {
            children.push(leaf(
                &format!("eat-{at}"),
                &policy.one_label,
                "eat",
                args.clone(),
                &requirements,
            ));
        }
        return Ok(Some(Graph {
            title,
            children,
            bindings,
            quantity: Some(("eat".into(), units, policy.count_label.clone())),
        }));
    }
    let Some(fire) = field("fireId")
        .and_then(|id| state.physical.entities.get(id))
        .filter(|e| e.heat.is_some())
    else {
        return Ok(None);
    };
    let Some(rule) = state.installed.fire_care.as_ref() else {
        return Ok(None);
    };
    if !rule.value().accepts_fuel(food_or_fuel) {
        return Ok(None);
    }
    let Some(minimum) = number("minimumHeld") else {
        return Ok(None);
    };
    bindings["fire"] = json!(fire.id);
    let requirements = json!([item_requirement]);
    let transfer = |key: &str, from: &str, to: &str, units: u64| {
        leaf(
            key,
            "Move the selected stock",
            "transfer-stock",
            json!({
                "sourceId":role(from),"destinationId":role(to),"definitionId":literal(pin.id.as_str()),
                "definitionVersion":literal(pin.version),"definitionDigest":literal(pin.digest.as_str()),"quantity":literal(units),"minimumHeld":literal(minimum)
            }),
            &requirements,
        )
    };
    let fuel = |key: &str, low: bool| {
        leaf(
            key,
            "Add one selected fuel unit",
            "tend-fire",
            json!({"targetId":role("fire"),"operation":literal("fuel"),
        "definitionId":literal(pin.id.as_str()),"minimumHeld":literal(minimum),"onlyWhenLow":literal(low)}),
            &requirements,
        )
    };
    if form.id == "base:camp-supply-method" {
        let Some(site) =
            crate::gathering::source(state, source).filter(|site| &site.definition.pin == pin)
        else {
            return Ok(None);
        };
        let Some(target) = field("containerId") else {
            return Ok(None);
        };
        let Some(mut container) = state.physical.entities.get(target) else {
            return Ok(None);
        };
        for _ in 0..crate::install::inventory_ancestor_limit() {
            if container.world_support().is_some() {
                break;
            }
            let Some(parent) = crate::install::inventory_parent(container)
                .and_then(|id| state.physical.entities.get(id))
            else {
                return Ok(None);
            };
            container = parent;
        }
        let Some(point) = container.supported_position() else {
            return Ok(None);
        };
        bindings["return"] = json!(point);
        bindings["container"] = json!(target);
        let source = json!([{"kind":"source","role":"source","definition":pin,"workSeconds":site.stock.work_seconds}]);
        children.push(leaf(
            "gather",
            "Gather from my selected source",
            "gather",
            json!({"targetId":role("source")}),
            &source,
        ));
        children.push(leaf(
            "return",
            "Return to the selected camp position",
            "move",
            json!({"destination":role("return")}),
            &json!([]),
        ));
        let Some(quantity) = number("quantity") else {
            return Ok(None);
        };
        children.push(transfer("pack", "self", "container", quantity));
        children.push(fuel("fuel", false));
        Ok(Some(Graph {
            title: "Gather, return, pack and fuel".into(),
            children,
            bindings,
            quantity: None,
        }))
    } else {
        let Some(deadline) = args.get("deadline").and_then(SqlCell::as_f64) else {
            return Ok(None);
        };
        let Some(count) = number("maxUnits") else {
            return Ok(None);
        };
        let Some(person) = state.physical.entities.get(actor) else {
            return Ok(None);
        };
        if !fire.heat.is_some_and(|heat| heat.lit)
            || crate::geometry::interaction_reach(
                person,
                fire,
                state.installed.retained.item_handling_read.reach,
                budget,
            )?
            .is_none()
        {
            return Ok(None);
        }
        let available = if source == actor
            || crate::install::owned_by(&state.physical, &state.installed.retained, actor, source)?
                .is_some()
        {
            stock(state, actor, source, pin, 0, true)?.is_some()
        } else {
            person
                .actor
                .as_ref()
                .and_then(|a| a.inventory_inspection.as_ref())
                .is_some_and(|page| {
                    page.container_id.as_deref() == Some(source)
                        && page.item_ids.iter().any(|id| {
                            state
                                .physical
                                .entities
                                .get(id)
                                .and_then(|e| e.item.as_ref())
                                .is_some_and(|lot| &lot.definition_pin == pin)
                        })
                })
        };
        if !available {
            return Ok(None);
        }
        // The first bound primitive of each unit waits for low fuel, the deadline
        // is attached to every primitive so an interrupted transfer never fuels late.
        for at in 1..=count {
            if source != actor {
                children.push(transfer(&format!("pack-{at}"), "source", "self", 1));
            }
            children.push(fuel(&format!("fuel-{at}"), true));
        }
        bindings["deadline"] = json!(deadline.to_string());
        Ok(Some(Graph {
            title: "Watch this fire for one session".into(),
            children,
            bindings,
            quantity: None,
        }))
    }
}

/// Find the first actually spendable selected lot in the named location; stop
/// once its quantity and the owner's reserve are established. Incomplete scans
/// never establish availability. The ordinary command still owns the debit.
fn stock<'a>(
    state: &'a SimulationState,
    actor: &str,
    source: &str,
    pin: &crate::values::DefinitionPin,
    minimum: u64,
    fuel: bool,
) -> Result<Option<&'a str>, ExecutionError> {
    if source != actor
        && !crate::install::owned_item_ancestry(&state.physical, actor, source, |_| {})?.is_some()
    {
        return Ok(None);
    }
    let mut found = None;
    let mut count = 0u64;
    let mut examined = 0usize;
    state.inventory.visit_owned_until(
        &state.physical.entities,
        actor,
        actor,
        &mut |entity, _| {
            examined += 1;
            if examined > crate::stock_transfer::limits().examined {
                return Ok(true);
            }
            let Some(lot) = entity
                .item
                .as_ref()
                .filter(|lot| &lot.definition_pin == pin)
            else {
                return Ok(false);
            };
            let available = lot
                .quantity
                .saturating_sub(state.physical.holds.quantity(&entity.id));
            if available > 0 && crate::execution::can_debit_lot(state, entity, 1) {
                count = count.saturating_add(available);
                let in_source = crate::install::inventory_parent(entity) == Some(source);
                if found.is_none() && (in_source || (fuel && source == actor)) {
                    found = Some(entity.id.as_str());
                }
            }
            Ok(found.is_some() && count > minimum)
        },
    )?;
    Ok(if count > minimum { found } else { None })
}

pub(crate) fn family(execution: &ActivityExecution) -> Option<&str> {
    execution
        .bindings
        .get("requestFamily")
        .and_then(SqlCell::as_str)
        .filter(|family| supports(family))
}

fn admitted_form<'a>(
    execution: &ActivityExecution,
    world: &'a crate::simulation::InstalledWorld,
) -> Option<&'a InstalledRequest> {
    let family = family(execution)?;
    world
        .occurrence_rules
        .value()
        .response
        .offers
        .installed_requests
        .iter()
        .find(|form| {
            form.id == family
                && execution
                    .bindings
                    .get("requestHost")
                    .and_then(SqlCell::as_str)
                    == Some(form.host.digest.as_str())
        })
}

pub(crate) fn installed(
    execution: &ActivityExecution,
    world: &crate::simulation::InstalledWorld,
) -> bool {
    let Some(form) = admitted_form(execution, world) else {
        return false;
    };
    let Some(nodes) = execution
        .request
        .as_ref()
        .and_then(|r| r.root.get("children"))
        .and_then(SqlCell::as_array)
    else {
        return false;
    };
    if nodes.is_empty()
        || execution.method_id.is_some()
        || execution.control.is_some()
        || execution.cooperation.is_some()
        || execution.combat_help_id.is_some()
        || execution.human_initiated.is_some()
        || execution.target_episodes.object_len() != Some(0)
    {
        return false;
    }
    let family = form.id.as_str();
    let cache = execution.bindings.get("source") != execution.bindings.get("self");
    let limit = match family {
        "base:repeat-gather" | "base:repeat-craft" => {
            form.fields.get("batches").and_then(|f| f.maximum)
        }
        "base:eat-meal" => form.fields.get("units").and_then(|f| f.maximum),
        "base:fire-watch" => form
            .fields
            .get("maxUnits")
            .and_then(|f| f.maximum)
            .map(|n| if cache { 2. * n } else { n }),
        _ => Some(4.),
    };
    if limit.is_none_or(|max| nodes.len() as f64 > max)
        || family == "base:camp-supply-method" && nodes.len() != 4
    {
        return false;
    }
    nodes.iter().enumerate().all(|(index, node)| {
        let expected = match family {
            "base:repeat-gather" => "gather",
            "base:repeat-craft" => "craft",
            "base:eat-meal" => "eat",
            "base:camp-supply-method" => ["gather", "move", "transfer-stock", "tend-fire"][index],
            "base:fire-watch" if cache && index % 2 == 0 => "transfer-stock",
            "base:fire-watch" => "tend-fire",
            _ => return false,
        };
        node.get("kind").and_then(SqlCell::as_str) == Some("invoke")
            && node.get("command").and_then(SqlCell::as_str) == Some(expected)
            && form.commands.iter().any(|kind| kind == expected)
    })
}

pub(crate) enum Gate {
    Ready,
    Wait,
    Complete,
    Refused,
}

fn argument<'a>(
    node: &'a SqlCell,
    execution: &'a ActivityExecution,
    key: &str,
) -> Option<&'a SqlCell> {
    let value = node.get("args")?.get(key)?;
    value
        .get("literal")
        .or_else(|| execution.bindings.get(value.get("role")?.as_str()?))
}

fn pin_matches(record: &SqlCell, pin: &crate::values::DefinitionPin) -> bool {
    record.get("id").and_then(SqlCell::as_str) == Some(pin.id.as_str())
        && record.get("version").and_then(SqlCell::as_u64) == Some(pin.version)
        && record.get("digest").and_then(SqlCell::as_str) == Some(pin.digest.as_str())
}

fn requirements(
    state: &SimulationState,
    actor: &str,
    execution: &ActivityExecution,
    node: &SqlCell,
) -> bool {
    let Some(requires) = node.get("requirements").and_then(SqlCell::as_array) else {
        return false;
    };
    requires.iter().all(|req| {
        let Some(pin) = req.get("definition") else {
            return false;
        };
        let id = pin.get("id").and_then(SqlCell::as_str).unwrap_or("");
        let target = req
            .get("role")
            .and_then(SqlCell::as_str)
            .and_then(|role| execution.bindings.get(role))
            .and_then(SqlCell::as_str);
        match req.get("kind").and_then(SqlCell::as_str) {
            Some("work-policy") => {
                exact_policy(state).is_some_and(|(_, current)| pin_matches(pin, &current))
            }
            Some("body-policy") => state
                .installed
                .body_policy
                .as_ref()
                .is_some_and(|current| pin_matches(pin, current.pin())),
            Some("item-definition") => state
                .installed
                .retained
                .items
                .get(id)
                .is_some_and(|current| pin_matches(pin, &current.pin)),
            Some("item") => target
                .and_then(|id| {
                    crate::install::owned_by(&state.physical, &state.installed.retained, actor, id)
                        .ok()
                        .flatten()
                })
                .and_then(|lot| state.installed.retained.items.get(lot.definition_id))
                .is_some_and(|def| pin_matches(pin, &def.pin)),
            Some("source") => target
                .and_then(|id| crate::gathering::source(state, id))
                .is_some_and(|source| {
                    pin_matches(pin, &source.definition.pin)
                        && req.get("workSeconds").and_then(SqlCell::as_f64)
                            == Some(source.stock.work_seconds)
                }),
            Some("recipe") => state
                .installed
                .retained
                .manufacture
                .get(id)
                .is_some_and(|m| {
                    pin_matches(pin, &m.pin)
                        && state
                            .learned_capabilities
                            .known_recipes(actor)
                            .contains(&m.pin.id)
                }),
            _ => false,
        }
    })
}

pub(crate) fn gate(
    execution: &ActivityExecution,
    state: &SimulationState,
    actor: &str,
    budget: &ByteBudget,
) -> Result<Gate, ExecutionError> {
    let Some(node) = execution.pending.last().map(|frame| &frame.node) else {
        return Ok(Gate::Complete);
    };
    if admitted_form(execution, &state.installed).is_none()
        || !requirements(state, actor, execution, node)
    {
        return Ok(Gate::Refused);
    }
    let Some(person) = state.physical.entities.get(actor) else {
        return Ok(Gate::Refused);
    };
    if family(execution) == Some("base:fire-watch") {
        let Some(deadline) = execution
            .bindings
            .get("deadline")
            .and_then(SqlCell::as_str)
            .and_then(|value| value.parse::<f64>().ok())
            .filter(|v| v.is_finite())
        else {
            return Ok(Gate::Refused);
        };
        if state.physical.header.sim_time >= deadline {
            return Ok(Gate::Complete);
        }
        let Some(fire) = execution
            .bindings
            .get("fire")
            .and_then(SqlCell::as_str)
            .and_then(|id| state.physical.entities.get(id))
        else {
            return Ok(Gate::Refused);
        };
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )?;
        if names.current_body_grant(&fire.id)?.is_none()
            || crate::geometry::interaction_reach(
                person,
                fire,
                state.installed.retained.item_handling_read.reach,
                budget,
            )?
            .is_none()
        {
            return Ok(Gate::Refused);
        }
        let Some(heat) = fire.heat.filter(|heat| heat.lit) else {
            return Ok(Gate::Refused);
        };
        let Some(rule) = &state.installed.fire_care else {
            return Ok(Gate::Refused);
        };
        if matches!(
            rule.value().visible_fuel(heat),
            crate::fire_care::VisibleFuel::Hours(_)
        ) {
            return Ok(Gate::Wait);
        }
    }
    if node.get("command").and_then(SqlCell::as_str) == Some("eat") {
        let Some(eater) =
            crate::consumption::Eater::current(&state.installed, &state.physical, person)?
        else {
            return Ok(Gate::Refused);
        };
        if eater.before >= eater.maximum {
            return Ok(Gate::Complete);
        }
    }
    Ok(Gate::Ready)
}

/// Bind only this leaf, including the currently spendable selected lot. The
/// caller retains the returned command reservation until ordinary admission.
pub(crate) fn bind(
    execution: &ActivityExecution,
    state: &SimulationState,
    actor: &str,
    id: &str,
    budget: &ByteBudget,
) -> Result<Option<(crate::commands::NativeCommand, ByteReservation)>, ExecutionError> {
    let Some(node) = execution.pending.last().map(|frame| &frame.node) else {
        return Ok(None);
    };
    let Some(kind) = node.get("command").and_then(SqlCell::as_str) else {
        return Ok(None);
    };
    let Some(name) = node.get("name").and_then(SqlCell::as_text) else {
        return Ok(None);
    };
    let Some(args) = node.get("args").and_then(SqlCell::as_object) else {
        return Ok(None);
    };
    let size = node
        .heap_bytes()
        .and_then(|n| n.checked_add(execution.bindings.heap_bytes()?))
        .and_then(|n| n.checked_add(actor.len() + id.len() + 2048))
        .and_then(|n| n.checked_mul(8))
        .ok_or(ExecutionError::Capacity)?;
    let mut storage = budget.reserve(size)?;
    let mut command = json!({"id":id,"actorId":actor,"type":kind,"purpose":name});
    for key in args.keys() {
        let Some(value) = argument(node, execution, key) else {
            return Ok(None);
        };
        if let Some(role) = key.strip_prefix("tool:") {
            if command.get("tools").is_none() {
                command["tools"] = json!({});
            }
            command["tools"][role] = json!(value);
        } else if !(kind == "eat"
            || kind == "tend-fire"
                && matches!(key.as_str(), "definitionId" | "minimumHeld" | "onlyWhenLow"))
        {
            command[key] = json!(value);
        }
    }
    if matches!(kind, "eat" | "tend-fire") {
        let Some(def) = argument(node, execution, "definitionId")
            .and_then(SqlCell::as_str)
            .and_then(|id| state.installed.retained.items.get(id))
        else {
            return Ok(None);
        };
        let source = if kind == "eat" {
            argument(node, execution, "sourceId").and_then(SqlCell::as_str)
        } else {
            Some(actor)
        };
        let Some(source) = source else {
            return Ok(None);
        };
        let min = argument(node, execution, "minimumHeld")
            .and_then(SqlCell::as_u64)
            .unwrap_or(0);
        let Some(lot) = stock(state, actor, source, &def.pin, min, kind == "tend-fire")? else {
            return Ok(None);
        };
        command["itemId"] = json!(lot);
    }
    let encoded = crate::encoding::json_value(&command).map_err(|_| ExecutionError::Invariant)?;
    let Ok(value) = serde_json::from_str::<crate::commands::NativeCommand>(&encoded) else {
        return Ok(None);
    };
    storage.resize(value.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok(Some((value, storage)))
}

pub(crate) fn matches(
    execution: &ActivityExecution,
    node: &SqlCell,
    command: &crate::commands::NativeCommand,
) -> bool {
    use crate::commands::NativeCommand;
    let value = |key| argument(node, execution, key);
    let text = |key| value(key).and_then(SqlCell::as_str);
    let envelope = command.envelope();
    if node.get("command").and_then(SqlCell::as_str) != Some(command.kind())
        || envelope.purpose.as_ref() != node.get("name").and_then(SqlCell::as_text)
        || envelope.human_initiated.is_some()
        || envelope.cooperation.is_some()
        || envelope.chosen_purpose.is_some()
        || envelope.combat_help_id.is_some()
    {
        return false;
    }
    match command {
        NativeCommand::Gather {
            target_id, tool, ..
        } => {
            text("targetId") == Some(target_id)
                && text("itemId") == tool.item_id.as_deref()
                && match tool.mode {
                    crate::gathering::GatheringMode::AvailableTools => {
                        text("gatheringMode").is_none()
                    }
                    crate::gathering::GatheringMode::BareHands => {
                        text("gatheringMode") == Some("bare-hands")
                    }
                    crate::gathering::GatheringMode::CarriedTool => {
                        text("gatheringMode") == Some("carried-tool")
                    }
                    _ => false,
                }
        }
        NativeCommand::Craft {
            recipe_id, tools, ..
        } => {
            text("recipeId") == Some(recipe_id)
                && node
                    .get("args")
                    .and_then(SqlCell::as_object)
                    .is_some_and(|args| {
                        let mut expected = args
                            .keys()
                            .filter_map(|key| Some((key.strip_prefix("tool:")?, text(key)?)));
                        match (expected.next(), tools.as_ref()) {
                            (None, None) => true,
                            (Some((role, lot)), Some(tools)) => {
                                tools.len() == 1
                                    && tools.get(role).map(String::as_str) == Some(lot)
                                    && expected.next().is_none()
                            }
                            _ => false,
                        }
                    })
        }
        NativeCommand::Move { destination, .. } => {
            value("destination").is_some_and(|v| destination.matches_cell(v))
        }
        NativeCommand::TransferStock { request, .. } => {
            text("sourceId") == Some(&request.source)
                && text("destinationId") == Some(&request.destination)
                && text("definitionId") == Some(&request.definition.id)
                && text("definitionDigest") == Some(&request.definition.digest)
                && value("definitionVersion").and_then(SqlCell::as_u64)
                    == Some(request.definition.version)
                && value("quantity").and_then(SqlCell::as_u64) == Some(request.quantity)
                && value("minimumHeld").and_then(SqlCell::as_u64) == Some(request.minimum_held)
        }
        NativeCommand::TendFire {
            target_id,
            operation,
            item_id,
            ..
        } => {
            text("targetId") == Some(target_id)
                && *operation == crate::fire_care::FireOperation::Fuel
                && item_id.is_some()
        }
        NativeCommand::Eat { item_id, .. } => crate::values::is_safe_record_id(item_id),
        _ => false,
    }
}

pub(crate) fn step_supported(command: &crate::commands::NativeCommand) -> bool {
    use crate::commands::NativeCommand::*;
    matches!(
        command,
        Gather { .. }
            | Craft { .. }
            | Move { .. }
            | Eat { .. }
            | TransferStock { .. }
            | TendFire { .. }
    )
}

pub(crate) fn unavailable() -> crate::commands::Outcome {
    crate::commands::Outcome {
        spent: None,
        outputs: None,
        ok: false,
        code: "work-selection-unavailable".into(),
        message: "The selected work can no longer be performed with those choices.".into(),
        recipe_id: None,
        item_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    }
}
