//! Each form binds a single ordinary outing intention. The actor's own current
//! evidence supplies private terms. An invitation grants neither control nor work.
use super::*;
use crate::{
    execution::ExecutionError,
    host::ByteBudget,
    state::Entity,
    text::JsText,
    worlds::base_decision_offers::{activity_opponent_permitted, activity_recipient_eligible},
};
use indexmap::IndexMap;

#[path = "outings/choices.rs"]
mod choices;
pub(crate) use choices::visit_choices;

pub(super) fn supports(id: &str) -> bool {
    matches!(
        id,
        "base:outing-invite"
            | "base:combat-help"
            | "base:cooperation-guide"
            | "base:cooperation-hunt"
            | "base:cooperation-prepare"
            | "base:cooperation-carry"
    )
}

pub(super) fn entity_role(
    state: &SimulationState,
    actor: &str,
    form: &InstalledRequest,
    field: &str,
    target: &Entity,
    carried: bool,
) -> bool {
    if carried || target.id == actor {
        return false;
    }
    let Some(source) = state.physical.entities.get(actor) else {
        return false;
    };
    match (form.id.as_str(), field) {
        (_, "recipientId") => {
            activity_recipient_eligible(&state.installed, target).unwrap_or(false)
        }
        ("base:combat-help", "opponentId") => {
            activity_opponent_permitted(&state.installed, source, target)
        }
        ("base:cooperation-hunt", "quarryId") => {
            target.animal.is_some() && target.actor.as_ref().is_some_and(|body| body.alive)
        }
        (_, "destinationId") => {
            target.actor.is_none()
                && target.retirement.is_none()
                && target.supported_position().is_some()
        }
        _ => false,
    }
}

pub(super) fn compile(
    state: &SimulationState,
    actor: &str,
    id: &str,
    form: &InstalledRequest,
    args: &IndexMap<String, SqlCell>,
    budget: &ByteBudget,
) -> Option<NativeCommand> {
    if !matches!(form.commands.as_slice(),[kind] if kind=="outing") {
        return None;
    }
    let arg = |name: &str| args.get(name)?.as_str();
    let recipient = arg("recipientId")?;
    if !entity_role(
        state,
        actor,
        form,
        "recipientId",
        state.physical.entities.get(recipient)?,
        false,
    ) {
        return None;
    }
    let mut command = json!({"id":id,"actorId":actor,"type":"outing","recipientId":recipient});
    match form.id.as_str() {
        "base:outing-invite" => {
            command["operation"] = "invite".into();
            command["mode"] = arg("mode")?.into();
            command["destinationId"] = arg("destinationId")?.into();
        }
        "base:combat-help" => {
            let opponent = arg("opponentId")?;
            if recipient == opponent {
                return None;
            }
            command["operation"] = "help".into();
            command["opponentId"] = opponent.into();
        }
        family => {
            let check = |field: &str| -> Option<bool> {
                let selected = arg(field)?;
                let mut result = false;
                visit_choices(state, actor, form, field, args, budget, |value, _, _| {
                    result |= value == selected;
                    Ok(())
                })
                .ok()?;
                Some(result)
            };
            if !check("agreement")? {
                return None;
            }
            match family {
                "base:cooperation-guide" | "base:cooperation-hunt" => {
                    let hunt = family == "base:cooperation-hunt";
                    command["cooperationKind"] = if hunt { "hunt" } else { "guide" }.into();
                    command["destinationId"] = arg("destinationId")?.into();
                    if hunt {
                        let quarry = arg("quarryId")?;
                        if quarry == recipient {
                            return None;
                        }
                        command["quarryId"] = quarry.into();
                    }
                }
                "base:cooperation-prepare" => {
                    if !check("outputPort")? {
                        return None;
                    }
                    command["cooperationKind"] = "help".into();
                    command["task"] = json!({"kind":"prepare","recipeId":arg("recipeId")?,"outputPort":arg("outputPort")?,"quantity":args.get("quantity")?.as_u64()?});
                }
                "base:cooperation-carry" => {
                    if !check("offer")? {
                        return None;
                    }
                    let (offer, revision): (String, u64) =
                        serde_json::from_str(arg("offer")?).ok()?;
                    command["cooperationKind"] = "help".into();
                    command["task"] = json!({"kind":"carry","offerId":offer,"offerRevision":revision,"destinationId":arg("destinationId")?});
                }
                _ => return None,
            }
            if arg("agreement")? == "new" {
                command["operation"] = "propose".into();
            } else {
                let (outing, revision): (String, u64) =
                    serde_json::from_str(arg("agreement")?).ok()?;
                command.as_object_mut()?.remove("recipientId");
                command["operation"] = "revise".into();
                command["outingId"] = outing.into();
                command["expectedRevision"] = revision.into();
            }
        }
    }
    serde_json::from_str(&crate::encoding::json_value(&command).ok()?).ok()
}
