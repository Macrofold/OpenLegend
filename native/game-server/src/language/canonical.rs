//! Source's canonical JSON sorts object keys using the pinned locale. Both
//! native operations and PostgreSQL evidence use this same streaming writer.

use super::LanguageError;
use indexmap::IndexMap;
use openlegend_simulation::encoding::write_json_record;
use serde_json::value::RawValue;
use std::{cmp::Ordering, io::Write};

pub(crate) type KeyOrder<'a> = dyn Fn(&str, &str) -> Result<Ordering, LanguageError> + Sync + 'a;

/// Reorder the already admitted current JSON object's keys while borrowing its
/// values. Preserve the existing JavaScript scalar encodings and array order.
/// The caller funds the sort workspace and its chosen output sink.
pub(crate) fn write_canonical(
    input: &str,
    compare: &KeyOrder<'_>,
    out: &mut impl Write,
) -> Result<(), LanguageError> {
    let invalid = |_| LanguageError::Provider;
    match input.as_bytes().first() {
        Some(b'{') => {
            let mut object: IndexMap<String, &RawValue> =
                serde_json::from_str(input).map_err(invalid)?;
            let mut failed = false;
            object.sort_by(|left, _, right, _| {
                compare(left, right).unwrap_or_else(|_| {
                    failed = true;
                    Ordering::Equal
                })
            });
            if failed {
                return Err(LanguageError::Provider);
            }
            out.write_all(b"{").map_err(|_| LanguageError::Capacity)?;
            for (index, (key, value)) in object.into_iter().enumerate() {
                if index > 0 {
                    out.write_all(b",").map_err(|_| LanguageError::Capacity)?;
                }
                write_json_record(&key, &mut *out).map_err(invalid)?;
                out.write_all(b":").map_err(|_| LanguageError::Capacity)?;
                write_canonical(value.get(), compare, out)?;
            }
            out.write_all(b"}").map_err(|_| LanguageError::Capacity)?;
        }
        Some(b'[') => {
            let array = serde_json::from_str::<Vec<&RawValue>>(input).map_err(invalid)?;
            out.write_all(b"[").map_err(|_| LanguageError::Capacity)?;
            for (index, value) in array.into_iter().enumerate() {
                if index > 0 {
                    out.write_all(b",").map_err(|_| LanguageError::Capacity)?;
                }
                write_canonical(value.get(), compare, out)?;
            }
            out.write_all(b"]").map_err(|_| LanguageError::Capacity)?;
        }
        Some(_) => out
            .write_all(input.as_bytes())
            .map_err(|_| LanguageError::Capacity)?,
        None => return Err(LanguageError::Provider),
    }
    Ok(())
}
