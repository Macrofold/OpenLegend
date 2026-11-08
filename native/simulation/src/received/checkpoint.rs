//! Sparse recording continuation belongs to the original observer timeline.
//! It retains last admitted values and secured terminal bytes, not a second
//! received proof graph or a promise to record content that was refused.

use serde::{Deserialize, Deserializer, Serialize};

use crate::reception::{CurrentReceivedPart, EvidenceFamily, EvidenceSource, ObserverLife};
use crate::values::{deserialize_safe_integer, is_safe_record_id};

use super::{ReceivedError, ReceivedValueReference};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CurrentMemberPart {
    pub kind: String,
    pub part: CurrentReceivedPart,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TemporalCurrentContent {
    pub kind: String,
    pub part: CurrentReceivedPart,
    pub value: ReceivedValueReference,
}

fn deserialize_refused_at<'de, D: Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<[u64; 2]>, D::Error> {
    #[derive(Deserialize)]
    struct Ordinal(#[serde(deserialize_with = "deserialize_safe_integer")] u64);
    let [bytes, count] = <[Ordinal; 2]>::deserialize(deserializer)?;
    Ok(Some([bytes.0, count.0]))
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemporalCurrentGroupCheckpoint {
    pub epoch: String,
    pub members: Vec<CurrentMemberPart>,
    pub content: Vec<TemporalCurrentContent>,
    pub last_source: EvidenceSource,
    pub last_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub last_measurement_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub terminal_bytes: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_refused_at",
        skip_serializing_if = "Option::is_none"
    )]
    pub refused_at: Option<[u64; 2]>,
    pub gap: bool,
}

impl TemporalCurrentGroupCheckpoint {
    /// `epoch` and `observer` must come from the installed temporal owner, not
    /// this checkpoint. Current membership is the receiving owner's exact set.
    pub fn validate(
        &self,
        through: f64,
        parts: &[CurrentMemberPart],
        observer: &ObserverLife,
        epoch: &str,
    ) -> Result<(), ReceivedError> {
        if self.epoch.is_empty()
            || self.epoch != epoch
            || !is_safe_record_id(&observer.actor_id)
            || self.last_source.observer != *observer
            || !matches!(
                self.last_source.family,
                EvidenceFamily::NativeExposure | EvidenceFamily::NativeResponse
            )
            || self.last_source.validate().is_err()
            || !self.last_at.is_finite()
            || self.last_at < 0.0
            || self.last_at > through
            || self.terminal_bytes == 0
            || self.members.is_empty()
            || (self.refused_at.is_some() && !self.gap)
            || self.members.iter().enumerate().any(|(index, member)| {
                !parts.contains(member) || self.members[..index].contains(member)
            })
            || self.content.iter().any(|value| {
                !self
                    .members
                    .iter()
                    .any(|member| member.kind == value.kind && member.part == value.part)
            })
        {
            return Err(ReceivedError("Invalid sparse recording continuation."));
        }
        Ok(())
    }
}
