//! Indexed columns cross as their actual JavaScript values. Using serde_json's
//! UTF-8 String conversion here would reject or replace retained UTF-16 units.
use napi::bindgen_prelude::{Array, Null, Object, ToNapiValue, Utf16String};
use napi::{Env, Error, Result, Status, sys};
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
                    object.set(key, Self(value))?;
                }
                unsafe { ToNapiValue::to_napi_value(raw_env, &object) }
            }
        }
    }
}
