//! Saved identity and random continuation. Scheduling never owns either sequence.
//!
//! Arithmetic/order matches `packages/domain/src/data.ts`; gameplay restoration
//! additionally retains the issued high-water under docs/identity-and-references.md.

use std::fmt;

pub const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IdentityState {
    rng_state: u32,
    next_id: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IssuedIdentity {
    pub id: String,
    pub sequence: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IdentityExhausted;

impl fmt::Display for IdentityExhausted {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("World identity sequence is exhausted or invalid.")
    }
}

impl std::error::Error for IdentityExhausted {}

impl IdentityState {
    pub fn install(rng_state: u32, next_id: u64) -> Result<Self, IdentityExhausted> {
        if next_id > MAX_SAFE_INTEGER {
            return Err(IdentityExhausted);
        }
        Ok(Self { rng_state, next_id })
    }

    pub fn rng_state(&self) -> u32 {
        self.rng_state
    }

    pub fn next_id(&self) -> u64 {
        self.next_id
    }

    pub fn draw(&mut self) -> f64 {
        let mut x = self.rng_state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.rng_state = x;
        f64::from(x) / 4_294_967_296.0
    }

    pub fn allocate(&mut self, prefix: &str) -> Result<IssuedIdentity, IdentityExhausted> {
        if self.next_id >= MAX_SAFE_INTEGER {
            return Err(IdentityExhausted);
        }
        let sequence = self.next_id;
        self.next_id += 1;
        Ok(IssuedIdentity {
            id: format!("{prefix}-{sequence}"),
            sequence,
        })
    }

    /// Authored keys can already occupy a native-looking identity. Membership is
    /// checked only in its owning entity dictionary, without scanning history.
    pub fn allocate_entity(
        &mut self,
        prefix: &str,
        mut present: impl FnMut(&str) -> bool,
    ) -> Result<IssuedIdentity, IdentityExhausted> {
        loop {
            let issued = self.allocate(prefix)?;
            if !present(&issued.id) {
                return Ok(issued);
            }
        }
    }

    pub fn reserve_entity(&mut self, id: &str) {
        let Some((prefix, suffix)) = id.rsplit_once('-') else {
            return;
        };
        if prefix.is_empty()
            || prefix.contains(['\n', '\r', '\u{2028}', '\u{2029}'])
            || suffix.is_empty()
            || (suffix.len() > 1 && suffix.starts_with('0'))
            || !suffix.bytes().all(|byte| byte.is_ascii_digit())
        {
            return;
        }
        if let Ok(sequence) = suffix.parse::<u64>()
            && sequence < MAX_SAFE_INTEGER
            && self.next_id <= sequence
        {
            self.next_id = sequence + 1;
        }
    }

    /// A private candidate rolls back the exact copied state instead. Keeping
    /// already-issued IDs applies only to an accepted gameplay rewind.
    pub fn preserve_issued_high_water(&mut self, current: Self) {
        self.next_id = self.next_id.max(current.next_id);
    }
}
