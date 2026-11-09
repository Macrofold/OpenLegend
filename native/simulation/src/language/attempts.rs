//! One finite normalization batch uses Source's actual Node Unicode rules.
//! These language facts never decide permissions or execute an intention.
use super::*;
use crate::execution::ExecutionError;
use crate::text::JsText;

#[derive(Serialize)]
pub(crate) struct AttemptNormalizationRequest {
    pub binding: GeometryBinding,
    pub descriptions: Vec<JsText>,
    #[serde(skip)]
    reservation: ByteReservation,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AttemptNormalizationAnswer {
    pub binding: GeometryBinding,
    pub normalized: Vec<JsText>,
}
pub(crate) struct NormalizedAttemptFacts {
    descriptions: Vec<JsText>,
    normalized: Vec<JsText>,
    _reservation: ByteReservation,
}
pub(crate) struct NormalizedAttempt<'a> {
    description: &'a JsText,
    normalized: &'a JsText,
}
impl NormalizedAttempt<'_> {
    pub(crate) fn description(&self) -> &JsText {
        self.description
    }
    pub(crate) fn normalized(&self) -> &JsText {
        self.normalized
    }
}
impl NormalizedAttemptFacts {
    pub(crate) fn get(&self, index: usize) -> Option<NormalizedAttempt<'_>> {
        Some(NormalizedAttempt {
            description: self.descriptions.get(index)?,
            normalized: self.normalized.get(index)?,
        })
    }
}
impl AttemptNormalizationRequest {
    pub(crate) fn prepare<'a>(
        binding: GeometryBinding,
        descriptions: impl Iterator<Item = &'a JsText> + Clone,
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
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                text_bytes,
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
        Ok(Self {
            binding,
            descriptions: owned,
            reservation,
        })
    }
    pub(crate) fn finish(
        self,
        answer: AttemptNormalizationAnswer,
    ) -> Result<NormalizedAttemptFacts, ExecutionError> {
        if answer.binding != self.binding || answer.normalized.len() != self.descriptions.len() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let Self {
            binding: _,
            descriptions,
            mut reservation,
        } = self;
        // The common provider decoder funds returned text before parsing. Move
        // its actual result into this request's custody before that guard drops;
        // do not guess Unicode expansion ratios or recompute another version.
        reservation.resize(
            answer
                .normalized
                .heap_bytes()
                .and_then(|n| n.checked_add(descriptions.heap_bytes()?))
                .and_then(|n| n.checked_add(size_of::<NormalizedAttemptFacts>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(NormalizedAttemptFacts {
            descriptions,
            normalized: answer.normalized,
            _reservation: reservation,
        })
    }
}
