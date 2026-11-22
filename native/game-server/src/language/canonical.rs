//! Source's canonical JSON sorts object keys using the pinned locale. Both
//! native operations and PostgreSQL evidence use this same streaming writer.

use super::LanguageError;
use indexmap::IndexMap;
use openlegend_simulation::{encoding::write_json_record, records::SqlCell};
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
            sequence(b"{", b"}", object, out, |(key, value), out| {
                property(&key, out)?;
                write_canonical(value.get(), compare, out)
            })?;
        }
        Some(b'[') => {
            let array = serde_json::from_str::<Vec<&RawValue>>(input).map_err(invalid)?;
            sequence(b"[", b"]", array, out, |value, out| {
                write_canonical(value.get(), compare, out)
            })?;
        }
        Some(_) => out
            .write_all(input.as_bytes())
            .map_err(|_| LanguageError::Capacity)?,
        None => return Err(LanguageError::Provider),
    }
    Ok(())
}

/// Canonicalize an admitted cell directly. The only temporary object storage
/// is a sorted list of references. Scalar emission shares the ordinary JSON
/// writer, preserving JavaScript numbers and the exact text code units.
pub(crate) fn write_canonical_cell(
    input: &SqlCell,
    compare: &KeyOrder<'_>,
    out: &mut impl Write,
) -> Result<(), LanguageError> {
    match input {
        SqlCell::Object(members) => {
            let mut entries: Vec<_> = members.iter().enumerate().collect();
            let mut failed = false;
            entries.sort_unstable_by(|(i, (a, _)), (j, (b, _))| {
                compare(a, b)
                    .unwrap_or_else(|_| {
                        failed = true;
                        Ordering::Equal
                    })
                    .then_with(|| i.cmp(j))
            });
            if failed {
                return Err(LanguageError::Provider);
            }
            sequence(b"{", b"}", entries, out, |(_, (key, value)), out| {
                property(key, out)?;
                write_canonical_cell(value, compare, out)
            })
        }
        SqlCell::Array(values) => sequence(b"[", b"]", values, out, |value, out| {
            write_canonical_cell(value, compare, out)
        }),
        // The current ICU canonical writer accepts Unicode property names.
        // The ordinary scalar writer still preserves isolated text units.
        SqlCell::ExactObject(_) => Err(LanguageError::Provider),
        scalar => write_json_record(scalar, &mut *out).map_err(|_| LanguageError::Provider),
    }
}

fn property(key: &str, out: &mut impl Write) -> Result<(), LanguageError> {
    write_json_record(key, &mut *out).map_err(|_| LanguageError::Provider)?;
    out.write_all(b":").map_err(|_| LanguageError::Capacity)
}

fn sequence<T, W: Write>(
    open: &[u8],
    close: &[u8],
    items: impl IntoIterator<Item = T>,
    out: &mut W,
    mut item: impl FnMut(T, &mut W) -> Result<(), LanguageError>,
) -> Result<(), LanguageError> {
    let capacity = |_| LanguageError::Capacity;
    out.write_all(open).map_err(capacity)?;
    for (index, value) in items.into_iter().enumerate() {
        if index != 0 {
            out.write_all(b",").map_err(capacity)?;
        }
        item(value, out)?;
    }
    out.write_all(close).map_err(capacity)
}
