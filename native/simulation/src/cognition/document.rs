//! Source publishInnerWorld keeps unchanged document objects, while a
//! publication constructs changed documents with protected before evidence.
//! Preserve actual imported row order through this same publication boundary:
//! docs/memory-architecture.md#8-reflection-workspaces-and-publication.
use super::EvidenceLink;
use crate::text::JsText;
use serde::de::{Error, MapAccess, Visitor};
use serde::ser::SerializeMap;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

#[derive(Clone, Copy, Debug, PartialEq, Deserialize)]
#[serde(field_identifier)]
enum Field {
    #[serde(rename = "id")]
    Id,
    #[serde(rename = "title")]
    Title,
    #[serde(rename = "text")]
    Text,
    #[serde(rename = "revision")]
    Revision,
    #[serde(rename = "evidence")]
    Evidence,
    #[serde(rename = "protected")]
    Protected,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct MindDocument {
    pub id: String,
    pub title: JsText,
    pub text: JsText,
    pub revision: u64,
    pub evidence: Vec<EvidenceLink>,
    pub protected: bool,
    order: [Field; 6],
}
impl MindDocument {
    pub(super) fn published(
        id: String,
        title: JsText,
        text: JsText,
        revision: u64,
        protected: bool,
        evidence: Vec<EvidenceLink>,
    ) -> Self {
        Self {
            id,
            title,
            text,
            revision,
            evidence,
            protected,
            order: [
                Field::Id,
                Field::Title,
                Field::Text,
                Field::Revision,
                Field::Protected,
                Field::Evidence,
            ],
        }
    }
}
impl Serialize for MindDocument {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(6))?;
        for field in self.order {
            match field {
                Field::Id => map.serialize_entry("id", &self.id)?,
                Field::Title => map.serialize_entry("title", &self.title)?,
                Field::Text => map.serialize_entry("text", &self.text)?,
                Field::Revision => map.serialize_entry("revision", &self.revision)?,
                Field::Evidence => map.serialize_entry("evidence", &self.evidence)?,
                Field::Protected => map.serialize_entry("protected", &self.protected)?,
            }
        }
        map.end()
    }
}
impl<'de> Deserialize<'de> for MindDocument {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        #[serde(transparent)]
        struct Revision(#[serde(deserialize_with = "crate::values::deserialize_safe_integer")] u64);
        struct DocumentVisitor;
        impl<'de> Visitor<'de> for DocumentVisitor {
            type Value = MindDocument;
            fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                formatter.write_str("a mind document with its six current fields")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let (mut id, mut title, mut text) = (None, None, None);
                let mut revision: Option<Revision> = None;
                let (mut evidence, mut protected) = (None, None);
                let mut order = [Field::Id; 6];
                let mut at = 0;
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
                        Field::Id => read!(id, "id"),
                        Field::Title => read!(title, "title"),
                        Field::Text => read!(text, "text"),
                        Field::Revision => read!(revision, "revision"),
                        Field::Evidence => read!(evidence, "evidence"),
                        Field::Protected => read!(protected, "protected"),
                    }
                    // Unknown or duplicate keys fail before this index. There
                    // are exactly six distinct supported fields.
                    order[at] = field;
                    at += 1;
                }
                Ok(MindDocument {
                    id: id.ok_or_else(|| A::Error::missing_field("id"))?,
                    title: title.ok_or_else(|| A::Error::missing_field("title"))?,
                    text: text.ok_or_else(|| A::Error::missing_field("text"))?,
                    revision: revision
                        .ok_or_else(|| A::Error::missing_field("revision"))?
                        .0,
                    evidence: evidence.ok_or_else(|| A::Error::missing_field("evidence"))?,
                    protected: protected.ok_or_else(|| A::Error::missing_field("protected"))?,
                    order,
                })
            }
        }
        deserializer.deserialize_struct(
            "MindDocument",
            &["id", "title", "text", "revision", "evidence", "protected"],
            DocumentVisitor,
        )
    }
}
