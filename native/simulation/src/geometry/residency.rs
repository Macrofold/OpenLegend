//! The immutable provider map keeps its actual allocation custody in the same
//! shared owner. Detached setup JSON owns a separately funded copy; a runtime
//! never lends a mutable geometry graph to Node or drops custody at acceptance.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_record};
use crate::host::{ByteBudget, CapacityError, ResidentReservation};
use std::{
    mem::{align_of, size_of},
    ops::Deref,
    sync::Arc,
};

heap_record!(GeometryMap {
    tiles,
    terrain,
    spatial
});
heap_record!(TerrainDefinition {
    solid,
    presentation
});
heap_record!(TerrainSolid { material, name });
heap_record!(TerrainPresentation {
    color,
    overview_color,
    pattern_colors,
    bank_colors,
    glint_colors
});
heap_record!(SpatialLayout {
    surfaces,
    blockers,
    levels,
    scenery
});
heap_record!(WalkableSurface {
    id,
    name,
    level_id,
    material
});
heap_record!(SpatialBlocker {
    id,
    boxes,
    material
});
heap_record!(SpatialLevel { id, name });
heap_record!(SceneryInstance { id, appearance });
impl HeapBytes for Bounds {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}

pub(crate) struct OwnedGeometry {
    value: GeometryMap,
    _storage: ResidentReservation,
}
impl Deref for OwnedGeometry {
    type Target = GeometryMap;
    fn deref(&self) -> &Self::Target {
        &self.value
    }
}
impl Serialize for OwnedGeometry {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.value.serialize(serializer)
    }
}
impl OwnedGeometry {
    pub(crate) fn new(value: GeometryMap, budget: &ByteBudget) -> Result<Arc<Self>, CapacityError> {
        let bytes = value
            .heap_bytes()
            .and_then(|n| {
                n.checked_add(size_of::<Self>() + 2 * size_of::<usize>() + align_of::<Self>() - 1)
            })
            .ok_or(CapacityError)?;
        let storage = budget.reserve_record(bytes)?;
        Ok(Arc::new(Self {
            value,
            _storage: storage,
        }))
    }
}
