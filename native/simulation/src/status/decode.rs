//! Recursive status expressions stream directly into their typed fields. Serde's
//! untagged Content buffer copies each nested subtree again at every level;
//! these closed current records need no such temporary value graph.
use super::*;
use serde::de::{Error, MapAccess, Visitor};
use std::fmt;

impl<'de> Deserialize<'de> for StatusCondition {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        struct Condition;
        impl<'de> Visitor<'de> for Condition {
            type Value = StatusCondition;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("one current status condition")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let key: String = map
                    .next_key()?
                    .ok_or_else(|| A::Error::custom("Missing status condition."))?;
                let value = match key.as_str() {
                    "all" => StatusCondition::All {
                        all: map.next_value()?,
                    },
                    "any" => StatusCondition::Any {
                        any: map.next_value()?,
                    },
                    "compare" => StatusCondition::Compare {
                        compare: map.next_value()?,
                    },
                    "field" => StatusCondition::Field {
                        field: map.next_value()?,
                    },
                    "dailyWindow" => StatusCondition::Daily {
                        daily_window: map.next_value()?,
                    },
                    "hasAttribute" => StatusCondition::Has {
                        has_attribute: map.next_value()?,
                    },
                    "statusActive" => StatusCondition::Active {
                        status_active: map.next_value()?,
                    },
                    _ => return Err(A::Error::custom("Unknown status condition.")),
                };
                if map.next_key::<serde::de::IgnoredAny>()?.is_some() {
                    return Err(A::Error::custom("Unexpected status condition field."));
                }
                Ok(value)
            }
        }
        de.deserialize_map(Condition)
    }
}

impl<'de> Deserialize<'de> for StatusOperation {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        struct Operation;
        impl<'de> Visitor<'de> for Operation {
            type Value = StatusOperation;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("one current status operation")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let (mut rate, mut every, mut restrict, mut when) = (None, None, None, None);
                let mut when_seen = false;
                while let Some(key) = map.next_key::<String>()? {
                    match key.as_str() {
                        "changeRate" if rate.is_none() => rate = Some(map.next_value()?),
                        "changeEvery" if every.is_none() => every = Some(map.next_value()?),
                        "restrictCapabilities" if restrict.is_none() => {
                            restrict = Some(map.next_value()?)
                        }
                        "when" if !when_seen => {
                            // An absent optional condition is supported; an
                            // explicitly null condition is not the same input.
                            when_seen = true;
                            when = Some(map.next_value::<StatusCondition>()?);
                        }
                        _ => return Err(A::Error::custom("Unexpected status operation field.")),
                    }
                }
                match (rate, every, restrict) {
                    (Some(change_rate), None, None) => {
                        Ok(StatusOperation::Rate { change_rate, when })
                    }
                    (None, Some(change_every), None) => {
                        Ok(StatusOperation::Every { change_every, when })
                    }
                    (None, None, Some(restrict_capabilities)) if !when_seen => {
                        Ok(StatusOperation::Restrict {
                            restrict_capabilities,
                        })
                    }
                    _ => Err(A::Error::custom("Invalid status operation variant.")),
                }
            }
        }
        de.deserialize_map(Operation)
    }
}
