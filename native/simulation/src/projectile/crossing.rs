//! Pending first exits from the actual ordinary envelope. This evidence never
//! grants collision immunity. Only the exact current encounter is retained.
use crate::host::retained_size::heap_record;
use crate::state::EntityStore;
use crate::values::{deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexMap;
use serde::{Deserialize, Deserializer, Serialize, de};

pub(crate) type ProjectileCrossings = IndexMap<String, ProjectileCrossing>;

pub(super) fn deserialize_present<'de, D: Deserializer<'de>>(
    decoder: D,
) -> Result<Option<ProjectileCrossings>, D::Error> {
    struct OrderedCrossings;
    impl<'de> de::Visitor<'de> for OrderedCrossings {
        type Value = ProjectileCrossings;
        fn expecting(&self, format: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            format.write_str("one pending crossing per projectile and body life")
        }
        fn visit_map<M: de::MapAccess<'de>>(self, mut map: M) -> Result<Self::Value, M::Error> {
            let mut entries = IndexMap::new();
            while let Some((key, value)) = map.next_entry()? {
                if entries.insert(key, value).is_some() {
                    return Err(de::Error::custom("duplicate projectile crossing"));
                }
            }
            Ok(entries)
        }
    }
    decoder.deserialize_map(OrderedCrossings).map(Some)
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ProjectileCrossing {
    pub(crate) body_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) body_life: u64,
    pub(crate) entered_at: f64,
    pub(crate) pose_occurrence_id: String,
}

impl ProjectileCrossing {
    pub(crate) fn key(&self) -> Result<String, serde_json::Error> {
        // IDs may contain punctuation. Use the ordinary JSON pair encoding for
        // the stored slot and retain separate typed identities for execution.
        serde_json::to_string(&(self.body_id.as_str(), self.body_life))
    }

    pub(crate) fn valid(&self, key: &str, launched: f64, now: f64) -> bool {
        is_safe_record_id(&self.body_id)
            && is_safe_record_id(&self.pose_occurrence_id)
            && (launched..=now).contains(&self.entered_at)
            && self.key().is_ok_and(|encoded| key == encoded)
    }

    pub(crate) fn still_bound(&self, entities: &EntityStore) -> bool {
        entities.get(&self.body_id).is_some_and(|body| {
            body.actively_participates()
                && body.actor.as_ref().is_some_and(|actor| actor.alive)
                && body.physical_life() == Some(self.body_life)
        })
    }

    pub(crate) fn validates_pose(&self, entities: &EntityStore) -> bool {
        self.still_bound(entities)
            && entities
                .get(&self.body_id)
                .and_then(|body| body.spatial.local_pose.as_ref())
                .is_some_and(|pose| pose.started_at == self.entered_at)
    }
}

heap_record!(ProjectileCrossing {
    body_id,
    pose_occurrence_id
});
