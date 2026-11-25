//! Whole-field speech trimming before an approved passage can be spoken.

use crate::{
    encoding::js_trim_part,
    host::{ByteBudget, ByteReservation, CapacityError},
    text::JsText,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SpeechTextError {
    TooLong,
    Capacity,
}

impl From<CapacityError> for SpeechTextError {
    fn from(_: CapacityError) -> Self {
        Self::Capacity
    }
}

/// Hold the canonical speech and its pending trailing whitespace in one buffer.
/// The canonical prefix matches trimming all successfully appended parts.
pub struct SpeechText {
    text: String,
    canonical_end: usize,
    raw_units: usize,
    max_units: usize,
    max_bytes: usize,
    storage: ByteReservation,
}

impl SpeechText {
    pub fn new(max_utf16_units: usize, budget: &ByteBudget) -> Result<Self, SpeechTextError> {
        Ok(Self {
            text: String::new(),
            canonical_end: 0,
            raw_units: 0,
            max_units: max_utf16_units,
            // A Unicode string uses at most three UTF-8 bytes per UTF-16 unit.
            max_bytes: max_utf16_units.checked_mul(3).ok_or(CapacityError)?,
            storage: budget.reserve(0)?,
        })
    }

    /// The caller's raw length allowance includes whitespace even when the
    /// trim discards it. The structured-output decoder supplies valid Unicode.
    pub fn append(&mut self, part: &str) -> Result<(), SpeechTextError> {
        let raw_units = self
            .raw_units
            .checked_add(part.encode_utf16().count())
            .filter(|units| *units <= self.max_units)
            .ok_or(SpeechTextError::TooLong)?;
        let (text, content_end) = js_trim_part(part, self.canonical_end != 0);
        let start = self.text.len();
        let end = start + text.len();
        self.reserve(end)?;
        self.text.push_str(text);
        if content_end != 0 {
            self.canonical_end = start + content_end;
        }
        self.raw_units = raw_units;
        Ok(())
    }

    pub fn canonical(&self) -> &str {
        &self.text[..self.canonical_end]
    }

    /// Discard pending trailing whitespace and keep the final buffer funded.
    pub fn into_canonical(mut self) -> (JsText, ByteReservation) {
        self.text.truncate(self.canonical_end);
        (self.text.into(), self.storage)
    }

    fn reserve(&mut self, end: usize) -> Result<(), SpeechTextError> {
        let capacity = self.text.capacity();
        if end > capacity {
            let next = end.max(capacity.saturating_mul(2).min(self.max_bytes));
            // Moving the buffer can hold both allocations until growth succeeds.
            self.storage
                .resize(capacity.checked_add(next).ok_or(CapacityError)?)?;
            let mut text = String::new();
            if text.try_reserve_exact(next).is_err() || text.capacity() > next {
                drop(text);
                self.storage.resize(capacity)?;
                return Err(CapacityError.into());
            }
            text.push_str(&self.text);
            self.text = text;
            self.storage.resize(self.text.capacity())?;
        }
        Ok(())
    }
}
