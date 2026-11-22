//! Source's Intl.Segmenter('und', {granularity:'word'}) uses ICU word
//! boundaries and marks rule statuses outside UBRK_WORD_NONE as word-like.
//! Spellings and UTF-16 indices stay tied to the input's original units.
use super::{LanguageError, LanguageProvider, symbol};
use libloading::Library;
use openlegend_simulation::{
    geometry::GeometryBinding,
    host::{ByteBudget, ByteReservation},
    runtime::{RuntimeError, RuntimeProviderInput},
    speech::SpeechWord,
    text::JsText,
};
use serde::Serialize;
use std::{
    ffi::{c_char, c_void},
    ptr::NonNull,
};

type Open = unsafe extern "C" fn(i32, *const c_char, *const u16, i32, *mut i32) -> *mut c_void;
type Close = unsafe extern "C" fn(*mut c_void);
type Cursor = unsafe extern "C" fn(*mut c_void) -> i32;

pub(super) struct SpeechPolicy {
    open: Open,
    close: Close,
    first: Cursor,
    next: Cursor,
    status: Cursor,
}

impl SpeechPolicy {
    pub(super) unsafe fn load(library: &Library) -> Result<Self, LanguageError> {
        unsafe {
            Ok(Self {
                open: symbol(library, b"ubrk_open_78")?,
                close: symbol(library, b"ubrk_close_78")?,
                first: symbol(library, b"ubrk_first_78")?,
                next: symbol(library, b"ubrk_next_78")?,
                status: symbol(library, b"ubrk_getRuleStatus_78")?,
            })
        }
    }
}

struct BreakIterator {
    handle: NonNull<c_void>,
    close: Close,
}
impl Drop for BreakIterator {
    fn drop(&mut self) {
        unsafe { (self.close)(self.handle.as_ptr()) }
    }
}

struct WordSpan {
    start: usize,
    end: usize,
}

pub(crate) struct PreparedUtterance {
    words: Vec<SpeechWord>,
    lowercase: JsText,
    custody: ByteReservation,
}

impl PreparedUtterance {
    pub(crate) fn into_answer(
        self,
        binding: GeometryBinding,
    ) -> Result<RuntimeProviderInput, RuntimeError> {
        RuntimeProviderInput::utterance(binding, self.words, self.lowercase, self.custody)
    }
}

#[derive(Serialize)]
pub(crate) struct PreparedWordLists {
    pub(crate) words: Vec<Vec<JsText>>,
    #[serde(skip)]
    _custody: ByteReservation,
}

impl LanguageProvider {
    /// Produce the actual heard-word candidate spans plus ECMAScript lowercase
    /// for a single permitted utterance. ICU retains no borrowed text after
    /// the continuation returns. The result owns its own decoded storage.
    pub(crate) fn utterance(
        &self,
        text: &JsText,
        budget: &ByteBudget,
    ) -> Result<PreparedUtterance, LanguageError> {
        let length = text.units_len();
        let _input = budget
            .reserve(length.checked_mul(2).ok_or(LanguageError::Capacity)?)
            .map_err(|_| LanguageError::Capacity)?;
        let input: Vec<_> = text.units().collect();
        let output = length
            .checked_mul(size_of::<SpeechWord>())
            .and_then(|n| n.checked_add(512))
            .ok_or(LanguageError::Capacity)?;
        let mut custody = budget
            .reserve(output)
            .map_err(|_| LanguageError::Capacity)?;
        let mut words = Vec::with_capacity(length);
        self.speech_boundaries(&input, budget, |span| {
            words.push(SpeechWord {
                start: span.start as u64,
                end: span.end as u64,
            })
        })?;
        let (lower, lowering) = self.lowercase_units(&input, budget)?;
        let proof = lower.len().checked_mul(12).ok_or(LanguageError::Capacity)?;
        custody
            .resize(output.checked_add(proof).ok_or(LanguageError::Capacity)?)
            .map_err(|_| LanguageError::Capacity)?;
        let lowercase = JsText::from_units(lower);
        drop(lowering);
        custody
            .resize(512 + words.capacity() * size_of::<SpeechWord>() + lowercase.storage_bytes())
            .map_err(|_| LanguageError::Capacity)?;
        Ok(PreparedUtterance {
            words,
            lowercase,
            custody,
        })
    }

    /// Recognition consumes exact strings rather than offsets. The bound
    /// result holds only selected word-like segments from each input string.
    pub(crate) fn speech_word_lists(
        &self,
        texts: &[JsText],
        budget: &ByteBudget,
    ) -> Result<PreparedWordLists, LanguageError> {
        let total = texts
            .iter()
            .try_fold(0usize, |n, text| n.checked_add(text.units_len()))
            .ok_or(LanguageError::Capacity)?;
        let charged = total
            .checked_mul(96)
            .and_then(|n| n.checked_add(texts.len().checked_mul(64)?))
            .and_then(|n| n.checked_add(512))
            .ok_or(LanguageError::Capacity)?;
        let custody = budget
            .reserve(charged)
            .map_err(|_| LanguageError::Capacity)?;
        let mut output = Vec::with_capacity(texts.len());
        for text in texts {
            let input: Vec<_> = text.units().collect();
            let mut words = Vec::new();
            self.speech_boundaries(&input, budget, |span| {
                words.push(JsText::from_units(input[span.start..span.end].to_vec()))
            })?;
            output.push(words);
        }
        Ok(PreparedWordLists {
            words: output,
            _custody: custody,
        })
    }

    fn speech_boundaries(
        &self,
        input: &[u16],
        budget: &ByteBudget,
        mut consume: impl FnMut(WordSpan),
    ) -> Result<(), LanguageError> {
        // This finite ICU request owns one scratch iterator and no world lane
        // state. The pinned library/data is already independently resident.
        let _workspace = budget
            .reserve(64 * 1024)
            .map_err(|_| LanguageError::Capacity)?;
        if input.is_empty() {
            return Ok(());
        }
        let length = i32::try_from(input.len()).map_err(|_| LanguageError::Capacity)?;
        let mut status = 0;
        // ABI `UBRK_WORD=1`. The iterator cannot outlive `input`; its Drop
        // releases ICU's alias before the original UTF-16 becomes available.
        let iterator = unsafe {
            NonNull::new((self.speech.open)(
                1,
                c"und".as_ptr(),
                input.as_ptr(),
                length,
                &mut status,
            ))
        }
        .ok_or(LanguageError::Provider)?;
        let iterator = BreakIterator {
            handle: iterator,
            close: self.speech.close,
        };
        if status > 0 {
            return Err(LanguageError::Provider);
        }
        let handle = iterator.handle.as_ptr();
        let mut start = unsafe { (self.speech.first)(handle) };
        if start != 0 {
            return Err(LanguageError::Provider);
        }
        loop {
            let end = unsafe { (self.speech.next)(handle) };
            if end == -1 {
                break;
            }
            if end <= start || end > length {
                return Err(LanguageError::Provider);
            }
            // ABI `UBRK_WORD_NONE_LIMIT=100`. Numbers, letters, kana and
            // ideographs all count, just as on the pinned Node build.
            if unsafe { (self.speech.status)(handle) } >= 100 {
                consume(WordSpan {
                    start: start as usize,
                    end: end as usize,
                });
            }
            start = end;
        }
        Ok(())
    }
}
