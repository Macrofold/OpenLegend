//! The current `mind_attention` row codec. Dirty scheduling is derived once on
//! restore; saved scan cursors, latches, generations and deadlines are retained.
//! Source: apps/server/src/attention-storage.ts and rebuildAttentionScheduling.

use super::*;
use serde::ser::SerializeStruct;

/// The durable representation intentionally has no relationDirty field. It is
/// distinct from the runtime continuation, not a reader for an older format.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StoredAttention {
    policy: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    next_order: u64,
    annotations: IndexMap<String, AttentionAnnotation>,
    entries: Vec<AttentionEntry>,
    explicit: Vec<String>,
    latches: IndexMap<String, AttentionRelationLatch>,
    next_relation_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    relation_cursor: u64,
    #[serde(deserialize_with = "super::discovery_cursor")]
    discovery_cursor: i64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    relation_revision: u64,
    relation_scans: IndexMap<String, AttentionRelationScan>,
}

pub struct AttentionStorage<'a>(&'a AttentionState, bool);

#[derive(Serialize)]
#[serde(transparent)]
struct JsMap<'a, T: Serialize>(
    #[serde(serialize_with = "crate::encoding::serialize_js_map")] &'a IndexMap<String, T>,
);

impl Serialize for AttentionStorage<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let state = self.0;
        let mut record = serializer.serialize_struct("StoredAttention", 11)?;
        record.serialize_field("policy", &state.policy)?;
        record.serialize_field("nextOrder", &state.next_order)?;
        if self.1 {
            record.serialize_field(
                "annotations",
                &std::collections::BTreeMap::<&str, ()>::new(),
            )?;
        } else {
            record.serialize_field("annotations", &JsMap(&state.annotations))?;
        }
        record.serialize_field("entries", &state.entries)?;
        record.serialize_field("explicit", &state.explicit)?;
        if self.1 {
            record.serialize_field("latches", &std::collections::BTreeMap::<&str, ()>::new())?;
        } else {
            record.serialize_field("latches", &JsMap(&state.latches))?;
        }
        record.serialize_field("nextRelationAt", &state.next_relation_at)?;
        record.serialize_field("relationCursor", &state.relation_cursor)?;
        record.serialize_field("discoveryCursor", &state.discovery_cursor)?;
        record.serialize_field("relationRevision", &state.relation_revision)?;
        if self.1 {
            record.serialize_field(
                "relationScans",
                &std::collections::BTreeMap::<&str, ()>::new(),
            )?;
        } else {
            record.serialize_field("relationScans", &JsMap(&state.relation_scans))?;
        }
        record.end()
    }
}

pub fn encode_attention_storage(state: &AttentionState) -> AttentionStorage<'_> {
    AttentionStorage(state, false)
}

/// Canonical SQL parent projection. Scheduling is omitted by the same codec;
/// child records remain with the complete map owner.
pub(crate) fn encode_attention_header(state: &AttentionState) -> AttentionStorage<'_> {
    AttentionStorage(state, true)
}

/// Rebuilding this derived queue acquires no fact, creates no ID and changes no
/// saved clock or scan. The receiving owner still validates all source grants
/// and this continuation against its installed attention policy after decoding.
pub fn decode_attention_storage(
    stored: StoredAttention,
) -> Result<AttentionState, crate::received::ReceivedError> {
    let mut relation_dirty = IndexMap::new();
    for key in std::iter::once(SELF_RELATION_KEY).chain(
        stored
            .annotations
            .keys()
            .map(String::as_str)
            .filter(|key| *key != SELF_RELATION_KEY),
    ) {
        for family in [
            AttentionRelationFamily::ClosingBody,
            AttentionRelationFamily::ClosingDrop,
        ] {
            let key = crate::encoding::json_record(&(key, family)).map_err(|_| {
                crate::received::ReceivedError("Attention relation identity encoding failed.")
            })?;
            relation_dirty.insert(key, stored.relation_revision);
        }
    }
    Ok(AttentionState {
        policy: stored.policy,
        next_order: stored.next_order,
        annotations: stored.annotations,
        entries: stored.entries,
        explicit: stored.explicit,
        latches: stored.latches,
        next_relation_at: stored.next_relation_at,
        relation_cursor: stored.relation_cursor,
        discovery_cursor: stored.discovery_cursor,
        relation_revision: stored.relation_revision,
        relation_dirty,
        relation_scans: stored.relation_scans,
    })
}
