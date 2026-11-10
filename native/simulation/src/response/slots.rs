//! Consequential slot matching is shared by free grounding and final admission.
//! Only selected world family metadata describes tool and per-command units.
use super::*;
use crate::records::SqlCell;
use crate::simulation::InstalledWorld;
use crate::text::JsText;

pub(super) enum UnmetSlot<'a> {
    Item,
    Tool,
    Recipient,
    Amount,
    Until(&'a JsText),
    Method(&'a JsText),
}
impl UnmetSlot<'_> {
    pub(super) fn append_to(&self, message: &mut JsText) {
        match self {
            Self::Item => message.push_str("the requested item"),
            Self::Tool => message.push_str("the requested tool"),
            Self::Recipient => message.push_str("the requested recipient"),
            Self::Amount => message.push_str("the requested amount"),
            Self::Until(text) | Self::Method(text) => {
                message.push_str(if matches!(self, Self::Until(_)) {
                    "the requested stopping time ("
                } else {
                    "the requested method ("
                });
                message.push_text(text);
                message.push_str(")");
            }
        }
    }
}
fn composition(command: &SqlCell) -> bool {
    command.get("type").and_then(SqlCell::as_str) == Some("compose")
}
fn bound(command: &SqlCell, id: &SqlCell) -> bool {
    composition(command)
        && command
            .get("bindings")
            .and_then(SqlCell::as_object)
            .is_some_and(|bindings| bindings.values().any(|value| value == id))
}
fn predicate(node: &SqlCell, test: &str, quantity: Option<&SqlCell>) -> bool {
    node.get("test").and_then(SqlCell::as_str) == Some(test)
        && quantity.is_none_or(|quantity| node.get("quantity") == Some(quantity))
}
fn condition(node: &SqlCell, test: &str, quantity: Option<&SqlCell>) -> bool {
    match node.get("kind").and_then(SqlCell::as_str) {
        Some("invoke") => {
            test == "time"
                && node.get("command").and_then(SqlCell::as_str) == Some("follow")
                && node
                    .get("args")
                    .and_then(|args| args.get("until"))
                    .and_then(|until| until.get("literal"))
                    .and_then(SqlCell::as_f64)
                    .is_some()
        }
        Some("sequence") => node
            .get("children")
            .and_then(SqlCell::as_array)
            .is_some_and(|children| children.iter().any(|node| condition(node, test, quantity))),
        Some("branch") => {
            node.get("when")
                .is_some_and(|node| predicate(node, test, quantity))
                || ["yes", "no"]
                    .iter()
                    .filter_map(|key| node.get(key))
                    .any(|node| condition(node, test, quantity))
        }
        Some("repeat") => {
            node.get("until")
                .is_some_and(|node| predicate(node, test, quantity))
                || node
                    .get("body")
                    .is_some_and(|node| condition(node, test, quantity))
        }
        _ => node
            .get("until")
            .is_some_and(|node| predicate(node, test, quantity)),
    }
}
/// No temporary command/body tree is built for the six independent checks.
pub(super) fn unmet_slots<'a>(
    installed: &InstalledWorld,
    commands: &[SqlCell],
    slots: Option<&'a SqlCell>,
) -> [Option<UnmetSlot<'a>>; 6] {
    let Some(slots) = slots.filter(|slots| !slots.is_null()) else {
        return [None, None, None, None, None, None];
    };
    let requirements = &installed
        .occurrence_rules
        .value()
        .response
        .offers
        .slot_requirements;
    let provided = |key| slots.get(key).filter(|value| !value.is_null());
    let uses = |id: &SqlCell, field: &str| {
        commands
            .iter()
            .any(|command| bound(command, id) || command.get(field) == Some(id))
    };
    let item = provided("itemId").is_some_and(|id| !uses(id, "itemId"));
    let tool = provided("instrumentId").is_some_and(|id| {
        !commands.iter().any(|command| {
            bound(command, id)
                || command
                    .get("type")
                    .and_then(SqlCell::as_str)
                    .and_then(|kind| requirements.tool_fields.get(kind))
                    .is_some_and(|fields| fields.iter().any(|field| command.get(field) == Some(id)))
        })
    });
    let recipient = provided("recipientId").is_some_and(|id| !uses(id, "targetId"));
    let amount = provided("quantity").is_some_and(|quantity| {
        if slots.get("quantityMode").and_then(SqlCell::as_str) == Some("exact") {
            !commands
                .iter()
                .any(|command| command.get("quantity") == Some(quantity))
                && quantity.as_f64()
                    != Some(
                        commands
                            .iter()
                            .filter(|command| {
                                command
                                    .get("type")
                                    .and_then(SqlCell::as_str)
                                    .is_some_and(|kind| {
                                        requirements
                                            .unit_per_command
                                            .iter()
                                            .any(|unit| unit == kind)
                                    })
                            })
                            .count() as f64,
                    )
        } else {
            !commands
                .iter()
                .filter(|command| composition(command))
                .filter_map(|command| command.get("root"))
                .any(|root| condition(root, "holding", Some(quantity)))
        }
    });
    let until = provided("until").and_then(SqlCell::as_text).filter(|_| {
        !commands.iter().any(|command| {
            (composition(command)
                && command
                    .get("root")
                    .is_some_and(|root| condition(root, "time", None)))
                || (command.get("type").and_then(SqlCell::as_str) == Some("follow")
                    && command.get("until").is_some())
        })
    });
    [
        item.then_some(UnmetSlot::Item),
        tool.then_some(UnmetSlot::Tool),
        recipient.then_some(UnmetSlot::Recipient),
        amount.then_some(UnmetSlot::Amount),
        until.map(UnmetSlot::Until),
        provided("method")
            .and_then(SqlCell::as_text)
            .map(UnmetSlot::Method),
    ]
}
