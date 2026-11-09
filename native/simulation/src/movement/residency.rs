//! Body bins remain one derived index. Cached string bytes and collection counts
//! fund changed nodes without recounting every body on an ordinary move. Keep
//! the largest admitted backing through inverse edits, then trim at root close.
use super::*;
use crate::host::retained_size::{heap_sum, tree_node_bound};
use crate::host::{ByteBudget, CapacityError};

#[derive(Clone, Copy)]
struct Counts {
    roots: usize,
    points: usize,
    cells: usize,
    extents: usize,
    strings: usize,
}
impl Counts {
    fn bytes(self) -> Result<usize, CapacityError> {
        // An emptied BTree can retain its root node. One additional full node
        // per outer tree covers that allocation as well as ordinary occupancy.
        heap_sum([
            (self.roots.checked_add(1).ok_or(CapacityError)?)
                .checked_mul(tree_node_bound::<String, ()>().ok_or(CapacityError)?)
                .ok_or(CapacityError)?,
            (self.points.checked_add(1).ok_or(CapacityError)?)
                .checked_mul(tree_node_bound::<String, BodyPoint>().ok_or(CapacityError)?)
                .ok_or(CapacityError)?,
            (self.cells.checked_add(1).ok_or(CapacityError)?)
                .checked_mul(
                    tree_node_bound::<(i64, i64, i64), BTreeSet<String>>().ok_or(CapacityError)?,
                )
                .ok_or(CapacityError)?,
            self.points
                .checked_mul(tree_node_bound::<String, ()>().ok_or(CapacityError)?)
                .ok_or(CapacityError)?,
            (self.extents.checked_add(1).ok_or(CapacityError)?)
                .checked_mul(tree_node_bound::<u64, usize>().ok_or(CapacityError)?)
                .ok_or(CapacityError)?,
            self.strings,
        ])
        .ok_or(CapacityError)
    }
}
impl BodyIndex {
    fn counts(&self) -> Counts {
        Counts {
            roots: self.roots.len(),
            points: self.points.len(),
            cells: self.cells.len(),
            extents: self.extents.len(),
            strings: self.strings,
        }
    }
    fn fund(&mut self, bytes: usize) -> Result<(), CapacityError> {
        if bytes > self.storage.bytes() {
            let growth = self.budget.reserve(bytes - self.storage.bytes())?;
            self.budget.fund_backing(&mut self.storage, growth)?;
        }
        Ok(())
    }
    pub(crate) fn settle_memory(&mut self) -> Result<(), CapacityError> {
        let bytes = self.counts().bytes()?;
        // No allocation/admission remains at accept or rollback. A failure is
        // an internal custody invariant, never an accepted capacity refusal.
        if bytes > self.storage.bytes() {
            return Err(CapacityError);
        }
        self.storage.resize(bytes)
    }
    pub(crate) fn install(
        entities: &EntityStore,
        budget: &ByteBudget,
    ) -> Result<Self, CapacityError> {
        let counts = Counts {
            roots: 0,
            points: 0,
            cells: 0,
            extents: 0,
            strings: 0,
        };
        let mut value = Self {
            roots: BTreeSet::new(),
            points: BTreeMap::new(),
            cells: BTreeMap::new(),
            extents: BTreeMap::new(),
            strings: 0,
            storage: budget.reserve_backing(counts.bytes()?)?,
            budget: budget.clone(),
        };
        for id in entities.ordered_ids() {
            value.refresh(entities, id)?;
        }
        value.settle_memory()?;
        Ok(value)
    }
    pub(crate) fn refresh_ordering(&mut self, entities: &EntityStore) -> Result<(), CapacityError> {
        // Renumbering already requires this full index pass. Admit its old
        // and replacement label bytes together so an inverse pass can restore
        // a different mixture of short/long labels without new capacity.
        // Ordinary movement never enters either renumbering pass.
        let incoming = self
            .points
            .iter()
            .try_fold(0usize, |sum, (id, point)| {
                let order = entities.ordering(id)?;
                sum.checked_add(if point.order == order { 0 } else { order.len() })
            })
            .ok_or(CapacityError)?;
        self.fund(
            self.counts()
                .bytes()?
                .checked_add(incoming)
                .ok_or(CapacityError)?,
        )?;
        for (id, point) in &mut self.points {
            let Some(order) = entities.ordering(id) else {
                continue;
            };
            if point.order == order {
                continue;
            }
            let replacement = order.to_owned();
            self.strings = self
                .strings
                .checked_sub(point.order.capacity())
                .and_then(|n| n.checked_add(replacement.capacity()))
                .ok_or(CapacityError)?;
            point.order = replacement;
        }
        Ok(())
    }
    pub(crate) fn refresh(
        &mut self,
        entities: &EntityStore,
        id: &str,
    ) -> Result<(), CapacityError> {
        let root = entities.get(id).is_some_and(Entity::physical_root);
        let mut after = self.counts();
        if root && !self.roots.contains(id) {
            after.roots = after.roots.checked_add(1).ok_or(CapacityError)?;
            after.strings = after.strings.checked_add(id.len()).ok_or(CapacityError)?;
        } else if !root && let Some(key) = self.roots.get(id) {
            after.roots -= 1;
            after.strings -= key.capacity();
        }
        let root_peak = after.bytes()?;
        let next = entities.get(id).and_then(|entity| {
            if entity.actor.is_none() || !entity.actively_participates() {
                return None;
            }
            let body = entity.body_profile();
            Some((
                entities.handle(id)?,
                entity.world_position()?,
                (body.height + body.radius).max(2.0 * body.radius),
                entities.ordering(id)?,
            ))
        });
        let unchanged = self.points.get(id).zip(next).is_some_and(
            |(old, (handle, position, extent, order))| {
                old.handle == handle
                    && old.position == position
                    && old.extent == extent
                    && old.order == order
            },
        );
        if !unchanged {
            let old = self.points.get_key_value(id);
            if let Some((key, point)) = old {
                after.points -= 1;
                let members = self.cells.get(&cell(point.position)).ok_or(CapacityError)?;
                after.strings = after
                    .strings
                    .checked_sub(key.capacity())
                    .and_then(|n| n.checked_sub(point.order.capacity()))
                    .and_then(|n| n.checked_sub(members.get(id)?.capacity()))
                    .ok_or(CapacityError)?;
                if members.len() == 1 {
                    after.cells -= 1;
                }
                if self.extents.get(&point.extent.to_bits()) == Some(&1) {
                    after.extents -= 1;
                }
            }
            if let Some((_, position, extent, order)) = next {
                after.points = after.points.checked_add(1).ok_or(CapacityError)?;
                after.strings = after
                    .strings
                    .checked_add(id.len().checked_mul(2).ok_or(CapacityError)?)
                    .and_then(|n| n.checked_add(order.len()))
                    .ok_or(CapacityError)?;
                let removed_cell = old.is_some_and(|(_, old)| {
                    cell(old.position) == cell(position)
                        && self
                            .cells
                            .get(&cell(position))
                            .is_some_and(|ids| ids.len() == 1)
                });
                if !self.cells.contains_key(&cell(position)) || removed_cell {
                    after.cells = after.cells.checked_add(1).ok_or(CapacityError)?;
                }
                let old_same = usize::from(old.is_some_and(|(_, old)| old.extent == extent));
                if self.extents.get(&extent.to_bits()).copied().unwrap_or(0) == old_same {
                    after.extents = after.extents.checked_add(1).ok_or(CapacityError)?;
                }
            }
        }
        self.fund(root_peak.max(after.bytes()?))?;
        if root {
            if !self.roots.contains(id) {
                self.roots.insert(id.to_owned());
            }
        } else {
            self.roots.remove(id);
        }
        if !unchanged {
            if let Some(old) = self.points.remove(id) {
                let key = cell(old.position);
                if let Some(ids) = self.cells.get_mut(&key) {
                    ids.remove(id);
                    if ids.is_empty() {
                        self.cells.remove(&key);
                    }
                }
                if let Some(count) = self.extents.get_mut(&old.extent.to_bits()) {
                    *count -= 1;
                    if *count == 0 {
                        self.extents.remove(&old.extent.to_bits());
                    }
                }
            }
            if let Some((handle, position, extent, order)) = next {
                self.cells
                    .entry(cell(position))
                    .or_default()
                    .insert(id.to_owned());
                *self.extents.entry(extent.to_bits()).or_default() += 1;
                self.points.insert(
                    id.to_owned(),
                    BodyPoint {
                        handle,
                        position,
                        extent,
                        order: order.to_owned(),
                    },
                );
            }
        }
        self.strings = after.strings;
        Ok(())
    }
}
