//! SqlCell needs the original JSON deserializer for its exact scalar codec.
//! Stream this closed tagged reply instead of Serde's buffered enum Content.
use super::{Rendered, TypedActionOutput, names};
use serde::de::{Error, MapAccess, Visitor};
use serde::{Deserialize, Deserializer};

#[derive(Deserialize)]
#[serde(field_identifier, rename_all = "camelCase")]
enum Field {
    Kind,
    Selection,
    Results,
}
#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Kind {
    Name,
    Format,
}
impl<'de> Deserialize<'de> for TypedActionOutput {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct OutputVisitor;
        impl<'de> Visitor<'de> for OutputVisitor {
            type Value = TypedActionOutput;
            fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                formatter.write_str("a closed typed-action name or format reply")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let mut kind: Option<Kind> = None;
                let mut selection: Option<names::Selection> = None;
                let mut results: Option<Vec<Rendered>> = None;
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
                        Field::Kind => read!(kind, "kind"),
                        Field::Selection => read!(selection, "selection"),
                        Field::Results => read!(results, "results"),
                    }
                }
                match kind.ok_or_else(|| A::Error::missing_field("kind"))? {
                    Kind::Name if results.is_none() => Ok(TypedActionOutput::Name {
                        selection: selection.ok_or_else(|| A::Error::missing_field("selection"))?,
                    }),
                    Kind::Format if selection.is_none() => Ok(TypedActionOutput::Format {
                        results: results.ok_or_else(|| A::Error::missing_field("results"))?,
                    }),
                    _ => Err(A::Error::custom(
                        "Fields do not belong to this typed-action reply.",
                    )),
                }
            }
        }
        deserializer.deserialize_map(OutputVisitor)
    }
}
