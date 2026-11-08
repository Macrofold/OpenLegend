//! Pure English participant grammar over already selected event-time names.
//! Source: packages/language/src/index.ts and domain/narration.ts. Literal text
//! and quotations are never reparsed, and this module has no world lookup.

use crate::encoding::{is_js_whitespace, js_trim};
use crate::state::Named;
use crate::text::JsText;
use crate::values::{deserialize_present_option, is_safe_record_id};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

mod numbers;
mod retained_size;
pub(crate) use numbers::display_number;

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

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged, deny_unknown_fields)]
pub enum NarrationPart {
    Literal(JsText),
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

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub enum NativeText {
    Literal(JsText),
    Captured(CapturedNarration),
}

impl<'de> Deserialize<'de> for NativeText {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(de)?;
        if raw.get().starts_with('"') {
            serde_json::from_str(raw.get())
                .map(Self::Literal)
                .map_err(serde::de::Error::custom)
        } else {
            serde_json::from_str(raw.get())
                .map(Self::Captured)
                .map_err(serde::de::Error::custom)
        }
    }
}
impl<'de> Deserialize<'de> for NarrationPart {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(de)?;
        let parse = || -> Result<Self, String> {
            if raw.get().starts_with('"') {
                return serde_json::from_str(raw.get())
                    .map(Self::Literal)
                    .map_err(|error| error.to_string());
            }
            let mut fields = crate::encoding::RawFields::parse(raw.get())?;
            let result = if fields.contains("entityId") {
                Self::Participant {
                    entity_id: fields.take("entityId")?,
                    role: fields.take("role")?,
                    article: fields.optional("article")?,
                }
            } else {
                Self::Verb {
                    subject_id: fields.take("subjectId")?,
                    verb: fields.take("verb")?,
                }
            };
            fields.finish()?;
            Ok(result)
        };
        parse().map_err(serde::de::Error::custom)
    }
}

fn ascii_word(character: char) -> bool {
    character.is_ascii_alphanumeric() || character == '_'
}
fn ascii_unit(unit: u16) -> bool {
    unit <= 127 && (unit as u8).is_ascii_alphanumeric() || unit == 95
}
fn boundary_after(value: &JsText, prefix: &str) -> bool {
    value.starts_with_str(prefix)
        && value
            .unit_at(prefix.len())
            .is_none_or(|next| !ascii_unit(next))
}
pub fn canonical_name(name: &JsText, form: Option<&str>) -> JsText {
    let name = name.trimmed();
    if form == Some("proper") {
        return name;
    }
    let lower = name.ascii_lowercase();
    for prefix in ["an", "a", "the"] {
        if lower.starts_with_str(prefix)
            && name
                .unit_at(prefix.len())
                .is_some_and(|unit| char::from_u32(u32::from(unit)).is_some_and(is_js_whitespace))
        {
            return name.slice(prefix.len()..name.units_len()).trimmed();
        }
    }
    name
}
pub fn valid_name_parts(name: &JsText, form: Option<&str>, article: Option<&str>) -> bool {
    !name.is_empty()
        && form.is_none_or(|form| matches!(form, "count" | "proper" | "plural" | "mass"))
        && article.is_none_or(|article| matches!(article, "a" | "an"))
        && canonical_name(name, form) == *name
}
pub fn valid_name(named: &Named) -> bool {
    valid_name_parts(
        &named.name,
        named.name_form.as_deref(),
        named.indefinite_article.as_deref(),
    )
}
fn indefinite_article(name: &JsText) -> &'static str {
    let lower = name.ascii_lowercase();
    if ["honest", "honor", "honour", "hour", "heir"]
        .iter()
        .any(|prefix| lower.starts_with_str(prefix))
        || boundary_after(&lower, "herb")
        || boundary_after(&lower, "x-ray")
    {
        return "an";
    }
    let uni = lower.starts_with_str("uni")
        && lower
            .unit_at(3)
            .is_none_or(|unit| !matches!(unit, 110 | 109 | 100));
    let u_pair = lower.unit_at(0) == Some(117)
        && lower
            .unit_at(1)
            .is_some_and(|unit| unit <= 127 && b"bcfhjkqrst".contains(&(unit as u8)))
        && lower
            .unit_at(2)
            .is_some_and(|unit| unit <= 127 && b"aeiou".contains(&(unit as u8)));
    if boundary_after(&lower, "one")
        || boundary_after(&lower, "once")
        || ["ewe", "eul", "eur", "user", "usual"]
            .iter()
            .any(|prefix| lower.starts_with_str(prefix))
        || uni
        || u_pair
        || boundary_after(&lower, "use")
    {
        return "a";
    }
    let uppercase = name
        .units()
        .take_while(|unit| (65..=90).contains(unit))
        .count();
    if uppercase > 0
        && name
            .unit_at(uppercase)
            .is_none_or(|next| !ascii_unit(next) || next == 45 || (48..=57).contains(&next))
    {
        return if name
            .unit_at(0)
            .is_some_and(|unit| b"AEFHILMNORSX".contains(&(unit as u8)))
        {
            "an"
        } else {
            "a"
        };
    }
    if ["8", "11", "18"]
        .iter()
        .any(|prefix| boundary_after(&lower, prefix))
    {
        return "an";
    }
    if lower
        .unit_at(0)
        .is_some_and(|unit| unit <= 127 && b"aeiou".contains(&(unit as u8)))
    {
        "an"
    } else {
        "a"
    }
}
fn first_case(value: &JsText, upper: bool) -> JsText {
    value.first_case(upper)
}
pub fn name_phrase(named: &Named, article: NameArticle, capitalize: bool) -> JsText {
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
    let keep_initial = name
        .unit_at(0)
        .is_some_and(|unit| (65..=90).contains(&unit))
        && name
            .unit_at(1)
            .is_none_or(|next| (65..=90).contains(&next) || !ascii_unit(next));
    let noun = if article != NameArticle::None && form != "proper" && !keep_initial {
        first_case(&name, false)
    } else {
        name
    };
    let phrase = if prefix.is_empty() {
        noun
    } else {
        let mut text: JsText = prefix.into();
        text.push_str(" ");
        text.push_text(&noun);
        text
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
) -> JsText {
    if self_subject && role != PersonRole::Name {
        return personal_pronoun(role, person).into();
    }
    if role == PersonRole::Reflexive {
        return if named.name_form.as_deref() == Some("plural") {
            "themselves"
        } else {
            "themself"
        }
        .into();
    }
    let mut phrase = name_phrase(named, article, false);
    if role == PersonRole::Possessive {
        if named.name_form.as_deref() == Some("plural") && phrase.ends_with_str("s") {
            phrase.push_str("’");
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
) -> JsText {
    let unknown = Named {
        name: "unidentified individual".into(),
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
    let mut text = JsText::default();
    for part in &narration.parts {
        match part {
            NarrationPart::Literal(literal) => text.push_text(literal),
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
                if (text.is_empty()
                    || text
                        .borrowed()
                        .trimmed()
                        .units()
                        .last()
                        .is_some_and(|unit| matches!(unit, 46 | 33 | 63)))
                    && ((self_subject && *role != PersonRole::Name)
                        || subject.name_form.as_deref() != Some("proper"))
                {
                    text.push_text(&first_case(&value, true));
                } else {
                    text.push_text(&value);
                }
            }
        }
    }
    text
}

pub fn native_text(text: &NativeText) -> JsText {
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

/// Allocation bound for the actual English renderer, including its temporary
/// phrases and String growth. Unicode case mapping has at most three scalars
/// of four UTF-8 bytes each; grammatical additions are bounded by this module.
/// Lookup supplies only a permitted/captured name length, never another read.
pub(crate) fn narration_render_bound(
    narration: &Narration,
    name_bytes: impl Fn(&str) -> Option<usize>,
) -> Option<usize> {
    let bytes = narration.parts.iter().try_fold(0usize, |bytes, part| {
        bytes.checked_add(match part {
            NarrationPart::Literal(text) => text.storage_bytes(),
            NarrationPart::Participant { entity_id, .. } => name_bytes(entity_id)
                .unwrap_or("someone".len())
                .checked_mul(12)?
                .checked_add(128)?,
            NarrationPart::Verb { verb, .. } => verb.len().checked_mul(12)?.checked_add(128)?,
        })
    })?;
    bytes.checked_mul(4)
}

pub(crate) fn native_text_bound(text: &NativeText) -> Option<usize> {
    match text {
        NativeText::Literal(text) => Some(text.storage_bytes()),
        NativeText::Captured(captured) => narration_render_bound(&captured.narration, |id| {
            captured.names.get(id).map(|name| name.name.storage_bytes())
        }),
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
    pub words: &'a JsText,
    pub second_person: bool,
}

pub struct SpeechPresentation {
    pub attribution: JsText,
    pub quotation: Option<JsText>,
    pub detail: JsText,
    pub description: JsText,
}

/// A heard bearing is language over already acquired facts. It performs no
/// source lookup and does not turn direction into a remembered location.
pub fn sound_description(sound: &crate::reception::PerceivedSound) -> JsText {
    use crate::reception::{Elevation, SoundAcquisition};
    let source = if sound.acquisition == SoundAcquisition::SelfBody {
        Some("my own body".into())
    } else {
        sound
            .visible_source
            .as_ref()
            .map(|source| name_phrase(&source.description, NameArticle::Indefinite, false))
    };
    let mut text: JsText = "I heard a sound".into();
    if let Some(source) = source {
        text.push_str(" from ");
        text.push_text(&source);
    }
    if let Some(direction) = sound.direction {
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
        text.push_str(" to the ");
        text.push_str(sector);
        text.push_str(match direction.elevation {
            Elevation::Above => " and above",
            Elevation::Level => "",
            Elevation::Below => " and below",
        });
    }
    text.push_str(".");
    text
}
pub fn speech_presentation(input: SpeechPresentationInput<'_>) -> SpeechPresentation {
    let first = !input.second_person;
    let speaker: JsText = if input.self_speaker {
        if first { "I" } else { "You" }.into()
    } else if let Some(named) = input.speaker {
        name_phrase(named, NameArticle::Indefinite, true)
    } else {
        "Someone nearby".into()
    };
    let plural = !input.self_speaker
        && input
            .speaker
            .is_some_and(|named| named.name_form.as_deref() == Some("plural"));
    let recipient: Option<JsText> = if input.addressed {
        Some(
            if input.self_speaker {
                if first { "myself" } else { "yourself" }
            } else if first {
                "me"
            } else {
                "you"
            }
            .into(),
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
            .into(),
        )
    } else {
        None
    };
    let mut destination = JsText::default();
    if let Some(recipient) = recipient {
        destination.push_str(" to ");
        destination.push_text(&recipient);
    } else if !input.directed {
        destination.push_str(" aloud");
    }
    let mut attribution = speaker;
    if input.seen {
        attribution.push_str(if input.self_speaker || plural {
            " appear to be speaking"
        } else {
            " appears to be speaking"
        });
        let mut description = attribution.clone();
        description.push_str(".");
        return SpeechPresentation {
            description,
            attribution,
            quotation: None,
            detail: "No words were heard.".into(),
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
        attribution.push_str(" ");
        attribution.push_str(auxiliary);
        attribution.push_str(" ");
        attribution.push_str(verb);
        attribution.push_text(&destination);
        let mut description = attribution.clone();
        description.push_str("; the words are unintelligible.");
        return SpeechPresentation {
            description,
            attribution,
            quotation: None,
            detail: "The words are unintelligible.".into(),
        };
    }
    let verb = match input.delivery {
        Some(SpeechDelivery::Whisper) => "whispered",
        Some(SpeechDelivery::Shout) => "shouted",
        _ => "said",
    };
    attribution.push_str(" ");
    attribution.push_str(verb);
    attribution.push_text(&destination);
    let mut description = attribution.clone();
    description.push_str(": “");
    description.push_text(input.words);
    description.push_str("”");
    if input.intelligibility == Intelligibility::Partial {
        description.push_str(" (partly heard).");
    }
    SpeechPresentation {
        description,
        attribution,
        quotation: Some(input.words.clone()),
        detail: input.words.clone(),
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
            parts.push(NarrationPart::Literal(
                template[end..from].to_owned().into(),
            ));
            let value = bindings.get(token.binding);
            let unknown = Named {
                name: "unknown".into(),
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
                    parts.push(NarrationPart::Literal(
                        present_tense(
                            verb,
                            false,
                            named.name_form.as_deref() == Some("plural"),
                            GrammaticalPerson::First,
                        )
                        .into(),
                    ));
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
                        name_phrase(named, token.article.unwrap_or(NameArticle::None), false).into()
                    } else {
                        person_phrase(
                            named,
                            role,
                            false,
                            token.article.unwrap_or(NameArticle::None),
                            GrammaticalPerson::First,
                        )
                        .into()
                    }));
                }
            }
            end = at + 1;
        }
    }
    parts.push(NarrationPart::Literal(template[end..].to_owned().into()));
    Narration { parts }
}
