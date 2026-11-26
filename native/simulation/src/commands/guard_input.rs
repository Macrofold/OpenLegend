//! Exact shield and facing for current-format commands and activity records.
use super::{CommandEncoding, CommandHeaders, NativeCommand, RuntimeGuardFacing};
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::{InstalledWorld, SimulationState};
use crate::values::{
    deserialize_present_option, deserialize_present_safe_integer, is_safe_record_id,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) enum GuardFacing<Id = String> {
    Subject { id: Id, life: u64 },
    Direction(f64),
    Recent(RecentGuard<Id>),
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RecentGuard<Id = String> {
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub(crate) life: u64,
    pub(crate) observed_at: f64,
    pub(crate) source: Id,
}

impl<Id: AsRef<str>> RecentGuard<Id> {
    pub(crate) fn valid(&self, world: &InstalledWorld) -> bool {
        self.expires(world).is_some()
    }

    pub(crate) fn current(&self, state: &SimulationState, actor: &str, life: Option<u64>) -> bool {
        let now = state.physical.header.sim_time;
        life == Some(self.life)
            && now >= self.observed_at
            && self.expires(&state.installed).is_some_and(|until| now < until)
            // A later plan step outlives the response ticket's source check.
            && state
                .experience
                .actor(actor)
                .is_none_or(|owner| !owner.privacy.revoked(self.source.as_ref()))
    }

    fn expires(&self, world: &InstalledWorld) -> Option<f64> {
        let policy = world
            .body_policy
            .as_ref()?
            .value()
            .combat
            .as_ref()?
            .encounters
            .as_ref()?;
        let until = self.observed_at + policy.recent_seconds;
        (policy.visible_preparation && until.is_finite()).then_some(until)
    }
}

impl<'a> From<RuntimeGuardFacing<'a>> for GuardFacing<&'a str> {
    fn from(facing: RuntimeGuardFacing<'a>) -> Self {
        match facing {
            RuntimeGuardFacing::Subject { id, life } => Self::Subject { id, life },
            RuntimeGuardFacing::Direction(heading) => Self::Direction(heading),
        }
    }
}

impl crate::host::retained_size::HeapBytes for GuardFacing {
    fn heap_bytes(&self) -> Option<usize> {
        Some(match self {
            Self::Subject { id, .. } => id.capacity(),
            Self::Direction(_) => 0,
            Self::Recent(threat) => threat.source.capacity(),
        })
    }
}

impl GuardFacing {
    pub(crate) fn subject_id(&self) -> Option<&str> {
        match self {
            Self::Subject { id, .. } => Some(id),
            Self::Direction(_) | Self::Recent(_) => None,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Stored {
    #[serde(rename = "type")]
    _kind: String,
    #[serde(flatten)]
    headers: CommandHeaders,
    item_id: String,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    target_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_safe_integer")]
    target_life: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    facing: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    recent_threat: Option<RecentGuard>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    auto_equip: Option<bool>,
}

pub(super) fn decode(raw: &str) -> Result<NativeCommand, serde_json::Error> {
    let input: Stored = serde_json::from_str(raw)?;
    let invalid = || serde::de::Error::custom("Invalid selected guard binding.");
    if !input.headers.valid() || !is_safe_record_id(&input.item_id) {
        return Err(invalid());
    }
    let facing = match (
        input.target_id,
        input.target_life,
        input.facing,
        input.recent_threat,
    ) {
        (Some(id), Some(life), None, None) if is_safe_record_id(&id) => {
            GuardFacing::Subject { id, life }
        }
        (None, None, Some(direction), None) if direction.is_finite() => {
            GuardFacing::Direction(direction)
        }
        (None, None, None, Some(recent))
            if input.headers.human_initiated.is_none()
                && input.auto_equip == Some(true)
                && recent.observed_at.is_finite()
                && is_safe_record_id(&recent.source) =>
        {
            GuardFacing::Recent(recent)
        }
        _ => return Err(invalid()),
    };
    Ok(NativeCommand::Guard {
        envelope: input.headers.envelope(CommandEncoding::decode(raw)?),
        item_id: input.item_id,
        facing,
        auto_equip: input.auto_equip.unwrap_or(false),
    })
}

pub(super) fn bind(
    headers: CommandHeaders,
    item_id: &str,
    facing: RuntimeGuardFacing<'_>,
    auto_equip: bool,
) -> Result<(NativeCommand, String), serde_json::Error> {
    let command = bind_exact(headers, item_id, facing.into(), auto_equip)?;
    let canonical = command.source_encoding().to_owned();
    Ok((command, canonical))
}

/// Fund one typed resident choice. Only the canonical activity/receipt
/// representation is encoded; the held command is never decoded to apply it.
pub(crate) fn bind_npc(
    id: &str,
    actor_id: &str,
    item_id: &str,
    facing: GuardFacing<&str>,
    budget: &ByteBudget,
) -> Result<(NativeCommand, ByteReservation), ExecutionError> {
    let target_bytes = match facing {
        GuardFacing::Subject { id, .. } => id.len(),
        GuardFacing::Recent(threat) => threat.source.len(),
        _ => 0,
    };
    let mut storage = budget.reserve(
        heap_sum([id.len(), actor_id.len(), item_id.len(), target_bytes])
            .and_then(|bytes| bytes.checked_mul(32)?.checked_add(1024))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let command = bind_exact(
        CommandHeaders {
            id: id.to_owned(),
            actor_id: actor_id.to_owned(),
            cooperation: None,
            combat_help_id: None,
            human_initiated: None,
            purpose: None,
            chosen_purpose: None,
        },
        item_id,
        facing,
        true,
    )
    .map_err(|_| ExecutionError::Invariant)?;
    storage.resize(command.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok((command, storage))
}

fn bind_exact(
    headers: CommandHeaders,
    item_id: &str,
    facing: GuardFacing<&str>,
    auto_equip: bool,
) -> Result<NativeCommand, serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Binding<'a> {
        actor_id: &'a str,
        #[serde(skip_serializing_if = "std::ops::Not::not")]
        auto_equip: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        facing: Option<f64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        human_initiated: Option<bool>,
        id: &'a str,
        item_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        recent_threat: Option<RecentGuard<&'a str>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        target_id: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        target_life: Option<u64>,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let invalid = || serde::ser::Error::custom("Invalid selected guard binding.");
    if !headers.valid() || !is_safe_record_id(item_id) {
        return Err(invalid());
    }
    let mut input = Binding {
        actor_id: &headers.actor_id,
        auto_equip,
        facing: None,
        human_initiated: headers.human_initiated,
        id: &headers.id,
        item_id,
        recent_threat: None,
        target_id: None,
        target_life: None,
        kind: "guard",
    };
    let bound = match facing {
        GuardFacing::Subject { id, life }
            if is_safe_record_id(id) && life <= crate::identity::MAX_SAFE_INTEGER =>
        {
            input.target_id = Some(id);
            input.target_life = Some(life);
            GuardFacing::Subject {
                id: id.into(),
                life,
            }
        }
        GuardFacing::Direction(heading) if heading.is_finite() => {
            input.facing = Some(heading);
            GuardFacing::Direction(heading)
        }
        GuardFacing::Recent(recent)
            if headers.human_initiated.is_none()
                && auto_equip
                && recent.observed_at.is_finite()
                && is_safe_record_id(recent.source) =>
        {
            input.recent_threat = Some(recent);
            GuardFacing::Recent(RecentGuard {
                life: recent.life,
                observed_at: recent.observed_at,
                source: recent.source.to_owned(),
            })
        }
        _ => return Err(invalid()),
    };
    let encoding = CommandEncoding::from_ordered(
        &input,
        4 + usize::from(headers.human_initiated.is_some())
            + usize::from(auto_equip)
            + if input.target_id.is_some() { 2 } else { 1 },
    )?;
    Ok(NativeCommand::Guard {
        envelope: headers.envelope(encoding),
        item_id: item_id.into(),
        facing: bound,
        auto_equip,
    })
}
