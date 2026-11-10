//! Both initial issuance and higher reconsideration select real catalogue rows.
//! The refreshed work identity remains T2 even when the catalogue is T0.
use super::*;

pub(crate) fn prepare_ordinary_actions(
    original: &PreparedNpcCandidates,
    current: &PreparedNpcCandidates,
    selected: &[NpcActionOrdinal],
    actor: &str,
    decision: &str,
    extra_capacity: usize,
    budget: &ByteBudget,
) -> Result<
    (
        IndexMap<String, ResponseActionChoice>,
        Vec<String>,
        ByteReservation,
    ),
    ExecutionError,
> {
    let capacity = selected
        .len()
        .checked_add(extra_capacity)
        .ok_or(ExecutionError::Capacity)?;
    let bytes = map_storage::<String, ResponseActionChoice>(capacity)
        .and_then(|n| n.checked_add(selected.len().checked_mul(size_of::<String>())?))
        .ok_or(ExecutionError::Capacity)?;
    let mut storage = budget.reserve(bytes)?;
    let mut actions = IndexMap::with_capacity(capacity);
    let mut aliases = Vec::with_capacity(selected.len());
    for selected in selected {
        let catalogue = match selected.source {
            NpcCatalogueSource::Original => original,
            NpcCatalogueSource::Current => current,
        };
        let offer = catalogue
            .offers()
            .get(selected.ordinal)
            .ok_or_else(invalid)?;
        let command = offer.command.as_ref();
        let text = command.map(|command| command.source_encoding());
        reserve(
            &mut storage,
            heap_sum([
                selected
                    .alias
                    .len()
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?,
                current.work.heap_bytes().ok_or(ExecutionError::Capacity)?,
                command
                    .and_then(|c| c.envelope().chosen_purpose.as_ref())
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or(ExecutionError::Capacity)?,
                text.map_or(0, str::len)
                    .checked_mul(12)
                    .ok_or(ExecutionError::Capacity)?,
                actor
                    .len()
                    .checked_add(decision.len())
                    .and_then(|n| n.checked_mul(8))
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let invocation = text
            .map(|text| -> Result<SqlCell, ExecutionError> {
                let mut value: SqlCell = serde_json::from_str(text).map_err(|_| invalid())?;
                let SqlCell::Object(object) = &mut value else {
                    return Err(invalid());
                };
                object.insert("actorId".into(), actor.into());
                object.insert("id".into(), decision.into());
                Ok(value)
            })
            .transpose()?;
        if actions.contains_key(&selected.alias) {
            return Err(invalid());
        }
        aliases.push(selected.alias.clone());
        actions.insert(
            selected.alias.clone(),
            ResponseActionChoice {
                invocation,
                purpose: command.and_then(|command| command.envelope().chosen_purpose.clone()),
                transition: offer.transition,
                expected_work: current.work.clone(),
            },
        );
    }
    Ok((actions, aliases, storage))
}
