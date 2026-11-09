//! Indexed columns cross as their actual JavaScript values. Using serde_json's
//! UTF-8 String conversion here would reject or replace retained UTF-16 units.
use napi::bindgen_prelude::{Array, JsObjectValue, Null, Object, ToNapiValue, Utf16String};
use napi::{Env, Error, Property, Result, Status, sys};
use openlegend_simulation::{records::SqlCell, text::JsText};

pub struct NativeSqlCell(pub SqlCell);
impl ToNapiValue for NativeSqlCell {
    unsafe fn to_napi_value(raw_env: sys::napi_env, value: Self) -> Result<sys::napi_value> {
        // This is NAPI's required conversion hook on the Node thread. All
        // allocation/property operations use the pinned SDK's checked APIs.
        match value.0 {
            SqlCell::Null => unsafe { ToNapiValue::to_napi_value(raw_env, Null) },
            SqlCell::Bool(value) => unsafe { ToNapiValue::to_napi_value(raw_env, value) },
            SqlCell::Number(value) => unsafe {
                ToNapiValue::to_napi_value(
                    raw_env,
                    value.as_f64().ok_or_else(|| {
                        Error::new(Status::InvalidArg, "SQL number exceeds JavaScript range")
                    })?,
                )
            },
            SqlCell::Text(JsText::Unicode(value)) => unsafe {
                ToNapiValue::to_napi_value(raw_env, value)
            },
            SqlCell::Text(JsText::Utf16 { units, .. }) => unsafe {
                ToNapiValue::to_napi_value(raw_env, Utf16String::from(units))
            },
            SqlCell::Array(values) => {
                let env = Env::from(raw_env);
                let _ = u32::try_from(values.len()).map_err(|_| {
                    Error::new(
                        Status::InvalidArg,
                        "SQL cell array exceeds JavaScript range",
                    )
                })?;
                let array = Array::from_vec(&env, values.into_iter().map(Self).collect())?;
                unsafe { ToNapiValue::to_napi_value(raw_env, array) }
            }
            SqlCell::Object(values) => {
                let env = Env::from(raw_env);
                let mut object = Object::new(&env)?;
                for (key, value) in values {
                    // JSON objects own data properties. Defining the property
                    // also preserves a literal `__proto__` key instead of
                    // invoking Object.prototype's inherited setter.
                    let property = Property::new()
                        .with_name(&env, key)?
                        .with_napi_value(&env, Self(value))?;
                    object.define_properties(&[property])?;
                }
                unsafe { ToNapiValue::to_napi_value(raw_env, &object) }
            }
            SqlCell::ExactObject(values) => {
                let env = Env::from(raw_env);
                let mut object = Object::new(&env)?;
                // Each property consumes the parent's funded member buffers.
                // The detached save/read product must retain its output custody
                // through Node consumption; this UTF16 conversion creates no
                // additional temporary key/member vector.
                for (key, value) in values.into_members() {
                    let property = Property::new()
                        .with_name(&env, Self(SqlCell::Text(key)))?
                        .with_napi_value(&env, Self(value))?;
                    object.define_properties(&[property])?;
                }
                unsafe { ToNapiValue::to_napi_value(raw_env, &object) }
            }
        }
    }
}
