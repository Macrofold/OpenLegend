//! The authorized browser handler passes its already-decoded command input.

use super::outings_input::PlayerTravelIntent;
pub use crate::execution::{OwnedArrangement, OwnedMove, OwnedStockSelection};
use super::{
    CommandEncoding, CommandEnvelope, CommandHeaders, NativeCommand, SpeechTargetRole,
    StatusOperation,
};
use crate::encoding::json_record;
use crate::gathering::{GatheringMode, ToolChoice};
use crate::state::SurfacePoint;
use crate::text::JsText;
use crate::values::DefinitionPin;
use crate::worlds::base_observed::SpeechVolume;
use indexmap::IndexMap;
use serde::Serialize;

#[derive(Clone, Copy)]
pub enum RuntimeGuardFacing<'a> {
    Subject { id: &'a str, life: u64 },
    Direction(f64),
}

impl RuntimeGuardFacing<'_> {
    fn text_bytes(self) -> usize {
        match self {
            Self::Subject { id, .. } => id.len(),
            Self::Direction(_) => 0,
        }
    }
}

#[derive(Clone, Copy)]
pub enum RuntimePlayerCommand<'a> {
    Move(&'a SurfacePoint),
    Evade(&'a SurfacePoint),
    Strike {
        target: &'a str,
        definition: &'a str,
        weapon: Option<&'a str>,
        auto_equip: bool,
        equipment_revision: Option<u64>,
        permission: Option<&'a crate::contact::StrikePermission>,
        timed_begin: bool,
    },
    ReleaseStrike {
        action: &'a str,
        permission: Option<&'a crate::contact::StrikePermission>,
        input: crate::attack_execution::TimedReleaseInput,
        may_wait: bool,
    },
    Follow {
        target: &'a str,
        distance: Option<f64>,
        until: Option<f64>,
        complete: Option<bool>,
    },
    Travel(PlayerTravelIntent<'a>),
    Respawn,
    Cancel(Option<&'a str>),
    DismissStrikeReview,
    Gather {
        target: &'a str,
        tool: Option<&'a str>,
        mode: Option<GatheringMode>,
    },
    Fish {
        target: &'a str,
        tool: &'a str,
    },
    Handover {
        target: &'a str,
        gift: &'a crate::handover::GiftIntent,
        evidence: Option<&'a std::sync::Arc<crate::handover::TradeEvidence>>,
    },
    Craft {
        recipe: &'a str,
        tools: Option<&'a indexmap::IndexMap<String, String>>,
    },
    Say {
        text: &'a JsText,
        target: Option<(&'a str, SpeechTargetRole)>,
        volume: Option<SpeechVolume>,
    },
    DirectedSpeech {
        text: &'a JsText,
        target: &'a str,
        role: SpeechTargetRole,
        volume: SpeechVolume,
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
    TreatScar { target: &'a str, scar: &'a str },
    Guard {
        item: &'a str,
        facing: RuntimeGuardFacing<'a>,
        auto_equip: bool,
    },
    RangedStart {
        mode: crate::projectile::RuntimeRangedMode,
        target: crate::projectile::RuntimeRangedTarget<'a>,
        weapon: Option<&'a str>,
        ammunition: Option<&'a str>,
        auto_equip: bool,
        permission: Option<&'a crate::contact::StrikePermission>,
        timed_begin: bool,
    },
    RangedRelease {
        action: &'a str,
        target: Option<crate::projectile::RuntimeRangedTarget<'a>>,
        permission: Option<&'a crate::contact::StrikePermission>,
        input: crate::attack_execution::TimedReleaseInput,
        may_wait: bool,
    },
    PracticeShot {
        target: &'a str,
        weapon: Option<&'a str>,
        ammunition: Option<&'a str>,
    },
    TendFire { target: &'a str, operation: crate::fire_care::FireOperation, item: Option<&'a str> },
    Pickup { target: &'a str, item: Option<&'a str>, quantity: Option<u64> },
    Drop { item: &'a str, quantity: u64 },
    DropGroup { item: &'a str, group: &'a OwnedStockSelection },
    LearnRecord(&'a super::RecipeRecordSelection),
    InspectItem { item: &'a str, container: &'a str, expected_revision: u64 },
    InspectStorage { root: &'a str, after: Option<&'a str>, expected_scope: Option<&'a crate::text::JsText>, expected_revision: Option<u64> },
    TransferItem(OwnedMove<&'a str>),
    MoveGroup(OwnedMove<&'a str>, &'a OwnedStockSelection),
    Eat(&'a str),
    Equip(&'a str),
    Unequip { item: &'a str, expected_revision: u64, placement_revision: u64 },
}

/// The owner binds executable facts and the exact receipt bytes together.
pub(crate) struct BoundPlayerCommand {
    command: NativeCommand,
    canonical: String,
}

impl BoundPlayerCommand {
    pub(super) fn command(&self) -> &NativeCommand {
        &self.command
    }

    pub(super) fn into_parts(self) -> (NativeCommand, String) {
        (self.command, self.canonical)
    }
}

impl RuntimePlayerCommand<'_> {
    pub(crate) fn selected_text_bytes(self) -> usize {
        match self {
            Self::Move(point) | Self::Evade(point) => point.surface_id.len(),
            Self::Strike {
                target, definition, weapon, ..
            } => target.len() + definition.len() + weapon.map_or(0, str::len),
            Self::Follow { target, .. } => target.len(),
            Self::Travel(intent) => intent.text_bytes(),
            Self::Cancel(action) => action.map_or(0, str::len),
            Self::DismissStrikeReview | Self::Respawn => 0,
            Self::Gather { target, tool, .. } => target.len() + tool.map_or(0, str::len),
            Self::Fish { target, tool } => target.len() + tool.len(),
            Self::Pickup { target, item, .. } => target.len() + item.map_or(0, str::len),
            Self::Drop { item, .. } => item.len(),
            Self::DropGroup { item, group } => item.len() + group_text_bytes(group),
            Self::Craft { recipe, tools } => {
                recipe.len()
                    + tools
                        .into_iter()
                        .flat_map(|tools| tools.iter())
                        .map(|(role, item)| role.len() + item.len())
                        .sum::<usize>()
            }
            Self::Handover { target, gift, .. } => target.len() + gift.retained_text_bytes(),
            Self::PlaceHearth { definition, site } => definition.id.len() + definition.digest.len() + site.surface_id.len(),
            Self::TreatScar { target, scar } => target.len() + scar.len(),
            Self::Guard { item, facing, .. } => item.len() + facing.text_bytes(),
            Self::RangedStart { target, weapon, ammunition, .. } =>
                target.selected_text_bytes() + weapon.map_or(0, str::len) + ammunition.map_or(0, str::len),
            Self::ReleaseStrike { action, .. } => action.len(),
            Self::RangedRelease { action, target, .. } =>
                action.len() + target.map_or(0, crate::projectile::RuntimeRangedTarget::selected_text_bytes),
            Self::PracticeShot { target, weapon, ammunition } => {
                target.len() + weapon.map_or(0, str::len) + ammunition.map_or(0, str::len)
            }
            Self::TendFire { target, item, .. } => target.len() + item.map_or(0, str::len),
            Self::Say { text, target, .. } => text.storage_bytes() + target.map_or(0, |(id, _)| id.len()),
            Self::DirectedSpeech { text, target, .. } => text.storage_bytes() + target.len(),
            Self::Status { target, definition, .. } => target.len() + definition.len(),
            Self::Cook { heat, preparation_id, preparation_digest, inputs, .. } => {
                heat.len() + preparation_id.len() + preparation_digest.len()
                    + inputs.iter().map(|(role, item)| role.len() + item.len()).sum::<usize>()
            }
            Self::LearnRecord(record) => record.item_id.len() + record.record_pin.id.len() + record.record_pin.digest.len(),
            Self::InspectItem { item, container, .. } => item.len() + container.len(),
            Self::InspectStorage { root, after, expected_scope, .. } => root.len() + after.map_or(0, str::len) + expected_scope.map_or(0, crate::text::JsText::storage_bytes),
            Self::TransferItem(selection) => selection.item_id.len() + selection.target_id.len()
                + selection.world_storage.map_or(0, str::len),
            Self::MoveGroup(selection, group) =>
                selection.item_id.len() + selection.target_id.len() + group_text_bytes(group),
            Self::Eat(item) | Self::Equip(item) | Self::Unequip { item, .. } => item.len(),
        }
    }

    pub(crate) fn bind(
        self,
        id: &str,
        actor: &str,
    ) -> Result<BoundPlayerCommand, serde_json::Error> {
        let (command, canonical) = self.bind_parts(id, actor)?;
        Ok(BoundPlayerCommand { command, canonical })
    }

    fn bind_parts(
        self,
        id: &str,
        actor: &str,
    ) -> Result<(NativeCommand, String), serde_json::Error> {
        if let Self::DirectedSpeech {
            text,
            target,
            role,
            volume,
        } = self
        {
            return bind_directed_speech(id, actor, target, role, text, volume);
        }
        if let Self::Strike {
            target, definition, weapon, auto_equip, ..
        } = self
        {
            return bind_strike(id, actor, target, definition, weapon, auto_equip);
        }
        if let Self::Follow {
            target,
            distance,
            until,
            complete,
        } = self
        {
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
        if let Self::Travel(intent) = self {
            return intent.bind(id, actor);
        }
        if let Self::PlaceHearth { definition, site } = self {
            return bind_hearth(id, actor, definition, site);
        }
        if let Self::TreatScar { target, scar } = self {
            return bind_scar_treatment(id, actor, target, scar);
        }
        match self {
            Self::Guard { item, facing, auto_equip } => {
                return super::guard_input::bind(player_headers(id, actor), item, facing, auto_equip);
            }
            Self::RangedStart { mode, target, weapon, ammunition, auto_equip, .. } => {
                return super::ranged_input::bind(
                    player_headers(id, actor),
                    super::ranged_input::RangedIntent::Start {
                        mode, target: crate::projectile::RangedTarget::bound(target),
                        weapon: weapon.map(str::to_owned), ammunition: ammunition.map(str::to_owned),
                        auto_equip,
                    },
                );
            }
            Self::RangedRelease { action, target, .. } => {
                return super::ranged_input::bind(
                    player_headers(id, actor),
                    super::ranged_input::RangedIntent::Release {
                        action: action.into(), target: target.map(crate::projectile::RangedTarget::bound),
                    },
                );
            }
            _ => {}
        }
        if let Self::PracticeShot { target, weapon, ammunition } = self {
            return bind_practice_shot(id, actor, target, weapon, ammunition);
        }
        if let Self::TendFire { target, operation, item } = self {
            return bind_fire(id, actor, target, operation, item);
        }
        if let Self::Status { target, definition, operation, facing } = self {
            return bind_status(id, actor, target, definition, operation, facing);
        }
        if let Self::Handover { target, gift, .. } = self {
            return bind_gift(id, actor, target, gift);
        }
        if let Self::LearnRecord(record) = self {
            return bind_record_learning(id, actor, record);
        }
        match self {
            Self::TransferItem(selection) => return bind_transfer(id, actor, selection, None),
            Self::MoveGroup(selection, group) => return bind_transfer(id, actor, selection, Some(group)),
            Self::DropGroup { item, group } => return bind_group_drop(id, actor, item, group),
            _ => {}
        }
        if let Self::InspectItem { item, container, expected_revision } = self {
            return bind_inspection(id, actor, item, container, expected_revision);
        }
        if let Self::InspectStorage { root, after, expected_scope, expected_revision } = self {
            return bind_storage_inspection(id, actor, root, after, expected_scope, expected_revision);
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
            tools: Option<&'a indexmap::IndexMap<String, String>>,
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
            #[serde(skip_serializing_if = "Option::is_none")]
            tools: Option<&'a indexmap::IndexMap<String, String>>,
            #[serde(rename = "type")]
            kind: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            volume: Option<SpeechVolume>,
        }
        let (kind, destination, expected_action_id, target_id, item_id, gathering_mode) = match self {
            Self::Move(point) => ("move", Some(point), None, None, None, None),
            Self::Evade(point) => ("evade", Some(point), None, None, None, None),
            Self::Respawn => ("respawn", None, None, None, None, None),
            Self::Cancel(action) => ("cancel", None, action, None, None, None),
            Self::ReleaseStrike { action, .. } => ("release-strike", None, Some(action), None, None, None),
            Self::DismissStrikeReview => ("dismiss-strike-review", None, None, None, None, None),
            Self::Gather { target, tool, mode } => ("gather", None, None, Some(target), tool, mode),
            Self::Pickup { target, item, .. } => ("pickup", None, None, Some(target), item, None),
            Self::Drop { item, .. } => ("drop", None, None, None, Some(item), None),
            Self::Fish { target, tool } => ("fish", None, None, Some(target), Some(tool), None),
            Self::Craft { .. } => ("craft", None, None, None, None, None),
            Self::Say { target, .. } => ("say", None, None, target.map(|(id, _)| id), None, None),
            Self::Cook { .. }
            | Self::Status { .. }
            | Self::TreatScar { .. }
            | Self::Guard { .. }
            | Self::RangedStart { .. }
            | Self::RangedRelease { .. }
            | Self::PracticeShot { .. }
            | Self::TendFire { .. }
            | Self::PlaceHearth { .. }
            | Self::LearnRecord(_)
            | Self::InspectItem { .. }
            | Self::InspectStorage { .. }
            | Self::Follow { .. }
            | Self::Handover { .. }
            | Self::Travel(_)
            | Self::TransferItem(_)
            | Self::MoveGroup(..)
            | Self::DropGroup { .. }
            | Self::DirectedSpeech { .. }
            | Self::Strike { .. } => {
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
            Self::Drop { quantity, .. } => Some(quantity),
            _ => None,
        };
        let (recipe_id, tools) = match self {
            Self::Craft { recipe, tools } => (Some(recipe), tools),
            _ => (None, None),
        };
        let (text, target_role, volume) = match self {
            Self::Say { text, target, volume } => (Some(text), target.map(|(_, role)| role), volume),
            _ => (None, None, None),
        };
        let headers = player_headers(id, actor);
        let unsafe_id = |id: &str| !crate::values::is_safe_record_id(id);
        if !headers.valid()
            || recipe_id.is_some_and(unsafe_id)
            || item_id.is_some_and(unsafe_id)
            || (matches!(self, Self::Gather { .. } | Self::Fish { .. } | Self::Pickup { .. })
                && target_id.is_some_and(unsafe_id))
            || (matches!(self, Self::Pickup { .. }) && quantity.is_some() && item_id.is_none())
            || tools.is_some_and(|tools| !crate::manufacturing::valid_tool_selection(tools))
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
                tools,
                target_role,
                text,
                volume,
            },
            4 + [
                destination.is_some(),
                expected_action_id.is_some(),
                target_id.is_some(),
                item_id.is_some(),
                gathering_mode.is_some(),
                recipe_id.is_some(),
                tools.is_some(),
                expected_revision.is_some(),
                placement_revision.is_some(),
                quantity.is_some(),
                text.is_some(),
                target_role.is_some(),
                volume.is_some(),
            ]
            .into_iter()
            .filter(|value| *value)
            .count(),
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
            tools,
            kind,
            volume,
        })?;
        let envelope = headers.envelope(encoding);
        let command = match self {
            Self::Move(point) => NativeCommand::Move {
                envelope,
                destination: point.clone().into(),
            },
            Self::Evade(point) => NativeCommand::Evade {
                envelope,
                destination: point.clone().into(),
            },
            Self::Respawn => NativeCommand::Respawn { envelope },
            Self::Cancel(action) => NativeCommand::Cancel {
                envelope,
                expected_action_id: action.map(str::to_owned),
                dismiss_review: false,
            },
            Self::ReleaseStrike { action, .. } => NativeCommand::ReleaseStrike {
                envelope, expected_action_id: action.into(),
            },
            Self::DismissStrikeReview => NativeCommand::Cancel {
                envelope,
                expected_action_id: None,
                dismiss_review: true,
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
            Self::Craft { recipe, tools } => NativeCommand::Craft {
                envelope,
                recipe_id: recipe.into(),
                tools: tools.cloned(),
            },
            Self::Say { text, target, volume } => bound_speech(envelope, text, target, volume),
            Self::Pickup { target, item, quantity } => NativeCommand::Pickup {
                envelope, target_id: target.into(), item_id: item.map(str::to_owned), quantity,
            },
            Self::Drop { item, quantity } => NativeCommand::Drop {
                envelope,
                item_id: item.to_owned(),
                quantity,
                group: None,
            },
            Self::Fish { target, tool } => NativeCommand::Fish {
                envelope,
                target_id: target.into(),
                item_id: tool.into(),
            },
            Self::Cook { .. }
            | Self::Status { .. }
            | Self::TreatScar { .. }
            | Self::Guard { .. }
            | Self::RangedStart { .. }
            | Self::RangedRelease { .. }
            | Self::PracticeShot { .. }
            | Self::TendFire { .. }
            | Self::PlaceHearth { .. }
            | Self::LearnRecord(_)
            | Self::InspectItem { .. }
            | Self::InspectStorage { .. }
            | Self::Follow { .. }
            | Self::Handover { .. }
            | Self::Travel(_)
            | Self::TransferItem(_)
            | Self::MoveGroup(..)
            | Self::DropGroup { .. }
            | Self::DirectedSpeech { .. }
            | Self::Strike { .. } => {
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

/// Encode the conversation's existing receipt and activity facts once. The
/// already authorized caller passes the exact text and target to the command.
fn bind_directed_speech(
    id: &str,
    actor: &str,
    target: &str,
    role: SpeechTargetRole,
    text: &JsText,
    volume: SpeechVolume,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Operation<'a> {
        actor_id: &'a str,
        id: &'a str,
        target_id: &'a str,
        target_role: SpeechTargetRole,
        text: &'a JsText,
        #[serde(rename = "type")]
        kind: &'static str,
        volume: SpeechVolume,
    }
    let mut headers = player_headers(id, actor);
    if !headers.valid() {
        return Err(serde::ser::Error::custom("Invalid conversation command."));
    }
    // Match the original directed speech record, including omission and order.
    headers.human_initiated = None;
    let encoding = CommandEncoding::from_ordered(
        &Operation {
            actor_id: actor,
            id,
            target_id: target,
            target_role: role,
            text,
            kind: "say",
            volume,
        },
        7,
    )?;
    let signature = encoding.json.get().to_owned();
    let command = bound_speech(
        headers.envelope(encoding),
        text,
        Some((target, role)),
        Some(volume),
    );
    Ok((command, signature))
}

fn bound_speech(
    envelope: CommandEnvelope,
    text: &JsText,
    target: Option<(&str, SpeechTargetRole)>,
    volume: Option<SpeechVolume>,
) -> NativeCommand {
    NativeCommand::Say {
        envelope,
        text: text.clone(),
        target_id: target.map(|(id, _)| id.to_owned()),
        target_role: target.map(|(_, role)| role),
        self_introduction: None,
        volume: volume.map(|value| value.id().to_owned()),
    }
}

fn bind_transfer(
    id: &str,
    actor: &str,
    selection: OwnedMove<&str>,
    group: Option<&OwnedStockSelection>,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Binding<'a> {
        actor_id: &'a str,
        #[serde(flatten)]
        selection: OwnedMove<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        sources: Option<&'a [crate::execution::OwnedStockLot]>,
        human_initiated: bool,
        id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let headers = player_headers(id, actor);
    if !headers.valid()
        || !crate::values::is_safe_record_id(selection.item_id)
        || !crate::values::is_safe_record_id(selection.target_id)
        || selection.world_storage.is_some_and(|root| {
            group.is_some()
                || selection.arrangement != OwnedArrangement::Move
                || !crate::values::is_safe_record_id(root)
        })
    {
        return Err(serde::ser::Error::custom("Invalid item move."));
    }
    let input = Binding {
        actor_id: actor, selection,
        sources: group.map(|group| group.members.as_slice()),
        human_initiated: true, id, kind: selection.arrangement.command_type(),
    };
    let encoding = CommandEncoding::from_ordered(
        &input, 10 + usize::from(selection.expected_contents_revision.is_some())
            + usize::from(selection.world_storage.is_some()) + usize::from(group.is_some()),
    )?;
    let signature = encoding.json.get().to_owned();
    Ok((NativeCommand::TransferItem {
        envelope: headers.envelope(encoding),
        selection: selection.map_ids(|id| (*id).to_owned()),
        group: group.cloned(),
    }, signature))
}

fn group_text_bytes(group: &OwnedStockSelection) -> usize {
    group.container_id.len() + group.members.iter().map(|lot| lot.item_id.len() + 96).sum::<usize>()
}

fn bind_group_drop(
    id: &str, actor: &str, item: &str, group: &OwnedStockSelection,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Binding<'a> {
        id: &'a str,
        actor_id: &'a str,
        human_initiated: bool,
        #[serde(rename = "type")]
        kind: &'static str,
        item_id: &'a str,
        quantity: u64,
        sources: &'a [crate::execution::OwnedStockLot],
    }
    let headers = player_headers(id, actor);
    if !headers.valid() || !crate::values::is_safe_record_id(item) {
        return Err(serde::ser::Error::custom("Invalid item drop."));
    }
    let encoding = CommandEncoding::from_ordered(&Binding {
        id, actor_id: actor, human_initiated: true, kind: "drop", item_id: item,
        quantity: group.quantity, sources: &group.members,
    }, 7)?;
    let signature = encoding.json.get().to_owned();
    Ok((NativeCommand::Drop {
        envelope: headers.envelope(encoding),
        item_id: item.to_owned(),
        quantity: group.quantity,
        group: Some(group.clone()),
    }, signature))
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
    let input = Binding {
        actor_id: actor,
        gift,
        human_initiated: true,
        id,
        target_id: target,
        kind: "handover",
    };
    let encoding = CommandEncoding::from_ordered(
        &input,
        6 + usize::from(gift.offered_items.is_some()) * 2
            + usize::from(gift.offer_id.is_some()) * 2,
    )?;
    Ok((
        NativeCommand::Handover {
            envelope: headers.envelope(encoding),
            target_id: target.to_owned(),
            gift: gift.clone(),
        },
        json_record(&input)?,
    ))
}

fn bind_strike(
    id: &str,
    actor: &str,
    target: &str,
    definition: &str,
    weapon: Option<&str>,
    auto_equip: bool,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Binding<'a> {
        actor_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        auto_equip: Option<bool>,
        definition_id: &'a str,
        human_initiated: bool,
        id: &'a str,
        target_id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
        #[serde(skip_serializing_if = "Option::is_none")]
        weapon_item_id: Option<&'a str>,
    }
    let headers = player_headers(id, actor);
    if !headers.valid()
        || ![target, definition]
            .into_iter()
            .all(crate::values::is_safe_record_id)
        || weapon.is_some_and(|id| !crate::values::is_safe_record_id(id))
        || (auto_equip && weapon.is_none())
    {
        return Err(serde::ser::Error::custom("Invalid strike binding."));
    }
    let binding = Binding {
        actor_id: actor,
        definition_id: definition,
        human_initiated: true,
        id,
        target_id: target,
        kind: "strike",
        weapon_item_id: weapon,
        auto_equip: auto_equip.then_some(true),
    };
    Ok((
        NativeCommand::Strike {
            envelope: headers.envelope(CommandEncoding::from_ordered(
                &binding,
                6 + usize::from(weapon.is_some()) + usize::from(auto_equip),
            )?),
            target_id: target.into(),
            target_life: None,
            definition_id: definition.into(),
            weapon_item_id: weapon.map(str::to_owned),
            auto_equip: auto_equip.then_some(true),
        },
        json_record(&binding)?,
    ))
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
        world: None,
    }, signature))
}

fn bind_storage_inspection(
    id: &str,
    actor: &str,
    root: &str,
    after: Option<&str>,
    expected_scope: Option<&crate::text::JsText>,
    expected_revision: Option<u64>,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Inspection<'a> {
        #[serde(rename = "type")]
        kind: &'static str,
        id: &'a str,
        actor_id: &'a str,
        human_initiated: bool,
        container_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        after: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        expected_scope: Option<&'a crate::text::JsText>,
        #[serde(skip_serializing_if = "Option::is_none")]
        expected_revision: Option<u64>,
    }
    let world = super::InspectedStorage::validated(
        root.to_owned(),
        after.map(str::to_owned),
        expected_scope.cloned(),
        expected_revision,
    )?;
    let headers = player_headers(id, actor);
    if !headers.valid() {
        return Err(serde::de::Error::custom("Invalid selected native command binding."));
    }
    let value = Inspection {
        id,
        actor_id: actor,
        kind: "inspect-inventory",
        human_initiated: true,
        container_id: root,
        after,
        expected_scope,
        expected_revision,
    };
    let encoding = CommandEncoding::from_ordered(
        &value,
        5 + usize::from(after.is_some())
            + usize::from(expected_scope.is_some())
            + usize::from(expected_revision.is_some()),
    )?;
    let canonical = encoding.json.get().to_owned();
    Ok((
        NativeCommand::InspectInventory {
            envelope: headers.envelope(encoding),
            selected: None,
            world: Some(world),
        },
        canonical,
    ))
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


fn bind_practice_shot(
    id: &str,
    actor: &str,
    target: &str,
    weapon: Option<&str>,
    ammunition: Option<&str>,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Input<'a> {
        actor_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        ammo_item_id: Option<&'a str>,
        human_initiated: bool,
        id: &'a str,
        target_id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
        #[serde(skip_serializing_if = "Option::is_none")]
        weapon_item_id: Option<&'a str>,
    }
    let headers = player_headers(id, actor);
    if !headers.valid()
        || ![Some(target), weapon, ammunition].into_iter().flatten().all(crate::values::is_safe_record_id)
    {
        return Err(serde::de::Error::custom("Invalid practice shot binding."));
    }
    let input = Input {
        actor_id: actor,
        ammo_item_id: ammunition,
        human_initiated: true,
        id,
        target_id: target,
        kind: "practice-shot",
        weapon_item_id: weapon,
    };
    let fields = 5 + usize::from(ammunition.is_some()) + usize::from(weapon.is_some());
    let encoding = CommandEncoding::from_ordered(&input, fields)?;
    let command = NativeCommand::PracticeShot {
        envelope: headers.envelope(encoding),
        target_id: target.into(),
        weapon_item_id: weapon.map(str::to_owned),
        ammo_item_id: ammunition.map(str::to_owned),
    };
    Ok((command, json_record(&input)?))
}

fn bind_scar_treatment(
    id: &str, actor: &str, target: &str, scar: &str,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Input<'a> {
        actor_id: &'a str,
        human_initiated: bool,
        id: &'a str,
        scar_id: &'a str,
        target_id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let headers = player_headers(id, actor);
    if !headers.valid() || !crate::values::is_safe_record_id(target)
        || !crate::values::is_safe_record_id(scar)
    {
        return Err(serde::de::Error::custom("Invalid scar treatment binding."));
    }
    let input = Input {
        actor_id: actor,
        human_initiated: true,
        id,
        scar_id: scar,
        target_id: target,
        kind: "treat-scar",
    };
    let encoding = CommandEncoding::from_ordered(&input, 6)?;
    let command = NativeCommand::TreatScar {
        envelope: headers.envelope(encoding),
        target_id: target.into(),
        scar_id: scar.into(),
    };
    Ok((command, json_record(&input)?))
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


fn bind_record_learning(
    id: &str,
    actor: &str,
    record: &super::RecipeRecordSelection,
) -> Result<(NativeCommand, String), serde_json::Error> {
    let headers = player_headers(id, actor);
    if !headers.valid() || !record.valid() {
        return Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidData, "Invalid recipe record binding.",
        )));
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Operation<'a> {
        id: &'a str,
        actor_id: &'a str,
        human_initiated: bool,
        #[serde(rename = "type")]
        kind: &'static str,
        #[serde(flatten)]
        record: &'a super::RecipeRecordSelection,
    }
    let encoding = CommandEncoding::from_ordered(&Operation {
        id, actor_id: actor, human_initiated: true, kind: "learn-record", record,
    }, 8)?;
    let canonical = encoding.json.get().to_owned();
    Ok((NativeCommand::LearnRecord {
        envelope: headers.envelope(encoding),
        record: record.clone(),
    }, canonical))
}


impl NativeCommand {
    /// Internal only. Provider words can reach this binding after native
    /// eligibility and the exact selected target have been checked.
    pub(crate) fn bind_player_expression(
        id: &str, actor: &str, predicate: &JsText, target: Option<&str>,
    ) -> Result<BoundPlayerCommand, serde_json::Error> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Expression<'a> {
            actor_id: &'a str,
            id: &'a str,
            predicate: &'a JsText,
            #[serde(skip_serializing_if = "Option::is_none")]
            target_id: Option<&'a str>,
            #[serde(rename = "type")]
            kind: &'static str,
        }
        let headers = player_headers(id, actor);
        let marker: JsText = "{target}".into();
        if !headers.valid() || predicate.trim_is_empty() || predicate.units_len() > 240
            || predicate.contains(&marker) != target.is_some()
        {
            return Err(serde::ser::Error::custom("Invalid descriptive expression."));
        }
        let input = Expression { actor_id: actor, id, predicate, target_id: target, kind: "descriptive-act" };
        let encoding = CommandEncoding::from_ordered(&input, 4 + usize::from(target.is_some()))?;
        Ok(BoundPlayerCommand {
            command: Self::DescriptiveAct {
                envelope: headers.envelope(encoding),
                predicate: predicate.clone(),
                target: target.map(str::to_owned),
            },
            canonical: json_record(&input)?,
        })
    }
}
