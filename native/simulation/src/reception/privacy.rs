//! Targeted canonical privacy cleanup. Ordinary end-current and life retirement
//! do not grant this authority or substitute for its exact source selection.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use indexmap::IndexSet;
mod attention;
mod current;
pub(crate) fn revoke_attention_evidence(
    core: &mut CoreMutation<'_>,
    observer: &str,
    affected: &IndexSet<String>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    attention::revoke_attention(core, observer, affected, budget)
}
pub(crate) fn revoke_current_evidence(
    core: &mut CoreMutation<'_>,
    observer: &str,
    affected: &IndexSet<String>,
    recognition: &IndexSet<String>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    current::revoke_current(core, observer, affected, recognition, budget)
}
