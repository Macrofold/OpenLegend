//! The authorized browser handler passes its already-decoded command input.

use super::{CommandEncoding, CommandHeaders, NativeCommand};
use crate::encoding::json_record;
use crate::gathering::{GatheringMode, ToolChoice};
use crate::state::SurfacePoint;
use crate::values::DefinitionPin;
use indexmap::IndexMap;
use serde::Serialize;

#[derive(Clone, Copy)]
pub enum RuntimePlayerCommand<'a> {
    Move(&'a SurfacePoint),
    Cancel(Option<&'a str>),
    Gather { target: &'a str, tool: Option<&'a str>, mode: Option<GatheringMode> },
    Fish { target: &'a str, tool: &'a str },
    Cook {
        heat: &'a str,
        preparation_id: &'a str,
        preparation_version: u64,
        preparation_digest: &'a str,
        inputs: &'a IndexMap<String, String>,
    },
    Equip(&'a str),
    Unequip { item: &'a str, expected_revision: u64, placement_revision: u64 },
}

impl RuntimePlayerCommand<'_> {
    pub(crate) fn selected_text_bytes(self) -> usize {
        match self {
            Self::Move(point) => point.surface_id.len(),
            Self::Cancel(action) => action.map_or(0, str::len),
            Self::Gather { target, tool, .. } => target.len() + tool.map_or(0, str::len),
            Self::Fish { target, tool } => target.len() + tool.len(),
            Self::Cook { heat, preparation_id, preparation_digest, inputs, .. } => {
                heat.len() + preparation_id.len() + preparation_digest.len()
                    + inputs.iter().map(|(role, item)| role.len() + item.len()).sum::<usize>()
            }
            Self::Equip(item) | Self::Unequip { item, .. } => item.len(),
        }
    }

    pub(crate) fn bind(
        self,
        id: &str,
        actor: &str,
    ) -> Result<(NativeCommand, String), serde_json::Error> {
        if let Self::Cook {
            heat, preparation_id, preparation_version, preparation_digest, inputs
        } = self {
            return bind_food_preparation(id, actor, heat, DefinitionPin {
                id: preparation_id.into(),
                version: preparation_version,
                digest: preparation_digest.into(),
            }, inputs);
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
            gathering_mode: Option<GatheringMode>,
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
            target_id: Option<&'a str>,
            #[serde(rename = "type")]
            kind: &'a str,
        }
        let (kind, destination, expected_action_id, target_id, item_id, gathering_mode) = match self {
            Self::Move(point) => ("move", Some(point), None, None, None, None),
            Self::Cancel(action) => ("cancel", None, action, None, None, None),
            Self::Gather { target, tool, mode } => ("gather", None, None, Some(target), tool, mode),
            Self::Fish { target, tool } => ("fish", None, None, Some(target), Some(tool), None),
            Self::Cook { .. } => unreachable!("food preparation uses its own typed wire fields"),
            Self::Equip(item) => ("equip", None, None, None, Some(item), None),
            Self::Unequip { item, .. } => ("unequip", None, None, None, Some(item), None),
        };
        let (expected_revision, placement_revision) = match self {
            Self::Unequip { expected_revision, placement_revision, .. } =>
                (Some(expected_revision), Some(placement_revision)),
            _ => (None, None),
        };
        let headers = CommandHeaders {
            id: id.to_owned(),
            actor_id: actor.to_owned(),
            cooperation: None,
            combat_help_id: None,
            human_initiated: Some(true),
            purpose: None,
            chosen_purpose: None,
        };
        if !headers.valid()
            || destination
                .is_some_and(|point| ![point.x, point.y, point.z].iter().all(|n| n.is_finite()))
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
                gathering_mode,
            },
            4 + [destination.is_some(), expected_action_id.is_some(), target_id.is_some(), item_id.is_some(), gathering_mode.is_some(), expected_revision.is_some(), placement_revision.is_some()]
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
            target_id,
            kind,
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
            Self::Fish { target, tool } => NativeCommand::Fish {
                envelope,
                target_id: target.into(),
                item_id: tool.into(),
            },
            Self::Cook { .. } => unreachable!("food preparation uses its own typed wire fields"),
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
    let headers = CommandHeaders {
        id: id.to_owned(),
        actor_id: actor.to_owned(),
        cooperation: None,
        combat_help_id: None,
        human_initiated: Some(true),
        purpose: None,
        chosen_purpose: None,
    };
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
