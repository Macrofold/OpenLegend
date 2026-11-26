//! Keep one derived scene beside the checked opening map. A restore may reuse
//! a revision number, so comparisons use the actual immutable structure cut.
use super::{SpatialError, SpatialProvider};
use openlegend_simulation::{
    assembly::scene::StructureScene, geometry::OwnedGeometry, host::ByteBudget,
};
use std::sync::{Arc, Mutex, Weak};

pub struct InstalledSpatial {
    map: Arc<OwnedGeometry>,
    base: Arc<SpatialProvider>,
    latest: Mutex<Option<(Weak<StructureScene>, Arc<SpatialProvider>)>>,
}

impl InstalledSpatial {
    pub(crate) fn new(map: Arc<OwnedGeometry>, base: SpatialProvider) -> Self {
        Self {
            map,
            base: Arc::new(base),
            latest: Mutex::new(None),
        }
    }

    /// Reuse the exact matching scene. A changed cut builds one admitted
    /// collision index and surface projection, shared by subsequent reads.
    /// Callers can retain the result only until their own bound query finishes.
    pub(crate) fn current(
        &self,
        structures: Option<&Arc<StructureScene>>,
        budget: &ByteBudget,
    ) -> Result<Arc<SpatialProvider>, SpatialError> {
        let Some(cut) = structures else {
            return Ok(self.base.clone());
        };
        let mut cache = self.latest.lock().map_err(|_| SpatialError::InvalidMap)?;
        if let Some((previous, geometry)) = cache.as_ref()
            && std::ptr::eq(previous.as_ptr(), Arc::as_ptr(cut))
        {
            return Ok(geometry.clone());
        }
        // Release the old scene before reserving a new one. An outstanding
        // query still owns its copy until it finishes.
        cache.take();
        let mut scene = SpatialProvider::with_structures(&self.map, Some(cut), budget)?;
        scene.navigation = self.base.navigation.clone();
        let scene = Arc::new(scene);
        *cache = Some((Arc::downgrade(cut), scene.clone()));
        Ok(scene)
    }
}
