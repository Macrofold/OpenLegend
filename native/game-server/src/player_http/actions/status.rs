//! Read the selected world's own status labels and hand the browser a typed action.

use super::*;
use openlegend_simulation::{commands::StatusOperation, runtime::RuntimeStatusMenu};
use std::mem::size_of;

pub(super) fn render(
    menu: RuntimeStatusMenu<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Command<'a> {
        #[serde(rename = "type")]
        kind: &'static str,
        definition_id: &'a str,
        target_id: &'a str,
        effect_operation: StatusOperation,
    }
    #[derive(Serialize)]
    struct Intent<'a> {
        kind: &'static str,
        command: Command<'a>,
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Choice<'a> {
        id: String,
        label: &'a str,
        category: &'static str,
        target_id: &'a str,
        description: &'a str,
        keywords: [&'a str; 1],
        #[serde(skip_serializing_if = "Option::is_none")]
        icon: Option<&'a str>,
        enabled: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<&'static str>,
        intent: Intent<'a>,
    }
    const CATEGORY: &str = "States";
    let bytes = menu
        .choices
        .iter()
        .try_fold(0_usize, |sum, choice| {
            sum.checked_add(size_of::<Choice<'_>>())?
                .checked_add(menu.actor.len())?
                .checked_add(choice.definition_id.len())?
                .checked_add(":deactivate:".len())
        })
        .ok_or(CapacityError)?;
    let _custody = budget.reserve(bytes)?;
    let choices: Vec<_> = menu
        .choices
        .iter()
        .map(|choice| {
            let starting = choice.operation == StatusOperation::Activate;
            let action = if starting { "activate" } else { "deactivate" };
            let reason = if !controlling {
                Some("Take control of your character to act here.")
            } else if menu.paused {
                Some("Resume the world to act.")
            } else if !menu.available || starting && !menu.allows_actions {
                Some("Your character cannot do that now.")
            } else {
                None
            };
            Choice {
                id: format!("{}:{}:{action}", choice.definition_id, menu.actor),
                label: choice.label,
                category: CATEGORY,
                target_id: menu.actor,
                description: choice.label,
                keywords: [choice.label],
                icon: choice.icon,
                enabled: reason.is_none(),
                reason,
                intent: Intent {
                    kind: "command",
                    command: Command {
                        kind: "status-effect",
                        definition_id: choice.definition_id,
                        target_id: menu.actor,
                        effect_operation: choice.operation,
                    },
                },
            }
        })
        .collect();
    resource_menu(menu.sequence, &choices, CATEGORY, budget)
}
