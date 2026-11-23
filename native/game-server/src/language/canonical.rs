//! The shared record writer orders keys with the host's pinned locale.
//! SQL readers use this adapter to keep their established error categories.

use super::LanguageError;
use openlegend_simulation::{
    language::{
        CanonicalWriteError, write_canonical_cell as write_cell,
        write_canonical_record as write_record,
    },
    records::SqlCell,
};
use std::{cmp::Ordering, io::Write};

pub(crate) type KeyOrder<'a> = dyn Fn(&str, &str) -> Result<Ordering, LanguageError> + Sync + 'a;

pub(crate) fn write_canonical(
    input: &str,
    compare: &KeyOrder<'_>,
    out: &mut impl Write,
) -> Result<(), LanguageError> {
    write_record(input, &|left, right| compare(left, right).ok(), out).map_err(language_error)
}

pub(crate) fn write_canonical_cell(
    input: &SqlCell,
    compare: &KeyOrder<'_>,
    out: &mut impl Write,
) -> Result<(), LanguageError> {
    write_cell(input, &|left, right| compare(left, right).ok(), out).map_err(language_error)
}

fn language_error(error: CanonicalWriteError) -> LanguageError {
    match error {
        CanonicalWriteError::InvalidRecord => LanguageError::Provider,
        CanonicalWriteError::Output => LanguageError::Capacity,
    }
}
