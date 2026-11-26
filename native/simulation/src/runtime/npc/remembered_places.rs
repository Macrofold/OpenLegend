//! The NPC's own bounded action sightings, held at direct generation preparation.
//! This roster grants a stored destination only, never a current body reference.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_record};
use crate::state::{ActorState, RememberedPlace};
use crate::text::JsText;
use std::mem::size_of;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Wording {
    remembered_request: JsText,
}

static WORDING: LazyLock<Wording> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../../packages/domain/src/typed-movement-format.json"
    ))
    .expect("the shared typed movement wording is a build input")
});

struct PlaceChoice {
    id: String,
    place: RememberedPlace,
    request: JsText,
}
heap_record!(PlaceChoice { id, place, request });

pub(crate) struct RememberedPlaces {
    choices: Vec<PlaceChoice>,
    _custody: ByteReservation,
}

impl RememberedPlaces {
    pub(super) fn capture(
        actor: &ActorState,
        serial: u64,
        budget: &ByteBudget,
    ) -> Result<Option<Arc<Self>>, RuntimeError> {
        let Some(places) = actor
            .agency
            .places
            .as_ref()
            .filter(|places| !places.is_empty())
        else {
            return Ok(None);
        };
        let prefix = &WORDING.remembered_request;
        let bound = places
            .iter()
            .try_fold(
                size_of::<Self>() + 2 * size_of::<usize>(),
                |bytes, place| {
                    let label = place
                        .label
                        .storage_bytes()
                        .checked_add(prefix.storage_bytes() + 1)?;
                    let request =
                        if place.label.as_unicode().is_some() && prefix.as_unicode().is_some() {
                            label
                        } else {
                            // Exact UTF-16 and its quoted JSON coexist during composition.
                            label.checked_mul(20)?.checked_add(64)?
                        };
                    bytes
                        .checked_add(size_of::<PlaceChoice>() + 40)?
                        .checked_add(place.heap_bytes()?)?
                        .checked_add(request)
                },
            )
            .ok_or(CapacityError)?;
        let mut custody = budget.reserve(bound)?;
        let mut choices = Vec::new();
        choices
            .try_reserve_exact(places.len())
            .map_err(|_| CapacityError)?;
        let stop = JsText::from(".");
        for (ordinal, place) in places.iter().enumerate() {
            choices.push(PlaceChoice {
                id: format!("place-{serial}-{ordinal}"),
                place: place.clone(),
                request: JsText::concat(&[prefix, &place.label, &stop]),
            });
        }
        custody.resize(
            choices
                .heap_bytes()
                .and_then(|bytes| bytes.checked_add(size_of::<Self>() + 2 * size_of::<usize>()))
                .ok_or(CapacityError)?,
        )?;
        Ok(Some(Arc::new(Self {
            choices,
            _custody: custody,
        })))
    }

    /// The prompt carries the last-saw label, never the point or timestamp.
    /// Check what is disclosed here; action application checks the exact point.
    pub(super) fn labels_current(&self, actor: &ActorState) -> bool {
        actor.agency.places.as_ref().is_some_and(|places| {
            self.choices.iter().all(|choice| {
                places.iter().any(|place| {
                    place.subject_id == choice.place.subject_id
                        && place.episode == choice.place.episode
                        && place.label == choice.place.label
                })
            })
        })
    }

    pub(crate) fn entry_current(actor: &ActorState, place: &RememberedPlace) -> bool {
        actor
            .agency
            .places
            .as_ref()
            .is_some_and(|current| current.contains(place))
    }

    pub(crate) fn get(&self, selected: &str, request: &JsText) -> Option<&RememberedPlace> {
        self.choices.iter().find_map(|choice| {
            (choice.id == selected && &choice.request == request).then_some(&choice.place)
        })
    }

    pub(super) fn choices(read: Option<&Self>) -> impl ExactSizeIterator<Item = (&str, &JsText)> {
        read.map_or(&[][..], |read| read.choices.as_slice())
            .iter()
            .map(|choice| (choice.id.as_str(), &choice.request))
    }
}
