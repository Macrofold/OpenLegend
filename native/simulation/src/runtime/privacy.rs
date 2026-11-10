//! The creator's recall edit uses the complete semantic cursor. Its history
//! reads yield through the ordinary provider boundary; no raw setter is public.
use super::*;
use serde::ser::{SerializeMap, SerializeSeq};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ForgetInput {
    actor_id: String,
    source_id: String,
}
impl NativeWorldSession {
    /// Application authority and retained-source admission remain with the
    /// existing creator service. Native owns the actual protected-obligation
    /// check, scoped erasure, transition, rollback and accepted save products.
    pub fn begin_forget(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: ForgetInput = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_forget(&input.actor_id, &input.source_id, self.history_edit_limits)
            .map_err(failure)
    }
}
struct Invalidated<'a>(&'a crate::experience::CompletedForgetExperience);
struct Ids<'a>(&'a crate::experience::CompletedForgetExperience);
impl Serialize for Invalidated<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(1))?;
        map.serialize_entry(self.0.actor_id(), &Ids(self.0))?;
        map.end()
    }
}
impl Serialize for Ids<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut list = serializer.serialize_seq(None)?;
        for id in self.0.invalidated_ids() {
            list.serialize_element(id)?;
        }
        list.end()
    }
}
/// Actor-scoped constraints are a complete replacement for this actor only.
/// The existing privacy-ledger owner must retain every other actor's accepted
/// constraints when composing its SQL commit input.
pub(super) fn serialize<M: SerializeMap>(
    operation: &CompletedOperation,
    map: &mut M,
) -> Result<(), M::Error> {
    if let CompletedOperation::Forget(done) = operation {
        if let Some(change) = done.privacy_change() {
            map.serialize_entry("invalidatedMemoryIds", &Invalidated(done))?;
            map.serialize_entry("privacyChange", &change)?;
        }
    }
    if let CompletedOperation::Consolidation(done) = operation {
        if done.outcome.ok {
            struct Retired<'a>(&'a str, &'a [String]);
            impl Serialize for Retired<'_> {
                fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
                    let mut m = s.serialize_map(Some(1))?;
                    m.serialize_entry(self.0, self.1)?;
                    m.end()
                }
            }
            map.serialize_entry("invalidatedMemoryIds", &Retired(&done.actor, &done.retired))?;
        }
    }
    Ok(())
}
