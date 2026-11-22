//! The stand-alone host uses the pinned comparison Node build's ICU data
//! through ICU's C ABI. Runtime language providers have no world authority.

use libloading::Library;
use openlegend_simulation::{
    encoding::hex_bytes,
    host::{ByteBudget, ResidentReservation},
    text::JsText,
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{
    ffi::{c_char, c_void},
    fmt, fs,
    io::Read,
    path::Path,
    ptr::NonNull,
    sync::Mutex,
};

pub(crate) mod canonical;
mod lexical;
mod speech;
pub use lexical::LexicalVector;
pub(crate) use speech::PreparedWordLists;

const NODE_DATA_SHA: &str = "2cac4f3277df9fa37f8ebd5d3459d4151e99f7d84d99fca5b7392fcd3c880ea9";
const MAX_LIBRARY_BYTES: u64 = 128 * 1024 * 1024;
#[cfg(target_os = "macos")]
const LIBRARY_NAME: &str = "libopenlegend_icu.dylib";
#[cfg(not(target_os = "macos"))]
const LIBRARY_NAME: &str = "libopenlegend_icu.so";

type Open = unsafe extern "C" fn(*const c_char, *mut i32) -> *mut c_void;
type Close = unsafe extern "C" fn(*mut c_void);
type Compare = unsafe extern "C" fn(*const c_void, *const u16, i32, *const u16, i32) -> i32;
type CompareUtf8 =
    unsafe extern "C" fn(*const c_void, *const c_char, i32, *const c_char, i32, *mut i32) -> i32;
type SetAttribute = unsafe extern "C" fn(*mut c_void, i32, i32, *mut i32);
type Version = unsafe extern "C" fn(*mut u8);
type DataVersion = unsafe extern "C" fn(*mut u8, *mut i32);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Manifest {
    library_sha256: String,
    node_data_sha256: String,
}

#[derive(Debug)]
pub enum LanguageError {
    Artifact,
    Capacity,
    Incompatible,
    Provider,
}
impl fmt::Display for LanguageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Artifact => "The installed ICU artifact is missing or changed",
            Self::Capacity => "Language work does not fit its admitted storage",
            Self::Incompatible => "The installed ICU release does not match the reference",
            Self::Provider => "The installed ICU provider refused this comparison",
        })
    }
}
impl std::error::Error for LanguageError {}

struct Collator {
    handle: NonNull<c_void>,
    close: Close,
}
// The provider's mutex serializes this fixed C object on application workers.
// The function pointers stay live until after the collator drops.
unsafe impl Send for Collator {}

impl Drop for Collator {
    fn drop(&mut self) {
        unsafe { (self.close)(self.handle.as_ptr()) }
    }
}

pub struct LanguageProvider {
    collator: Mutex<Collator>,
    compare: Compare,
    compare_utf8: CompareUtf8,
    lexical: lexical::LexicalPolicy,
    speech: speech::SpeechPolicy,
    _library: Library,
    _resident: ResidentReservation,
}

impl LanguageProvider {
    pub fn open(directory: &Path, budget: &ByteBudget) -> Result<Self, LanguageError> {
        let mut bytes = Vec::new();
        fs::File::open(directory.join("language.json"))
            .and_then(|file| file.take(4097).read_to_end(&mut bytes))
            .map_err(|_| LanguageError::Artifact)?;
        if bytes.len() > 4096 {
            return Err(LanguageError::Artifact);
        }
        let manifest: Manifest =
            serde_json::from_slice(&bytes).map_err(|_| LanguageError::Artifact)?;
        if manifest.node_data_sha256 != NODE_DATA_SHA {
            return Err(LanguageError::Incompatible);
        }
        let file = directory.join(LIBRARY_NAME);
        let size = digest_library(&file, &manifest.library_sha256)?;
        let custody = budget
            .resident()
            .reserve(size)
            .map_err(|_| LanguageError::Capacity)?;
        // The release is an operator-installed immutable artifact. No request
        // chooses a load path, symbol name or ABI. The manifest is checked first.
        let library = unsafe { Library::new(file) }.map_err(|_| LanguageError::Artifact)?;
        unsafe {
            let version = symbol::<Version>(&library, b"u_getVersion_78")?;
            let data_version = symbol::<DataVersion>(&library, b"ulocdata_getCLDRVersion_78")?;
            let mut actual = [0_u8; 4];
            let mut status = 0;
            version(actual.as_mut_ptr());
            if actual != [78, 2, 0, 0] {
                return Err(LanguageError::Incompatible);
            }
            data_version(actual.as_mut_ptr(), &mut status);
            if status > 0 || actual != [48, 0, 0, 0] {
                return Err(LanguageError::Incompatible);
            }
            let open = symbol::<Open>(&library, b"ucol_open_78")?;
            let close = symbol::<Close>(&library, b"ucol_close_78")?;
            let compare = symbol::<Compare>(&library, b"ucol_strcoll_78")?;
            let compare_utf8 = symbol::<CompareUtf8>(&library, b"ucol_strcollUTF8_78")?;
            let set_attribute = symbol::<SetAttribute>(&library, b"ucol_setAttribute_78")?;
            status = 0;
            let handle = NonNull::new(open(c"en_US".as_ptr(), &mut status))
                .ok_or(LanguageError::Provider)?;
            let collator = Collator { handle, close };
            // V8's default sorting collator enables normalization, tertiary
            // strength (variant sensitivity), and non-ignorable punctuation.
            set_attribute(handle.as_ptr(), 4, 17, &mut status);
            set_attribute(handle.as_ptr(), 5, 2, &mut status);
            set_attribute(handle.as_ptr(), 1, 21, &mut status);
            if status > 0 {
                return Err(LanguageError::Provider);
            }
            let lexical = lexical::LexicalPolicy::load(&library)?;
            let speech = speech::SpeechPolicy::load(&library)?;
            Ok(Self {
                lexical,
                speech,
                collator: Mutex::new(collator),
                compare,
                compare_utf8,
                _library: library,
                _resident: custody,
            })
        }
    }

    /// The operation already owns the caller's admitted UTF-16 temporaries.
    /// Match the stable ECMAScript sort and preserve the comparator's equality.
    pub fn collate(&self, strings: &[JsText]) -> Result<(Vec<u32>, Vec<u32>), LanguageError> {
        let capacity = u32::try_from(strings.len()).map_err(|_| LanguageError::Capacity)?;
        let values = strings
            .iter()
            .map(|value| {
                let length =
                    i32::try_from(value.units_len()).map_err(|_| LanguageError::Capacity)?;
                Ok((value.units().collect::<Vec<_>>(), length))
            })
            .collect::<Result<Vec<_>, LanguageError>>()?;
        let collator = self.collator.lock().map_err(|_| LanguageError::Provider)?;
        let compare = |left: u32, right: u32| {
            let (a, an) = &values[left as usize];
            let (b, bn) = &values[right as usize];
            // Each pointer and length refer to the owned vector retained
            // through this call. ICU does not retain these arguments.
            unsafe { (self.compare)(collator.handle.as_ptr(), a.as_ptr(), *an, b.as_ptr(), *bn) }
                .cmp(&0)
        };
        let mut order: Vec<u32> = (0..capacity).collect();
        order.sort_by(|left, right| compare(*left, *right));
        let mut group = 0;
        let mut groups = Vec::with_capacity(order.len());
        if !order.is_empty() {
            groups.push(group);
        }
        for pair in order.windows(2) {
            if !compare(pair[0], pair[1]).is_eq() {
                group += 1;
            }
            groups.push(group);
        }
        Ok((order, groups))
    }

    /// Storage uses this same installed comparator for Source's canonical
    /// evidence JSON. Inputs are borrowed valid UTF-8, with no copy or I/O.
    pub fn compare_utf8(
        &self,
        left: &str,
        right: &str,
    ) -> Result<std::cmp::Ordering, LanguageError> {
        let a = i32::try_from(left.len()).map_err(|_| LanguageError::Capacity)?;
        let b = i32::try_from(right.len()).map_err(|_| LanguageError::Capacity)?;
        let collator = self.collator.lock().map_err(|_| LanguageError::Provider)?;
        let mut status = 0;
        let result = unsafe {
            (self.compare_utf8)(
                collator.handle.as_ptr(),
                left.as_ptr().cast(),
                a,
                right.as_ptr().cast(),
                b,
                &mut status,
            )
        };
        if status > 0 {
            return Err(LanguageError::Provider);
        }
        Ok(result.cmp(&0))
    }
}

unsafe fn symbol<T: Copy>(library: &Library, name: &[u8]) -> Result<T, LanguageError> {
    // Symbol names and signatures mirror the pinned ICU public headers.
    unsafe { library.get::<T>(name) }
        .map(|symbol| *symbol)
        .map_err(|_| LanguageError::Incompatible)
}

fn digest_library(path: &Path, expected: &str) -> Result<usize, LanguageError> {
    let file = fs::File::open(path).map_err(|_| LanguageError::Artifact)?;
    let mut digest = Sha256::new();
    let mut remaining = file.take(MAX_LIBRARY_BYTES + 1);
    let mut buffer = [0_u8; 64 * 1024];
    let mut size = 0_u64;
    loop {
        let count = remaining
            .read(&mut buffer)
            .map_err(|_| LanguageError::Artifact)?;
        if count == 0 {
            break;
        }
        size += count as u64;
        digest.update(&buffer[..count]);
    }
    if size > MAX_LIBRARY_BYTES || hex_bytes(&digest.finalize()) != expected {
        return Err(LanguageError::Artifact);
    }
    usize::try_from(size).map_err(|_| LanguageError::Capacity)
}
