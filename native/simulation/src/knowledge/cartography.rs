//! Private cartography borrows the installed map's limits and uses the
//! existing personal knowledge revision to order edits and saved notes.

mod state;

pub(crate) use state::{MapMarkers, MarkerCheckpoint, MarkerEntry, MarkerJournal};

use super::{CompletedKnowledgeEdit, KnowledgeEdit, KnowledgeSubject, edit_knowledge};
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::{ByteBudget, ByteReservation, retained_size::HeapBytes};
use crate::install::InstallError;
use crate::reception::MapMarker;
use crate::text::JsText;
use crate::values::is_safe_record_id;
use serde::Deserialize;
use serde_json::value::RawValue;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Bounds {
    min_x: f64,
    min_z: f64,
    max_x: f64,
    max_z: f64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarkerIcon {
    id: String,
}

/// Prepared once from the already verified authored presentation. The server
/// still reads that same definition for art and labels.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Cartography {
    bounds: Bounds,
    marker_icons: Vec<MarkerIcon>,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    max_markers: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    label_characters: u64,
    #[serde(skip)]
    _storage: Option<crate::host::ResidentReservation>,
}
impl Cartography {
    pub(crate) fn prepare(
        presentation: Option<&RawValue>,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, InstallError> {
        let Some(presentation) = presentation else {
            return Ok(None);
        };
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Selected<'a> {
            #[serde(borrow)]
            map_art: Option<&'a RawValue>,
        }
        let selected: Selected<'_> =
            serde_json::from_str(presentation.get()).map_err(|_| InstallError::DefinitionBody)?;
        let Some(art) = selected.map_art else {
            return Ok(None);
        };
        let _preparation = crate::install::reserve_typed_parse::<Self>(
            art.get(),
            std::mem::size_of::<MarkerIcon>(),
            None,
            budget,
        )?;
        let mut art: Self =
            serde_json::from_str(art.get()).map_err(|_| InstallError::DefinitionBody)?;
        // Lookup order is internal. The authored display order remains in the
        // original presentation used by the map's icon picker.
        art.marker_icons.sort_unstable_by(|a, b| a.id.cmp(&b.id));
        let b = &art.bounds;
        let valid = [b.min_x, b.max_x, b.min_z, b.max_z]
            .into_iter()
            .all(f64::is_finite)
            && b.min_x < b.max_x
            && b.min_z < b.max_z
            && art.max_markers > 0
            && art.label_characters > 0
            && !art.marker_icons.is_empty()
            && art
                .marker_icons
                .iter()
                .all(|icon| is_safe_record_id(&icon.id))
            && art
                .marker_icons
                .windows(2)
                .all(|pair| pair[0].id != pair[1].id);
        if !valid {
            return Err(InstallError::DefinitionBody);
        }
        art._storage = Some(
            budget
                .reserve_record(art.heap_bytes().ok_or(InstallError::Capacity)?)
                .map_err(|_| InstallError::Capacity)?,
        );
        Ok(Some(art))
    }

    pub(crate) fn heap_bytes(&self) -> Option<usize> {
        self.marker_icons.iter().try_fold(
            self.marker_icons
                .capacity()
                .checked_mul(std::mem::size_of::<MarkerIcon>())?,
            |bytes, icon| bytes.checked_add(icon.id.capacity()),
        )
    }

    pub(super) fn collection_fits(&self, count: usize) -> bool {
        (count as u64) <= self.max_markers
    }

    fn authorizes(&self, marker: &MapMarker) -> bool {
        let b = &self.bounds;
        is_safe_record_id(&marker.id)
            && (b.min_x..=b.max_x).contains(&marker.x)
            && (b.min_z..=b.max_z).contains(&marker.z)
            && !marker.label.trim_is_empty()
            && marker.label.character_count() as u64 <= self.label_characters
            && self
                .marker_icons
                .binary_search_by(|icon| icon.id.cmp(&marker.icon))
                .is_ok()
    }
}

pub struct MapMarkerEdit {
    pub id: String,
    pub expected_revision: u64,
    pub change: MarkerChange,
}

pub enum MarkerChange {
    Remove,
    Place {
        x: f64,
        z: f64,
        label: JsText,
        icon: String,
    },
}
impl MapMarkerEdit {
    pub(crate) fn heap_bytes(&self) -> Option<usize> {
        match &self.change {
            MarkerChange::Remove => Some(self.id.capacity()),
            MarkerChange::Place { label, icon, .. } => self
                .id
                .capacity()
                .checked_add(icon.capacity())?
                .checked_add(label.heap_bytes()?),
        }
    }
}

pub(super) fn edit_marker(
    core: &mut CoreMutation<'_>,
    actor: &str,
    edit: &MapMarkerEdit,
    budget: &ByteBudget,
) -> Result<CompletedKnowledgeEdit, ExecutionError> {
    let result = |ok, code, message| super::edit::result(ok, code, message, budget);
    let installed = core.state.installed.clone();
    let Some(policy) = installed.content.cartography.as_ref() else {
        return result(false, "map-unavailable", "This world has no map.");
    };
    let revision = core
        .state
        .reception
        .knowledge_revisions
        .as_ref()
        .and_then(|owners| owners.get(actor))
        .copied()
        .unwrap_or(0);
    if !is_safe_record_id(&edit.id) || edit.expected_revision != revision {
        return result(
            false,
            "stale-map",
            "Your notes changed. Refresh the map before editing.",
        );
    }
    if revision == crate::identity::MAX_SAFE_INTEGER {
        return result(
            false,
            "knowledge-exhausted",
            "Your map cannot be edited further.",
        );
    }
    let markers = core
        .state
        .reception
        .map_markers
        .as_ref()
        .and_then(|owners| owners.get(actor));
    let prior = markers.and_then(|markers| markers.get(&edit.id));
    let (next, cleared_note, code, message) = match &edit.change {
        MarkerChange::Remove => {
            if prior.is_none() {
                return result(true, "marker-absent", "The marker is already removed.");
            }
            let _subject = budget.reserve(
                edit.id
                    .len()
                    .checked_mul(4)
                    .ok_or(ExecutionError::Capacity)?
                    + 128,
            )?;
            let subject = KnowledgeSubject::MapMarker {
                marker_id: edit.id.clone(),
            };
            let note_revision = core
                .state
                .reception
                .actor_knowledge
                .get(actor, Some(&subject))?
                .filter(|note| !note.text.is_empty())
                .map(|note| note.revision);
            if let Some(note_revision) = note_revision {
                let edit = KnowledgeEdit {
                    subject_id: Some(subject.clone()),
                    expected_revision: note_revision as i64,
                    text: JsText::default(),
                };
                let cleared = edit_knowledge(core, actor, &edit, &[subject], &[], budget)?;
                if !cleared.outcome().ok {
                    return Ok(cleared);
                }
            }
            (
                None,
                note_revision.is_some(),
                "marker-deleted",
                "Marker removed.",
            )
        }
        MarkerChange::Place { x, z, label, icon } => {
            let mut held = budget.reserve(edit.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            let marker = MapMarker {
                id: edit.id.clone(),
                x: *x,
                z: *z,
                label: label.trimmed(),
                icon: icon.clone(),
            };
            if !policy.authorizes(&marker) {
                let _copy = budget.reserve(160)?;
                return result(
                    false,
                    "invalid-marker",
                    &format!(
                        "Choose a point on the map, an offered icon and a label within {} characters.",
                        policy.label_characters
                    ),
                );
            }
            if prior.is_none()
                && !policy.collection_fits(markers.map_or(1, |markers| markers.len() + 1))
            {
                let _copy = budget.reserve(110)?;
                return result(
                    false,
                    "map-full",
                    &format!(
                        "Your map has {} markers. Remove one to add another.",
                        policy.max_markers
                    ),
                );
            }
            if prior.is_some_and(|prior| **prior == marker) {
                return result(true, "marker-unchanged", "Your marker is already current.");
            }
            held.resize(marker.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            (Some((marker, held)), false, "marker-saved", "Marker saved.")
        }
    };
    core.journal.markers.change(
        &mut core.state.reception.map_markers,
        actor,
        &edit.id,
        next,
        budget,
    )?;
    if !cleared_note {
        core.journal.recognition.advance_revision(
            &mut core.state.reception,
            actor,
            &mut core.journal.cognition,
        )?;
    }
    result(true, code, message)
}
