//! Operator-authored experimental context. An enabled value belongs only to
//! its intended decision recipients and never enters a character's saved mind.
mod context;
mod store;
pub(crate) use context::{Context, History, ReadStamp};
mod editor;
pub(crate) mod exchange;
pub(super) use editor::router;
use serde::{Deserialize, Serialize};
pub(super) use store::initialize;
pub(crate) use store::{FieldRevision, read_checkpoint_ref, restore_checkpoint_ref};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Field<T> {
    id: Uuid,
    label: String,
    description: String,
    enabled: bool,
    subject: Subject<T>,
    recipients: Vec<T>,
    value: FieldValue,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
enum Subject<T> {
    Scene,
    Person { person: T },
    Object { object: T },
    Relation { from: T, to: T },
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
enum FieldValue {
    Text {
        value: String,
    },
    Boolean {
        value: bool,
    },
    Number {
        value: f64,
    },
    Meter {
        value: f64,
        minimum: Option<f64>,
        maximum: Option<f64>,
        unit: Option<String>,
    },
}
impl FieldValue {
    fn valid(&self) -> bool {
        match self {
            Self::Number { value } => value.is_finite(),
            Self::Meter {
                value,
                minimum,
                maximum,
                unit,
            } => {
                value.is_finite()
                    && minimum.zip(*maximum).is_none_or(|(lo, hi)| lo <= hi)
                    && unit
                        .as_ref()
                        .is_none_or(|value| value.encode_utf16().count() <= 80)
            }
            _ => true,
        }
    }
}
#[derive(Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Binding {
    id: String,
    life: Option<u64>,
    // The author supplies the wording deliberately shown to the model. It
    // cannot reveal an NPC's canonical name through a player's contact handle.
    label: String,
}
impl<T> Field<T> {
    fn try_map<U, E>(self, mut f: impl FnMut(T, bool) -> Result<U, E>) -> Result<Field<U>, E> {
        let subject = match self.subject {
            Subject::Scene => Subject::Scene,
            Subject::Person { person } => Subject::Person {
                person: f(person, true)?,
            },
            Subject::Object { object } => Subject::Object {
                object: f(object, false)?,
            },
            Subject::Relation { from, to } => Subject::Relation {
                from: f(from, true)?,
                to: f(to, true)?,
            },
        };
        Ok(Field {
            id: self.id,
            label: self.label,
            description: self.description,
            enabled: self.enabled,
            subject,
            recipients: self
                .recipients
                .into_iter()
                .map(|r| f(r, true))
                .collect::<Result<_, _>>()?,
            value: self.value,
        })
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Contact {
    reference: String,
    label: String,
}
impl Field<Contact> {
    fn valid(&self) -> bool {
        !self.label.trim().is_empty()
            && self.label.encode_utf16().count() <= 200
            && self.description.encode_utf16().count() <= 4000
            && !self.recipients.is_empty()
            && self.value.valid()
    }
}
