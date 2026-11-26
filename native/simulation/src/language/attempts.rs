//! A finite local normalization batch for exact movement proposals.
//! These language facts never decide permissions or execute an intention.
use super::*;
use crate::execution::ExecutionError;
use crate::narration::{NameArticle, name_phrase};
use crate::state::Named;
use crate::text::JsText;
use std::sync::Arc;

pub(crate) struct AttemptNormalizationRequest {
    pub binding: GeometryBinding,
    pub descriptions: Vec<JsText>,
    pub target_names: Vec<(usize, JsText)>,
    _reservation: ByteReservation,
}
pub(crate) struct AttemptNormalizationAnswer {
    pub binding: GeometryBinding,
    pub normalized: Vec<JsText>,
    pub syntax: Vec<Option<FreeTypedActionSyntax>>,
}
#[derive(Clone)]
pub(crate) enum FreeTypedActionSyntax {
    NamedApproach { label: JsText },
    RememberedPlace,
    Offset { x: Option<f64>, z: Option<f64> },
    DistanceNeeded,
}
impl HeapBytes for FreeTypedActionSyntax {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::NamedApproach { label } => label.heap_bytes(),
            _ => Some(0),
        }
    }
}
pub(crate) struct NormalizedAttemptFacts {
    descriptions: Arc<AttemptNormalizationRequest>,
    normalized: Vec<JsText>,
    syntax: Vec<Option<FreeTypedActionSyntax>>,
    _reservation: ByteReservation,
}
pub(crate) struct NormalizedAttempt<'a> {
    description: &'a JsText,
    normalized: &'a JsText,
    syntax: Option<&'a FreeTypedActionSyntax>,
}
impl NormalizedAttempt<'_> {
    pub(crate) fn description(&self) -> &JsText {
        self.description
    }
    pub(crate) fn normalized(&self) -> &JsText {
        self.normalized
    }
    pub(crate) fn syntax(&self) -> Option<&FreeTypedActionSyntax> {
        self.syntax
    }
}
impl NormalizedAttemptFacts {
    pub(crate) fn get(&self, index: usize) -> Option<NormalizedAttempt<'_>> {
        Some(NormalizedAttempt {
            description: self.descriptions.descriptions.get(index)?,
            normalized: self.normalized.get(index)?,
            syntax: self.syntax.get(index)?.as_ref(),
        })
    }
}
impl AttemptNormalizationRequest {
    pub(crate) fn prepare<'a>(
        binding: GeometryBinding,
        descriptions: impl Iterator<Item = &'a JsText> + Clone,
        target_names: impl Iterator<Item = (usize, &'a Named)> + Clone,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let (count, text_bytes) = descriptions
            .clone()
            .try_fold((0_usize, 0_usize), |(count, bytes), text| {
                Some((
                    count.checked_add(1)?,
                    bytes.checked_add(text.storage_bytes())?,
                ))
            })
            .ok_or(ExecutionError::Capacity)?;
        let (named_count, named_bytes) = target_names
            .clone()
            .try_fold((0_usize, 0_usize), |(count, bytes), (_, name)| {
                Some((
                    count.checked_add(1)?,
                    bytes
                        .checked_add(size_of::<(usize, JsText)>() + 128)?
                        .checked_add(name.name.heap_bytes()?.checked_mul(8)?)?,
                ))
            })
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>() + 2 * size_of::<usize>(),
                text_bytes,
                named_bytes,
                count
                    .checked_mul(size_of::<JsText>())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut owned = Vec::new();
        owned
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        owned.extend(descriptions.cloned());
        let mut selected_names = Vec::new();
        selected_names
            .try_reserve_exact(named_count)
            .map_err(|_| ExecutionError::Capacity)?;
        selected_names.extend(
            target_names
                .map(|(index, name)| (index, name_phrase(name, NameArticle::Definite, false))),
        );
        Ok(Self {
            binding,
            descriptions: owned,
            target_names: selected_names,
            _reservation: reservation,
        })
    }
    pub(crate) fn finish_shared(
        self: Arc<Self>,
        answer: AttemptNormalizationAnswer,
        budget: &ByteBudget,
    ) -> Result<NormalizedAttemptFacts, ExecutionError> {
        self.check(&answer)?;
        // The typed provider and cursor share the exact funded originals.
        let reservation = budget.reserve(
            heap_sum([
                answer
                    .normalized
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                answer.syntax.heap_bytes().ok_or(ExecutionError::Capacity)?,
                size_of::<NormalizedAttemptFacts>(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(NormalizedAttemptFacts {
            descriptions: self,
            normalized: answer.normalized,
            syntax: answer.syntax,
            _reservation: reservation,
        })
    }
    fn check(&self, answer: &AttemptNormalizationAnswer) -> Result<(), ExecutionError> {
        if answer.binding != self.binding
            || answer.normalized.len() != self.descriptions.len()
            || answer.syntax.len() != self.descriptions.len()
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        Ok(())
    }
}
