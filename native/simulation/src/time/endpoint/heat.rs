//! A fire already lit before discrete work uses that interval's fuel. The
//! emitted occurrence goes through ordinary receiving and history.
use super::*;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::host::retained_size::heap_sum;

pub(super) struct HeatCursor {
    burning: std::vec::IntoIter<EntityHandle>,
    seconds: f64,
    pending: Option<ByteReservation>,
    _storage: ByteReservation,
}

impl HeatCursor {
    pub(super) fn capture(
        core: &CoreMutation<'_>,
        sources: &[EntityHandle],
        seconds: f64,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        if sources.is_empty() || seconds == 0.0 {
            return Ok(None);
        }
        let storage = budget.reserve(
            sources
                .len()
                .checked_mul(size_of::<EntityHandle>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut burning = Vec::with_capacity(sources.len());
        burning.extend(sources.iter().copied().filter(|handle| {
            core.state
                .physical
                .entities
                .resolve(*handle)
                .and_then(|entity| entity.heat)
                .is_some_and(|heat| heat.lit)
        }));
        if burning.is_empty() {
            return Ok(None);
        }
        Ok(Some(Self {
            burning: burning.into_iter(),
            seconds,
            pending: None,
            _storage: storage,
        }))
    }

    pub(super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CompletedOccurrence>,
        budget: &ByteBudget,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        match (self.pending.take(), answer) {
            // The event owner has already completed the occurrence journal.
            // Advance checked its receipt before delivering it to this cursor.
            (Some(_guard), Some(_)) => (),
            (None, None) => (),
            _ => return Err(ExecutionError::UnfinishedOccurrence),
        }
        for handle in self.burning.by_ref() {
            if !core.physical().burn_heat(handle, self.seconds)? {
                continue;
            }
            let source = &core
                .state
                .physical
                .entities
                .resolve(handle)
                .ok_or(ExecutionError::MissingEntity)?
                .id;
            let rules = core
                .state
                .installed
                .occurrence_rules
                .value()
                .fire_out
                .as_ref()
                .ok_or(ExecutionError::UnsupportedFamily)?;
            let bytes = heap_sum([
                source.len(),
                rules.event_type.len(),
                rules.message.storage_bytes(),
            ])
            .ok_or(ExecutionError::Capacity)?;
            let guard = budget.reserve(bytes)?;
            let event = core.stage_event(EventEmissionIntent {
                event_type: rules.event_type.clone(),
                text: EmissionText::Literal(rules.message.clone()),
                audience: AudienceSelection::Physical,
                source_id: Some(source.clone()),
                target_id: None,
                data: None,
                scope: EventScope::External,
                origin: None,
                exposure: None,
            })?;
            self.pending = Some(guard);
            return Ok(Some(event));
        }
        Ok(None)
    }
}
