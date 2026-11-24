//! Read the selected world's own status labels and hand the browser a typed action.

use super::*;
use openlegend_simulation::{commands::StatusOperation, runtime::RuntimeStatusMenu};
use std::{borrow::Cow, mem::size_of};

pub(super) fn render(
    menu: RuntimeStatusMenu<'_>,
    controlling: bool,
    gathering: &[GatherAction],
    craft: &[manufacture::ManufactureAction],
    resources: Option<&resources::CatalogueRows<'_>>,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    #[derive(Serialize)]
    #[serde(tag = "type", rename_all_fields = "camelCase")]
    enum Command<'a> {
        #[serde(rename = "status-effect")]
        Status {
            definition_id: &'a str,
            target_id: &'a str,
            effect_operation: StatusOperation,
        },
        #[serde(rename = "treat-scar")]
        TreatScar {
            target_id: &'a str,
            scar_id: &'a str,
        },
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
        label: Cow<'a, str>,
        category: &'static str,
        target_id: &'a str,
        description: &'a str,
        keywords: [&'a str; 1],
        #[serde(skip_serializing_if = "Option::is_none")]
        icon: Option<&'a str>,
        enabled: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<Cow<'a, JsText>>,
        intent: Intent<'a>,
    }
    const STATES: &str = "States";
    const BODY: &str = "Body";
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
    let treatment_bytes = menu
        .treatment
        .as_ref()
        .map_or(Some(0), |treatment| {
            treatment.scars.iter().try_fold(
                256_usize.checked_add(treatment.material.storage_bytes())?,
                |sum, scar| {
                    sum.checked_add(size_of::<Choice<'_>>())?
                        .checked_add(treatment.label.len())?
                        .checked_add(scar.name.len())?
                        .checked_add(scar.id.len())?
                        .checked_add(128)
                },
            )
        })
        .ok_or(CapacityError)?;
    let _custody = budget.reserve(bytes.checked_add(treatment_bytes).ok_or(CapacityError)?)?;
    let common_refusal = if !controlling {
        Some(JsText::from("Take control of your character to act here."))
    } else if menu.paused {
        Some(JsText::from("Resume the world to act."))
    } else if !menu.available {
        Some(JsText::from("Your character cannot do that now."))
    } else {
        None
    };
    let blocked_actions =
        (!menu.allows_actions).then(|| JsText::from("Your character cannot do that now."));
    let mut choices = Vec::with_capacity(
        menu.choices.len()
            + menu
                .treatment
                .as_ref()
                .map_or(0, |treatment| treatment.scars.len()),
    );
    choices.extend(menu.choices.iter().map(|choice| {
        let starting = choice.operation == StatusOperation::Activate;
        let action = if starting { "activate" } else { "deactivate" };
        let reason = common_refusal
            .as_ref()
            .or_else(|| starting.then_some(blocked_actions.as_ref()).flatten());
        Choice {
            id: format!("{}:{}:{action}", choice.definition_id, menu.actor),
            label: Cow::Borrowed(choice.label),
            category: STATES,
            target_id: menu.actor,
            description: choice.label,
            keywords: [choice.label],
            icon: choice.icon,
            enabled: reason.is_none(),
            reason: reason.map(Cow::Borrowed),
            intent: Intent {
                kind: "command",
                command: Command::Status {
                    definition_id: choice.definition_id,
                    target_id: menu.actor,
                    effect_operation: choice.operation,
                },
            },
        }
    }));
    let missing_stock = menu
        .treatment
        .as_ref()
        .filter(|treatment| !treatment.material_available)
        .map(|treatment| {
            let mut reason = JsText::from(format!("Treatment needs {} ", treatment.quantity));
            reason.push_text(treatment.material);
            reason.push_str(" in your carried inventory.");
            reason
        });
    if let Some(treatment) = &menu.treatment {
        let reason = common_refusal
            .as_ref()
            .or(blocked_actions.as_ref())
            .or(missing_stock.as_ref());
        choices.extend(treatment.scars.iter().map(|scar| Choice {
            id: format!("treat-{}", scar.id),
            label: Cow::Owned(format!("{} {}", treatment.label, scar.name)),
            category: BODY,
            target_id: treatment.target,
            description: scar.name,
            keywords: ["scar"],
            icon: None,
            enabled: reason.is_none(),
            reason: reason.map(Cow::Borrowed),
            intent: Intent {
                kind: "command",
                command: Command::TreatScar {
                    target_id: treatment.target,
                    scar_id: scar.id,
                },
            },
        }));
    }
    struct Actions<'a, A>(
        &'a [A],
        &'a [GatherAction],
        &'a [manufacture::ManufactureAction],
        Option<&'a resources::CatalogueRows<'a>>,
    );
    impl<T: Serialize> Serialize for Actions<'_, T> {
        fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
            use serde::ser::SerializeSeq;
            let mut sequence = serializer.serialize_seq(Some(
                self.0.len()
                    + self.1.len()
                    + self.2.len()
                    + self.3.map_or(0, resources::CatalogueRows::len),
            ))?;
            for choice in self.0 {
                sequence.serialize_element(choice)?;
            }
            for choice in self.1 {
                sequence.serialize_element(choice)?;
            }
            for choice in self.2 {
                sequence.serialize_element(choice)?;
            }
            if let Some(rows) = self.3 {
                for choice in rows.rows() {
                    sequence.serialize_element(choice)?;
                }
            }
            sequence.end()
        }
    }
    let groups = [
        Some(STATES),
        menu.treatment.is_some().then_some(BODY),
        (!gathering.is_empty()).then_some(GATHER.name),
        (!craft.is_empty()).then_some(manufacture::CATEGORY),
    ];
    let mut categories = [""; 6];
    let mut length = 0;
    for category in groups
        .into_iter()
        .flatten()
        .chain(resources.into_iter().flat_map(|rows| rows.groups()))
    {
        if !categories[..length].contains(&category) {
            categories[length] = category;
            length += 1;
        }
    }
    resource_menu_selection(
        menu.sequence,
        &Actions(&choices, gathering, craft, resources),
        &categories[..length],
        None,
        budget,
    )
}
