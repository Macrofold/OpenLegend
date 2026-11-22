//! Describe already received values. This presentation does not consult live
//! positions, canonical names, or raw events.
use openlegend_simulation::{
    encoding::json_record,
    narration::{self, historical_account, Intelligibility, SpeechDelivery, SpeechPresentationInput},
    received::{MaterializedTemporalValue, ReceivedValueFragment, TemporalChange},
    reception::{
        AttributeKnowledge, ContactDetail, DetectedKind, Elevation, EncounterExposure,
        ObservedItemLocation, ObservedLocation, PerceivedSpeech, SensoryFacet, SpeechAddressing,
        SpeechPerception, SpeechSegment,
    },
    state::{Named, Point},
    text::JsText,
    values::AttributeValue,
};

fn number(value: f64) -> String {
    json_record(&value).expect("received numeric value is valid")
}

fn point(value: Point) -> String {
    format!(
        "({}, {}, {})",
        number(value.x),
        number(value.y),
        number(value.z)
    )
}

fn location(value: &ObservedLocation) -> String {
    match value {
        ObservedLocation::Point {
            point: position,
            error_radius,
        } => {
            let mut result = format!("position {}", point(position.position()));
            if *error_radius != 0.0 {
                result.push_str(&format!(", within {}", number(*error_radius)));
            }
            result
        }
        ObservedLocation::Region { center, radius } => {
            format!("within {} of {}", number(*radius), point(center.position()))
        }
        ObservedLocation::Bearing { elevation, .. } => match elevation {
            Elevation::Above => "a direction above me",
            Elevation::Level => "a direction around my level",
            Elevation::Below => "a direction below me",
        }
        .to_owned(),
    }
}

fn speech_description(value: &PerceivedSpeech) -> JsText {
    let name = |part: &openlegend_simulation::reception::SpeechParticipant| Named {
        name: part.name_at_time.clone(),
        name_form: part.name_form.clone(),
        indefinite_article: part.indefinite_article.clone(),
    };
    let speaker = value.speaker.as_ref().map(name);
    let addressee = value.addressee.as_ref().map(name);
    let portions = value
        .segments
        .iter()
        .map(|segment| match segment {
            SpeechSegment::Heard { text } => text.clone(),
            SpeechSegment::Unintelligible => "[…]".into(),
        })
        .collect::<Vec<_>>();
    let words = JsText::join(portions.iter(), " ");
    let intelligibility = match value.intelligibility {
        openlegend_simulation::reception::Intelligibility::Clear => Intelligibility::Clear,
        openlegend_simulation::reception::Intelligibility::Partial => Intelligibility::Partial,
        openlegend_simulation::reception::Intelligibility::None => Intelligibility::None,
    };
    let delivery = value.delivery.as_ref().map(|delivery| {
        use openlegend_simulation::worlds::base_observed::SpeechVolume;
        match delivery {
            SpeechVolume::Whisper => SpeechDelivery::Whisper,
            SpeechVolume::Normal => SpeechDelivery::Normal,
            SpeechVolume::Shout => SpeechDelivery::Shout,
        }
    });
    narration::speech_presentation(SpeechPresentationInput {
        speaker: speaker.as_ref(),
        addressee: addressee.as_ref(),
        self_speaker: value.perception == SpeechPerception::SelfBody,
        addressed: false,
        directed: value.addressing == Some(SpeechAddressing::Directed),
        seen: value.perception == SpeechPerception::Seen,
        intelligibility,
        delivery,
        words: &words,
        second_person: false,
    })
    .description
}

pub(super) fn described<'a>(
    values: impl Iterator<Item = MaterializedTemporalValue<'a>>,
    change: TemporalChange,
    has_facets: bool,
) -> JsText {
    if !has_facets {
        let boundary = match change {
            TemporalChange::Loss => Some("Contact was lost."),
            TemporalChange::Unchecked => Some("Further details were uncertain."),
            TemporalChange::AttentionExit => Some("Attention shifted elsewhere."),
            TemporalChange::RecordingGap => Some("Further details were not retained."),
            _ => None,
        };
        if let Some(boundary) = boundary {
            return boundary.into();
        }
    }
    let mut parts = indexmap::IndexSet::<JsText>::new();
    for value in values {
        let part = match value {
            MaterializedTemporalValue::Body { body, .. } => {
                let mut named = body
                    .details()
                    .label
                    .as_ref()
                    .map_or_else(|| JsText::from("something"), |label| label.name.clone());
                named.push_str(" at ");
                named.push_str(&point(body.pose().position));
                named
            }
            MaterializedTemporalValue::Location {
                location: position, ..
            } => location(&position).into(),
            MaterializedTemporalValue::Other(fragment) => match fragment {
                ReceivedValueFragment::PersonalAccount(value) => historical_account(&value.text),
                ReceivedValueFragment::ActionResult(value) => historical_account(&value.text),
                ReceivedValueFragment::Sensory(facet) => match facet {
                    SensoryFacet::Description { text } => text.clone(),
                    SensoryFacet::Speech { speech, .. } => speech_description(speech),
                    SensoryFacet::Sound { sound, .. } => narration::sound_description(sound),
                    SensoryFacet::Event {
                        event_type, text, ..
                    } if event_type == "speech" => text.clone(),
                    SensoryFacet::Event { text, .. } => historical_account(text),
                    SensoryFacet::Claim { words_as_heard, .. } => words_as_heard.clone(),
                    SensoryFacet::ObservedMotion { earlier, later, .. } => format!(
                        "{} → {}",
                        location(&earlier.location),
                        location(&later.location)
                    )
                    .into(),
                    SensoryFacet::SurfacePatch { patch } => {
                        let vertices = patch
                            .vertices
                            .iter()
                            .copied()
                            .map(point)
                            .collect::<Vec<_>>();
                        let mut result =
                            format!("Visible part of a surface through {}", vertices.join(", "));
                        if patch.error_radius != 0.0 {
                            result
                                .push_str(&format!("; uncertainty {}", number(patch.error_radius)));
                        }
                        result.into()
                    }
                    SensoryFacet::PhysicalBoundary { boundary } => {
                        let mut result =
                            format!("Edge from {} to {}", point(boundary.a), point(boundary.b));
                        if boundary.drop_lower > 0.0 {
                            result.push_str(&format!(
                                "; drop at least {}",
                                number(boundary.drop_lower)
                            ));
                        }
                        result.into()
                    }
                    SensoryFacet::PublicAttributes { attributes } => {
                        for attribute in attributes {
                            let unknown = JsText::from("unknown");
                            let value = match &attribute.value {
                                Some(AttributeValue::Number(value))
                                    if attribute.status == AttributeKnowledge::Known =>
                                {
                                    number(*value).into()
                                }
                                Some(AttributeValue::Category(value))
                                    if attribute.status == AttributeKnowledge::Known =>
                                {
                                    value.as_str().into()
                                }
                                _ => unknown,
                            };
                            let mut entry: JsText = format!("{}: ", attribute.name).into();
                            entry.push_text(&value);
                            if attribute.status == AttributeKnowledge::Known
                                && attribute.value.is_some()
                                && let Some(unit) =
                                    attribute.unit.as_deref().filter(|unit| !unit.is_empty())
                            {
                                entry.push_str(" ");
                                entry.push_str(unit);
                            }
                            parts.insert(entry);
                        }
                        continue;
                    }
                    SensoryFacet::Carried { items } => list(
                        "Carried: ",
                        items.iter().map(|item| item.item_kind_as_observed.clone()),
                    ),
                    SensoryFacet::PileContents { items } => list(
                        "Contents: ",
                        items.iter().map(|item| {
                            let mut entry: JsText = format!("{} ", number(item.quantity)).into();
                            entry.push_text(&item.name);
                            entry
                        }),
                    ),
                    SensoryFacet::EncounterExposure { exposure } => match exposure {
                        EncounterExposure::Place {
                            label, description, ..
                        } => {
                            let mut result = label.clone();
                            result.push_str(": ");
                            result.push_text(description);
                            result
                        }
                        EncounterExposure::InventoryItem {
                            label,
                            description,
                            inscription,
                            observed_location,
                            ..
                        } => {
                            let mut details = label.clone();
                            details.push_str(": ");
                            details.push_text(description);
                            parts.insert(details);
                            if let Some(inscription) =
                                inscription.as_ref().filter(|text| !text.is_empty())
                            {
                                let mut written = JsText::from("Inscription: ");
                                written.push_text(inscription);
                                parts.insert(written);
                            }
                            if let Some(
                                ObservedItemLocation::World { label, .. }
                                | ObservedItemLocation::Possession { label },
                            ) = observed_location
                            {
                                parts.insert(label.as_str().into());
                            }
                            continue;
                        }
                    },
                    SensoryFacet::Contact {
                        detail: ContactDetail::Moving,
                        ..
                    } => "Movement noticed.".into(),
                    SensoryFacet::Contact { .. } => "Presence noticed.".into(),
                    SensoryFacet::Detected { detected, .. } => match detected {
                        DetectedKind::Signal => "signal detected.",
                        DetectedKind::Surface => "surface detected.",
                        DetectedKind::Body => "body detected.",
                        DetectedKind::Impact => "impact detected.",
                    }
                    .into(),
                    _ => continue,
                },
                _ => continue,
            },
        };
        parts.insert(part);
    }
    let result = JsText::join(parts.iter(), "; ");
    if result.is_empty() {
        "A received detail changed.".into()
    } else {
        result
    }
}

fn list(label: &str, parts: impl Iterator<Item = JsText>) -> JsText {
    let parts = parts.collect::<Vec<_>>();
    let mut result: JsText = label.into();
    let joined = JsText::join(parts.iter(), ", ");
    if joined.is_empty() {
        result.push_str("nothing observed");
    } else {
        result.push_text(&joined);
    }
    result
}
