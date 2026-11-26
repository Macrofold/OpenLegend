//! Wire speech presentation from acquired words and event-time labels. These
//! parts never resolve a participant from present world state.

use super::PlayerEventError;
use crate::player_references::PlayerReferences;
use openlegend_simulation::{
    narration::{GrammaticalPerson, NameArticle, PersonRole, person_phrase},
    reception::{
        Intelligibility, PerceivedSpeech, SpeechAddressing, SpeechParticipant, SpeechPerception,
        SpeechSegment,
    },
    state::Named,
    text::JsText,
};
use serde::Serialize;

#[derive(PartialEq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
enum Part {
    Literal {
        text: JsText,
    },
    Participant {
        id: String,
        role: &'static str,
        text: JsText,
        #[serde(skip_serializing_if = "Option::is_none")]
        contact_reference: Option<String>,
    },
    Quotation {
        segments: Vec<SpeechSegment>,
        text: JsText,
    },
}

impl Part {
    fn literal(text: &'static str) -> Self {
        Self::Literal { text: text.into() }
    }

    fn text(&self) -> &JsText {
        match self {
            Self::Literal { text }
            | Self::Participant { text, .. }
            | Self::Quotation { text, .. } => text,
        }
    }
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct SpeechPresentation {
    acquisition: SpeechPerception,
    speaker_label: JsText,
    direction_label: Option<JsText>,
    segments: Vec<SpeechSegment>,
    personal_text: JsText,
    accessibility_text: JsText,
    parts: Vec<Part>,
}

pub(super) fn words(speech: &PerceivedSpeech) -> JsText {
    let mut joined = JsText::default();
    for (index, segment) in speech.segments.iter().enumerate() {
        if index > 0 {
            joined.push_str(" ");
        }
        match segment {
            SpeechSegment::Heard { text } => joined.push_text(text),
            SpeechSegment::Unintelligible => joined.push_str("[…]"),
        }
    }
    joined
}

pub(super) fn wire_speech(speech: &PerceivedSpeech) -> PerceivedSpeech {
    let mut speech = speech.clone();
    if speech.perception == SpeechPerception::Seen {
        speech.addressing = None;
        speech.intelligibility = Intelligibility::None;
        speech.segments.clear();
        speech.addressee = None;
    } else if speech.addressing != Some(SpeechAddressing::Directed) {
        speech.addressing = Some(SpeechAddressing::Ambient);
    }
    speech
}

pub(super) struct Participants<'a> {
    pub observer: &'a str,
    pub source: Option<&'a str>,
    pub target: Option<&'a str>,
    pub source_contact: Option<&'a str>,
    pub target_contact: Option<&'a str>,
}

pub(super) fn project(
    speech: &PerceivedSpeech,
    people: Participants<'_>,
    event_id: &str,
    references: &PlayerReferences<'_>,
) -> Result<SpeechPresentation, PlayerEventError> {
    let matching_label = |id: Option<&str>| {
        if id.is_some() && id == people.target && speech.addressee.is_some() {
            speech.addressee.as_ref()
        } else if id.is_some() && id == people.source {
            speech.speaker.as_ref()
        } else {
            None
        }
    };
    let source = participant(
        people.source,
        matching_label(people.source),
        speech.speaker.as_ref(),
        people.observer,
        PersonRole::Subject,
        "someone",
        true,
        "speaker",
        people.source_contact,
        "actor",
        event_id,
        references,
    )?;
    let target = participant(
        people.target,
        matching_label(people.target),
        speech.addressee.as_ref(),
        people.observer,
        if people.target == people.source {
            PersonRole::Reflexive
        } else {
            PersonRole::Object
        },
        "someone else",
        false,
        "addressee",
        people.target_contact,
        "target",
        event_id,
        references,
    )?;
    let direction = (speech.addressing == Some(SpeechAddressing::Directed)).then(|| {
        let mut label = JsText::from("to ");
        label.push_text(target.text());
        label
    });
    let speaker = source.text().clone();
    let mut parts = Vec::with_capacity(7);
    parts.push(source);
    if speech.perception == SpeechPerception::Seen {
        parts.push(Part::literal(" appears to be speaking."));
    } else {
        parts.push(Part::literal(
            if speech.intelligibility == Intelligibility::None {
                " spoke"
            } else {
                " said"
            },
        ));
        if direction.is_some() {
            parts.extend([Part::literal(" to "), target]);
        }
        if speech.intelligibility == Intelligibility::None {
            parts.push(Part::literal("; I could not understand the words."));
        } else {
            let mut quotation = JsText::from("“");
            quotation.push_text(&words(speech));
            quotation.push_str("”");
            parts.extend([
                Part::literal(": "),
                Part::Quotation {
                    segments: speech.segments.clone(),
                    text: quotation,
                },
            ]);
            if speech.intelligibility == Intelligibility::Partial {
                parts.push(Part::literal(" I heard only part of the words."));
            }
        }
    }
    let mut text = JsText::default();
    for part in &parts {
        text.push_text(part.text());
    }
    Ok(SpeechPresentation {
        acquisition: speech.perception,
        speaker_label: speaker,
        direction_label: direction,
        segments: speech.segments.clone(),
        personal_text: text.clone(),
        accessibility_text: text,
        parts,
    })
}

fn participant(
    id: Option<&str>,
    matched: Option<&SpeechParticipant>,
    original: Option<&SpeechParticipant>,
    observer: &str,
    grammar: PersonRole,
    unknown: &'static str,
    capitalize: bool,
    role: &'static str,
    contact: Option<&str>,
    historical_role: &str,
    event: &str,
    references: &PlayerReferences<'_>,
) -> Result<Part, PlayerEventError> {
    let known = matched.is_some() && id.is_some();
    let selected = matched.or(original);
    let self_subject = known && id == Some(observer);
    let mut text = selected.map_or_else(
        || unknown.into(),
        |label| {
            person_phrase(
                &Named {
                    name: label.name_at_time.clone(),
                    name_form: label.name_form.clone(),
                    indefinite_article: label.indefinite_article.clone(),
                },
                grammar,
                self_subject,
                NameArticle::Indefinite,
                GrammaticalPerson::First,
            )
        },
    );
    if capitalize
        && (self_subject || selected.and_then(|name| name.name_form.as_deref()) != Some("proper"))
    {
        text = text.first_case(true);
    }
    Ok(if let Some(id) = id.filter(|_| known) {
        Part::Participant {
            id: references.historical(event, id, historical_role)?,
            role,
            text,
            contact_reference: contact.map(str::to_owned),
        }
    } else {
        Part::Literal { text }
    })
}
