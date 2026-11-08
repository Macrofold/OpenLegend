//! Closed native inputs for the selected compiled command families. The public
//! protocol and binder retain their existing owner; unsupported input does not
//! acquire a generic JSON execution path or silently lose optional parameters.

use crate::encoding::js_trim;
use crate::state::SurfacePoint;
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_present_safe_integer,
    deserialize_safe_integer, is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Deserializer, Serialize};

mod state;
pub(crate) use state::*;
mod run;
pub(crate) use run::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CooperationBinding {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PurposeBinding {
    pub definition: DefinitionPin,
    pub id: String,
    pub description: String,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub roles: IndexMap<String, String>,
    pub source_ids: Vec<String>,
}
impl PurposeBinding {
    fn valid(&self) -> bool {
        self.definition.is_valid()
            && is_safe_record_id(&self.id)
            && !js_trim(&self.description).is_empty()
            && self.description.encode_utf16().count() <= 500
            && self.roles.len() <= 8
            && self
                .roles
                .iter()
                .all(|(role, id)| is_safe_record_id(role) && is_safe_record_id(id))
            && self.source_ids.len() <= 48
            && self.source_ids.iter().all(|id| is_safe_record_id(id))
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CommandEnvelope {
    pub id: String,
    pub actor_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cooperation: Option<CooperationBinding>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub combat_help_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub human_initiated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purpose: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chosen_purpose: Option<PurposeBinding>,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum StatusOperation {
    Activate,
    Deactivate,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum SpeechTargetRole {
    Body,
    Remembered,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(
    tag = "type",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub(crate) enum NativeCommand {
    Move {
        #[serde(flatten)]
        envelope: CommandEnvelope,
        destination: SurfacePoint,
    },
    Say {
        #[serde(flatten)]
        envelope: CommandEnvelope,
        text: crate::text::JsText,
        #[serde(skip_serializing_if = "Option::is_none")]
        target_id: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        target_role: Option<SpeechTargetRole>,
        #[serde(skip_serializing_if = "Option::is_none")]
        self_introduction: Option<crate::text::JsText>,
        #[serde(skip_serializing_if = "Option::is_none")]
        volume: Option<String>,
    },
    StatusEffect {
        #[serde(flatten)]
        envelope: CommandEnvelope,
        target_id: String,
        definition_id: String,
        operation: StatusOperation,
        #[serde(skip_serializing_if = "Option::is_none")]
        facing_heading: Option<f64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        resting_place_id: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        resting_bay: Option<u64>,
    },
    Cancel {
        #[serde(flatten)]
        envelope: CommandEnvelope,
        #[serde(skip_serializing_if = "Option::is_none")]
        expected_action_id: Option<String>,
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
optional!(cooperation:CooperationBinding,combat_help_id:String,human_initiated:bool,purpose:String,chosen_purpose:PurposeBinding,destination:SurfacePoint,text:crate::text::JsText,target_id:String,target_role:SpeechTargetRole,self_introduction:crate::text::JsText,volume:String,definition_id:String,operation:StatusOperation,facing_heading:f64,resting_place_id:String,expected_action_id:String);

impl<'de> Deserialize<'de> for NativeCommand {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let input = CommandInput::deserialize(deserializer)?;
        use serde::de::Error;
        if !is_safe_record_id(&input.id)
            || !is_safe_record_id(&input.actor_id)
            || input.human_initiated.is_some_and(|value| !value)
            || input
                .combat_help_id
                .as_ref()
                .is_some_and(|id| !is_safe_record_id(id))
            || input
                .cooperation
                .as_ref()
                .is_some_and(|binding| !is_safe_record_id(&binding.id))
            || input.purpose.as_ref().is_some_and(|value| {
                js_trim(value).is_empty() || value.encode_utf16().count() > 120
            })
            || input
                .chosen_purpose
                .as_ref()
                .is_some_and(|value| !value.valid())
        {
            return Err(D::Error::custom("Invalid selected native command binding."));
        }
        let extras_for_move = input.text.is_some()
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
        let extras_for_say = input.destination.is_some()
            || input.definition_id.is_some()
            || input.operation.is_some()
            || input.facing_heading.is_some()
            || input.resting_place_id.is_some()
            || input.resting_bay.is_some()
            || input.expected_action_id.is_some();
        let extras_for_status = input.destination.is_some()
            || input.text.is_some()
            || input.target_role.is_some()
            || input.self_introduction.is_some()
            || input.volume.is_some()
            || input.expected_action_id.is_some();
        let extras_for_cancel = input.destination.is_some()
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
        let envelope = CommandEnvelope {
            id: input.id,
            actor_id: input.actor_id,
            cooperation: input.cooperation,
            combat_help_id: input.combat_help_id,
            human_initiated: input.human_initiated,
            purpose: input.purpose,
            chosen_purpose: input.chosen_purpose,
        };
        match input.kind.as_str() {
            "move" if !extras_for_move => Ok(Self::Move {
                envelope,
                destination: input.destination.ok_or_else(|| {
                    D::Error::custom("Movement requires its selected destination.")
                })?,
            }),
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
            _ => Err(D::Error::custom(
                "This native command family or parameter is not installed.",
            )),
        }
    }
}
impl NativeCommand {
    pub(crate) fn envelope(&self) -> &CommandEnvelope {
        match self {
            Self::Move { envelope, .. }
            | Self::Say { envelope, .. }
            | Self::StatusEffect { envelope, .. }
            | Self::Cancel { envelope, .. } => envelope,
        }
    }
    pub(crate) fn kind(&self) -> &'static str {
        match self {
            Self::Move { .. } => "move",
            Self::Say { .. } => "say",
            Self::StatusEffect { .. } => "status-effect",
            Self::Cancel { .. } => "cancel",
        }
    }
    pub(crate) fn recorded(&self) -> Self {
        let mut value = self.clone();
        let envelope = match &mut value {
            Self::Move { envelope, .. }
            | Self::Say { envelope, .. }
            | Self::StatusEffect { envelope, .. }
            | Self::Cancel { envelope, .. } => envelope,
        };
        envelope.human_initiated = None;
        envelope.combat_help_id = None;
        envelope.cooperation = None;
        value
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
