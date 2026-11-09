//! Reference factories have different Source member order. That order enters
//! pooled value identity (received-values.ts), so retain it through cold reads
//! instead of replacing it with one struct declaration order.
use super::ReferenceRole;
use crate::text::JsText;
use serde::de::{Error, MapAccess, Visitor};
use serde::ser::SerializeMap;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

#[derive(Clone, Copy, Debug, PartialEq, Deserialize)]
#[serde(field_identifier, rename_all = "camelCase")]
enum Field {
    Id,
    Role,
    Label,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ReceivedReference {
    pub id: String,
    pub label: JsText,
    pub role: ReferenceRole,
    order: [Field; 3],
}
impl ReceivedReference {
    pub(crate) fn ordinary(id: String, label: JsText, role: ReferenceRole) -> Self {
        Self {
            id,
            label,
            role,
            order: [Field::Id, Field::Role, Field::Label],
        }
    }
    pub(crate) fn sound(id: String, label: JsText, role: ReferenceRole) -> Self {
        Self {
            id,
            label,
            role,
            order: [Field::Id, Field::Label, Field::Role],
        }
    }
}
impl Serialize for ReceivedReference {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(3))?;
        for field in self.order {
            match field {
                Field::Id => map.serialize_entry("id", &self.id)?,
                Field::Role => map.serialize_entry("role", &self.role)?,
                Field::Label => map.serialize_entry("label", &self.label)?,
            }
        }
        map.end()
    }
}
impl<'de> Deserialize<'de> for ReceivedReference {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct ReferenceVisitor;
        impl<'de> Visitor<'de> for ReferenceVisitor {
            type Value = ReceivedReference;
            fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                formatter.write_str("a received reference with id, role and label")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let (mut id, mut role, mut label) = (None, None, None);
                let mut order = [Field::Id; 3];
                let mut at = 0;
                while let Some(field) = map.next_key::<Field>()? {
                    match field {
                        Field::Id => {
                            if id.is_some() {
                                return Err(A::Error::duplicate_field("id"));
                            }
                            id = Some(map.next_value()?);
                        }
                        Field::Role => {
                            if role.is_some() {
                                return Err(A::Error::duplicate_field("role"));
                            }
                            role = Some(map.next_value()?);
                        }
                        Field::Label => {
                            if label.is_some() {
                                return Err(A::Error::duplicate_field("label"));
                            }
                            label = Some(map.next_value()?);
                        }
                    }
                    // Exactly three distinct supported keys can reach here.
                    order[at] = field;
                    at += 1;
                }
                Ok(ReceivedReference {
                    id: id.ok_or_else(|| A::Error::missing_field("id"))?,
                    role: role.ok_or_else(|| A::Error::missing_field("role"))?,
                    label: label.ok_or_else(|| A::Error::missing_field("label"))?,
                    order,
                })
            }
        }
        deserializer.deserialize_struct(
            "ReceivedReference",
            &["id", "role", "label"],
            ReferenceVisitor,
        )
    }
}
