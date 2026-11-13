//! Selected private place notes and current-source checks. The application
//! supplies already-permitted memory rows, never a live TypeScript world.
use super::*;
use crate::reception::{EncounterExposure, KnowledgeSubject};
use crate::text::TextRef;
use std::mem::size_of;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PlaceRequest {
    account_id: String,
    actor_id: String,
    entries: Vec<PlaceSelection>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PlaceSelection {
    place_id: String,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    exposure: Option<EncounterExposure>,
}
#[derive(Serialize)]
struct PlaceNote<'a> {
    text: TextRef<'a>,
    revision: u64,
}
#[derive(Serialize)]
struct PlaceFacts<'a> {
    note: PlaceNote<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    current: Option<bool>,
}
impl NativeWorldSession {
    pub fn player_places(&self, input: &[u8]) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let request: PlaceRequest = serde_json::from_slice(input).map_err(failure)?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(&request.account_id, &request.actor_id)
            .map_err(failure)?;
        let state = &simulation.state;
        let _selection = self
            .budget
            .reserve(
                request
                    .entries
                    .len()
                    .checked_mul(size_of::<PlaceFacts<'_>>())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let mut facts = Vec::new();
        facts
            .try_reserve_exact(request.entries.len())
            .map_err(failure)?;
        for selected in &request.entries {
            if !crate::values::is_safe_record_id(&selected.place_id)
                || selected.exposure.as_ref().is_some_and(|exposure| {
                    !exposure.validate()
                        || !matches!(exposure, EncounterExposure::Place { id, .. } if *id == selected.place_id)
                })
            {
                return Err(failure("invalid selected place"));
            }
            let note = state
                .reception
                .actor_knowledge
                .get(
                    &request.actor_id,
                    Some(&KnowledgeSubject::Place {
                        place_id: selected.place_id.clone(),
                    }),
                )
                .map_err(failure)?;
            facts.push(PlaceFacts {
                note: PlaceNote {
                    text: note.map_or(TextRef::Unicode(""), |note| (&note.text).into()),
                    revision: note.map_or(0, |note| note.revision),
                },
                current: selected.exposure.as_ref().map(|exposure| {
                    state
                        .installed
                        .retained
                        .places_read
                        .current_observation(exposure, &state.physical)
                }),
            });
        }
        RuntimeJson::encode(&facts, &self.budget)
    }
}
