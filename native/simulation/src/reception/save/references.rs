//! One shared-value ownership comparison for the three current-evidence tables.
//! Callers select and fund their actual row and sorted reference closures first.
use crate::records::{RowEffects, SqlCell};
pub(in super::super) struct ReferenceDelta<'a> {
    refs: Vec<&'a str>,
    changed: bool,
    additions: Option<Vec<String>>,
    removals: Option<Vec<String>>,
}
impl<'a> ReferenceDelta<'a> {
    pub fn new(before: Option<Vec<&'a str>>, refs: Vec<&'a str>, insert_only: bool) -> Self {
        let existed = before.is_some();
        let before = before.unwrap_or_default();
        let changed = !existed || before != refs;
        // Without a certified predecessor/insert, the writer must replace the
        // full stored closure rather than infer removals from an empty vector.
        let known = changed && (existed || insert_only);
        let additions = known.then(|| {
            refs.iter()
                .filter(|id| {
                    before
                        .binary_search_by(|old| crate::encoding::js_string_cmp(old, id))
                        .is_err()
                })
                .map(|id| (*id).to_owned())
                .collect()
        });
        let removals = known.then(|| {
            before
                .iter()
                .filter(|id| {
                    refs.binary_search_by(|next| crate::encoding::js_string_cmp(next, id))
                        .is_err()
                })
                .map(|id| (*id).to_owned())
                .collect()
        });
        Self {
            refs,
            changed,
            additions,
            removals,
        }
    }
    pub fn changed(&self) -> bool {
        self.changed
    }
    pub fn cell(&self) -> SqlCell {
        SqlCell::Array(self.refs.iter().map(|id| SqlCell::from(*id)).collect())
    }
    pub fn effects(&self) -> RowEffects<'_> {
        RowEffects {
            received_uses_changed: Some(self.changed),
            received_value_additions: self.additions.as_deref(),
            received_value_removals: self.removals.as_deref(),
            ..RowEffects::default()
        }
    }
}
