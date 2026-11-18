//! Search the bounded retained index before hydrating the displayed page.
//! Source text is restored only where the existing search projection was cold.

use super::*;

impl Store {
    pub(super) async fn search_place_view(
        &self,
        transaction: &Transaction<'_>,
        read: &PreparedKnownPlaceRead,
        search: PlaceViewSearch,
        candidates: Vec<PlaceIndex>,
        more: bool,
        held: &mut ByteReservation,
    ) -> StoreResult<SelectedPlaces> {
        let history = read.history.as_ref().ok_or(StoreError::InvalidRecord)?;
        let correction = |row: &PlaceIndex| {
            row.capsule
                .source_event_id
                .as_ref()
                .and_then(|id| history.corrections.get(id))
        };
        let mut witnesses = BTreeMap::new();
        for kind in ["awareness", "memory", "summary", "support"] {
            let mut owners = Vec::new();
            for place in &candidates {
                match correction(place) {
                    Some(id) if kind == "awareness" => owners.push(id.as_str()),
                    None if place.kind == kind && place.search_text.is_empty() => {
                        owners.push(place.owner.as_str());
                    }
                    _ => {}
                }
            }
            owners.sort_unstable();
            owners.dedup();
            if !owners.is_empty() {
                witnesses.insert(
                    kind,
                    self.place_source_rows(transaction, read, kind, &owners, held)
                        .await?,
                );
            }
        }

        let last_visited = more.then(|| {
            candidates
                .last()
                .expect("nonempty scan window")
                .capsule
                .place_id
                .clone()
        });
        let mut selected = Vec::new();
        let mut extra_match = false;
        for mut place in candidates {
            let text = if let Some(id) = correction(&place) {
                let mut notice = JsText::from("Corrected observation ");
                let current = witnesses.get("awareness").and_then(|rows| rows.get(id));
                if let Some(source) = current {
                    notice.push_text(&source_text("awareness", &source.row.payload)?);
                } else {
                    notice.push_str("This observation was corrected. Its original description is no longer established information.");
                }
                notice
            } else if !place.search_text.is_empty() {
                JsText::from(std::mem::take(&mut place.search_text))
            } else {
                let source = witnesses
                    .get(place.kind.as_str())
                    .and_then(|rows| rows.get(&place.owner))
                    .ok_or(StoreError::StaleCut)?;
                if source.revision != place.revision {
                    return Err(StoreError::StaleCut);
                }
                if place.kind == "support" {
                    let EncounterExposure::Place { description, .. } =
                        place_exposure(&source.row.payload, &place.capsule, "support")?
                    else {
                        return Err(StoreError::InvalidRecord);
                    };
                    description
                } else {
                    source_text(&place.kind, &source.row.payload)?
                }
            };
            if search.matches(&place.capsule.label, &text, &self.budget)? {
                if selected.len() == PAGE {
                    extra_match = true;
                    break;
                }
                selected.push(place);
            }
        }
        for (kind, sources) in &mut witnesses {
            sources.retain(|id, _| {
                selected.iter().any(|place| {
                    (place.kind == *kind && place.owner == *id)
                        || (*kind == "awareness" && correction(place) == Some(id))
                })
            });
        }
        let next = if extra_match {
            selected.last().map(|last| last.capsule.place_id.clone())
        } else {
            last_visited
        };
        Ok(SelectedPlaces {
            index: selected,
            next,
            scan_limited: more && !extra_match,
            witnesses,
        })
    }
}

impl PlaceViewSearch {
    fn matches(
        &self,
        label: &JsText,
        text: &JsText,
        budget: &openlegend_simulation::host::ByteBudget,
    ) -> StoreResult<bool> {
        let complete = (1_u16 << self.words.len()) - 1;
        let mut seen = 0_u16;
        for cell in [label, text] {
            self.language
                .search_words(cell, budget, |word| {
                    for (at, prefix) in self.words.iter().enumerate() {
                        if word.starts_with(prefix) {
                            seen |= 1 << at;
                        }
                    }
                })
                .map_err(|error| match error {
                    crate::language::LanguageError::Capacity => StoreError::Capacity,
                    _ => StoreError::InvalidRecord,
                })?;
            if seen == complete {
                return Ok(true);
            }
        }
        Ok(false)
    }
}

pub(super) fn source_text(kind: &str, body: &str) -> StoreResult<JsText> {
    match kind {
        "awareness" => {
            #[derive(Deserialize)]
            struct Text {
                text: openlegend_simulation::narration::NativeText,
            }
            let body: Text = serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
            Ok(openlegend_simulation::narration::native_text(&body.text))
        }
        "memory" => {
            #[derive(Deserialize)]
            struct Text {
                summary: JsText,
            }
            let body: Text = serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
            Ok(body.summary)
        }
        "summary" => {
            #[derive(Deserialize)]
            struct Text {
                text: JsText,
            }
            let body: Text = serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
            Ok(body.text)
        }
        _ => Err(StoreError::InvalidRecord),
    }
}
