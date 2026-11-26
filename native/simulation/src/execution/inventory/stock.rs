//! A quantity request selects exact material lots before any custody edit. The
//! ordinary arrangement owner applies each move inside one candidate checkpoint.
use super::*;
use crate::ground_items::inspection::WorldStorage;
use crate::stock_transfer::{StockRequest, limits};
use crate::work::WorkUnit;

/// Kept only inside the stock command, with no yield between the inspected
/// page proof and its last lot. Other commands must recheck their own page.
pub(super) struct AdmittedStock<'a> {
    root: Option<&'a str>,
    destination: &'a str,
    lots: Vec<OwnedStockLot>,
    _storage: ByteReservation,
}

impl AdmittedStock<'_> {
    pub(super) fn permits(&self, root: &str, item: &str, target: &str) -> bool {
        self.root == Some(root)
            && self.destination == target
            && self.lots.iter().any(|lot| lot.item_id == item)
    }
}

impl CoreMutation<'_> {
    fn select_stock<'a>(
        &mut self,
        actor: &str,
        request: &'a StockRequest,
    ) -> Result<Result<AdmittedStock<'a>, OwnedMoveError>, ExecutionError> {
        use OwnedMoveError as Refuse;
        let state = &self.state;
        let entities = &state.physical.entities;
        let Some(body) = entities.get(actor) else {
            return Err(ExecutionError::MissingActor);
        };
        let Some(definition) = state
            .installed
            .retained
            .items
            .get(&request.definition.id)
            .filter(|def| def.pin == request.definition && def.portable)
        else {
            return Ok(Err(Refuse::Unavailable));
        };
        let root = match request.endpoint(state, actor) {
            Ok(root) => root,
            Err(e) => return Ok(Err(e)),
        };
        let page = if let Some(root) = root {
            let Some(storage) = WorldStorage::selected(state, actor, root) else {
                return Ok(Err(Refuse::Unavailable));
            };
            let Some(page) = storage.inspection(&self.journal.budget)? else {
                return Ok(Err(Refuse::Unavailable));
            };
            Some(page)
        } else {
            None
        };
        let exporting = root == Some(request.destination.as_str());
        let required = if exporting {
            let Some(n) = request
                .quantity
                .checked_add(request.minimum_held)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            else {
                return Ok(Err(Refuse::Quantity));
            };
            n
        } else {
            0
        };
        let mut remaining = request.quantity;
        let mut held = 0u64;
        let bound = limits();
        let mut examined = 0;
        let mut limited = false;
        let mut lots = Vec::new();
        let mut custody = self
            .journal
            .budget
            .reserve(bound.moved_lots * std::mem::size_of::<OwnedStockLot>())?;
        lots.try_reserve_exact(bound.moved_lots)
            .map_err(|_| ExecutionError::Capacity)?;
        let mut visit =
            |entity: &Entity, source: bool, belongs: bool| -> Result<bool, ExecutionError> {
                if remaining == 0 && held >= required {
                    return Ok(true);
                }
                if examined == bound.examined {
                    limited = true;
                    return Ok(true);
                }
                examined += 1;
                self.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
                let Some(lot) = entity
                    .item
                    .as_ref()
                    .filter(|lot| lot.definition_pin == request.definition)
                else {
                    return Ok(false);
                };
                if !can_split_stock(entity, definition)
                    || inventory_work_bound(
                        state,
                        body.actor.as_ref().and_then(|b| b.action.as_ref()),
                        entity,
                        &mut || {
                            self.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
                            Ok(())
                        },
                    )?
                {
                    return Ok(false);
                }
                if belongs {
                    held = held.saturating_add(lot.quantity).min(required);
                }
                if source
                    && remaining != 0
                    && crate::install::inventory_parent(entity) != Some(&request.destination)
                {
                    if lots.len() == bound.moved_lots {
                        limited = true;
                        return Ok(true);
                    }
                    let quantity = lot.quantity.min(remaining);
                    let placement_revision = crate::handover::placement_revision(entity)
                        .ok_or(ExecutionError::Invariant)?;
                    custody.merge(self.journal.budget.reserve(entity.id.len())?)?;
                    lots.push(OwnedStockLot {
                        item_id: entity.id.clone(),
                        quantity,
                        revision: lot.revision,
                        placement_revision,
                    });
                    remaining -= quantity;
                }
                Ok(remaining == 0 && held >= required)
            };
        if request.source == actor {
            state
                .inventory
                .visit_owned_until(entities, actor, actor, &mut |entity, _| {
                    visit(entity, true, true)
                })?;
        } else {
            let source_world = root == Some(request.source.as_str());
            // Only exact entries on the currently inspected foreign page are
            // selectable; inspection provenance never expands to undisclosed IDs.
            let complete = if source_world {
                let page = page.ok_or(ExecutionError::Invariant)?;
                for id in &page.item_ids {
                    let Some(entity) = entities.get(id) else {
                        return Ok(Err(Refuse::Stale));
                    };
                    if visit(entity, true, false)? {
                        break;
                    }
                }
                !page.more
            } else {
                for entity in state.inventory.children(entities, &request.source, false) {
                    if visit(entity, true, true)? {
                        break;
                    }
                }
                true
            };
            if required > 0 {
                // The direct source was already counted. Count only the actor's
                // other accessible matching lots when proving a personal reserve.
                state
                    .inventory
                    .visit_owned_until(entities, actor, actor, &mut |entity, _| {
                        visit(
                            entity,
                            false,
                            crate::install::inventory_parent(entity) != Some(&request.source),
                        )
                    })?;
            }
            if !complete && remaining > 0 {
                limited = true;
            }
        }
        if limited {
            return Ok(Err(Refuse::StockIncomplete));
        }
        if remaining > 0 {
            return Ok(Err(Refuse::InsufficientStock));
        }
        if held < required {
            return Ok(Err(Refuse::PersonalMinimum));
        }
        Ok(Ok(AdmittedStock {
            root,
            destination: &request.destination,
            lots,
            _storage: custody,
        }))
    }

    pub(crate) fn transfer_stock(
        &mut self,
        actor: &str,
        request: &StockRequest,
        cause: &str,
    ) -> Result<Result<crate::stock_transfer::CompletedStock, OwnedMoveError>, ExecutionError> {
        let batch = match self.select_stock(actor, request)? {
            Ok(batch) => batch,
            Err(e) => return Ok(Err(e)),
        };
        let initial_revision = self
            .state
            .physical
            .entities
            .get(&request.destination)
            .ok_or(ExecutionError::Invariant)?
            .inventory_revision
            .unwrap_or_default();
        let saved = self.journal.checkpoint(self.state)?;
        let result = (|| {
            let mut output_guard = self.journal.budget.reserve(
                batch.lots.len()
                    * (std::mem::size_of::<crate::commands::ActivityOutput>()
                        + 2 * request.definition.id.len())
                    + request.source.len()
                    + request.destination.len()
                    + request.definition.id.len()
                    + request.definition.digest.len(),
            )?;
            let mut outputs = Vec::with_capacity(batch.lots.len());
            for lot in &batch.lots {
                let revision = self
                    .state
                    .physical
                    .entities
                    .get(&request.destination)
                    .ok_or(ExecutionError::Invariant)?
                    .inventory_revision
                    .unwrap_or_default();
                let selection = OwnedMove {
                    arrangement: OwnedArrangement::Move,
                    item_id: lot.item_id.as_str(),
                    quantity: lot.quantity,
                    placement_revision: lot.placement_revision,
                    expected_revision: lot.revision,
                    target_id: &request.destination,
                    target_revision: revision,
                    world_storage: batch.root,
                    expected_contents_revision: None,
                };
                match self.arrange_selected_lot(actor, cause, selection, Some(&batch))? {
                    Ok(id) => {
                        output_guard.merge(self.journal.budget.reserve(id.capacity())?)?;
                        outputs.push(crate::commands::ActivityOutput {
                            port: request.definition.id.clone(),
                            definition_id: request.definition.id.clone(),
                            item_id: id,
                            quantity: lot.quantity,
                        });
                    }
                    Err(reason) => return Ok(Err(reason)),
                }
            }
            output_guard.merge(batch._storage)?;
            let admission = crate::stock_transfer::StockResolution {
                source_id: request.source.clone(),
                destination_id: request.destination.clone(),
                destination_revision: initial_revision,
                definition: request.definition.clone(),
                quantity: request.quantity,
                minimum_held: request.minimum_held,
                lots: batch.lots,
            };
            Ok(Ok(crate::stock_transfer::CompletedStock {
                admission,
                outputs,
                _storage: output_guard,
            }))
        })();
        if matches!(&result, Ok(Ok(_))) {
            self.journal.keep(self.state, saved)?;
        } else {
            self.journal.rollback_to(self.state, saved)?;
        }
        result
    }
}
