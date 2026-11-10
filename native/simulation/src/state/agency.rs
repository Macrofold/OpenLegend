//! Agency property order is consumed by Source's raw decision fingerprint.
//! Keep only its nine inline field tags beside the canonical typed values;
//! optional fields are appended by their real mutation owners and journalled.
use super::ActorAgency;
use serde::de::{Error, MapAccess, Visitor};
use serde::ser::SerializeMap;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

#[derive(Clone, Copy, Debug, PartialEq, Deserialize)]
#[serde(field_identifier)]
enum Field {
    #[serde(rename = "semantic")]
    Semantic,
    #[serde(rename = "lastResultEvidence")]
    LastResultEvidence,
    #[serde(rename = "revision")]
    Revision,
    #[serde(rename = "goals")]
    Goals,
    #[serde(rename = "plan")]
    Plan,
    #[serde(rename = "suspended")]
    Suspended,
    #[serde(rename = "history")]
    History,
    #[serde(rename = "attempts")]
    Attempts,
    #[serde(rename = "places")]
    Places,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct AgencyOrder {
    fields: [Field; 9],
    len: u8,
}
impl AgencyOrder {
    fn empty() -> Self {
        Self {
            fields: [Field::Revision; 9],
            len: 0,
        }
    }
    /// The real seedAgency factory, also used for a newly created corpse actor.
    pub(crate) fn opening() -> Self {
        let mut order = Self::empty();
        for field in [
            Field::Semantic,
            Field::Revision,
            Field::Goals,
            Field::Plan,
            Field::History,
            Field::Attempts,
        ] {
            order.insert(field);
        }
        order
    }
    fn insert(&mut self, field: Field) {
        if !self.fields[..self.len as usize].contains(&field) {
            // There are exactly nine closed fields; each is inserted once.
            self.fields[self.len as usize] = field;
            self.len += 1;
        }
    }
    pub(crate) fn result_evidence(&mut self) {
        self.insert(Field::LastResultEvidence);
    }
    pub(crate) fn places(&mut self) {
        self.insert(Field::Places);
    }
    pub(crate) fn suspended(&mut self) {
        self.insert(Field::Suspended);
    }
}

impl ActorAgency {
    pub(crate) fn serialize_without_semantic<S: Serializer>(
        &self,
        serializer: S,
    ) -> Result<S::Ok, S::Error> {
        self.serialize_fields(serializer, false)
    }
    fn serialize_fields<S: Serializer>(
        &self,
        serializer: S,
        include_semantic: bool,
    ) -> Result<S::Ok, S::Error> {
        // New canonical fields require an explicit serialization and validity
        // decision here instead of silently disappearing from either consumer.
        let Self {
            semantic,
            last_result_evidence,
            revision,
            goals,
            plan,
            suspended,
            history,
            attempts,
            places,
            order,
        } = self;
        let mut map = serializer.serialize_map(None)?;
        for field in &order.fields[..order.len as usize] {
            match field {
                Field::Semantic => {
                    if include_semantic {
                        if let Some(value) = semantic {
                            map.serialize_entry("semantic", value)?;
                        }
                    }
                }
                Field::LastResultEvidence => {
                    if let Some(value) = last_result_evidence {
                        map.serialize_entry("lastResultEvidence", value)?;
                    }
                }
                Field::Revision => map.serialize_entry("revision", revision)?,
                Field::Goals => map.serialize_entry("goals", goals)?,
                Field::Plan => map.serialize_entry("plan", plan)?,
                Field::Suspended => {
                    if let Some(value) = suspended {
                        map.serialize_entry("suspended", value)?;
                    }
                }
                Field::History => map.serialize_entry("history", history)?,
                Field::Attempts => map.serialize_entry("attempts", attempts)?,
                Field::Places => {
                    if let Some(value) = places {
                        map.serialize_entry("places", value)?;
                    }
                }
            }
        }
        map.end()
    }
}
impl Serialize for ActorAgency {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.serialize_fields(serializer, true)
    }
}
impl<'de> Deserialize<'de> for ActorAgency {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        #[serde(transparent)]
        struct Revision(#[serde(deserialize_with = "crate::values::deserialize_safe_integer")] u64);
        struct AgencyVisitor;
        impl<'de> Visitor<'de> for AgencyVisitor {
            type Value = ActorAgency;
            fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                formatter.write_str("an actor agency with its closed current fields")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let (mut semantic, mut last_result_evidence, mut revision) = (None, None, None);
                let (mut goals, mut plan, mut suspended) = (None, None, None);
                let (mut history, mut attempts, mut places) = (None, None, None);
                let mut order = AgencyOrder::empty();
                while let Some(field) = map.next_key::<Field>()? {
                    macro_rules! read {
                        ($slot:ident, $name:literal) => {{
                            if $slot.is_some() {
                                return Err(A::Error::duplicate_field($name));
                            }
                            $slot = Some(map.next_value()?);
                        }};
                    }
                    match field {
                        Field::Semantic => read!(semantic, "semantic"),
                        Field::LastResultEvidence => {
                            read!(last_result_evidence, "lastResultEvidence")
                        }
                        Field::Revision => read!(revision, "revision"),
                        Field::Goals => read!(goals, "goals"),
                        Field::Plan => read!(plan, "plan"),
                        Field::Suspended => read!(suspended, "suspended"),
                        Field::History => read!(history, "history"),
                        Field::Attempts => read!(attempts, "attempts"),
                        Field::Places => read!(places, "places"),
                    }
                    order.insert(field);
                }
                Ok(ActorAgency {
                    semantic,
                    last_result_evidence,
                    revision: revision
                        .map(|value: Revision| value.0)
                        .ok_or_else(|| A::Error::missing_field("revision"))?,
                    goals: goals.ok_or_else(|| A::Error::missing_field("goals"))?,
                    plan: plan.ok_or_else(|| A::Error::missing_field("plan"))?,
                    suspended,
                    history: history.ok_or_else(|| A::Error::missing_field("history"))?,
                    attempts: attempts.ok_or_else(|| A::Error::missing_field("attempts"))?,
                    places,
                    order,
                })
            }
        }
        deserializer.deserialize_map(AgencyVisitor)
    }
}
