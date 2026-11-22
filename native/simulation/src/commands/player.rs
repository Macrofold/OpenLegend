//! The authorized browser handler passes its already-decoded command input.

use super::{CommandEncoding, CommandHeaders, NativeCommand, SpeechTargetRole, StatusOperation};
use crate::encoding::json_record;
use crate::gathering::{GatheringMode, ToolChoice};
use crate::state::SurfacePoint;
use crate::text::JsText;
use crate::values::DefinitionPin;
use crate::worlds::base_observed::SpeechVolume;
use indexmap::IndexMap;
use serde::Serialize;

#[derive(Clone, Copy)]
pub enum RuntimePlayerCommand<'a> {
    Move(&'a SurfacePoint),
    Follow { target: &'a str, distance: Option<f64>, until: Option<f64>, complete: Option<bool> },
    Cancel(Option<&'a str>),
    Gather { target: &'a str, tool: Option<&'a str>, mode: Option<GatheringMode> },
    Fish { target: &'a str, tool: &'a str },
    Handover { target: &'a str, gift: &'a crate::handover::GiftIntent },
    Craft { recipe: &'a str },
    Say {
        text: &'a JsText,
        target: Option<(&'a str, SpeechTargetRole)>,
        volume: Option<SpeechVolume>,
    },
    Status {
        target: &'a str,
        definition: &'a str,
        operation: StatusOperation,
        facing: Option<f64>,
    },
    Cook {
        heat: &'a str,
        preparation_id: &'a str,
        preparation_version: u64,
        preparation_digest: &'a str,
        inputs: &'a IndexMap<String, String>,
    },
    PlaceHearth { definition: &'a DefinitionPin, site: &'a SurfacePoint },
    TendFire { target: &'a str, operation: crate::fire_care::FireOperation, item: Option<&'a str> },
    Pickup { target: &'a str, item: &'a str, quantity: Option<u64> },
    InspectItem { item: &'a str, container: &'a str, expected_revision: u64 },
    Eat(&'a str),
    Equip(&'a str),
    Unequip { item: &'a str, expected_revision: u64, placement_revision: u64 },
}

impl RuntimePlayerCommand<'_> {
    pub(crate) fn selected_text_bytes(self) -> usize {
        match self {
            Self::Move(point) => point.surface_id.len(),
            Self::Follow { target, .. } => target.len(),
            Self::Cancel(action) => action.map_or(0, str::len),
            Self::Gather { target, tool, .. } => target.len() + tool.map_or(0, str::len),
            Self::Fish { target, tool } | Self::Pickup { target, item: tool, .. } => target.len() + tool.len(),
            Self::Craft { recipe } => recipe.len(),
            Self::Handover { target, gift } => target.len() + gift.retained_text_bytes(),
            Self::PlaceHearth { definition, site } => definition.id.len() + definition.digest.len() + site.surface_id.len(),
            Self::TendFire { target, item, .. } => target.len() + item.map_or(0, str::len),
            Self::Say { text, target, .. } => text.storage_bytes() + target.map_or(0, |(id, _)| id.len()),
            Self::Status { target, definition, .. } => target.len() + definition.len(),
            Self::Cook { heat, preparation_id, preparation_digest, inputs, .. } => {
                heat.len() + preparation_id.len() + preparation_digest.len()
                    + inputs.iter().map(|(role, item)| role.len() + item.len()).sum::<usize>()
            }
            Self::InspectItem { item, container, .. } => item.len() + container.len(),
            Self::Eat(item) | Self::Equip(item) | Self::Unequip { item, .. } => item.len(),
        }
    }

    pub(crate) fn bind(
        self,
        id: &str,
        actor: &str,
    ) -> Result<(NativeCommand, String), serde_json::Error> {
        if let Self::Follow { target, distance, until, complete } = self {
            return bind_follow(id, actor, target, distance, until, complete);
        }
        if let Self::Cook {
            heat, preparation_id, preparation_version, preparation_digest, inputs
        } = self {
            return bind_food_preparation(id, actor, heat, DefinitionPin {
                id: preparation_id.into(),
                version: preparation_version,
                digest: preparation_digest.into(),
            }, inputs);
        }
        if let Self::PlaceHearth { definition, site } = self {
            return bind_hearth(id, actor, definition, site);
        }
        if let Self::TendFire { target, operation, item } = self {
            return bind_fire(id, actor, target, operation, item);
        }
        if let Self::Status { target, definition, operation, facing } = self {
            return bind_status(id, actor, target, definition, operation, facing);
        }
        if let Self::Handover { target, gift } = self {
            return bind_gift(id, actor, target, gift);
        }
        if let Self::InspectItem { item, container, expected_revision } = self {
            return bind_inspection(id, actor, item, container, expected_revision);
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Operation<'a> {
            id: &'a str,
            actor_id: &'a str,
            human_initiated: bool,
            #[serde(rename = "type")]
            kind: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            destination: Option<&'a SurfacePoint>,
            #[serde(skip_serializing_if = "Option::is_none")]
            expected_action_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            target_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            item_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            expected_revision: Option<u64>,
            #[serde(skip_serializing_if = "Option::is_none")]
            placement_revision: Option<u64>,
            #[serde(skip_serializing_if = "Option::is_none")]
            quantity: Option<u64>,
            #[serde(skip_serializing_if = "Option::is_none")]
            gathering_mode: Option<GatheringMode>,
            #[serde(skip_serializing_if = "Option::is_none")]
            recipe_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            target_role: Option<SpeechTargetRole>,
            #[serde(skip_serializing_if = "Option::is_none")]
            text: Option<&'a JsText>,
            #[serde(skip_serializing_if = "Option::is_none")]
            volume: Option<SpeechVolume>,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct SignaturePoint<'a> {
            surface_id: &'a str,
            x: f64,
            y: f64,
            z: f64,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Signature<'a> {
            actor_id: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            destination: Option<SignaturePoint<'a>>,
            #[serde(skip_serializing_if = "Option::is_none")]
            expected_action_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            expected_revision: Option<u64>,
            #[serde(skip_serializing_if = "Option::is_none")]
            gathering_mode: Option<GatheringMode>,
            human_initiated: bool,
            id: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            item_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            placement_revision: Option<u64>,
            #[serde(skip_serializing_if = "Option::is_none")]
            quantity: Option<u64>,
            #[serde(skip_serializing_if = "Option::is_none")]
            recipe_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            target_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            target_role: Option<SpeechTargetRole>,
            #[serde(skip_serializing_if = "Option::is_none")]
            text: Option<&'a JsText>,
            #[serde(rename = "type")]
            kind: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            volume: Option<SpeechVolume>,
        }
        let (kind, destination, expected_action_id, target_id, item_id, gathering_mode) = match self {
            Self::Move(point) => ("move", Some(point), None, None, None, None),
            Self::Cancel(action) => ("cancel", None, action, None, None, None),
            Self::Gather { target, tool, mode } => ("gather", None, None, Some(target), tool, mode),
            Self::Pickup { target, item, .. } => ("pickup", None, None, Some(target), Some(item), None),
            Self::Fish { target, tool } => ("fish", None, None, Some(target), Some(tool), None),
            Self::Craft { .. } => ("craft", None, None, None, None, None),
            Self::Say { target, .. } => ("say", None, None, target.map(|(id, _)| id), None, None),
            Self::Cook { .. } | Self::Status { .. } | Self::TendFire { .. } | Self::PlaceHearth { .. } | Self::InspectItem { .. } | Self::Follow { .. } | Self::Handover { .. } => {
                unreachable!("specialized commands bind their own fields")
            }
            Self::Eat(item) => ("eat", None, None, None, Some(item), None),
            Self::Equip(item) => ("equip", None, None, None, Some(item), None),
            Self::Unequip { item, .. } => ("unequip", None, None, None, Some(item), None),
        };
        let (expected_revision, placement_revision) = match self {
            Self::Unequip { expected_revision, placement_revision, .. } =>
                (Some(expected_revision), Some(placement_revision)),
            _ => (None, None),
        };
        let quantity = match self {
            Self::Pickup { quantity, .. } => quantity,
            _ => None,
        };
        let recipe_id = match self {
            Self::Craft { recipe } => Some(recipe),
            _ => None,
        };
        let (text, target_role, volume) = match self {
            Self::Say { text, target, volume } => (Some(text), target.map(|(_, role)| role), volume),
            _ => (None, None, None),
        };
        let headers = player_headers(id, actor);
        if !headers.valid()
            || recipe_id.is_some_and(|id| !crate::values::is_safe_record_id(id))
            || destination
                .is_some_and(|point| ![point.x, point.y, point.z].iter().all(|n| n.is_finite()))
            || quantity.is_some_and(|n| n == 0 || n > crate::identity::MAX_SAFE_INTEGER)
            || [expected_revision, placement_revision].into_iter().flatten().any(|revision| revision > crate::identity::MAX_SAFE_INTEGER)
        {
            return Err(serde_json::Error::io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Invalid selected player command binding.",
            )));
        }
        // Learning retains the original authored field order. Replay compares
        // the existing separate canonical signature. Neither string is parsed
        // to make an executable command in the stand-alone host.
        let encoding = CommandEncoding::from_ordered(
            &Operation {
                id,
                actor_id: actor,
                human_initiated: true,
                kind,
                destination,
                expected_action_id,
                target_id,
                item_id,
                expected_revision,
                placement_revision,
                quantity,
                gathering_mode,
                recipe_id,
                target_role,
                text,
                volume,
            },
            4 + [destination.is_some(), expected_action_id.is_some(), target_id.is_some(), item_id.is_some(), gathering_mode.is_some(), recipe_id.is_some(), expected_revision.is_some(), placement_revision.is_some(), quantity.is_some(), text.is_some(), target_role.is_some(), volume.is_some()]
                .into_iter().filter(|value| *value).count(),
        )?;
        let signature = json_record(&Signature {
            actor_id: actor,
            destination: destination.map(|point| SignaturePoint {
                surface_id: &point.surface_id,
                x: point.x,
                y: point.y,
                z: point.z,
            }),
            expected_action_id,
            expected_revision,
            gathering_mode,
            human_initiated: true,
            id,
            item_id,
            placement_revision,
            quantity,
            recipe_id,
            target_id,
            target_role,
            text,
            kind,
            volume,
        })?;
        let envelope = headers.envelope(encoding);
        let command = match self {
            Self::Move(point) => NativeCommand::Move {
                envelope,
                destination: point.clone().into(),
            },
            Self::Cancel(action) => NativeCommand::Cancel {
                envelope,
                expected_action_id: action.map(str::to_owned),
            },
            Self::Gather { target, tool, mode } => NativeCommand::Gather {
                envelope,
                target_id: target.to_owned(),
                tool: ToolChoice::new(mode, tool.map(str::to_owned)).ok_or_else(|| {
                    serde_json::Error::io(std::io::Error::new(
                        std::io::ErrorKind::InvalidData, "Invalid selected gathering tool."
                    ))
                })?,
            },
            Self::Craft { recipe } => NativeCommand::Craft { envelope, recipe_id: recipe.into() },
            Self::Say { text, target, volume } => NativeCommand::Say {
                envelope,
                text: text.clone(),
                target_id: target.map(|(id, _)| id.to_owned()),
                target_role,
                self_introduction: None,
                volume: volume.map(|volume| volume.id().to_owned()),
            },
            Self::Pickup { target, item, quantity } => NativeCommand::Pickup {
                envelope, target_id: target.into(), item_id: item.into(), quantity,
            },
            Self::Fish { target, tool } => NativeCommand::Fish {
                envelope,
                target_id: target.into(),
                item_id: tool.into(),
            },
            Self::Cook { .. } | Self::Status { .. } | Self::TendFire { .. } | Self::PlaceHearth { .. } | Self::InspectItem { .. } | Self::Follow { .. } | Self::Handover { .. } => {
                unreachable!("specialized commands bind their own fields")
            }
            Self::Eat(item) => NativeCommand::Eat { envelope, item_id: item.into() },
            Self::Equip(item) => NativeCommand::Equipment {
                envelope,
                item_id: item.into(),
                request: crate::execution::EquipmentRequest::Equip,
            },
            Self::Unequip { item, expected_revision, placement_revision } => NativeCommand::Equipment {
                envelope,
                item_id: item.into(),
                request: crate::execution::EquipmentRequest::Unequip { item_revision: expected_revision, placement_revision },
            },
        };
        Ok((command, signature))
    }
}

fn bind_gift(
    id: &str,
    actor: &str,
    target: &str,
    gift: &crate::handover::GiftIntent,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Binding<'a> {
        actor_id: &'a str,
        #[serde(flatten)]
        gift: &'a crate::handover::GiftIntent,
        human_initiated: bool,
        id: &'a str,
        target_id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let headers = player_headers(id, actor);
    if !headers.valid() || !crate::values::is_safe_record_id(target) || !gift.valid() {
        return Err(serde::ser::Error::custom("Invalid handover binding."));
    }
    let input = Binding { actor_id: actor, gift, human_initiated: true, id, target_id: target, kind: "handover" };
    let encoding = CommandEncoding::from_ordered(&input, 6 + usize::from(gift.offered_items.is_some()) * 2
        + usize::from(gift.offer_id.is_some()) * 2)?;
    Ok((NativeCommand::Handover {
        envelope: headers.envelope(encoding),
        target_id: target.to_owned(),
        gift: gift.clone(),
    }, json_record(&input)?))
}

fn bind_follow(
    id: &str,
    actor: &str,
    target: &str,
    distance: Option<f64>,
    until: Option<f64>,
    complete: Option<bool>,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Signature<'a> {
        actor_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        complete: Option<bool>,
        #[serde(skip_serializing_if = "Option::is_none")]
        distance: Option<f64>,
        human_initiated: bool,
        id: &'a str,
        target_id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
        #[serde(skip_serializing_if = "Option::is_none")]
        until: Option<f64>,
    }
    let headers = player_headers(id, actor);
    if !headers.valid() || !crate::values::is_safe_record_id(target)
        || distance.is_some_and(|value| !value.is_finite())
        || until.is_some_and(|value| !value.is_finite())
        || complete == Some(false)
    {
        return Err(serde::ser::Error::custom("Invalid follow command binding."));
    }
    let input = Signature {
        actor_id: actor, complete, distance, human_initiated: true,
        id, target_id: target, kind: "follow", until,
    };
    let fields = 5 + usize::from(complete.is_some()) + usize::from(distance.is_some()) + usize::from(until.is_some());
    let encoding = CommandEncoding::from_ordered(&input, fields)?;
    let signature = json_record(&input)?;
    Ok((NativeCommand::Follow {
        envelope: headers.envelope(encoding),
        target_id: target.into(),
        distance,
        parameters: crate::movement::follow::FollowParameters { relation: None, on_lost: None, until, complete },
    }, signature))
}

fn bind_inspection(
    id: &str,
    actor: &str,
    item: &str,
    container: &str,
    expected_revision: u64,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Inspection<'a> {
        actor_id: &'a str,
        container_id: &'a str,
        expected_revision: u64,
        human_initiated: bool,
        id: &'a str,
        item_id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let headers = player_headers(id, actor);
    if !headers.valid() || !crate::values::is_safe_record_id(item)
        || !crate::values::is_safe_record_id(container)
        || expected_revision > crate::identity::MAX_SAFE_INTEGER
    {
        return Err(serde::ser::Error::custom("Invalid exact item inspection."));
    }
    let input = Inspection {
        actor_id: actor, container_id: container, expected_revision, human_initiated: true,
        id, item_id: item, kind: "inspect-inventory",
    };
    let encoding = CommandEncoding::from_ordered(&input, 7)?;
    let signature = json_record(&input)?;
    Ok((NativeCommand::InspectInventory {
        envelope: headers.envelope(encoding),
        selected: Some(super::InspectedItem {
            item_id: item.into(), container_id: container.into(), expected_revision,
        }),
    }, signature))
}

fn player_headers(id: &str, actor: &str) -> CommandHeaders {
    CommandHeaders {
        id: id.to_owned(),
        actor_id: actor.to_owned(),
        cooperation: None,
        combat_help_id: None,
        human_initiated: Some(true),
        purpose: None,
        chosen_purpose: None,
    }
}

fn bind_status(
    id: &str,
    actor: &str,
    target: &str,
    definition: &str,
    operation: StatusOperation,
    facing_heading: Option<f64>,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct StatusCommand<'a> {
        actor_id: &'a str,
        definition_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        facing_heading: Option<f64>,
        human_initiated: bool,
        id: &'a str,
        operation: StatusOperation,
        target_id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let headers = player_headers(id, actor);
    if !headers.valid()
        || ![target, definition].into_iter().all(crate::values::is_safe_record_id)
        || facing_heading.is_some_and(|heading| !heading.is_finite())
    {
        return Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Invalid status command binding.",
        )));
    }
    let record = StatusCommand {
        actor_id: actor,
        definition_id: definition,
        facing_heading,
        human_initiated: true,
        id,
        operation,
        target_id: target,
        kind: "status-effect",
    };
    let encoding = CommandEncoding::from_ordered(&record, 7 + usize::from(facing_heading.is_some()))?;
    let signature = json_record(&record)?;
    Ok((
        NativeCommand::StatusEffect {
            envelope: headers.envelope(encoding),
            target_id: target.into(),
            definition_id: definition.into(),
            operation,
            facing_heading,
            resting_place_id: None,
            resting_bay: None,
        },
        signature,
    ))
}

fn bind_food_preparation(
    id: &str,
    actor: &str,
    heat: &str,
    definition: DefinitionPin,
    inputs: &IndexMap<String, String>,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Operation<'a> {
        id: &'a str,
        actor_id: &'a str,
        human_initiated: bool,
        #[serde(rename = "type")]
        kind: &'static str,
        preparation_id: &'a str,
        preparation_version: u64,
        preparation_digest: &'a str,
        #[serde(serialize_with = "crate::encoding::serialize_js_map")]
        inputs: &'a IndexMap<String, String>,
        heat_id: &'a str,
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Signature<'a> {
        actor_id: &'a str,
        heat_id: &'a str,
        human_initiated: bool,
        id: &'a str,
        inputs: std::collections::BTreeMap<&'a str, &'a str>,
        preparation_digest: &'a str,
        preparation_id: &'a str,
        preparation_version: u64,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let headers = player_headers(id, actor);
    if !headers.valid()
        || !definition.is_valid()
        || !crate::values::is_safe_record_id(heat)
        || !crate::food_preparation::valid_inputs(inputs)
    {
        return Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Invalid exact food preparation binding.",
        )));
    }
    let encoding = CommandEncoding::from_ordered(
        &Operation {
            id,
            actor_id: actor,
            human_initiated: true,
            kind: "cook",
            preparation_id: &definition.id,
            preparation_version: definition.version,
            preparation_digest: &definition.digest,
            inputs,
            heat_id: heat,
        },
        9,
    )?;
    let signature = json_record(&Signature {
        actor_id: actor,
        heat_id: heat,
        human_initiated: true,
        id,
        inputs: inputs.iter().map(|(role, lot)| (role.as_str(), lot.as_str())).collect(),
        preparation_digest: &definition.digest,
        preparation_id: &definition.id,
        preparation_version: definition.version,
        kind: "cook",
    })?;
    Ok((
        NativeCommand::Cook {
            envelope: headers.envelope(encoding),
            heat_id: heat.into(),
            definition,
            inputs: inputs.clone(),
        },
        signature,
    ))
}


fn bind_fire(
    id: &str, actor: &str, target: &str,
    operation: crate::fire_care::FireOperation, item: Option<&str>,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Input<'a> {
        actor_id: &'a str,
        human_initiated: bool,
        id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        item_id: Option<&'a str>,
        operation: crate::fire_care::FireOperation,
        target_id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let headers = player_headers(id, actor);
    if !headers.valid() || !crate::values::is_safe_record_id(target) || !operation.admits_item(item) {
        return Err(serde::de::Error::custom("Invalid fire-care binding."));
    }
    let input = Input {
        actor_id: actor, human_initiated: true, id, item_id: item,
        operation, target_id: target, kind: "tend-fire",
    };
    let encoding = CommandEncoding::from_ordered(&input, 6 + usize::from(item.is_some()))?;
    Ok((NativeCommand::TendFire {
        envelope: headers.envelope(encoding),
        target_id: target.into(),
        operation,
        item_id: item.map(str::to_owned),
    }, json_record(&input)?))
}

fn bind_hearth(
    id: &str, actor: &str, definition: &DefinitionPin, site: &SurfacePoint,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct SignaturePoint<'a> { surface_id: &'a str, x: f64, y: f64, z: f64 }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Operation<'a> {
        actor_id: &'a str,
        definition_digest: &'a str,
        definition_id: &'a str,
        definition_version: u64,
        destination: SignaturePoint<'a>,
        human_initiated: bool,
        id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let headers = player_headers(id, actor);
    if !headers.valid() || !crate::hearth::valid_plan(definition, site)
        || !crate::values::is_safe_record_id(&crate::item_holds::hearth_hold_id(id, 0))
    {
        return Err(serde::de::Error::custom("Invalid hearth placement binding."));
    }
    let operation = Operation {
        actor_id: actor, definition_digest: &definition.digest, definition_id: &definition.id,
        definition_version: definition.version,
        destination: SignaturePoint { surface_id: &site.surface_id, x: site.x, y: site.y, z: site.z },
        human_initiated: true, id, kind: "place-hearth",
    };
    let signature = json_record(&operation)?;
    let encoding = CommandEncoding::from_ordered(&operation, 8)?;
    Ok((NativeCommand::PlaceHearth {
        envelope: headers.envelope(encoding), definition: definition.clone(), site: site.clone(),
    }, signature))
}
