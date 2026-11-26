//! Finite current-schema layout imported from the existing PostgreSQL owner.
//! Projection stops before child values are traversed. It never serializes a
//! whole actor's history merely to replace that child's body with a marker.

use serde::ser::Error as _;
use serde::ser::{self, SerializeMap, SerializeStruct, Serializer};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RecordCodec {
    Plain,
    EmptyArray,
    EmptyObject,
    HotEventPointer,
    TemporalActor,
    CurrentContact,
    TemporalPage,
    Attention,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChildShape {
    Array,
    Object,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RecordChild {
    pub field: String,
    pub shape: ChildShape,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RecordLayout {
    pub table: String,
    pub children: Vec<RecordChild>,
    pub columns: Vec<String>,
    pub codec: RecordCodec,
}

impl RecordLayout {
    pub fn project<T: Serialize + ?Sized>(&self, value: &T) -> Result<String, serde_json::Error> {
        match self.codec {
            RecordCodec::EmptyArray => Ok("[]".to_owned()),
            RecordCodec::EmptyObject => Ok("{}".to_owned()),
            RecordCodec::CurrentContact | RecordCodec::TemporalPage | RecordCodec::Attention => {
                Err(<serde_json::Error as ser::Error>::custom(
                    "This record requires its actual owned storage codec.",
                ))
            }
            RecordCodec::Plain if self.children.is_empty() => crate::encoding::json_record(value),
            _ => crate::encoding::json_record(&Projected {
                value,
                layout: self,
            }),
        }
    }
    pub(crate) fn project_len<T: Serialize + ?Sized>(
        &self,
        value: &T,
    ) -> Result<usize, serde_json::Error> {
        match self.codec {
            RecordCodec::EmptyArray | RecordCodec::EmptyObject => Ok(2),
            RecordCodec::CurrentContact | RecordCodec::TemporalPage | RecordCodec::Attention => {
                Err(<serde_json::Error as ser::Error>::custom(
                    "This record requires its actual owned storage codec.",
                ))
            }
            RecordCodec::Plain if self.children.is_empty() => {
                crate::encoding::json_record_len(value)
            }
            _ => crate::encoding::json_record_len(&Projected {
                value,
                layout: self,
            }),
        }
    }
    fn child(&self, key: &str) -> Option<ChildShape> {
        self.children
            .iter()
            .find(|child| child.field == key)
            .map(|child| child.shape)
    }
    fn skipped(&self, key: &str) -> bool {
        (self.codec == RecordCodec::HotEventPointer && key != "id")
            || (self.codec == RecordCodec::TemporalActor && key == "recent")
    }
}

struct Projected<'a, T: ?Sized> {
    value: &'a T,
    layout: &'a RecordLayout,
}
impl<T: Serialize + ?Sized> Serialize for Projected<'_, T> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.value.serialize(ProjectSerializer {
            inner: serializer,
            layout: self.layout,
        })
    }
}

struct ChildValue<'a, T: ?Sized> {
    value: &'a T,
    shape: ChildShape,
}
impl<T: Serialize + ?Sized> Serialize for ChildValue<'_, T> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let null = match self.value.serialize(Presence) {
            Ok(null) => null,
            Err(PresenceError::NonNull) => false,
            Err(PresenceError::Custom(error)) => return Err(S::Error::custom(error)),
        };
        if null {
            serializer.serialize_none()
        } else {
            match self.shape {
                ChildShape::Array => serializer.serialize_seq(Some(0))?.end(),
                ChildShape::Object => serializer.serialize_map(Some(0))?.end(),
            }
        }
    }
}

use serde::ser::SerializeSeq;
struct ProjectSerializer<'a, S> {
    inner: S,
    layout: &'a RecordLayout,
}

macro_rules! delegate_scalar {($($name:ident($value:ident:$ty:ty)),*$(,)?)=>{$(fn $name(self,$value:$ty)->Result<Self::Ok,Self::Error>{self.inner.$name($value)})*};}
impl<'a, S: Serializer> Serializer for ProjectSerializer<'a, S> {
    type Ok = S::Ok;
    type Error = S::Error;
    type SerializeSeq = S::SerializeSeq;
    type SerializeTuple = S::SerializeTuple;
    type SerializeTupleStruct = S::SerializeTupleStruct;
    type SerializeTupleVariant = S::SerializeTupleVariant;
    type SerializeMap = ProjectMap<'a, S::SerializeMap>;
    type SerializeStruct = ProjectStruct<'a, S::SerializeStruct>;
    type SerializeStructVariant = S::SerializeStructVariant;
    delegate_scalar!(
        serialize_bool(value: bool),
        serialize_i8(value: i8),
        serialize_i16(value: i16),
        serialize_i32(value: i32),
        serialize_i64(value: i64),
        serialize_u8(value: u8),
        serialize_u16(value: u16),
        serialize_u32(value: u32),
        serialize_u64(value: u64),
        serialize_f32(value: f32),
        serialize_f64(value: f64),
        serialize_char(value: char),
        serialize_str(value: &str),
        serialize_bytes(value: &[u8])
    );
    fn serialize_none(self) -> Result<Self::Ok, Self::Error> {
        self.inner.serialize_none()
    }
    fn serialize_some<T: Serialize + ?Sized>(self, value: &T) -> Result<Self::Ok, Self::Error> {
        value.serialize(self)
    }
    fn serialize_unit(self) -> Result<Self::Ok, Self::Error> {
        self.inner.serialize_unit()
    }
    fn serialize_unit_struct(self, name: &'static str) -> Result<Self::Ok, Self::Error> {
        self.inner.serialize_unit_struct(name)
    }
    fn serialize_unit_variant(
        self,
        name: &'static str,
        index: u32,
        variant: &'static str,
    ) -> Result<Self::Ok, Self::Error> {
        self.inner.serialize_unit_variant(name, index, variant)
    }
    fn serialize_newtype_struct<T: Serialize + ?Sized>(
        self,
        _name: &'static str,
        value: &T,
    ) -> Result<Self::Ok, Self::Error> {
        value.serialize(self)
    }
    fn serialize_newtype_variant<T: Serialize + ?Sized>(
        self,
        name: &'static str,
        index: u32,
        variant: &'static str,
        value: &T,
    ) -> Result<Self::Ok, Self::Error> {
        self.inner
            .serialize_newtype_variant(name, index, variant, value)
    }
    fn serialize_seq(self, len: Option<usize>) -> Result<Self::SerializeSeq, Self::Error> {
        self.inner.serialize_seq(len)
    }
    fn serialize_tuple(self, len: usize) -> Result<Self::SerializeTuple, Self::Error> {
        self.inner.serialize_tuple(len)
    }
    fn serialize_tuple_struct(
        self,
        name: &'static str,
        len: usize,
    ) -> Result<Self::SerializeTupleStruct, Self::Error> {
        self.inner.serialize_tuple_struct(name, len)
    }
    fn serialize_tuple_variant(
        self,
        name: &'static str,
        index: u32,
        variant: &'static str,
        len: usize,
    ) -> Result<Self::SerializeTupleVariant, Self::Error> {
        self.inner
            .serialize_tuple_variant(name, index, variant, len)
    }
    fn serialize_map(self, len: Option<usize>) -> Result<Self::SerializeMap, Self::Error> {
        Ok(ProjectMap {
            inner: self.inner.serialize_map(len)?,
            layout: self.layout,
            key: None,
        })
    }
    fn serialize_struct(
        self,
        name: &'static str,
        len: usize,
    ) -> Result<Self::SerializeStruct, Self::Error> {
        Ok(ProjectStruct {
            inner: self.inner.serialize_struct(name, len)?,
            layout: self.layout,
        })
    }
    fn serialize_struct_variant(
        self,
        name: &'static str,
        index: u32,
        variant: &'static str,
        len: usize,
    ) -> Result<Self::SerializeStructVariant, Self::Error> {
        self.inner
            .serialize_struct_variant(name, index, variant, len)
    }
    fn is_human_readable(&self) -> bool {
        self.inner.is_human_readable()
    }
}

struct ProjectStruct<'a, S> {
    inner: S,
    layout: &'a RecordLayout,
}
impl<S: SerializeStruct> SerializeStruct for ProjectStruct<'_, S> {
    type Ok = S::Ok;
    type Error = S::Error;
    fn serialize_field<T: Serialize + ?Sized>(
        &mut self,
        key: &'static str,
        value: &T,
    ) -> Result<(), Self::Error> {
        if self.layout.skipped(key) {
            return Ok(());
        }
        match self.layout.child(key) {
            Some(shape) => self
                .inner
                .serialize_field(key, &ChildValue { value, shape }),
            None => self.inner.serialize_field(key, value),
        }
    }
    fn skip_field(&mut self, key: &'static str) -> Result<(), Self::Error> {
        self.inner.skip_field(key)
    }
    fn end(self) -> Result<Self::Ok, Self::Error> {
        self.inner.end()
    }
}

struct ProjectMap<'a, S> {
    inner: S,
    layout: &'a RecordLayout,
    key: Option<String>,
}
impl<S: SerializeMap> SerializeMap for ProjectMap<'_, S> {
    type Ok = S::Ok;
    type Error = S::Error;
    fn serialize_key<T: Serialize + ?Sized>(&mut self, key: &T) -> Result<(), Self::Error> {
        self.key = Some(map_key(key)?);
        Ok(())
    }
    fn serialize_value<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Self::Error> {
        let key = self
            .key
            .take()
            .ok_or_else(|| S::Error::custom("Record map value has no key."))?;
        self.entry(&key, value)
    }
    fn serialize_entry<K: Serialize + ?Sized, V: Serialize + ?Sized>(
        &mut self,
        key: &K,
        value: &V,
    ) -> Result<(), Self::Error> {
        self.entry(&map_key(key)?, value)
    }
    fn end(self) -> Result<Self::Ok, Self::Error> {
        self.inner.end()
    }
}
impl<S: SerializeMap> ProjectMap<'_, S> {
    fn entry<T: Serialize + ?Sized>(&mut self, key: &str, value: &T) -> Result<(), S::Error> {
        if self.layout.skipped(key) {
            return Ok(());
        }
        match self.layout.child(key) {
            Some(shape) => self
                .inner
                .serialize_entry(key, &ChildValue { value, shape }),
            None => self.inner.serialize_entry(key, value),
        }
    }
}
fn map_key<T: Serialize + ?Sized, E: ser::Error>(key: &T) -> Result<String, E> {
    let encoded = crate::encoding::json_record(key).map_err(E::custom)?;
    serde_json::from_str(&encoded).map_err(E::custom)
}

/// Aborting at the first container token is deliberate: a null probe must not
/// enumerate a Vec/map/history merely to establish that it is non-null.
#[derive(Debug)]
enum PresenceError {
    NonNull,
    Custom(String),
}
impl std::fmt::Display for PresenceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NonNull => f.write_str("non-null"),
            Self::Custom(error) => f.write_str(error),
        }
    }
}
impl std::error::Error for PresenceError {}
impl ser::Error for PresenceError {
    fn custom<T: std::fmt::Display>(message: T) -> Self {
        Self::Custom(message.to_string())
    }
}
struct Presence;
macro_rules! nonnull_scalar {($($name:ident($value:ident:$ty:ty)),*$(,)?)=>{$(fn $name(self,$value:$ty)->Result<bool,PresenceError>{let _=$value;Ok(false)})*};}
impl Serializer for Presence {
    type Ok = bool;
    type Error = PresenceError;
    type SerializeSeq = ser::Impossible<bool, PresenceError>;
    type SerializeTuple = ser::Impossible<bool, PresenceError>;
    type SerializeTupleStruct = ser::Impossible<bool, PresenceError>;
    type SerializeTupleVariant = ser::Impossible<bool, PresenceError>;
    type SerializeMap = ser::Impossible<bool, PresenceError>;
    type SerializeStruct = ser::Impossible<bool, PresenceError>;
    type SerializeStructVariant = ser::Impossible<bool, PresenceError>;
    nonnull_scalar!(
        serialize_bool(value: bool),
        serialize_i8(value: i8),
        serialize_i16(value: i16),
        serialize_i32(value: i32),
        serialize_i64(value: i64),
        serialize_u8(value: u8),
        serialize_u16(value: u16),
        serialize_u32(value: u32),
        serialize_u64(value: u64),
        serialize_f32(value: f32),
        serialize_f64(value: f64),
        serialize_char(value: char),
        serialize_str(value: &str),
        serialize_bytes(value: &[u8])
    );
    fn serialize_none(self) -> Result<bool, PresenceError> {
        Ok(true)
    }
    fn serialize_some<T: Serialize + ?Sized>(self, value: &T) -> Result<bool, PresenceError> {
        value.serialize(self)
    }
    fn serialize_unit(self) -> Result<bool, PresenceError> {
        Ok(true)
    }
    fn serialize_unit_struct(self, _name: &'static str) -> Result<bool, PresenceError> {
        Ok(true)
    }
    fn serialize_unit_variant(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
    ) -> Result<bool, PresenceError> {
        Ok(false)
    }
    fn serialize_newtype_struct<T: Serialize + ?Sized>(
        self,
        _name: &'static str,
        value: &T,
    ) -> Result<bool, PresenceError> {
        value.serialize(self)
    }
    fn serialize_newtype_variant<T: Serialize + ?Sized>(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
        _value: &T,
    ) -> Result<bool, PresenceError> {
        Err(PresenceError::NonNull)
    }
    fn serialize_seq(self, _len: Option<usize>) -> Result<Self::SerializeSeq, PresenceError> {
        Err(PresenceError::NonNull)
    }
    fn serialize_tuple(self, _len: usize) -> Result<Self::SerializeTuple, PresenceError> {
        Err(PresenceError::NonNull)
    }
    fn serialize_tuple_struct(
        self,
        _name: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeTupleStruct, PresenceError> {
        Err(PresenceError::NonNull)
    }
    fn serialize_tuple_variant(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeTupleVariant, PresenceError> {
        Err(PresenceError::NonNull)
    }
    fn serialize_map(self, _len: Option<usize>) -> Result<Self::SerializeMap, PresenceError> {
        Err(PresenceError::NonNull)
    }
    fn serialize_struct(
        self,
        _name: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeStruct, PresenceError> {
        Err(PresenceError::NonNull)
    }
    fn serialize_struct_variant(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeStructVariant, PresenceError> {
        Err(PresenceError::NonNull)
    }
}
