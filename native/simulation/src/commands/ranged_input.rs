//! Exact stored shot choices and their ordinary signed command binding.
//! The host review is held by the authorized cursor, never part of caller
//! bytes or an activity's recorded command.
use super::{CommandEncoding, CommandHeaders, NativeCommand};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::projectile::{RangedTarget, RuntimeRangedMode};
use crate::values::{deserialize_present_option, is_safe_record_id};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum RangedIntent {
    Start {
        mode: RuntimeRangedMode,
        target: RangedTarget,
        weapon: Option<String>,
        ammunition: Option<String>,
        auto_equip: bool,
    },
    Release {
        action: String,
        target: Option<RangedTarget>,
    },
}

impl RangedIntent {
    pub(crate) fn kind(&self) -> &'static str {
        match self {
            Self::Start { mode, .. } => mode.kind(),
            Self::Release { .. } => "release-shot",
        }
    }
}

impl HeapBytes for RangedIntent {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Start {
                target,
                weapon,
                ammunition,
                ..
            } => heap_sum([
                target.heap_bytes()?,
                weapon.heap_bytes()?,
                ammunition.heap_bytes()?,
            ]),
            Self::Release { action, target } => {
                action.heap_bytes()?.checked_add(target.heap_bytes()?)
            }
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Stored {
    #[serde(rename = "type")]
    kind: String,
    #[serde(flatten)]
    headers: CommandHeaders,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    ranged_target: Option<RangedTarget>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    aim_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    weapon_item_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    ammo_item_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    auto_equip: Option<bool>,
}

impl Stored {
    fn intent(self) -> Result<(CommandHeaders, RangedIntent), serde_json::Error> {
        let invalid = || serde::de::Error::custom("Invalid selected shot binding.");
        let Self {
            kind,
            headers,
            ranged_target,
            aim_id,
            weapon_item_id,
            ammo_item_id,
            auto_equip,
        } = self;
        if !headers.valid()
            || ranged_target.as_ref().is_some_and(|target| !target.valid())
            || [
                aim_id.as_deref(),
                weapon_item_id.as_deref(),
                ammo_item_id.as_deref(),
            ]
            .into_iter()
            .flatten()
            .any(|id| !is_safe_record_id(id))
        {
            return Err(invalid());
        }
        let intent = match kind.as_str() {
            "release-shot"
                if weapon_item_id.is_none() && ammo_item_id.is_none() && auto_equip.is_none() =>
            {
                RangedIntent::Release {
                    action: aim_id.ok_or_else(invalid)?,
                    target: ranged_target,
                }
            }
            "aim" | "shoot-once" | "hunt" if aim_id.is_none() => RangedIntent::Start {
                mode: match kind.as_str() {
                    "aim" => RuntimeRangedMode::Aim,
                    "shoot-once" => RuntimeRangedMode::ShootOnce,
                    "hunt" => RuntimeRangedMode::Hunt,
                    _ => return Err(invalid()),
                },
                target: ranged_target.ok_or_else(invalid)?,
                weapon: weapon_item_id,
                ammunition: ammo_item_id,
                auto_equip: auto_equip.unwrap_or(false),
            },
            _ => return Err(invalid()),
        };
        Ok((headers, intent))
    }
}

pub(super) fn decode(raw: &str) -> Result<NativeCommand, serde_json::Error> {
    let input: Stored = serde_json::from_str(raw)?;
    let (headers, intent) = input.intent()?;
    Ok(NativeCommand::Ranged {
        envelope: headers.envelope(CommandEncoding::decode(raw)?),
        intent,
    })
}

pub(super) fn bind(
    headers: CommandHeaders,
    intent: RangedIntent,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Input<'a> {
        actor_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        aim_id: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        ammo_item_id: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        auto_equip: Option<bool>,
        human_initiated: bool,
        id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        ranged_target: Option<&'a RangedTarget>,
        #[serde(rename = "type")]
        kind: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        weapon_item_id: Option<&'a str>,
    }
    let mut input = Input {
        actor_id: &headers.actor_id,
        aim_id: None,
        ammo_item_id: None,
        auto_equip: None,
        human_initiated: true,
        id: &headers.id,
        ranged_target: None,
        kind: intent.kind(),
        weapon_item_id: None,
    };
    match &intent {
        RangedIntent::Start {
            target,
            weapon,
            ammunition,
            auto_equip,
            ..
        } => {
            input.ranged_target = Some(target);
            input.weapon_item_id = weapon.as_deref();
            input.ammo_item_id = ammunition.as_deref();
            input.auto_equip = auto_equip.then_some(true);
        }
        RangedIntent::Release { action, target } => {
            input.aim_id = Some(action);
            input.ranged_target = target.as_ref();
        }
    }
    if !headers.valid()
        || input.ranged_target.is_some_and(|target| !target.valid())
        || [input.aim_id, input.weapon_item_id, input.ammo_item_id]
            .into_iter()
            .flatten()
            .any(|id| !is_safe_record_id(id))
    {
        return Err(serde::de::Error::custom("Invalid selected shot binding."));
    }
    let fields = 4
        + usize::from(input.aim_id.is_some())
        + usize::from(input.ammo_item_id.is_some())
        + usize::from(input.auto_equip.is_some())
        + usize::from(input.ranged_target.is_some())
        + usize::from(input.weapon_item_id.is_some());
    let encoding = CommandEncoding::from_ordered(&input, fields)?;
    let canonical = crate::encoding::json_record(&input)?;
    Ok((
        NativeCommand::Ranged {
            envelope: headers.envelope(encoding),
            intent,
        },
        canonical,
    ))
}

pub(crate) fn review_digest(
    action: &crate::state::Action,
    aim: &crate::projectile::RangedAim,
    target: &crate::projectile::AimedLife,
    injury: crate::contact::ContactInjury,
    maximum: f64,
    budget: &crate::host::ByteBudget,
) -> Result<(String, crate::host::ByteReservation), crate::execution::ExecutionError> {
    use crate::execution::ExecutionError;
    let bindings = (
        action.weapon_item_id.as_deref(),
        action.ammo_item_id.as_deref(),
        &aim.tool,
        &aim.ammunition,
        target,
        injury.outgoing,
        injury.susceptibility,
        injury.incoming,
        maximum,
    );
    let bytes =
        crate::encoding::json_record_len(&bindings).map_err(|_| ExecutionError::Invariant)?;
    let reservation = budget.reserve(bytes.checked_add(128).ok_or(ExecutionError::Capacity)?)?;
    let canonical =
        crate::encoding::json_record(&bindings).map_err(|_| ExecutionError::Invariant)?;
    Ok((
        crate::encoding::sha256_hex(canonical.as_bytes()),
        reservation,
    ))
}
