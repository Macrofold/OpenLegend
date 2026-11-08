//! Wilderness event disclosure consumes the one authored descriptor exported
//! by worlds/base/event-disclosure.ts. No activity words or payload allowlists
//! are copied into native engine code or invented at reception.

use crate::events::{EmissionText, EventScope, WorldEvent};
use crate::narration::{Narration, NarrationPart, NativeText, PersonRole, native_text};
use crate::reception::EventScalar;
use crate::values::deserialize_safe_integer;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EventDisclosure {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    fields: IndexMap<String, Vec<String>>,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    activity: IndexMap<String, String>,
    physical_references: Vec<String>,
    shared: Vec<String>,
    contact_metrics: Vec<String>,
    felt_events: Vec<String>,
    contact_field: String,
    offer_field: String,
    gate_events: Vec<String>,
    gate_checked_event: String,
    operation_field: String,
    close_operation: String,
    bar_fields: Vec<String>,
    private_body_event: String,
    private_body_metrics: Vec<String>,
    attribute_event: String,
    cause_field: String,
    partial_type: String,
    text: DisclosureText,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DisclosureText {
    unseen_impact: String,
    default_activity: String,
    target_activity: String,
    unknown_activity: String,
    cause_prefix: String,
}

impl crate::install::DefinitionIdentity for EventDisclosure {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}

fn subject_narration(id: &str, rest: &str) -> EmissionText {
    EmissionText::Narration(Narration {
        parts: vec![
            NarrationPart::Participant {
                entity_id: id.to_owned(),
                role: PersonRole::Subject,
                article: None,
            },
            NarrationPart::Literal(" ".to_owned()),
            NarrationPart::Literal(rest.to_owned()),
        ],
    })
}

impl EventDisclosure {
    pub fn partial_type(&self) -> &str {
        &self.partial_type
    }

    fn value<'a>(&self, event: &'a WorldEvent, key: &str) -> Option<&'a EventScalar> {
        event.data.as_ref().and_then(|data| data.get(key))
    }
    fn contact(&self, event: &WorldEvent) -> bool {
        matches!(
            self.value(event, &self.contact_field),
            Some(EventScalar::Boolean(true))
        )
    }
    pub fn felt_target<'a>(&self, event: &'a WorldEvent) -> Option<&'a str> {
        if self.felt_events.contains(&event.event_type) && self.contact(event) {
            event.target_id.as_deref()
        } else {
            None
        }
    }
    pub fn permits_details(&self, event: &WorldEvent, observer_id: &str) -> bool {
        !matches!(
            self.value(event, &self.offer_field),
            Some(EventScalar::Text(_))
        ) || event.actor_id.as_deref() == Some(observer_id)
            || event.target_id.as_deref() == Some(observer_id)
    }
    pub fn references<'a>(&self, event: &'a WorldEvent) -> Vec<&'a str> {
        self.physical_references
            .iter()
            .filter_map(|key| match self.value(event, key) {
                Some(EventScalar::Text(value)) => Some(value.as_str()),
                _ => None,
            })
            .collect()
    }
    pub fn partial(
        &self,
        event: &WorldEvent,
        source_id: Option<&str>,
        target_id: Option<&str>,
    ) -> EmissionText {
        if source_id.is_none()
            && let Some(target) = target_id
            && self.contact(event)
        {
            return subject_narration(target, &self.text.unseen_impact);
        }
        if let Some(source) = source_id {
            return subject_narration(
                source,
                self.activity
                    .get(&event.event_type)
                    .unwrap_or(&self.text.default_activity),
            );
        }
        if let Some(target) = target_id {
            return subject_narration(target, &self.text.target_activity);
        }
        EmissionText::Literal(self.text.unknown_activity.clone())
    }

    pub fn complete_text(
        &self,
        event: &WorldEvent,
        data: &IndexMap<String, EventScalar>,
        text: NativeText,
    ) -> NativeText {
        if event.event_type == self.attribute_event
            && let Some(EventScalar::Text(cause)) = data.get(&self.cause_field)
        {
            let mut value = native_text(&text);
            if value.ends_with(['.', '!', '?']) {
                value.pop();
            }
            value.push_str(&self.text.cause_prefix);
            value.push_str(&cause.to_lowercase());
            value.push('.');
            NativeText::Literal(value)
        } else {
            text
        }
    }

    pub fn data(
        &self,
        event: &WorldEvent,
        observer_id: &str,
        detailed: bool,
    ) -> IndexMap<String, EventScalar> {
        let Some(data) = &event.data else {
            return IndexMap::new();
        };
        if !detailed {
            if event.target_id.as_deref() != Some(observer_id) || !self.contact(event) {
                return IndexMap::new();
            }
            return std::iter::once(&self.contact_field)
                .chain(self.contact_metrics.iter())
                .filter_map(|key| data.get(key).map(|value| (key.clone(), value.clone())))
                .collect();
        }
        let owned = event.scope == Some(EventScope::Private)
            || event.actor_id.as_deref() == Some(observer_id);
        let mut keys: Vec<&String> = if self.gate_events.contains(&event.event_type) {
            self.fields.get(&event.event_type).into_iter().flatten().filter(|key| {
                event.event_type != self.gate_checked_event
                    || !matches!(self.value(event, &self.operation_field), Some(EventScalar::Text(value)) if value == &self.close_operation)
                    || !self.bar_fields.contains(key)
            }).collect()
        } else if owned {
            data.keys().collect()
        } else {
            self.shared
                .iter()
                .chain(self.fields.get(&event.event_type).into_iter().flatten())
                .collect()
        };
        let private_metrics = if event.event_type == self.private_body_event {
            self.private_body_metrics.as_slice()
        } else if self.contact(event) {
            self.contact_metrics.as_slice()
        } else {
            &[]
        };
        if event.target_id.as_deref() == Some(observer_id) {
            keys.extend(private_metrics);
        }
        keys.into_iter()
            .filter(|key| {
                event.target_id.as_deref() == Some(observer_id) || !private_metrics.contains(key)
            })
            .filter_map(|key| data.get(key).map(|value| (key.clone(), value.clone())))
            .collect()
    }
}
