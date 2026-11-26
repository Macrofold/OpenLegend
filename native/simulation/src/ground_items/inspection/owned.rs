//! A selected carried recipe keeps one finite inspection proof. Reopening an
//! inventory checks the same ancestry and revision without hydrating history.
use super::*;

pub(crate) fn scope(
    state: &SimulationState,
    actor: &str,
    container: &str,
    budget: &ByteBudget,
) -> Result<Option<(JsText, ByteReservation)>, ExecutionError> {
    let Some(owner) = state
        .physical
        .entities
        .get(actor)
        .filter(|entity| entity.actor.is_some())
    else {
        return Ok(None);
    };
    let depth = crate::install::inventory_ancestor_limit();
    let mut custody = budget.reserve(1024 + depth * 1024)?;
    let mut containers = Vec::with_capacity(if container == actor { 1 } else { depth + 1 });
    let root = if container == actor {
        owner
    } else {
        let selected =
            crate::install::owned_item_ancestry(&state.physical, actor, container, |parent| {
                containers.push(container_revision(parent))
            })?;
        let Some(bag) = selected.filter(|bag| crate::install::accessible_bag(bag, actor)) else {
            return Ok(None);
        };
        bag
    };
    containers.push(container_revision(root));
    let values = (
        "owned-record",
        state.generation.as_str(),
        actor,
        owner.physical_life(),
        state
            .experience
            .actor(actor)
            .map_or(0, |value| value.privacy.revision()),
        &containers,
    );
    let serialized = json_record(&values).map_err(|_| ExecutionError::Invariant)?;
    let stamp: JsText = sha256_hex(serialized.as_bytes()).into();
    drop(serialized);
    drop(containers);
    custody.resize(stamp.storage_bytes())?;
    Ok(Some((stamp, custody)))
}

fn container_revision(entity: &Entity) -> (&str, u64, u64, u64) {
    (
        &entity.id,
        entity.inventory_revision.unwrap_or_default(),
        match entity.placement.as_ref() {
            Some(Placement::Contained { revision, .. } | Placement::Attached { revision, .. }) => {
                *revision
            }
            _ => 0, // The owner's ordinary movement does not change carried custody.
        },
        entity
            .container
            .as_ref()
            .map_or(0, |bag| bag.subtree_revision),
    )
}

pub(crate) fn current<'a>(
    state: &'a SimulationState,
    actor: &str,
    container: &str,
    budget: &ByteBudget,
) -> Result<Option<&'a InventoryInspection>, ExecutionError> {
    let Some(page) = state
        .physical
        .entities
        .get(actor)
        .and_then(|body| body.actor.as_ref())
        .and_then(|body| body.inventory_inspection.as_ref())
        .filter(|page| {
            page.container_id.as_deref() == Some(container)
                && page.item_ids.len() == 1
                && state.physical.entities.get(container).is_some_and(|root| {
                    root.inventory_revision.unwrap_or_default() == page.revision
                })
        })
    else {
        return Ok(None);
    };
    let Some((scope, _custody)) = scope(state, actor, container, budget)? else {
        return Ok(None);
    };
    Ok((page.scope == scope).then_some(page))
}
