//! Decode the actual body reception variants before serde can buffer an inline
//! shared-value alternative. That buffer cannot retain exact JavaScript text.

use super::*;
use crate::encoding::RawFields;
use serde::{Deserialize, Deserializer};
use serde_json::value::RawValue;

fn pose(fields: &mut RawFields<'_>) -> Result<BodyReception, String> {
    if fields.contains("pose") {
        Ok(BodyReception::Pose {
            pose: fields.take("pose")?,
        })
    } else {
        Ok(BodyReception::Reference {
            pose_ref: fields.take("poseRef")?,
        })
    }
}
impl<'de> Deserialize<'de> for BodyReception {
    fn deserialize<D: Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(de)?;
        let parse = || -> Result<Self, String> {
            let mut fields = RawFields::parse(raw.get())?;
            let result = pose(&mut fields)?;
            fields.finish()?;
            Ok(result)
        };
        parse().map_err(serde::de::Error::custom)
    }
}
impl<'de> Deserialize<'de> for ReceivedReception {
    fn deserialize<D: Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(de)?;
        let parse = || -> Result<Self, String> {
            let mut fields = RawFields::parse(raw.get())?;
            let kind: String = fields.take("kind")?;
            match kind.as_str() {
                "body" => {
                    let pose = pose(&mut fields)?;
                    fields.finish()?;
                    Ok(Self::Body { pose })
                }
                "location" => Ok(Self::Location {
                    frame: fields.safe_integer("frame")?,
                }),
                _ => Err("Unknown received reception kind.".to_owned()),
            }
        };
        parse().map_err(serde::de::Error::custom)
    }
}
impl<'de> Deserialize<'de> for TemporalReception {
    fn deserialize<D: Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(de)?;
        let parse = || -> Result<Self, String> {
            let mut fields = RawFields::parse(raw.get())?;
            let kind: String = fields.take("kind")?;
            match kind.as_str() {
                "body" => {
                    let pose = pose(&mut fields)?;
                    fields.finish()?;
                    Ok(Self::Body { pose })
                }
                "location" => Ok(Self::Location {
                    frame: fields.take("frame")?,
                }),
                _ => Err("Unknown temporal reception kind.".to_owned()),
            }
        };
        parse().map_err(serde::de::Error::custom)
    }
}
