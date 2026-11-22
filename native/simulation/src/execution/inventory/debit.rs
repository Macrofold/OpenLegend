//! Plan one exact owned group, then update its lots and ancestor summaries.
//! The existing physical journal owns all before-images through acceptance.
use super::*;

struct Lot<'a> {
    parent: &'a str,
    item: &'a str,
    quantity: u64,
}

struct ContentsPlan {
    before: ContentsBefore,
    removed_load: u64,
    depth: usize,
}

pub(crate) struct OwnedDebits {
    _workspace: ByteReservation,
    lots: Vec<(String, String, u64)>,
    affected: Vec<ContentsPlan>,
}

impl CoreMutation<'_> {
    pub(super) fn can_debit_lot(&self, entity: &Entity, quantity: u64) -> bool {
        entity.item.as_ref().is_some_and(|lot| {
            quantity > 0
                && quantity <= lot.quantity
                && lot.assembly_claim.is_none()
                && lot.material_contribution_ids.is_none()
                && (quantity < lot.quantity
                    || (!self.state.inventory.has_children(&entity.id)
                        && entity.attributes.as_ref().is_none_or(|attributes| {
                            attributes.is_empty()
                                || (entity.container.is_none()
                                    && self
                                        .state
                                        .installed
                                        .retained
                                        .items
                                        .get(&lot.definition_pin.id)
                                        .filter(|definition| definition.pin == lot.definition_pin)
                                        .and_then(|definition| definition.material.as_ref())
                                        .is_some_and(|rule| {
                                            rule.homogeneous
                                                && attributes
                                                    .keys()
                                                    .all(|id| rule.state_attributes.contains(id))
                                        }))
                        })
                        && entity
                            .status_effects
                            .as_ref()
                            .is_none_or(IndexMap::is_empty)
                        && entity.mechanism_fields.is_none()))
        })
    }

    /// Validate the complete group against the current inventory before
    /// changing any lot. Only affected ancestor chains are summarized.
    pub(crate) fn plan_owned_debits(
        &self,
        actor: &str,
        amounts: &IndexMap<String, u64>,
    ) -> Result<Option<OwnedDebits>, ExecutionError> {
        let budget = self.journal.physical.budget.clone();
        let physical = &self.state.physical;
        let recipes = &self.state.installed.retained;
        let mut workspace = budget.reserve(amounts.len() * size_of::<Lot<'_>>())?;
        let mut contents = IndexMap::<EntityHandle, ContentsPlan>::new();
        let mut lots = Vec::with_capacity(amounts.len());
        for (id, quantity) in amounts {
            let Some(entity) = physical.entities.get(id) else {
                return Ok(None);
            };
            if !self.can_debit_lot(entity, *quantity) {
                return Ok(None);
            }
            let Some(parent) = crate::install::inventory_parent(entity) else {
                return Ok(None);
            };
            // Recipe claims already verified the entire access path and exact
            // definition. This owner needs custody identifiers and quantities.
            let definition = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
            let packing = recipes.packing_load_for(&definition.definition_pin);
            let mut current = parent;
            let mut path = Vec::new();
            let mut path_space = budget.reserve(0)?;
            loop {
                let handle = physical
                    .entities
                    .handle(current)
                    .ok_or(ExecutionError::Invariant)?;
                let ancestor = physical
                    .entities
                    .resolve(handle)
                    .ok_or(ExecutionError::Invariant)?;
                if current != actor && !crate::install::inventory_bag_access(ancestor, actor) {
                    return Ok(None);
                }
                path_space.resize(
                    path_space
                        .bytes()
                        .checked_add(4 * size_of::<EntityHandle>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                path.push(handle);
                if current == actor {
                    break;
                }
                current =
                    crate::install::inventory_parent(ancestor).ok_or(ExecutionError::Invariant)?;
            }
            for (depth, handle) in path.into_iter().rev().enumerate() {
                let ancestor = physical
                    .entities
                    .resolve(handle)
                    .ok_or(ExecutionError::Invariant)?;
                if !contents.contains_key(&handle) {
                    workspace.resize(
                        workspace
                            .bytes()
                            .checked_add(
                                4 * (size_of::<(EntityHandle, ContentsPlan)>()
                                    + size_of::<ContentsBefore>()
                                    + 32),
                            )
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    contents.insert(
                        handle,
                        ContentsPlan {
                            before: ContentsBefore {
                                handle,
                                revision: ancestor.inventory_revision,
                                bag: ancestor.container.as_ref().map(|bag| {
                                    (
                                        bag.load,
                                        bag.load_revision,
                                        bag.subtree_revision,
                                        bag.height,
                                    )
                                }),
                            },
                            removed_load: 0,
                            depth,
                        },
                    );
                }
                if let Some(bag) = &ancestor.container {
                    let plan = contents.get_mut(&handle).ok_or(ExecutionError::Invariant)?;
                    let amount = packing
                        .and_then(|load| load.checked_mul(*quantity))
                        .and_then(|load| load.checked_add(plan.removed_load))
                        .ok_or(ExecutionError::Invariant)?;
                    if amount > bag.load || bag.load_revision != bag.subtree_revision {
                        return Err(ExecutionError::Invariant);
                    }
                    plan.removed_load = amount;
                    next_revision(bag.subtree_revision)?;
                }
                next_revision(ancestor.inventory_revision.unwrap_or_default())?;
            }
            lots.push(Lot {
                parent,
                item: id,
                quantity: *quantity,
            });
        }
        if lots.is_empty() {
            return Ok(None);
        }

        // Parent IDs are from accepted entities, which can no longer be
        // borrowed across mutation. Own just those exact keys until debit.
        let text = lots
            .iter()
            .try_fold(0_usize, |bytes, lot| {
                bytes.checked_add(lot.parent.len() + lot.item.len())
            })
            .ok_or(ExecutionError::Capacity)?;
        workspace.resize(
            workspace
                .bytes()
                .checked_add(text + lots.len() * size_of::<(String, String, u64)>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let lots = lots
            .into_iter()
            .map(|lot| (lot.parent.to_owned(), lot.item.to_owned(), lot.quantity))
            .collect();
        let mut affected: Vec<_> = contents.into_values().collect();
        affected.sort_unstable_by_key(|plan| std::cmp::Reverse(plan.depth));
        Ok(Some(OwnedDebits {
            _workspace: workspace,
            lots,
            affected,
        }))
    }

    /// Apply a plan checked in the same candidate before any contents change.
    /// Retain one ancestor inverse for the whole set under the physical owner.
    pub(crate) fn use_owned_lots(
        &mut self,
        actor: &str,
        cause: &str,
        plan: OwnedDebits,
    ) -> Result<(), ExecutionError> {
        let OwnedDebits {
            _workspace,
            lots,
            affected,
        } = plan;
        self.journal
            .physical
            .reserve(affected.len() * size_of::<ContentsBefore>())?;
        for (parent, item, quantity) in lots {
            self.debit_inventory_lot(&parent, &item, quantity, LotDebit::consume(cause, Some(actor)))?;
        }
        let Some(Undo::Inventory(undo)) = self.journal.physical.undo.last_mut() else {
            return Err(ExecutionError::Invariant);
        };
        undo.extra_contents = affected.iter().map(|plan| plan.before).collect();
        for plan in affected {
            let entity = self
                .state
                .physical
                .entities
                .resolve(plan.before.handle)
                .ok_or(ExecutionError::Invariant)?;
            let height = entity.container.as_ref().map(|_| {
                self.state
                    .inventory
                    .children(&self.state.physical.entities, &entity.id, false)
                    .map(|child| 1 + child.container.as_ref().map_or(0, |bag| bag.height))
                    .max()
                    .unwrap_or(0)
            });
            let entity = self
                .state
                .physical
                .entities
                .resolve_mut(plan.before.handle)
                .ok_or(ExecutionError::Invariant)?;
            entity.inventory_revision =
                Some(next_revision(plan.before.revision.unwrap_or_default())?);
            if let (Some(bag), Some(height)) = (&mut entity.container, height) {
                bag.load -= plan.removed_load;
                bag.subtree_revision = next_revision(bag.subtree_revision)?;
                bag.load_revision = bag.subtree_revision;
                bag.height = height;
            }
        }
        Ok(())
    }

    pub(crate) fn record_owned_debit_sources(
        &mut self,
        actor: &str,
        cause: &str,
        plan: &OwnedDebits,
    ) -> Result<(), ExecutionError> {
        for (_, item, quantity) in &plan.lots {
            let before = self
                .state
                .physical
                .entities
                .get(item)
                .and_then(|entity| entity.item.as_ref())
                .ok_or(ExecutionError::Invariant)?
                .quantity;
            self.journal
                .activity
                .consume_item_source(
                    &mut self.state.activity,
                    actor,
                    cause,
                    item,
                    before,
                    *quantity,
                )
                .map_err(ExecutionError::Activity)?;
        }
        Ok(())
    }
}
