//! Closed native inputs for the selected compiled command families. The public
//! protocol and binder retain their existing owner; unsupported input does not
//! acquire a generic JSON execution path or silently lose optional parameters.

use crate::state::RecordedSurfacePoint;
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_present_safe_integer,
    deserialize_safe_integer, is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
mod encoding;
use encoding::CommandEncoding;
mod outings_input;
pub(crate) use outings_input::OutingParameters;
pub use outings_input::{PlayerTravelDestination, PlayerTravelIntent};

pub(crate) mod invocation;
mod preparation;
pub(crate) use invocation::{
    BoundInvocation, InvocationCursor, InvocationStep, movement_destination,
};
pub(crate) use preparation::{
    CommandChoiceAnswer, CommandChoiceCursor, CommandChoiceStep, InvocationLimits,
    PreparedCommandChoice,
};
pub use preparation::WorkTransitionMode;
mod operation;
pub(crate) use operation::*;
mod exposure;
mod finalization;
pub(crate) use finalization::*;
mod native_contact;
mod native_movement;
pub(crate) use native_contact::begin_native_contact;
pub(crate) use native_contact::begin_native_hunt_contact;
pub(crate) use native_movement::{
    begin_native_feed, begin_native_foraging_move, begin_native_hunt_move, begin_native_movement, begin_native_stop,
    begin_territorial_move,
};
pub(crate) mod player;
mod state;
pub(crate) use state::*;
mod display;
pub(crate) use display::*;
mod run;
pub(crate) use run::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CooperationBinding {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PurposeBinding {
    pub definition: DefinitionPin,
    pub id: String,
    pub description: crate::text::JsText,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub roles: IndexMap<String, String>,
    pub source_ids: Vec<String>,
}
impl Clone for PurposeBinding {
    fn clone(&self) -> Self {
        // IndexMap::clone can grow dense backing beyond the admitted
        // source HeapBytes. Keep every command and activity copy within it.
        let mut roles = IndexMap::with_capacity(self.roles.capacity());
        roles.extend(
            self.roles
                .iter()
                .map(|(role, id)| (role.clone(), id.clone())),
        );
        Self {
            definition: self.definition.clone(),
            id: self.id.clone(),
            description: self.description.clone(),
            roles,
            source_ids: self.source_ids.clone(),
        }
    }
}
impl PurposeBinding {
    fn valid(&self) -> bool {
        self.definition.is_valid()
            && is_safe_record_id(&self.id)
            && !self.description.trim_is_empty()
            && self.description.units_len() <= 500
            && self.roles.len() <= 8
            && self
                .roles
                .iter()
                .all(|(role, id)| is_safe_record_id(role) && is_safe_record_id(id))
            && self.source_ids.len() <= 48
            && self.source_ids.iter().all(|id| is_safe_record_id(id))
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CommandEnvelope {
    #[serde(skip)]
    encoding: CommandEncoding,
    pub id: String,
    pub actor_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cooperation: Option<CooperationBinding>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub combat_help_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub human_initiated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purpose: Option<crate::text::JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chosen_purpose: Option<PurposeBinding>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CommandHeaders {
    id: String,
    actor_id: String,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    cooperation: Option<CooperationBinding>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    combat_help_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    human_initiated: Option<bool>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    purpose: Option<crate::text::JsText>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    chosen_purpose: Option<PurposeBinding>,
}
impl CommandHeaders {
    fn valid(&self) -> bool {
        is_safe_record_id(&self.id)
            && is_safe_record_id(&self.actor_id)
            && !self.human_initiated.is_some_and(|value| !value)
            && self
                .combat_help_id
                .as_ref()
                .is_none_or(|id| is_safe_record_id(id))
            && self
                .cooperation
                .as_ref()
                .is_none_or(|binding| is_safe_record_id(&binding.id))
            && self
                .purpose
                .as_ref()
                .is_none_or(|value| !value.trim_is_empty() && value.units_len() <= 120)
            && self
                .chosen_purpose
                .as_ref()
                .is_none_or(PurposeBinding::valid)
    }
    fn envelope(self, encoding: CommandEncoding) -> CommandEnvelope {
        CommandEnvelope {
            encoding,
            id: self.id,
            actor_id: self.actor_id,
            cooperation: self.cooperation,
            combat_help_id: self.combat_help_id,
            human_initiated: self.human_initiated,
            purpose: self.purpose,
            chosen_purpose: self.chosen_purpose,
        }
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StatusOperation {
    Activate,
    Deactivate,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SpeechTargetRole {
    Body,
    Remembered,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum NativeCommand {
    Outing {
        envelope: CommandEnvelope,
        parameters: OutingParameters,
    },
    Handover {
        envelope: CommandEnvelope,
        target_id: String,
        gift: crate::handover::GiftIntent,
    },
    Move {
        envelope: CommandEnvelope,
        destination: RecordedSurfacePoint,
    },
    Feed {
        envelope: CommandEnvelope,
        target_id: String,
        item_id: Option<String>,
    },
    Gather {
        envelope: CommandEnvelope,
        target_id: String,
        tool: crate::gathering::ToolChoice,
    },
    Fish {
        envelope: CommandEnvelope,
        target_id: String,
        item_id: String,
    },
    Craft {
        envelope: CommandEnvelope,
        recipe_id: String,
    },
    Cook {
        envelope: CommandEnvelope,
        heat_id: String,
        definition: crate::values::DefinitionPin,
        inputs: indexmap::IndexMap<String, String>,
    },
    PlaceHearth {
        envelope: CommandEnvelope,
        definition: crate::values::DefinitionPin,
        site: crate::state::SurfacePoint,
    },
    TendFire {
        envelope: CommandEnvelope,
        target_id: String,
        operation: crate::fire_care::FireOperation,
        item_id: Option<String>,
    },
    Pickup {
        envelope: CommandEnvelope,
        target_id: String,
        item_id: Option<String>,
        quantity: Option<u64>,
    },
    Drop { envelope: CommandEnvelope, item_id: String, quantity: u64 },
    Eat { envelope: CommandEnvelope, item_id: String },
    Equipment {
        envelope: CommandEnvelope,
        item_id: String,
        request: crate::execution::EquipmentRequest,
    },
    Say {
        envelope: CommandEnvelope,
        text: crate::text::JsText,
        target_id: Option<String>,
        target_role: Option<SpeechTargetRole>,
        self_introduction: Option<crate::text::JsText>,
        volume: Option<String>,
    },
    StatusEffect {
        envelope: CommandEnvelope,
        target_id: String,
        definition_id: String,
        operation: StatusOperation,
        facing_heading: Option<f64>,
        resting_place_id: Option<String>,
        resting_bay: Option<u64>,
    },
    Cancel {
        envelope: CommandEnvelope,
        expected_action_id: Option<String>,
    },
    WithdrawAttempt {
        envelope: CommandEnvelope,
        attempt_id: String,
    },
    Follow {
        envelope: CommandEnvelope,
        target_id: String,
        distance: Option<f64>,
        parameters: crate::movement::follow::FollowParameters,
    },
    Strike {
        envelope: CommandEnvelope,
        target_id: String,
        definition_id: String,
        weapon_item_id: Option<String>,
        auto_equip: Option<bool>,
    },
    InspectInventory {
        envelope: CommandEnvelope,
        selected: Option<InspectedItem>,
    },
    InspectActivities {
        envelope: CommandEnvelope,
        history_after: i64,
        method_after: u64,
    },
}

macro_rules! optional {
    ($($field:ident:$ty:ty),+ $(,)?)=>{
        #[derive(Deserialize)]
        #[serde(rename_all="camelCase",deny_unknown_fields)]
        struct CommandInput {
            #[serde(rename="type")]kind:String,id:String,actor_id:String,
            $(#[serde(default,deserialize_with="deserialize_present_option")]$field:Option<$ty>,)+
            #[serde(default,deserialize_with="deserialize_present_safe_integer")]resting_bay:Option<u64>,
        }
    }
}
optional!(cooperation:CooperationBinding,combat_help_id:String,human_initiated:bool,purpose:crate::text::JsText,chosen_purpose:PurposeBinding,destination:RecordedSurfacePoint,text:crate::text::JsText,target_id:String,target_role:SpeechTargetRole,self_introduction:crate::text::JsText,volume:String,definition_id:String,operation:StatusOperation,facing_heading:f64,resting_place_id:String,expected_action_id:String,distance:f64,weapon_item_id:String,auto_equip:bool,after:i64,method_after:u64,attempt_id:String,item_id:String,gathering_mode:crate::gathering::GatheringMode,expected_revision:u64,placement_revision:u64,quantity:u64,heat_id:String,preparation_id:String,preparation_version:u64,preparation_digest:String,inputs:indexmap::IndexMap<String,String>,recipe_id:String);

#[derive(Clone, Debug, PartialEq)]
pub struct InspectedItem {
    pub(crate) item_id: String,
    pub(crate) container_id: String,
    pub(crate) expected_revision: u64,
}

fn inventory_inspection_input(raw: &str) -> Result<NativeCommand, serde_json::Error> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Input {
        #[serde(rename = "type")]
        _kind: String,
        #[serde(flatten)]
        headers: CommandHeaders,
        #[serde(default, deserialize_with = "deserialize_present_option")]
        item_id: Option<String>,
        #[serde(default, deserialize_with = "deserialize_present_option")]
        container_id: Option<String>,
        #[serde(default, deserialize_with = "deserialize_present_safe_integer")]
        expected_revision: Option<u64>,
    }
    let input: Input = serde_json::from_str(raw)?;
    let selected = match (input.item_id, input.container_id, input.expected_revision) {
        (None, None, None) => None,
        (Some(item_id), Some(container_id), Some(expected_revision))
            if is_safe_record_id(&item_id) && is_safe_record_id(&container_id) =>
        {
            Some(InspectedItem { item_id, container_id, expected_revision })
        }
        _ => return Err(serde::de::Error::custom("Invalid exact item inspection.")),
    };
    if !input.headers.valid() {
        return Err(serde::de::Error::custom("Invalid selected native command binding."));
    }
    Ok(NativeCommand::InspectInventory {
        envelope: input.headers.envelope(CommandEncoding::decode(raw)?),
        selected,
    })
}

fn follow_input(raw: &str) -> Result<NativeCommand, serde_json::Error> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Input {
        #[serde(rename = "type")]
        _kind: String,
        #[serde(flatten)]
        headers: CommandHeaders,
        target_id: String,
        #[serde(default, deserialize_with = "deserialize_present_option")]
        distance: Option<f64>,
        #[serde(default, deserialize_with = "deserialize_present_option")]
        relation: Option<crate::movement::follow::FollowRelation>,
        #[serde(default, deserialize_with = "deserialize_present_option")]
        on_lost: Option<crate::movement::follow::FollowLoss>,
        #[serde(default, deserialize_with = "deserialize_present_option")]
        until: Option<f64>,
        #[serde(default, deserialize_with = "deserialize_present_option")]
        complete: Option<bool>,
    }
    let input: Input = serde_json::from_str(raw)?;
    if !input.headers.valid() || !is_safe_record_id(&input.target_id)
        || input.complete == Some(false)
    {
        return Err(serde::de::Error::custom("Invalid selected follow binding."));
    }
    Ok(NativeCommand::Follow {
        envelope: input.headers.envelope(CommandEncoding::decode(raw)?),
        target_id: input.target_id,
        distance: input.distance,
        parameters: crate::movement::follow::FollowParameters {
            relation: input.relation,
            on_lost: input.on_lost,
            until: input.until,
            complete: input.complete,
        },
    })
}

fn fire_care_input(raw: &str) -> Result<NativeCommand, serde_json::Error> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Input {
        #[serde(rename = "type")]
        _kind: String,
        #[serde(flatten)]
        headers: CommandHeaders,
        target_id: String,
        operation: crate::fire_care::FireOperation,
        #[serde(default, deserialize_with = "deserialize_present_option")]
        item_id: Option<String>,
    }
    let input: Input = serde_json::from_str(raw)?;
    if !input.headers.valid() || !is_safe_record_id(&input.target_id)
        || !input.operation.admits_item(input.item_id.as_deref())
    {
        return Err(serde::de::Error::custom("Invalid fire-care binding."));
    }
    Ok(NativeCommand::TendFire {
        envelope: input.headers.envelope(CommandEncoding::decode(raw)?),
        target_id: input.target_id,
        operation: input.operation,
        item_id: input.item_id,
    })
}

fn hearth_input(raw: &str) -> Result<NativeCommand, serde_json::Error> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Input {
        #[serde(rename = "type")]
        _kind: String,
        #[serde(flatten)]
        headers: CommandHeaders,
        definition_id: String,
        #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
        definition_version: u64,
        definition_digest: String,
        destination: crate::state::SurfacePoint,
    }
    let input: Input = serde_json::from_str(raw)?;
    let definition = crate::values::DefinitionPin {
        id: input.definition_id,
        version: input.definition_version,
        digest: input.definition_digest,
    };
    if !input.headers.valid() || !crate::hearth::valid_plan(&definition, &input.destination) {
        return Err(serde::de::Error::custom("Invalid hearth placement binding."));
    }
    Ok(NativeCommand::PlaceHearth {
        envelope: input.headers.envelope(CommandEncoding::decode(raw)?),
        definition,
        site: input.destination,
    })
}

fn gift_input(raw: &str) -> Result<NativeCommand, serde_json::Error> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Input {
        #[serde(rename = "type")]
        _kind: String,
        #[serde(flatten)] headers: CommandHeaders,
        target_id: String,
        #[serde(flatten)] gift: crate::handover::GiftIntent,
    }
    let input: Input = serde_json::from_str(raw)?;
    if !input.headers.valid() || !is_safe_record_id(&input.target_id) || !input.gift.valid() {
        return Err(serde::de::Error::custom("Invalid handover binding."));
    }
    Ok(NativeCommand::Handover {
        envelope: input.headers.envelope(CommandEncoding::decode(raw)?),
        target_id: input.target_id,
        gift: input.gift,
    })
}

impl<'de> Deserialize<'de> for NativeCommand {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(deserializer)?;
        #[derive(Deserialize)]
        struct Tag {
            #[serde(rename = "type")]
            kind: String,
        }
        let tag: Tag = serde_json::from_str(raw.get()).map_err(serde::de::Error::custom)?;
        if tag.kind == crate::worlds::base_outings::travel_command_type() {
            return outings_input::decode(raw.get()).map_err(serde::de::Error::custom);
        }
        if tag.kind == "place-hearth" {
            return hearth_input(raw.get()).map_err(serde::de::Error::custom);
        }
        if tag.kind == "follow" {
            return follow_input(raw.get()).map_err(serde::de::Error::custom);
        }
        if tag.kind == "handover" {
            return gift_input(raw.get()).map_err(serde::de::Error::custom);
        }
        if tag.kind == "tend-fire" {
            return fire_care_input(raw.get()).map_err(serde::de::Error::custom);
        }
        if tag.kind == "inspect-inventory" {
            return inventory_inspection_input(raw.get()).map_err(serde::de::Error::custom);
        }
        let input: CommandInput =
            serde_json::from_str(raw.get()).map_err(serde::de::Error::custom)?;
        use serde::de::Error;
        let headers = CommandHeaders {
            id: input.id,
            actor_id: input.actor_id,
            cooperation: input.cooperation,
            combat_help_id: input.combat_help_id,
            human_initiated: input.human_initiated,
            purpose: input.purpose,
            chosen_purpose: input.chosen_purpose,
        };
        if !headers.valid() {
            return Err(D::Error::custom("Invalid selected native command binding."));
        }
        if (input.kind != "gather" && input.gathering_mode.is_some())
            || (!matches!(input.kind.as_str(), "gather" | "feed" | "fish" | "pickup" | "drop" | "eat" | "equip" | "unequip") && input.item_id.is_some())
            || (input.kind != "unequip" && (input.expected_revision.is_some() || input.placement_revision.is_some()))
            || input.quantity.is_some_and(|n| !matches!(input.kind.as_str(), "pickup" | "drop") || n == 0 || n > crate::identity::MAX_SAFE_INTEGER)
            || (input.kind != "craft" && input.recipe_id.is_some())
            || (input.kind != "cook" && (input.heat_id.is_some() || input.preparation_id.is_some()
                || input.preparation_version.is_some() || input.preparation_digest.is_some() || input.inputs.is_some()))
        {
            return Err(D::Error::custom("Unexpected item selection."));
        }
        let discovery_fields = input.distance.is_some()
            || input.attempt_id.is_some()
            || input.weapon_item_id.is_some()
            || input.auto_equip.is_some()
            || input.after.is_some()
            || input.method_after.is_some();
        let extras_for_move = discovery_fields
            || input.text.is_some()
            || input.target_id.is_some()
            || input.target_role.is_some()
            || input.self_introduction.is_some()
            || input.volume.is_some()
            || input.definition_id.is_some()
            || input.operation.is_some()
            || input.facing_heading.is_some()
            || input.resting_place_id.is_some()
            || input.resting_bay.is_some()
            || input.expected_action_id.is_some();
        let extras_for_say = discovery_fields
            || input.destination.is_some()
            || input.definition_id.is_some()
            || input.operation.is_some()
            || input.facing_heading.is_some()
            || input.resting_place_id.is_some()
            || input.resting_bay.is_some()
            || input.expected_action_id.is_some();
        let extras_for_status = discovery_fields
            || input.destination.is_some()
            || input.text.is_some()
            || input.target_role.is_some()
            || input.self_introduction.is_some()
            || input.volume.is_some()
            || input.expected_action_id.is_some();
        let extras_for_cancel = discovery_fields
            || input.destination.is_some()
            || input.text.is_some()
            || input.target_id.is_some()
            || input.target_role.is_some()
            || input.self_introduction.is_some()
            || input.volume.is_some()
            || input.definition_id.is_some()
            || input.operation.is_some()
            || input.facing_heading.is_some()
            || input.resting_place_id.is_some()
            || input.resting_bay.is_some();
        let discovery_extras = input.destination.is_some()
            || input.text.is_some()
            || input.target_role.is_some()
            || input.self_introduction.is_some()
            || input.volume.is_some()
            || input.operation.is_some()
            || input.facing_heading.is_some()
            || input.resting_place_id.is_some()
            || input.resting_bay.is_some()
            || input.expected_action_id.is_some();
        let envelope =
            headers.envelope(CommandEncoding::decode(raw.get()).map_err(D::Error::custom)?);
        match input.kind.as_str() {
            "withdraw-attempt"
                if !discovery_extras
                    && input.distance.is_none()
                    && input.weapon_item_id.is_none()
                    && input.auto_equip.is_none()
                    && input.after.is_none()
                    && input.method_after.is_none()
                    && input.target_id.is_none()
                    && input.definition_id.is_none() =>
            {
                Ok(Self::WithdrawAttempt {
                    envelope,
                    attempt_id: input
                        .attempt_id
                        .filter(|id| is_safe_record_id(id))
                        .ok_or_else(|| {
                            D::Error::custom(
                                "Intent withdrawal requires its actual pending identity.",
                            )
                        })?,
                })
            }
            "move" if !extras_for_move => Ok(Self::Move {
                envelope,
                destination: input.destination.ok_or_else(|| {
                    D::Error::custom("Movement requires its selected destination.")
                })?,
            }),
            "feed"
                if !extras_for_say
                    && input.text.is_none()
                    && input.target_role.is_none()
                    && input.self_introduction.is_none()
                    && input.volume.is_none()
                    && envelope.human_initiated.is_none()
                    && envelope.cooperation.is_none()
                    && envelope.combat_help_id.is_none()
                    && envelope.purpose.is_none()
                    && envelope.chosen_purpose.is_none()
                    && input.item_id.as_deref().is_none_or(is_safe_record_id) =>
            {
                Ok(Self::Feed {
                    envelope,
                    target_id: input
                        .target_id
                        .filter(|id| is_safe_record_id(id))
                        .ok_or_else(|| {
                            D::Error::custom("Feeding requires its selected source.")
                        })?,
                    item_id: input.item_id,
                })
            }
            "gather"
                if !extras_for_say
                    && input.text.is_none()
                    && input.target_role.is_none()
                    && input.self_introduction.is_none()
                    && input.volume.is_none() =>
            {
                let target_id = input.target_id.filter(|id| is_safe_record_id(id))
                    .ok_or_else(|| D::Error::custom("Gathering requires a selected source."))?;
                let tool = crate::gathering::ToolChoice::new(input.gathering_mode, input.item_id)
                    .ok_or_else(|| D::Error::custom("Invalid gathering tool selection."))?;
                Ok(Self::Gather { envelope, target_id, tool })
            }
            "fish"
                if !extras_for_say
                    && input.text.is_none()
                    && input.target_role.is_none()
                    && input.self_introduction.is_none()
                    && input.volume.is_none()
                    && input.gathering_mode.is_none() =>
            {
                Ok(Self::Fish {
                    envelope,
                    target_id: input.target_id.filter(|id| is_safe_record_id(id))
                        .ok_or_else(|| D::Error::custom("A cast requires a selected source."))?,
                    item_id: input.item_id.filter(|id| is_safe_record_id(id))
                        .ok_or_else(|| D::Error::custom("A cast requires a selected tool."))?,
                })
            }
            "craft"
                if !extras_for_say && input.target_id.is_none() && input.text.is_none()
                    && input.target_role.is_none() && input.self_introduction.is_none()
                    && input.volume.is_none() =>
            {
                let recipe_id = input.recipe_id.filter(|id| is_safe_record_id(id))
                    .ok_or_else(|| D::Error::custom("Manufacture requires its known method."))?;
                Ok(Self::Craft { envelope, recipe_id })
            }
            "cook"
                if !extras_for_say && input.target_id.is_none() && input.text.is_none()
                    && input.target_role.is_none() && input.self_introduction.is_none()
                    && input.volume.is_none() =>
            {
                let missing = || D::Error::custom("Cooking requires an exact recipe, heat source and ingredients.");
                let definition = crate::values::DefinitionPin {
                    id: input.preparation_id.ok_or_else(missing)?,
                    version: input.preparation_version.ok_or_else(missing)?,
                    digest: input.preparation_digest.ok_or_else(missing)?,
                };
                let heat_id = input.heat_id.filter(|id| is_safe_record_id(id)).ok_or_else(missing)?;
                let inputs = input.inputs.filter(crate::food_preparation::valid_inputs).ok_or_else(missing)?;
                if !definition.is_valid() {
                    return Err(missing());
                }
                Ok(Self::Cook { envelope, heat_id, definition, inputs })
            }
            "say" if !extras_for_say => Ok(Self::Say {
                envelope,
                text: input
                    .text
                    .ok_or_else(|| D::Error::custom("Speech requires its selected text."))?,
                target_id: input.target_id,
                target_role: input.target_role,
                self_introduction: input.self_introduction,
                volume: input.volume,
            }),
            "status-effect" if !extras_for_status => Ok(Self::StatusEffect {
                envelope,
                target_id: input.target_id.ok_or_else(|| {
                    D::Error::custom("Status transition requires its selected target.")
                })?,
                definition_id: input.definition_id.ok_or_else(|| {
                    D::Error::custom("Status transition requires its selected definition.")
                })?,
                operation: input.operation.ok_or_else(|| {
                    D::Error::custom("Status transition requires its selected operation.")
                })?,
                facing_heading: input.facing_heading,
                resting_place_id: input.resting_place_id,
                resting_bay: input.resting_bay,
            }),
            "cancel" if !extras_for_cancel => Ok(Self::Cancel {
                envelope,
                expected_action_id: input.expected_action_id,
            }),
            "strike"
                if !discovery_extras
                    && input.attempt_id.is_none()
                    && input.distance.is_none()
                    && input.after.is_none()
                    && input.method_after.is_none() =>
            {
                Ok(Self::Strike {
                    envelope,
                    target_id: input.target_id.ok_or_else(|| {
                        D::Error::custom("A strike requires its selected target.")
                    })?,
                    definition_id: input.definition_id.ok_or_else(|| {
                        D::Error::custom("A strike requires its selected definition.")
                    })?,
                    weapon_item_id: input.weapon_item_id,
                    auto_equip: input.auto_equip,
                })
            }
            "pickup" if input.destination.is_none()
                && input.expected_action_id.is_none()
                && input.definition_id.is_none()
                && input.distance.is_none()
                && input.text.is_none()
                && input.target_role.is_none()
                && input.self_introduction.is_none()
                && input.volume.is_none() =>
            {
                let invalid = || D::Error::custom("Pickup requires a pile and an exact item for a chosen quantity.");
                if input.item_id.as_deref().is_some_and(|id| !is_safe_record_id(id))
                    || input.quantity.is_some_and(|quantity| quantity == 0 || input.item_id.is_none())
                {
                    return Err(invalid());
                }
                Ok(Self::Pickup {
                    envelope,
                    target_id: input.target_id.filter(|id| is_safe_record_id(id)).ok_or_else(invalid)?,
                    item_id: input.item_id,
                    quantity: input.quantity,
                })
            }
            "drop" if !extras_for_move && input.destination.is_none() => {
                let invalid = || D::Error::custom("Drop requires an exact item and quantity.");
                Ok(Self::Drop {
                    envelope,
                    item_id: input.item_id.filter(|id| is_safe_record_id(id)).ok_or_else(invalid)?,
                    quantity: input.quantity.ok_or_else(invalid)?,
                })
            }
            "eat" if !extras_for_move && input.destination.is_none() => Ok(Self::Eat {
                envelope,
                item_id: input.item_id.filter(|id| is_safe_record_id(id))
                    .ok_or_else(|| D::Error::custom("Eating requires the selected carried item."))?,
            }),
            "equip" | "unequip" if !extras_for_move && input.destination.is_none() => {
                let invalid = || D::Error::custom("Invalid selected equipment binding.");
                let request = if input.kind == "equip" {
                    crate::execution::EquipmentRequest::Equip
                } else {
                    crate::execution::EquipmentRequest::Unequip {
                        item_revision: input.expected_revision.filter(|value| *value <= crate::identity::MAX_SAFE_INTEGER).ok_or_else(invalid)?,
                        placement_revision: input.placement_revision.filter(|value| *value <= crate::identity::MAX_SAFE_INTEGER).ok_or_else(invalid)?,
                    }
                };
                Ok(Self::Equipment {
                    envelope,
                    item_id: input.item_id.filter(|id| crate::values::is_safe_record_id(id)).ok_or_else(invalid)?,
                    request,
                })
            }
            "inspect-activities"
                if !discovery_extras
                    && input.attempt_id.is_none()
                    && input.target_id.is_none()
                    && input.definition_id.is_none()
                    && input.distance.is_none()
                    && input.weapon_item_id.is_none()
                    && input.auto_equip.is_none() =>
            {
                Ok(Self::InspectActivities {
                    envelope,
                    history_after: input.after.ok_or_else(|| {
                        D::Error::custom("Activity inspection requires its selected cursor.")
                    })?,
                    method_after: input.method_after.ok_or_else(|| {
                        D::Error::custom("Activity inspection requires its selected method cursor.")
                    })?,
                })
            }
            _ => Err(D::Error::custom(
                "This native command family or parameter is not installed.",
            )),
        }
    }
}
impl NativeCommand {
    /// Pausing changes the id at its actual existing property position.
    pub(crate) fn restart_id(&mut self, id: String) -> Result<(), serde_json::Error> {
        let encoding = self.envelope().encoding.edit(Some(&id), &[])?;
        let envelope = self.envelope_mut();
        envelope.encoding = encoding;
        envelope.id = id;
        Ok(())
    }
    fn envelope_mut(&mut self) -> &mut CommandEnvelope {
        match self {
            Self::Outing { envelope, .. }
            | Self::Handover { envelope, .. }
            | Self::Move { envelope, .. }
            | Self::Feed { envelope, .. }
            | Self::Gather { envelope, .. }
            | Self::Fish { envelope, .. }
            | Self::Pickup { envelope, .. }
            | Self::Drop { envelope, .. }
            | Self::TendFire { envelope, .. }
            | Self::PlaceHearth { envelope, .. }
            | Self::Cook { envelope, .. }
            | Self::Craft { envelope, .. }
            | Self::Eat { envelope, .. }
            | Self::Equipment { envelope, .. }
            | Self::Say { envelope, .. }
            | Self::StatusEffect { envelope, .. }
            | Self::Cancel { envelope, .. }
            | Self::WithdrawAttempt { envelope, .. }
            | Self::Follow { envelope, .. }
            | Self::Strike { envelope, .. }
            | Self::InspectInventory { envelope, .. }
            | Self::InspectActivities { envelope, .. } => envelope,
        }
    }
    pub(crate) fn source_encoding(&self) -> &str {
        self.envelope().encoding.json.get()
    }
    pub(crate) fn source_edit_heap_bound(&self, extra: usize) -> Option<usize> {
        self.envelope().encoding.edit_heap_bound(extra)
    }
    pub(crate) fn envelope(&self) -> &CommandEnvelope {
        match self {
            Self::Outing { envelope, .. }
            | Self::Handover { envelope, .. }
            | Self::Move { envelope, .. }
            | Self::Feed { envelope, .. }
            | Self::Gather { envelope, .. }
            | Self::Fish { envelope, .. }
            | Self::Pickup { envelope, .. }
            | Self::Drop { envelope, .. }
            | Self::TendFire { envelope, .. }
            | Self::PlaceHearth { envelope, .. }
            | Self::Cook { envelope, .. }
            | Self::Craft { envelope, .. }
            | Self::Eat { envelope, .. }
            | Self::Equipment { envelope, .. }
            | Self::Say { envelope, .. }
            | Self::StatusEffect { envelope, .. }
            | Self::Cancel { envelope, .. }
            | Self::WithdrawAttempt { envelope, .. }
            | Self::Follow { envelope, .. }
            | Self::Strike { envelope, .. }
            | Self::InspectInventory { envelope, .. }
            | Self::InspectActivities { envelope, .. } => envelope,
        }
    }
    pub(crate) fn kind(&self) -> &'static str {
        match self {
            Self::Outing { .. } => crate::worlds::base_outings::travel_command_type(),
            Self::Move { .. } => "move",
            Self::Handover { .. } => "handover",
            Self::Feed { .. } => "feed",
            Self::Gather { .. } => "gather",
            Self::Fish { .. } => "fish",
            Self::Pickup { .. } => "pickup",
            Self::Drop { .. } => "drop",
            Self::TendFire { .. } => "tend-fire",
            Self::PlaceHearth { .. } => "place-hearth",
            Self::Cook { .. } => "cook",
            Self::Craft { .. } => "craft",
            Self::Eat { .. } => "eat",
            Self::Equipment { request, .. } => match request {
                crate::execution::EquipmentRequest::Equip => "equip",
                crate::execution::EquipmentRequest::Unequip { .. } => "unequip",
            },
            Self::Say { .. } => "say",
            Self::StatusEffect { .. } => "status-effect",
            Self::Cancel { .. } => "cancel",
            Self::WithdrawAttempt { .. } => "withdraw-attempt",
            Self::Follow { .. } => "follow",
            Self::Strike { .. } => "strike",
            Self::InspectInventory { .. } => "inspect-inventory",
            Self::InspectActivities { .. } => "inspect-activities",
        }
    }
    pub(crate) fn discovery_only(&self) -> bool {
        matches!(
            self,
            Self::Strike { .. }
                | Self::InspectInventory { selected: None, .. }
        )
    }
    pub(crate) fn recorded(&self) -> Result<Self, serde_json::Error> {
        let mut value = self.clone();
        if self.envelope().human_initiated.is_some()
            || self.envelope().combat_help_id.is_some()
            || self.envelope().cooperation.is_some()
        {
            let encoding = self
                .envelope()
                .encoding
                .edit(None, &["humanInitiated", "combatHelpId", "cooperation"])?;
            let envelope = value.envelope_mut();
            envelope.encoding = encoding;
            envelope.human_initiated = None;
            envelope.combat_help_id = None;
            envelope.cooperation = None;
        }
        Ok(value)
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActivityOutput {
    pub port: String,
    pub item_id: String,
    pub definition_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Outcome {
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub spent: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub outputs: Option<Vec<ActivityOutput>>,
    pub ok: bool,
    pub code: String,
    pub message: crate::text::JsText,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recipe_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub item_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub entity_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub goal_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub plan_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub action_id: Option<String>,
}

impl PartialEq for CommandEnvelope {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
            && self.actor_id == other.actor_id
            && self.cooperation == other.cooperation
            && self.combat_help_id == other.combat_help_id
            && self.human_initiated == other.human_initiated
            && self.purpose == other.purpose
            && self.chosen_purpose == other.chosen_purpose
    }
}
impl Serialize for NativeCommand {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.envelope().encoding.json.serialize(serializer)
    }
}
impl crate::host::retained_size::HeapBytes for CommandEnvelope {
    fn heap_bytes(&self) -> Option<usize> {
        use crate::host::retained_size::{HeapBytes, heap_sum};
        heap_sum([
            self.id.heap_bytes()?,
            self.actor_id.heap_bytes()?,
            self.cooperation.heap_bytes()?,
            self.combat_help_id.heap_bytes()?,
            self.human_initiated.heap_bytes()?,
            self.purpose.heap_bytes()?,
            self.chosen_purpose.heap_bytes()?,
            self.encoding.heap_bytes(),
        ])
    }
}
