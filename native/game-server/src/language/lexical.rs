//! Match the pinned Source word policy using the same Unicode data.

use super::{LanguageError, LanguageProvider, symbol};
use indexmap::IndexMap;
use libloading::Library;
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation},
    text::JsText,
};
use std::ffi::{c_char, c_void};
use std::fmt::Write as _;

type Normalizer = unsafe extern "C" fn(*mut i32) -> *const c_void;
type Normalize =
    unsafe extern "C" fn(*const c_void, *const u16, i32, *mut u16, i32, *mut i32) -> i32;
type Lowercase =
    unsafe extern "C" fn(*mut u16, i32, *const u16, i32, *const c_char, *mut i32) -> i32;
type Category = unsafe extern "C" fn(i32) -> i8;
const BUFFER_OVERFLOW: i32 = 15;

pub(super) struct LexicalPolicy {
    model: Normalizer,
    normalize: Normalize,
    lowercase: Lowercase,
    category: Category,
}

impl LexicalPolicy {
    pub(super) unsafe fn load(library: &Library) -> Result<Self, LanguageError> {
        // Exact ABI from the same verified ICU version as the collator.
        unsafe {
            Ok(Self {
                model: symbol(library, b"unorm2_getNFKCInstance_78")?,
                normalize: symbol(library, b"unorm2_normalize_78")?,
                lowercase: symbol(library, b"u_strToLower_78")?,
                category: symbol(library, b"u_charType_78")?,
            })
        }
    }
}

pub struct LexicalVector {
    value: String,
    _storage: ByteReservation,
}
impl LexicalVector {
    pub fn as_str(&self) -> &str {
        &self.value
    }
}

impl LanguageProvider {
    /// Mind filenames follow the current engine's 1–64-letter/number path
    /// grammar with spaces, underscores and hyphens, and an exact .md suffix.
    pub(crate) fn valid_mind_path(&self, path: &JsText) -> bool {
        let Some(stem) = path.as_unicode().and_then(|path| path.strip_suffix(".md")) else {
            return false;
        };
        !stem.is_empty()
            && stem.chars().enumerate().all(|(index, character)| {
                index < 64
                    && (matches!(character, '_' | ' ' | '-')
                        || matches!(unsafe { (self.lexical.category)(character as i32) }, 1..=5 | 9..=11))
            })
    }

    /// Count NFKC-normalized whitespace-separated words with the same pinned
    /// Unicode data as Source, preserving isolated UTF-16 units as nonspaces.
    pub(crate) fn maintenance_words(
        &self,
        parts: &[&JsText],
        budget: &ByteBudget,
    ) -> Result<u64, LanguageError> {
        use LanguageError::Capacity;
        let capacity = parts
            .iter()
            .try_fold(parts.len().saturating_sub(1), |total, text| {
                total.checked_add(text.units_len()).ok_or(Capacity)
            })?;
        let _input = budget
            .reserve(capacity.checked_mul(size_of::<u16>()).ok_or(Capacity)?)
            .map_err(|_| Capacity)?;
        let mut input = Vec::with_capacity(capacity);
        for (index, part) in parts.iter().enumerate() {
            if index != 0 {
                input.push(u16::from(b' '));
            }
            input.extend(part.units());
        }
        let (normalized, _normalization) = self.normalize_units(&input, budget)?;
        let mut count = 0;
        let mut in_word = false;
        for unit in normalized {
            let word = !char::from_u32(unit.into())
                .is_some_and(openlegend_simulation::encoding::is_js_whitespace);
            count += u64::from(word && !in_word);
            in_word = word;
        }
        Ok(count)
    }

    /// Prepare a saved intention's exact Source match text with the pinned ICU
    /// data. Return its own admitted bytes for the current-record installer.
    pub(crate) fn normalize_intention(
        &self,
        input: &JsText,
        budget: &ByteBudget,
    ) -> Result<(JsText, ByteReservation), LanguageError> {
        use LanguageError::Capacity;
        let input_custody = budget
            .reserve(input.units_len().checked_mul(2).ok_or(Capacity)?)
            .map_err(|_| Capacity)?;
        let input: Vec<_> = input.units().collect();
        let (mut lower, lower_custody) = self.normalized_lower(&input, budget)?;
        drop(input);
        drop(input_custody);
        // Source trims and collapses ECMAScript whitespace after NFKC and
        // root lowercase. All other code units, including NUL and isolated
        // surrogates, remain exact. The output never gets ahead of the read.
        let mut write = 0;
        let mut gap = false;
        for read in 0..lower.len() {
            let unit = lower[read];
            if char::from_u32(unit.into())
                .is_some_and(openlegend_simulation::encoding::is_js_whitespace)
            {
                gap = write != 0;
            } else {
                if gap {
                    lower[write] = u16::from(b' ');
                    write += 1;
                }
                lower[write] = unit;
                write += 1;
                gap = false;
            }
        }
        lower.truncate(write);
        // Fund Unicode conversion or JSON escaping before handing off either
        // the converted buffer or the original UTF-16 allocation.
        let mut custody = budget
            .reserve(
                write
                    .checked_mul(12)
                    .and_then(|n| n.checked_add(128))
                    .ok_or(Capacity)?,
            )
            .map_err(|_| Capacity)?;
        let normalized = JsText::from_units(lower);
        custody.merge(lower_custody).map_err(|_| Capacity)?;
        custody
            .resize(normalized.storage_bytes())
            .map_err(|_| Capacity)?;
        Ok((normalized, custody))
    }

    /// Generate exactly the Source tsvector text from one admitted search body.
    /// Transient ICU work is dropped before handing the result to a SQL owner.
    pub fn lexical_vector(
        &self,
        input: &str,
        budget: &ByteBudget,
    ) -> Result<LexicalVector, LanguageError> {
        use LanguageError::Capacity;
        let _input = budget
            .reserve(input.len().checked_mul(4).ok_or(Capacity)?)
            .map_err(|_| Capacity)?;
        let input = input.encode_utf16().collect::<Vec<_>>();
        let (lower, _lower) = self.normalized_lower(&input, budget)?;
        drop(input);
        drop(_input);
        let upper = lower
            .len()
            .checked_mul(128)
            .and_then(|bytes| bytes.checked_add(4096))
            .ok_or(Capacity)?;
        let mut custody = budget.reserve(upper).map_err(|_| Capacity)?;
        let mut words = IndexMap::<String, Vec<u16>>::new();
        let mut position = 0_u16;
        let add = |word: &mut String| {
            // PostgreSQL's explicit lexeme length/position constraints are
            // the current Source contract, shared by every search owner.
            if !word.is_empty() && word.len() < 2047 {
                position = (position + 1).min(16383);
                let positions = words.entry(std::mem::take(word)).or_default();
                if positions.len() < 255 && positions.last() != Some(&position) {
                    positions.push(position);
                }
            }
            word.clear();
        };
        self.visit_words(&lower, add);
        drop(lower);
        drop(_lower);
        let mut output = String::new();
        for (word, positions) in words {
            if !output.is_empty() {
                output.push(' ');
            }
            // Only letters, marks and numbers enter a lexeme; neither SQL
            // quote nor the tsvector escape character can occur in it.
            write!(&mut output, "'{word}':").expect("string write");
            for (index, position) in positions.into_iter().enumerate() {
                if index != 0 {
                    output.push(',');
                }
                write!(&mut output, "{position}").expect("string write");
            }
        }
        custody.resize(output.capacity()).map_err(|_| Capacity)?;
        Ok(LexicalVector {
            value: output,
            _storage: custody,
        })
    }

    /// Share the pinned Source normalization with private prefix searches.
    /// Borrow each word in turn. Neither the callback nor ICU retains it.
    pub(crate) fn search_words(
        &self,
        input: &JsText,
        budget: &ByteBudget,
        mut consume: impl FnMut(&str),
    ) -> Result<(), LanguageError> {
        use LanguageError::Capacity;
        let _input = budget
            .reserve(input.units_len().checked_mul(2).ok_or(Capacity)?)
            .map_err(|_| Capacity)?;
        let input: Vec<_> = input.units().collect();
        let (lower, _lower) = self.normalized_lower(&input, budget)?;
        drop(input);
        drop(_input);
        let _word = budget
            .reserve(lower.len().checked_mul(6).ok_or(Capacity)?)
            .map_err(|_| Capacity)?;
        self.visit_words(&lower, |word| {
            if !word.is_empty() {
                consume(word);
            }
            word.clear();
        });
        Ok(())
    }

    fn normalized_lower(
        &self,
        input: &[u16],
        budget: &ByteBudget,
    ) -> Result<(Vec<u16>, ByteReservation), LanguageError> {
        let (normalized, _normalized) = self.normalize_units(input, budget)?;
        self.lowercase_units(&normalized, budget)
    }

    fn normalize_units(
        &self,
        input: &[u16],
        budget: &ByteBudget,
    ) -> Result<(Vec<u16>, ByteReservation), LanguageError> {
        use LanguageError::{Capacity, Provider};
        let length = i32::try_from(input.len()).map_err(|_| Capacity)?;
        let mut status = 0;
        // The NFKC singleton belongs to the pinned ICU library. Its immutable
        // data can be read concurrently, with no shared collation lock.
        let model = unsafe { (self.lexical.model)(&mut status) };
        if status > 0 || model.is_null() {
            return Err(Provider);
        }
        transform(budget, |output, maximum, status| unsafe {
            (self.lexical.normalize)(model, input.as_ptr(), length, output, maximum, status)
        })
    }

    pub(super) fn lowercase_units(
        &self,
        input: &[u16],
        budget: &ByteBudget,
    ) -> Result<(Vec<u16>, ByteReservation), LanguageError> {
        let length = i32::try_from(input.len()).map_err(|_| LanguageError::Capacity)?;
        transform(budget, |output, maximum, status| unsafe {
            // Empty locale is ICU root, matching ECMAScript toLowerCase, not
            // the service's process/user locale or toLocaleLowerCase.
            (self.lexical.lowercase)(
                output,
                maximum,
                input.as_ptr(),
                length,
                c"".as_ptr(),
                status,
            )
        })
    }

    fn visit_words(&self, normalized: &[u16], mut add: impl FnMut(&mut String)) {
        let mut chars = char::decode_utf16(normalized.iter().copied()).peekable();
        let mut word = String::new();
        while let Some(next) = chars.next() {
            let Ok(next) = next else {
                // An isolated surrogate is outside Source's word categories.
                add(&mut word);
                continue;
            };
            if next == 'i' && matches!(chars.peek(), Some(Ok('\u{0307}'))) {
                chars.next();
            }
            // ICU UCharCategory 1..=11 are exactly General Category L, M, N.
            if matches!(unsafe { (self.lexical.category)(next as i32) }, 1..=11) {
                word.push(next);
            } else {
                add(&mut word);
            }
        }
        add(&mut word);
    }
}

fn transform(
    budget: &ByteBudget,
    mut call: impl FnMut(*mut u16, i32, *mut i32) -> i32,
) -> Result<(Vec<u16>, ByteReservation), LanguageError> {
    let mut status = 0;
    let length = call(std::ptr::null_mut(), 0, &mut status);
    if length < 0 || (status > 0 && status != BUFFER_OVERFLOW) {
        return Err(LanguageError::Provider);
    }
    let bytes = (length as usize)
        .checked_mul(2)
        .ok_or(LanguageError::Capacity)?;
    let custody = budget.reserve(bytes).map_err(|_| LanguageError::Capacity)?;
    let mut destination = vec![0; length as usize];
    if length != 0 {
        status = 0;
        let written = call(destination.as_mut_ptr(), length, &mut status);
        if written != length || status > 0 {
            return Err(LanguageError::Provider);
        }
    }
    Ok((destination, custody))
}
