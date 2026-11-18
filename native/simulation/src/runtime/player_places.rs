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
pub struct RuntimePlaceNote<'a> {
    pub text: TextRef<'a>,
    pub revision: u64,
}
#[derive(Serialize)]
pub struct RuntimePlaceFacts<'a> {
    pub note: RuntimePlaceNote<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current: Option<bool>,
}
impl NativeWorldSession {
    pub fn player_places(&self, input: &[u8]) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let request: PlaceRequest = serde_json::from_slice(input).map_err(failure)?;
        self.with_player_place_facts(
            &request.account_id,
            &request.actor_id,
            request
                .entries
                .iter()
                .map(|row| (row.place_id.as_str(), row.exposure.as_ref())),
            |facts| RuntimeJson::encode(facts, &self.budget),
        )?
    }

    /// Borrow only notes and optional physical validity for places selected by
    /// the private evidence owner. The result cannot grant that permission.
    pub fn with_player_place_facts<'a, T>(
        &self,
        account: &str,
        actor: &str,
        entries: impl ExactSizeIterator<Item = (&'a str, Option<&'a EncounterExposure>)>,
        consume: impl FnOnce(&[RuntimePlaceFacts<'_>]) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        // The stand-alone caller borrows these notes while its already-
        // admitted history disclosure lease moves the fence to Publishing.
        let simulation = self.session.publication_read().map_err(failure)?;
        simulation
            .require_player_owner(account, actor)
            .map_err(failure)?;
        let state = &simulation.state;
        let count = entries.len();
        let _selection = self
            .budget
            .reserve(
                count
                    .checked_mul(size_of::<RuntimePlaceFacts<'_>>())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let mut facts = Vec::new();
        facts.try_reserve_exact(count).map_err(failure)?;
        for (place_id, exposure) in entries {
            if !crate::values::is_safe_record_id(place_id) || exposure.is_some_and(|exposure| {
                !exposure.validate()
                    || !matches!(exposure, EncounterExposure::Place { id, .. } if id == place_id)
            }) {
                return Err(failure("invalid selected place"));
            }
            let note = state
                .reception
                .actor_knowledge
                .get(
                    actor,
                    Some(&KnowledgeSubject::Place {
                        place_id: place_id.to_owned(),
                    }),
                )
                .map_err(failure)?;
            facts.push(RuntimePlaceFacts {
                note: RuntimePlaceNote {
                    text: note.map_or(TextRef::Unicode(""), |note| (&note.text).into()),
                    revision: note.map_or(0, |note| note.revision),
                },
                current: exposure.map(|exposure| {
                    state
                        .installed
                        .retained
                        .places_read
                        .current_observation(exposure, &state.physical)
                }),
            });
        }
        Ok(consume(&facts))
    }
}
