//! Pure English participant grammar over already selected event-time names.
//! Source: packages/language/src/index.ts and domain/narration.ts. Literal text
//! and quotations are never reparsed, and this module has no world lookup.

use crate::encoding::{is_js_whitespace, js_trim};
use crate::state::Named;
use crate::values::{deserialize_present_option, is_safe_record_id};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

mod retained_size;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NameArticle {
    None,
    Indefinite,
    Definite,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PersonRole {
    Name,
    Subject,
    Object,
    Possessive,
    Reflexive,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GrammaticalPerson {
    First,
    Second,
    Third,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged, deny_unknown_fields)]
pub enum NarrationPart {
    Literal(String),
    Participant {
        #[serde(rename = "entityId")]
        entity_id: String,
        role: PersonRole,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        article: Option<NameArticle>,
    },
    Verb {
        #[serde(rename = "subjectId")]
        subject_id: String,
        verb: String,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Narration {
    pub parts: Vec<NarrationPart>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum CapturedKind {
    #[serde(rename = "captured-narration")]
    CapturedNarration,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CapturedNarration {
    pub kind: CapturedKind,
    pub narration: Narration,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub names: IndexMap<String, Named>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub self_id: Option<String>,
    pub person: GrammaticalPerson,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum NativeText {
    Literal(String),
    Captured(CapturedNarration),
}

fn ascii_word(character: char) -> bool {
    character.is_ascii_alphanumeric() || character == '_'
}
fn boundary_after(value: &str, prefix: &str) -> bool {
    value.starts_with(prefix)
        && value[prefix.len()..]
            .chars()
            .next()
            .is_none_or(|next| !ascii_word(next))
}

pub fn canonical_name(name: &str, form: Option<&str>) -> String {
    let name = js_trim(name);
    if form == Some("proper") {
        return name.to_owned();
    }
    let lower = name.to_ascii_lowercase();
    for prefix in ["an", "a", "the"] {
        if lower.starts_with(prefix) {
            let rest = &name[prefix.len()..];
            if rest.chars().next().is_some_and(is_js_whitespace) {
                // The source pattern removes only the whitespace after the
                // article. Trailing content has already had its outer trim.
                return rest.trim_start_matches(is_js_whitespace).to_owned();
            }
        }
    }
    name.to_owned()
}

pub fn valid_name_parts(name: &str, form: Option<&str>, article: Option<&str>) -> bool {
    !name.is_empty()
        && form.is_none_or(|form| matches!(form, "count" | "proper" | "plural" | "mass"))
        && article.is_none_or(|article| matches!(article, "a" | "an"))
        && canonical_name(name, form) == name
}

pub fn valid_name(named: &Named) -> bool {
    valid_name_parts(
        &named.name,
        named.name_form.as_deref(),
        named.indefinite_article.as_deref(),
    )
}

fn indefinite_article(name: &str) -> &'static str {
    let lower = name.to_ascii_lowercase();
    if ["honest", "honor", "honour", "hour", "heir"]
        .iter()
        .any(|prefix| lower.starts_with(prefix))
        || boundary_after(&lower, "herb")
        || boundary_after(&lower, "x-ray")
    {
        return "an";
    }
    let uni = lower.strip_prefix("uni").is_some_and(|rest| {
        rest.chars()
            .next()
            .is_none_or(|next| !matches!(next, 'n' | 'm' | 'd'))
    });
    let u_pair = lower.as_bytes().get(0..3).is_some_and(|chars| {
        chars[0] == b'u' && b"bcfhjkqrst".contains(&chars[1]) && b"aeiou".contains(&chars[2])
    });
    if boundary_after(&lower, "one")
        || boundary_after(&lower, "once")
        || lower.starts_with("ewe")
        || lower.starts_with("eul")
        || lower.starts_with("eur")
        || uni
        || u_pair
        || lower.starts_with("user")
        || boundary_after(&lower, "use")
        || lower.starts_with("usual")
    {
        return "a";
    }
    let uppercase = name.bytes().take_while(u8::is_ascii_uppercase).count();
    if uppercase > 0 {
        let next = name[uppercase..].chars().next();
        if next.is_none_or(|next| !ascii_word(next) || next == '-' || next.is_ascii_digit()) {
            return if b"AEFHILMNORSX".contains(&name.as_bytes()[0]) {
                "an"
            } else {
                "a"
            };
        }
    }
    if ["8", "11", "18"]
        .iter()
        .any(|prefix| boundary_after(&lower, prefix))
    {
        return "an";
    }
    if lower
        .as_bytes()
        .first()
        .is_some_and(|first| b"aeiou".contains(first))
    {
        "an"
    } else {
        "a"
    }
}

fn first_case(value: &str, upper: bool) -> String {
    let Some(first) = value.chars().next() else {
        return String::new();
    };
    // JavaScript cases value[0], a single UTF-16 code unit. A supplementary
    // character begins with an unpaired high surrogate in that operation.
    if first.len_utf16() == 2 {
        return value.to_owned();
    }
    let mut result: String = if upper {
        first.to_uppercase().collect()
    } else {
        first.to_lowercase().collect()
    };
    result.push_str(&value[first.len_utf8()..]);
    result
}

pub fn name_phrase(named: &Named, article: NameArticle, capitalize: bool) -> String {
    let name = canonical_name(&named.name, named.name_form.as_deref());
    if name.is_empty() {
        return name;
    }
    let form = named.name_form.as_deref().unwrap_or("count");
    let prefix = if form == "proper" || article == NameArticle::None {
        ""
    } else if article == NameArticle::Definite {
        "the"
    } else if form == "count" {
        named
            .indefinite_article
            .as_deref()
            .unwrap_or_else(|| indefinite_article(&name))
    } else {
        ""
    };
    let mut characters = name.chars();
    let first = characters.next().expect("name is nonempty");
    let second = characters.next();
    let keep_initial = first.is_ascii_uppercase()
        && second.is_none_or(|next| next.is_ascii_uppercase() || !ascii_word(next));
    let noun = if article != NameArticle::None && form != "proper" && !keep_initial {
        first_case(&name, false)
    } else {
        name
    };
    let phrase = if prefix.is_empty() {
        noun
    } else {
        format!("{prefix} {noun}")
    };
    if capitalize && form != "proper" {
        first_case(&phrase, true)
    } else {
        phrase
    }
}

pub fn personal_pronoun(role: PersonRole, person: GrammaticalPerson) -> &'static str {
    match (person == GrammaticalPerson::Second, role) {
        (true, PersonRole::Subject | PersonRole::Object) => "you",
        (true, PersonRole::Possessive) => "your",
        (true, PersonRole::Reflexive) => "yourself",
        (false, PersonRole::Subject) => "I",
        (false, PersonRole::Object) => "me",
        (false, PersonRole::Possessive) => "my",
        (false, PersonRole::Reflexive) => "myself",
        (_, PersonRole::Name) => unreachable!("name roles never select a pronoun"),
    }
}

pub fn person_phrase(
    named: &Named,
    role: PersonRole,
    self_subject: bool,
    article: NameArticle,
    person: GrammaticalPerson,
) -> String {
    if self_subject && role != PersonRole::Name {
        return personal_pronoun(role, person).to_owned();
    }
    if role == PersonRole::Reflexive {
        return if named.name_form.as_deref() == Some("plural") {
            "themselves"
        } else {
            "themself"
        }
        .to_owned();
    }
    let mut phrase = name_phrase(named, article, false);
    if role == PersonRole::Possessive {
        if named.name_form.as_deref() == Some("plural") && phrase.ends_with('s') {
            phrase.push('’');
        } else {
            phrase.push_str("’s");
        }
    }
    phrase
}

pub fn present_tense(verb: &str, first: bool, plural: bool, person: GrammaticalPerson) -> String {
    if verb == "be" {
        return (if first {
            if person == GrammaticalPerson::First {
                "am"
            } else {
                "are"
            }
        } else if plural {
            "are"
        } else {
            "is"
        })
        .to_owned();
    }
    if first || plural {
        return verb.to_owned();
    }
    if verb == "have" {
        return "has".to_owned();
    }
    if verb == "do" {
        return "does".to_owned();
    }
    if let Some(prefix) = verb.strip_suffix('y')
        && prefix
            .as_bytes()
            .last()
            .is_some_and(|before| !b"aeiou".contains(before))
    {
        return format!("{prefix}ies");
    }
    format!(
        "{verb}{}",
        if ["s", "x", "z", "ch", "sh", "o"]
            .iter()
            .any(|ending| verb.ends_with(ending))
        {
            "es"
        } else {
            "s"
        }
    )
}

impl Narration {
    pub fn validate(&self) -> bool {
        self.parts.iter().all(|part| match part {
            NarrationPart::Literal(_) => true,
            NarrationPart::Participant { entity_id, .. } => is_safe_record_id(entity_id),
            NarrationPart::Verb { subject_id, verb } => {
                is_safe_record_id(subject_id)
                    && !verb.is_empty()
                    && verb.bytes().all(|character| character.is_ascii_lowercase())
            }
        })
    }
}

impl NativeText {
    pub fn validate(&self) -> bool {
        match self {
            Self::Literal(_) => true,
            Self::Captured(value) => {
                value.narration.validate()
                    && value.self_id.as_deref().is_none_or(is_safe_record_id)
                    && value
                        .names
                        .iter()
                        .all(|(id, name)| is_safe_record_id(id) && valid_name(name))
                    && value.narration.parts.iter().all(|part| match part {
                        NarrationPart::Literal(_) => true,
                        NarrationPart::Participant { entity_id, .. } => {
                            value.names.contains_key(entity_id)
                        }
                        NarrationPart::Verb { subject_id, .. } => {
                            value.names.contains_key(subject_id)
                        }
                    })
            }
        }
    }
}

pub fn render_narration_parts(
    narration: &Narration,
    names: &IndexMap<String, Named>,
    self_id: Option<&str>,
    person: GrammaticalPerson,
) -> String {
    let unknown = Named {
        name: "unidentified individual".to_owned(),
        name_form: None,
        indefinite_article: None,
    };
    let named = |id: &str| names.get(id).unwrap_or(&unknown);
    let personal = person != GrammaticalPerson::Third;
    let grammatical = if person == GrammaticalPerson::Second {
        GrammaticalPerson::Second
    } else {
        GrammaticalPerson::First
    };
    let mut text = String::new();
    for part in &narration.parts {
        match part {
            NarrationPart::Literal(literal) => text.push_str(literal),
            NarrationPart::Verb { subject_id, verb } => text.push_str(&present_tense(
                verb,
                personal && self_id == Some(subject_id.as_str()),
                named(subject_id).name_form.as_deref() == Some("plural"),
                grammatical,
            )),
            NarrationPart::Participant {
                entity_id,
                role,
                article,
            } => {
                let self_subject = personal && self_id == Some(entity_id.as_str());
                let subject = named(entity_id);
                let article = article.unwrap_or(if personal {
                    NameArticle::Indefinite
                } else {
                    NameArticle::Definite
                });
                let value = if *role == PersonRole::Name {
                    name_phrase(subject, article, false)
                } else {
                    person_phrase(subject, *role, self_subject, article, grammatical)
                };
                if (text.is_empty() || js_trim(&text).ends_with(['.', '!', '?']))
                    && ((self_subject && *role != PersonRole::Name)
                        || subject.name_form.as_deref() != Some("proper"))
                {
                    text.push_str(&first_case(&value, true));
                } else {
                    text.push_str(&value);
                }
            }
        }
    }
    text
}

pub fn native_text(text: &NativeText) -> String {
    match text {
        NativeText::Literal(value) => value.clone(),
        NativeText::Captured(value) => render_narration_parts(
            &value.narration,
            &value.names,
            value.self_id.as_deref(),
            value.person,
        ),
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Intelligibility {
    Clear,
    Partial,
    None,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SpeechDelivery {
    Whisper,
    Normal,
    Shout,
}

/// Participant names and words have already passed the receiving boundary.
/// This grammar neither finds an audience nor recovers unheard speech.
pub struct SpeechPresentationInput<'a> {
    pub speaker: Option<&'a Named>,
    pub addressee: Option<&'a Named>,
    pub self_speaker: bool,
    pub addressed: bool,
    pub directed: bool,
    pub seen: bool,
    pub intelligibility: Intelligibility,
    pub delivery: Option<SpeechDelivery>,
    pub words: &'a str,
    pub second_person: bool,
}

pub struct SpeechPresentation {
    pub attribution: String,
    pub quotation: Option<String>,
    pub detail: String,
    pub description: String,
}

/// A heard bearing is language over already acquired facts. It performs no
/// source lookup and does not turn direction into a remembered location.
pub fn sound_description(sound: &crate::reception::PerceivedSound) -> String {
    use crate::reception::{Elevation, SoundAcquisition};
    let source = if sound.acquisition == SoundAcquisition::SelfBody {
        Some("my own body".to_owned())
    } else {
        sound
            .visible_source
            .as_ref()
            .map(|source| name_phrase(&source.description, NameArticle::Indefinite, false))
    };
    let direction = sound.direction.map(|direction| {
        let sector = [
            "east",
            "southeast",
            "south",
            "southwest",
            "west",
            "northwest",
            "north",
            "northeast",
        ][direction.sector as usize];
        let elevation = match direction.elevation {
            Elevation::Above => " and above",
            Elevation::Level => "",
            Elevation::Below => " and below",
        };
        (sector, elevation)
    });
    let mut text = String::with_capacity(
        "I heard a sound.".len()
            + source
                .as_ref()
                .map_or(0, |source| " from ".len() + source.len())
            + direction.map_or(0, |(sector, elevation)| {
                " to the ".len() + sector.len() + elevation.len()
            }),
    );
    text.push_str("I heard a sound");
    if let Some(source) = source {
        text.push_str(" from ");
        text.push_str(&source);
    }
    if let Some((sector, elevation)) = direction {
        text.push_str(" to the ");
        text.push_str(sector);
        text.push_str(elevation);
    }
    text.push('.');
    text
}

pub fn speech_presentation(input: SpeechPresentationInput<'_>) -> SpeechPresentation {
    let first = !input.second_person;
    let speaker = if input.self_speaker {
        if first { "I" } else { "You" }.to_owned()
    } else if let Some(named) = input.speaker {
        name_phrase(named, NameArticle::Indefinite, true)
    } else {
        "Someone nearby".to_owned()
    };
    let plural = !input.self_speaker
        && input
            .speaker
            .is_some_and(|named| named.name_form.as_deref() == Some("plural"));
    let recipient = if input.addressed {
        Some(
            if input.self_speaker {
                if first { "myself" } else { "yourself" }
            } else if first {
                "me"
            } else {
                "you"
            }
            .to_owned(),
        )
    } else if let Some(named) = input.addressee {
        Some(name_phrase(named, NameArticle::Indefinite, false))
    } else if input.directed {
        Some(
            if input.self_speaker {
                "someone"
            } else {
                "someone else"
            }
            .to_owned(),
        )
    } else {
        None
    };
    let destination = if let Some(recipient) = recipient {
        format!(" to {recipient}")
    } else if input.directed {
        String::new()
    } else {
        " aloud".to_owned()
    };
    if input.seen {
        let attribution = format!(
            "{speaker} {} to be speaking",
            if input.self_speaker || plural {
                "appear"
            } else {
                "appears"
            }
        );
        return SpeechPresentation {
            description: format!("{attribution}."),
            attribution,
            quotation: None,
            detail: "No words were heard.".to_owned(),
        };
    }
    if input.intelligibility == Intelligibility::None {
        let verb = match input.delivery {
            Some(SpeechDelivery::Whisper) => "whispering",
            Some(SpeechDelivery::Shout) => "shouting",
            _ => "speaking",
        };
        let auxiliary = if input.self_speaker {
            if first { "am" } else { "are" }
        } else if plural {
            "are"
        } else {
            "is"
        };
        let attribution = format!("{speaker} {auxiliary} {verb}{destination}");
        return SpeechPresentation {
            description: format!("{attribution}; the words are unintelligible."),
            attribution,
            quotation: None,
            detail: "The words are unintelligible.".to_owned(),
        };
    }
    let verb = match input.delivery {
        Some(SpeechDelivery::Whisper) => "whispered",
        Some(SpeechDelivery::Shout) => "shouted",
        _ => "said",
    };
    let attribution = format!("{speaker} {verb}{destination}");
    SpeechPresentation {
        description: format!(
            "{attribution}: “{}”{}",
            input.words,
            if input.intelligibility == Intelligibility::Partial {
                " (partly heard)."
            } else {
                ""
            }
        ),
        attribution,
        quotation: Some(input.words.to_owned()),
        detail: input.words.to_owned(),
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NarrationToken<'a> {
    pub binding: &'a str,
    pub role: Option<PersonRole>,
    pub article: Option<NameArticle>,
    pub verb: Option<&'a str>,
}

pub fn parse_narration_token(token: &str) -> Option<NarrationToken<'_>> {
    let (binding, meaning) = token.split_once('.')?;
    if !binding.as_bytes().first()?.is_ascii_alphabetic()
        || !binding
            .bytes()
            .all(|character| character.is_ascii_alphanumeric() || character == b'_')
    {
        return None;
    }
    if let Some(verb) = meaning.strip_prefix("verb:") {
        return (!verb.is_empty() && verb.bytes().all(|character| character.is_ascii_lowercase()))
            .then_some(NarrationToken {
                binding,
                role: None,
                article: None,
                verb: Some(verb),
            });
    }
    let (role, article) = meaning
        .split_once(':')
        .map_or((meaning, None), |(role, article)| (role, Some(article)));
    let role = match role {
        "name" => PersonRole::Name,
        "subject" => PersonRole::Subject,
        "object" => PersonRole::Object,
        "possessive" => PersonRole::Possessive,
        "reflexive" => PersonRole::Reflexive,
        _ => return None,
    };
    let article = match article {
        None => None,
        Some("none") => Some(NameArticle::None),
        Some("indefinite") => Some(NameArticle::Indefinite),
        Some("definite") => Some(NameArticle::Definite),
        _ => return None,
    };
    Some(NarrationToken {
        binding,
        role: Some(role),
        article,
        verb: None,
    })
}

pub enum TemplateBinding<'a> {
    Entity { id: &'a str, name: &'a Named },
    Named(&'a Named),
}

/// Bindings identify actual entities separately from named definition values.
/// A definition's id can never become a personal entity reference by accident.
pub fn narration_template(
    template: &str,
    bindings: &IndexMap<&str, TemplateBinding<'_>>,
) -> Narration {
    let mut parts = Vec::new();
    let mut end = 0;
    let mut open = None;
    for (at, character) in template.char_indices() {
        if character == '{' {
            open = Some(at);
        } else if character == '}' {
            let Some(from) = open.take() else { continue };
            let Some(token) = parse_narration_token(&template[from + 1..at]) else {
                continue;
            };
            parts.push(NarrationPart::Literal(template[end..from].to_owned()));
            let value = bindings.get(token.binding);
            let unknown = Named {
                name: "unknown".to_owned(),
                name_form: None,
                indefinite_article: None,
            };
            let (entity, named) = match value {
                Some(TemplateBinding::Entity { id, name }) => (Some(*id), *name),
                Some(TemplateBinding::Named(name)) => (None, *name),
                None => (None, &unknown),
            };
            if let Some(verb) = token.verb {
                if let Some(id) = entity {
                    parts.push(NarrationPart::Verb {
                        subject_id: id.to_owned(),
                        verb: verb.to_owned(),
                    });
                } else {
                    parts.push(NarrationPart::Literal(present_tense(
                        verb,
                        false,
                        named.name_form.as_deref() == Some("plural"),
                        GrammaticalPerson::First,
                    )));
                }
            } else {
                let role = token.role.expect("parsed role or verb");
                if let Some(id) = entity {
                    parts.push(NarrationPart::Participant {
                        entity_id: id.to_owned(),
                        role,
                        article: token.article,
                    });
                } else {
                    parts.push(NarrationPart::Literal(if role == PersonRole::Name {
                        name_phrase(named, token.article.unwrap_or(NameArticle::None), false)
                    } else {
                        person_phrase(
                            named,
                            role,
                            false,
                            token.article.unwrap_or(NameArticle::None),
                            GrammaticalPerson::First,
                        )
                    }));
                }
            }
            end = at + 1;
        }
    }
    parts.push(NarrationPart::Literal(template[end..].to_owned()));
    Narration { parts }
}
