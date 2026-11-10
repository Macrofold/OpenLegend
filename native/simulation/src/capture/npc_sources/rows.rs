//! InstalledRow.extra contains exact SqlCell values. Serde's internally tagged
//! enum buffering loses the JSON RawValue decoder those cells require, so read
//! each closed variant directly from its original provider object instead.
use super::{InstalledRow, NpcPersonalSourceRow};
use serde::de::{Error, MapAccess, Visitor};
use serde::{Deserialize, Deserializer};

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Storage {
    Current,
    Archive,
}
#[derive(Deserialize)]
#[serde(field_identifier, rename_all = "camelCase")]
enum Field {
    Storage,
    Kind,
    Row,
    Archive,
    Current,
}
impl<'de> Deserialize<'de> for NpcPersonalSourceRow {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct SourceRowVisitor;
        impl<'de> Visitor<'de> for SourceRowVisitor {
            type Value = NpcPersonalSourceRow;
            fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                formatter.write_str("a current or archived canonical personal source row")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let (mut storage, mut kind, mut row, mut archive) = (None, None, None, None);
                // Archive.current is required and nullable; absence cannot stand
                // in for a witnessed missing current version.
                let mut current: Option<Option<InstalledRow>> = None;
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
                        Field::Storage => read!(storage, "storage"),
                        Field::Kind => read!(kind, "kind"),
                        Field::Row => read!(row, "row"),
                        Field::Archive => read!(archive, "archive"),
                        Field::Current => read!(current, "current"),
                    }
                }
                match storage.ok_or_else(|| A::Error::missing_field("storage"))? {
                    Storage::Current => {
                        if archive.is_some() || current.is_some() {
                            return Err(A::Error::custom("current source has archive-only fields"));
                        }
                        Ok(NpcPersonalSourceRow::Current {
                            kind: kind.ok_or_else(|| A::Error::missing_field("kind"))?,
                            row: row.ok_or_else(|| A::Error::missing_field("row"))?,
                        })
                    }
                    Storage::Archive => {
                        if kind.is_some() || row.is_some() {
                            return Err(A::Error::custom(
                                "archived source has current-only fields",
                            ));
                        }
                        Ok(NpcPersonalSourceRow::Archive {
                            archive: archive.ok_or_else(|| A::Error::missing_field("archive"))?,
                            current: current.ok_or_else(|| A::Error::missing_field("current"))?,
                        })
                    }
                }
            }
        }
        deserializer.deserialize_struct(
            "NpcPersonalSourceRow",
            &["storage", "kind", "row", "archive", "current"],
            SourceRowVisitor,
        )
    }
}
