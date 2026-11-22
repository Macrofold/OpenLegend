//! The existing four-entry extent tree partition and traversal order.

use super::{Bounds, coordinates, extent, point};
use openlegend_simulation::host::{ByteBudget, ByteReservation, CapacityError};
use std::mem::size_of;

/// A temporary index of already admitted extents. Build only for an actual
/// query. Its workspace and tree backing are owned until the batch returns.
pub(crate) struct ReceivedIndex {
    root: Option<Node>,
    _storage: ByteReservation,
}
impl ReceivedIndex {
    pub(crate) fn build(
        bounds: impl ExactSizeIterator<Item = Option<Bounds>>,
        budget: &ByteBudget,
    ) -> Result<Self, CapacityError> {
        // Stable sort scratch, recursive splits and the boxed leaves/branches
        // can overlap. Reserve all of that before the first allocation.
        let count = bounds.len();
        let storage = budget.reserve(
            count
                .checked_mul(4 * (size_of::<Node>() + size_of::<Entry>()))
                .ok_or(CapacityError)?,
        )?;
        let mut entries = Vec::new();
        entries
            .try_reserve_exact(count)
            .map_err(|_| CapacityError)?;
        entries.extend(
            bounds
                .enumerate()
                .filter_map(|(id, bounds)| bounds.map(|bounds| Entry { id, bounds })),
        );
        Ok(Self {
            root: Node::build(entries),
            _storage: storage,
        })
    }

    /// Return whether the bounded traversal completed. A hit names the
    /// original input ordinal and owns no new geometry or permissions.
    pub(crate) fn query(
        &self,
        window: &Bounds,
        remaining: &mut u64,
        hit: &mut impl FnMut(usize),
    ) -> bool {
        self.root.as_ref().is_none_or(|root| {
            root.query(
                &|bounds| super::overlaps(window, bounds, 0.0),
                remaining,
                hit,
            )
        })
    }
}

pub(super) struct Entry {
    pub id: usize,
    pub bounds: Bounds,
}

pub(super) struct Node {
    pub bounds: Bounds,
    pub members: Members,
}

pub(super) enum Members {
    Leaf(Box<[Entry]>),
    Branch(Box<[Node; 2]>),
}

impl Node {
    pub(super) fn build(mut items: Vec<Entry>) -> Option<Self> {
        if items.is_empty() {
            return None;
        }
        let bounds = extent(
            items
                .iter()
                .flat_map(|item| [item.bounds.min, item.bounds.max]),
        );
        let centre = |item: &Entry| {
            let lo = coordinates(item.bounds.min);
            let hi = coordinates(item.bounds.max);
            point(std::array::from_fn(|i| lo[i] + hi[i]))
        };
        let members = if items.len() <= 4 {
            // A left split keeps its parent's allocation. Retain only the entries
            // this leaf can query, rather than its share of the build workspace.
            Members::Leaf(items.into_boxed_slice())
        } else {
            let centres = extent(items.iter().map(centre));
            let lo = coordinates(centres.min);
            let hi = coordinates(centres.max);
            let spread: [f64; 3] = std::array::from_fn(|i| hi[i] - lo[i]);
            let mut axis = 0;
            for i in 1..3 {
                if spread[i] > spread[axis] {
                    axis = i;
                }
            }
            // Keep the Source left-associated comparison and stable tie order.
            items.sort_by(|a, b| {
                let right_min = coordinates(b.bounds.min)[axis];
                let right_max = coordinates(b.bounds.max)[axis];
                let diff = coordinates(centre(a))[axis] - right_min - right_max;
                diff.partial_cmp(&0.0).expect("finite indexed extents")
            });
            let right = items.split_off(items.len() / 2);
            Members::Branch(Box::new([
                Self::build(items).expect("nonempty left split"),
                Self::build(right).expect("nonempty right split"),
            ]))
        };
        Some(Self { bounds, members })
    }

    pub(super) fn visit(
        &self,
        intersects: &impl Fn(&Bounds) -> bool,
        hit: &mut impl FnMut(usize) -> bool,
    ) -> bool {
        if !intersects(&self.bounds) {
            return false;
        }
        match &self.members {
            Members::Leaf(items) => items.iter().any(|x| intersects(&x.bounds) && hit(x.id)),
            Members::Branch(children) => children.iter().any(|x| x.visit(intersects, hit)),
        }
    }

    /// Count both nodes and leaf entries, matching the existing bounded convex query.
    pub(super) fn query(
        &self,
        intersects: &impl Fn(&Bounds) -> bool,
        remaining: &mut u64,
        hit: &mut impl FnMut(usize),
    ) -> bool {
        if *remaining == 0 {
            return false;
        }
        *remaining -= 1;
        if !intersects(&self.bounds) {
            return true;
        }
        match &self.members {
            Members::Leaf(items) => {
                for x in items.iter() {
                    if *remaining == 0 {
                        return false;
                    }
                    *remaining -= 1;
                    if intersects(&x.bounds) {
                        hit(x.id);
                    }
                }
                true
            }
            Members::Branch(children) => {
                children.iter().all(|x| x.query(intersects, remaining, hit))
            }
        }
    }
}
