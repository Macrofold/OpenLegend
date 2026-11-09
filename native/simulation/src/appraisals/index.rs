//! The Source actor/definition/target indexes select before reading rich records.
//! Saved insertion order remains in `records`; these derived keys are never rows.
use super::{Appraisal, ExecutionError};
use crate::encoding::{js_string_cmp, json_record};
use crate::host::retained_size::{heap_sum, tree_node_bound};
use crate::values::DefinitionPin;
use std::cmp::Ordering;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Eq, PartialEq)]
pub(super) struct Key(String);
impl PartialOrd for Key {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for Key {
    fn cmp(&self, other: &Self) -> Ordering {
        js_string_cmp(&self.0, &other.0)
    }
}
#[derive(Default)]
pub(super) struct AppraisalIndex {
    active: BTreeSet<Key>,
    scoped: BTreeMap<Key, String>,
}
fn capacity() -> ExecutionError {
    ExecutionError::Capacity
}
fn scope(pin: &DefinitionPin, target: Option<&str>) -> Result<String, ExecutionError> {
    let mut key = json_record(&(&pin.id, pin.version, &pin.digest, target))
        .map_err(|_| ExecutionError::Invariant)?;
    key.push('\0');
    Ok(key)
}
impl AppraisalIndex {
    /// JSON string escaping can expand each byte sixfold. Two complete tree
    /// nodes per live entry conservatively cover even a sparse B-tree.
    pub(super) fn entry_bound(value: &Appraisal) -> Result<usize, ExecutionError> {
        if value.state != "active" {
            return Ok(0);
        }
        let strings = heap_sum([
            value.id.len().checked_mul(3).ok_or_else(capacity)?,
            value.definition_pin.id.len(),
            value.definition_pin.digest.len(),
            value.target_id.as_ref().map_or(0, String::len),
        ])
        .ok_or_else(capacity)?;
        heap_sum([
            strings.checked_mul(6).ok_or_else(capacity)?,
            128,
            tree_node_bound::<Key, ()>().ok_or_else(capacity)?,
            tree_node_bound::<Key, String>().ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)
    }
    pub(super) fn insert(&mut self, value: &Appraisal) -> Result<(), ExecutionError> {
        if value.state != "active" {
            return Ok(());
        }
        let mut scoped = scope(&value.definition_pin, value.target_id.as_deref())?;
        scoped.push_str(&value.id);
        self.active.insert(Key(value.id.clone()));
        self.scoped.insert(Key(scoped), value.id.clone());
        Ok(())
    }
    pub(super) fn remove(&mut self, value: &Appraisal) -> Result<(), ExecutionError> {
        if value.state != "active" {
            return Ok(());
        }
        let mut scoped = scope(&value.definition_pin, value.target_id.as_deref())?;
        scoped.push_str(&value.id);
        self.active.remove(&Key(value.id.clone()));
        self.scoped.remove(&Key(scoped));
        Ok(())
    }
    pub(super) fn active(&self) -> impl Iterator<Item = &str> {
        self.active.iter().map(|key| key.0.as_str())
    }
    pub(super) fn active_len(&self) -> usize {
        self.active.len()
    }
    pub(super) fn scoped<'a>(&'a self, prefix: &'a str) -> impl Iterator<Item = &'a str> {
        self.scoped
            .range(Key(prefix.to_owned())..)
            .take_while(move |(key, _)| key.0.starts_with(prefix))
            .map(|(_, id)| id.as_str())
    }
    pub(super) fn scope_key(
        pin: &DefinitionPin,
        target: Option<&str>,
    ) -> Result<String, ExecutionError> {
        scope(pin, target)
    }
}
