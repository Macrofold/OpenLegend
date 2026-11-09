//! Finite own-body detector and cartography reads. Marker notes are selected by
//! their actual address; unrelated private knowledge never enters this packet.
use super::*;
use crate::reception::{MapMarker, hearing_floor, vision_parameters};
use serde::ser::SerializeStruct;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct OwnSenses {
    enabled: bool,
    perception_blocked: bool,
    radius: f64,
    vision_angle: f64,
    hearing_floor: Option<f64>,
}
pub(super) struct OwnMarker<'a> {
    marker: &'a MapMarker,
    note: Option<&'a crate::text::JsText>,
    revision: u64,
}
impl Serialize for OwnMarker<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        struct Note<'a> {
            #[serde(serialize_with = "note_text")]
            text: Option<&'a crate::text::JsText>,
            revision: u64,
        }
        fn note_text<S: Serializer>(value: &Option<&crate::text::JsText>, serializer: S) -> Result<S::Ok, S::Error> {
            match value {
                Some(text) => text.serialize(serializer),
                None => serializer.serialize_str(""),
            }
        }
        let mut value = serializer.serialize_struct("PlayerMapMarker", 6)?;
        value.serialize_field("id", &self.marker.id)?;
        value.serialize_field("x", &self.marker.x)?;
        value.serialize_field("z", &self.marker.z)?;
        value.serialize_field("label", &self.marker.label)?;
        value.serialize_field("icon", &self.marker.icon)?;
        value.serialize_field("note", &Note { text: self.note, revision: self.revision })?;
        value.end()
    }
}
pub(super) struct PlayerMetadata<'a> {
    pub senses: OwnSenses,
    pub markers: Vec<OwnMarker<'a>>,
    _reservation: ByteReservation,
}
impl<'a> PlayerMetadata<'a> {
    pub fn prepare(state: &'a SimulationState, actor: &'a crate::state::Entity, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let markers = state.reception.map_markers.as_ref().and_then(|owners| owners.get(&actor.id));
        let count = markers.map_or(0, |markers| markers.len());
        let max_key = markers.into_iter().flat_map(|markers| markers.values()).map(|marker| marker.id.len()).max().unwrap_or(0);
        let bytes = count.checked_mul(size_of::<(usize, &str, &MapMarker)>() + size_of::<OwnMarker>())
            .and_then(|bytes| bytes.checked_add(max_key.checked_add("map-marker:".len())?.checked_mul(2)?))
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        let mut ordered = Vec::new();
        ordered.try_reserve_exact(count).map_err(|_| ExecutionError::Capacity)?;
        for (index, (key, marker)) in markers.into_iter().flat_map(|markers| markers.iter()).enumerate() {
            ordered.push((index, key.as_str(), marker));
        }
        ordered.sort_unstable_by_key(|(index, key, _)| match crate::encoding::array_index(key) {
            Some(value) => (0, value as usize),
            None => (1, *index),
        });
        let documents = state.reception.actor_knowledge.as_ref().and_then(|owners| owners.get(&actor.id));
        let mut selected = Vec::new();
        selected.try_reserve_exact(count).map_err(|_| ExecutionError::Capacity)?;
        for (_, _, marker) in ordered {
            let key = format!("map-marker:{}", marker.id);
            let note = documents.and_then(|documents| documents.get(&key));
            selected.push(OwnMarker { marker, note: note.map(|note| &note.text), revision: note.map_or(0, |note| note.revision) });
        }
        let blocked = state.installed.capabilities.capability_blocked(Some(actor), "perception")?;
        let vision = vision_parameters(&state.installed, actor);
        Ok(Self {
            senses: OwnSenses { enabled: actor.actively_participates() && !blocked, perception_blocked: blocked, radius: vision.radius, vision_angle: vision.field_of_view, hearing_floor: hearing_floor(&state.installed, actor) },
            markers: selected,
            _reservation: reservation,
        })
    }
}
