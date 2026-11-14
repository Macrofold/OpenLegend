//! An intention retains its complete authored point; physics reads only the
//! immutable four-field projection. Route/support points remain SurfacePoint.
use super::SurfacePoint;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::records::SqlCell;
use crate::text::JsText;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::value::RawValue;
use std::mem::size_of;
use std::ops::Deref;

#[derive(Debug)]
pub struct RecordedSurfacePoint(Representation);

#[derive(Debug)]
enum Representation {
    Standard(SurfacePoint),
    Exact(Box<ExactPoint>),
}

#[derive(Debug)]
struct ExactPoint {
    physical: SurfacePoint,
    body: SqlCell,
}

const FIELDS: [&str; 4] = ["x", "y", "z", "surfaceId"];

fn invalid() -> serde_json::Error {
    serde_json::Error::io(std::io::Error::new(
        std::io::ErrorKind::InvalidData,
        "Invalid recorded surface point.",
    ))
}

impl RecordedSurfacePoint {
    /// The typed decoder can briefly hold its keyed scanner and member Vec,
    /// then its member Vec and retained cell body. Include the uncommon Box
    /// beside those actual carriers before either owning role is decoded.
    pub(crate) fn decode_map_entry_bytes() -> Option<usize> {
        heap_sum([
            size_of::<(usize, JsText, SqlCell)>().max(size_of::<(usize, String, SqlCell)>()),
            4 * size_of::<(JsText, SqlCell)>(),
            size_of::<ExactPoint>(),
        ])
    }

    pub fn physical(&self) -> &SurfacePoint {
        match &self.0 {
            Representation::Standard(point) => point,
            Representation::Exact(point) => &point.physical,
        }
    }

    /// Consume a caller-funded point, never a route or hidden world lookup.
    /// Only the ordinary field order can discard the temporary object backing.
    pub(crate) fn from_cell(body: SqlCell) -> Result<Self, serde_json::Error> {
        let number = |field| {
            body.get(field)
                .and_then(SqlCell::as_f64)
                .ok_or_else(invalid)
        };
        let (x, y, z) = (number("x")?, number("y")?, number("z")?);
        let surface = body
            .get("surfaceId")
            .and_then(SqlCell::as_str)
            .ok_or_else(invalid)?;
        if body.as_object().is_some_and(|members| {
            members.len() == FIELDS.len() && members.keys().map(String::as_str).eq(FIELDS)
        }) {
            let SqlCell::Object(mut members) = body else {
                unreachable!("Ordinary point membership was checked before consumption");
            };
            let Some(SqlCell::Text(JsText::Unicode(surface_id))) =
                members.shift_remove("surfaceId")
            else {
                unreachable!("Surface text was checked before consumption");
            };
            Ok(SurfacePoint {
                x,
                y,
                z,
                surface_id,
            }
            .into())
        } else {
            let physical = SurfacePoint {
                x,
                y,
                z,
                surface_id: surface.into(),
            };
            Ok(Self(Representation::Exact(Box::new(ExactPoint {
                physical,
                body,
            }))))
        }
    }

    /// Appending an activity leaf must match all supplied intention fields,
    /// including extras, rather than only its physical destination.
    pub(crate) fn matches_cell(&self, value: &SqlCell) -> bool {
        match &self.0 {
            Representation::Exact(point) => point.body == *value,
            Representation::Standard(point) => {
                value.object_len() == Some(4)
                    && value.get("x").and_then(SqlCell::as_f64) == Some(point.x)
                    && value.get("y").and_then(SqlCell::as_f64) == Some(point.y)
                    && value.get("z").and_then(SqlCell::as_f64) == Some(point.z)
                    && value.get("surfaceId").and_then(SqlCell::as_str)
                        == Some(point.surface_id.as_str())
            }
        }
    }
}

impl From<SurfacePoint> for RecordedSurfacePoint {
    fn from(point: SurfacePoint) -> Self {
        Self(Representation::Standard(point))
    }
}
impl Deref for RecordedSurfacePoint {
    type Target = SurfacePoint;
    fn deref(&self) -> &Self::Target {
        self.physical()
    }
}
impl Clone for RecordedSurfacePoint {
    fn clone(&self) -> Self {
        match &self.0 {
            Representation::Standard(point) => point.clone().into(),
            Representation::Exact(point) => Self(Representation::Exact(Box::new(ExactPoint {
                physical: point.physical.clone(),
                body: point.body.clone_within_heap_bound(),
            }))),
        }
    }
}
impl PartialEq for RecordedSurfacePoint {
    fn eq(&self, other: &Self) -> bool {
        match (&self.0, &other.0) {
            (Representation::Standard(a), Representation::Standard(b)) => a == b,
            (Representation::Exact(a), Representation::Exact(b)) => a.body == b.body,
            (Representation::Standard(a), Representation::Exact(b))
            | (Representation::Exact(b), Representation::Standard(a)) => {
                b.body.object_len() == Some(4) && *a == b.physical
            }
        }
    }
}
impl PartialEq<SurfacePoint> for RecordedSurfacePoint {
    fn eq(&self, other: &SurfacePoint) -> bool {
        match &self.0 {
            Representation::Standard(point) => point == other,
            Representation::Exact(point) => {
                point.body.object_len() == Some(4) && point.physical == *other
            }
        }
    }
}
impl Serialize for RecordedSurfacePoint {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match &self.0 {
            Representation::Standard(point) => point.serialize(serializer),
            Representation::Exact(point) => point.body.serialize(serializer),
        }
    }
}
impl<'de> Deserialize<'de> for RecordedSurfacePoint {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(deserializer)?;
        let mut members =
            SqlCell::decode_object_members(raw.get(), &FIELDS).map_err(serde::de::Error::custom)?;
        if members.len() == FIELDS.len()
            && members
                .iter()
                .map(|(key, _)| key.as_unicode())
                .eq(FIELDS.map(Some))
        {
            let number = |index: usize| -> Result<f64, D::Error> {
                members[index]
                    .1
                    .as_f64()
                    .ok_or_else(|| serde::de::Error::custom(invalid()))
            };
            let (x, y, z) = (number(0)?, number(1)?, number(2)?);
            let Some((_, SqlCell::Text(JsText::Unicode(surface_id)))) = members.pop() else {
                return Err(serde::de::Error::custom(invalid()));
            };
            return Ok(SurfacePoint {
                x,
                y,
                z,
                surface_id,
            }
            .into());
        }
        let body = SqlCell::from_text_members(members).map_err(serde::de::Error::custom)?;
        Self::from_cell(body).map_err(serde::de::Error::custom)
    }
}
impl HeapBytes for RecordedSurfacePoint {
    fn heap_bytes(&self) -> Option<usize> {
        match &self.0 {
            Representation::Standard(point) => point.surface_id.heap_bytes(),
            Representation::Exact(point) => heap_sum([
                size_of::<ExactPoint>(),
                point.physical.surface_id.heap_bytes()?,
                point.body.heap_bytes()?,
            ]),
        }
    }
}
