//! Immutable physical shapes for the accepted structure revision. Readers and
//! in-flight questions can pin the old shapes while an edit prepares its successor.
use super::{Assembly, family::FamilyRules};
use crate::{
    geometry::{SpatialBlocker, rain::Cover},
    host::{
        ByteBudget, ResidentReservation,
        retained_size::{HeapBytes, map_storage},
    },
    install::{InstallError, RetainedDefinitions},
    state::{Bounds, Entity, EntityStore},
};
use indexmap::IndexMap;
use std::{mem::size_of, sync::Arc};

pub struct StructureScene {
    revision: u64,
    roots: IndexMap<String, Arc<RootShapes>>,
    _storage: ResidentReservation,
}
struct RootShapes {
    blockers: Vec<SpatialBlocker>,
    covers: Vec<Cover>,
    _storage: ResidentReservation,
}
impl StructureScene {
    pub fn revision(&self) -> u64 {
        self.revision
    }
    pub fn blockers(&self) -> impl Iterator<Item = &SpatialBlocker> {
        self.roots.values().flat_map(|r| r.blockers.iter())
    }
    pub(crate) fn root(&self, id: &str) -> &[SpatialBlocker] {
        self.roots.get(id).map_or(&[], |r| r.blockers.as_slice())
    }
    pub(crate) fn covers(&self) -> impl Iterator<Item = &Cover> {
        self.roots.values().flat_map(|root| root.covers.iter())
    }
    pub(crate) fn cover(&self, root: &str, part: &str) -> Option<&Cover> {
        self.roots
            .get(root)?
            .covers
            .iter()
            .find(|cover| cover.id == part)
    }
    /// Reuse every unaffected group's shapes. Older candidate/read references
    /// keep their immutable pieces and their component's allocation alive.
    pub(crate) fn after_edit(
        &self,
        root: &Entity,
        entities: &EntityStore,
        definitions: &RetainedDefinitions,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, InstallError> {
        let revision = self
            .revision
            .checked_add(1)
            .filter(|r| *r <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(InstallError::CurrentFormat)?;
        let assembly = root
            .assembly
            .as_deref()
            .ok_or(InstallError::CurrentFormat)?;
        let updated = RootShapes::prepare(root, assembly, entities, definitions, budget)?;
        if let Some(updated) = &updated {
            Self::validate_covers(
                &updated.covers,
                self.roots
                    .iter()
                    .filter(|(id, _)| *id != &root.id)
                    .flat_map(|(_, shape)| &shape.covers),
            )?;
        }
        let capacity = self
            .roots
            .len()
            .checked_add(usize::from(
                updated.is_some() && !self.roots.contains_key(&root.id),
            ))
            .ok_or(InstallError::Capacity)?;
        let admitted = map_storage::<String, Arc<RootShapes>>(capacity)
            .and_then(|bytes| {
                self.roots
                    .keys()
                    .try_fold(bytes, |bytes, id| bytes.checked_add(id.len()))
            })
            .and_then(|bytes| {
                bytes.checked_add(root.id.len() + size_of::<Self>() + 3 * size_of::<usize>())
            })
            .ok_or(InstallError::Capacity)?;
        let storage = budget
            .reserve(admitted)
            .map_err(|_| InstallError::Capacity)?;
        let mut roots = IndexMap::with_capacity(capacity);
        roots.extend(
            self.roots
                .iter()
                .map(|(id, shape)| (id.clone(), shape.clone())),
        );
        if let Some(updated) = updated {
            roots.insert(root.id.clone(), updated);
        } else {
            roots.shift_remove(&root.id);
        }
        Ok(Arc::new(Self {
            revision,
            roots,
            _storage: budget
                .adopt_record(storage)
                .map_err(|_| InstallError::Capacity)?,
        }))
    }

    pub(crate) fn install(
        base: u64,
        delta: u64,
        entities: &EntityStore,
        definitions: &RetainedDefinitions,
        budget: &ByteBudget,
    ) -> Result<Option<Arc<Self>>, InstallError> {
        if delta == 0 {
            if entities
                .ordered_ids()
                .any(|id| entities.get(id).is_some_and(|e| e.assembly.is_some()))
            {
                return Err(InstallError::CurrentFormat);
            }
            return Ok(None);
        }
        let revision = base
            .checked_add(delta)
            .filter(|&r| r <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(InstallError::CurrentFormat)?;
        let roots = || {
            entities
                .ordered_ids()
                .filter_map(|id| entities.get(id))
                .filter(|e| e.assembly.is_some())
        };
        let count = roots().count();
        let root_bytes = map_storage::<String, Arc<RootShapes>>(count)
            .and_then(|sum| roots().try_fold(sum, |n, e| n.checked_add(e.id.len())))
            .and_then(|n| n.checked_add(size_of::<Self>() + 3 * size_of::<usize>()))
            .ok_or(InstallError::Capacity)?;
        let mut owned = budget
            .reserve(root_bytes)
            .map_err(|_| InstallError::Capacity)?;
        let mut table = IndexMap::with_capacity(count);
        for root in roots() {
            let assembly = root
                .assembly
                .as_deref()
                .ok_or(InstallError::CurrentFormat)?;
            if let Some(shapes) =
                RootShapes::prepare(root, assembly, entities, definitions, budget)?
            {
                Self::validate_covers(
                    &shapes.covers,
                    table
                        .values()
                        .flat_map(|entry: &Arc<RootShapes>| &entry.covers),
                )?;
                table.insert(root.id.clone(), shapes);
            }
        }
        let actual = map_storage::<String, Arc<RootShapes>>(table.capacity())
            .and_then(|sum| {
                table
                    .keys()
                    .try_fold(sum, |n, id| n.checked_add(id.capacity()))
            })
            .and_then(|n| n.checked_add(size_of::<Self>() + 3 * size_of::<usize>()))
            .ok_or(InstallError::Capacity)?;
        if actual > owned.bytes() {
            return Err(InstallError::Capacity);
        }
        owned.resize(actual).map_err(|_| InstallError::Capacity)?;
        Ok(Some(Arc::new(Self {
            revision,
            roots: table,
            _storage: budget
                .adopt_record(owned)
                .map_err(|_| InstallError::Capacity)?,
        })))
    }

    fn validate_covers<'a>(
        covers: &[Cover],
        previous: impl Clone + Iterator<Item = &'a Cover>,
    ) -> Result<(), InstallError> {
        for (index, cover) in covers.iter().enumerate() {
            if covers[..index].iter().any(|other| !cover.compatible(other))
                || previous.clone().any(|other| !cover.compatible(other))
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        Ok(())
    }
}
impl RootShapes {
    fn prepare(
        root: &Entity,
        assembly: &Assembly,
        entities: &EntityStore,
        definitions: &RetainedDefinitions,
        budget: &ByteBudget,
    ) -> Result<Option<Arc<Self>>, InstallError> {
        if assembly.retirement().is_some() {
            return Ok(None);
        }
        let family = definitions
            .structures
            .get(&assembly.family().id)
            .ok_or(InstallError::DefinitionPin)?;
        let label_bytes = match &family.rules {
            FamilyRules::Boundary(b) => {
                [&b.materials.post, &b.materials.panel, &b.materials.binding]
                    .into_iter()
                    .map(String::len)
                    .max()
                    .unwrap_or(0)
            }
            FamilyRules::Shelter(s) => s.materials.post.len().max(s.materials.cover.len()),
        };
        // At most one shape per physical part and four boxes per shape (the aperture).
        let (count, id_bytes) = match assembly {
            Assembly::Shelter { parts, .. } => (
                parts.len(),
                parts
                    .keys()
                    .try_fold(0usize, |n, id| n.checked_add(id.len())),
            ),
            Assembly::Boundary { parts, .. } => (
                parts.len(),
                parts
                    .keys()
                    .try_fold(0usize, |n, id| n.checked_add(id.len())),
            ),
        };
        if count == 0 {
            return Ok(None);
        }
        let cover_count = match assembly {
            Assembly::Shelter { parts, .. } => parts
                .values()
                .filter(|part| part.role == super::ShelterRole::Cover)
                .count(),
            Assembly::Boundary { .. } => 0,
        };
        let cover_bytes = (size_of::<Cover>() + Cover::HEAP_BOUND)
            .checked_mul(cover_count)
            .ok_or(InstallError::Capacity)?;
        let bound = (size_of::<SpatialBlocker>() + 4 * size_of::<Bounds>())
            .checked_add(label_bytes)
            .and_then(|per| per.checked_mul(count))
            .and_then(|n| n.checked_add(id_bytes?))
            .and_then(|n| n.checked_add(cover_bytes + if cover_count > 0 { id_bytes? } else { 0 }))
            .and_then(|n| n.checked_add(size_of::<Self>() + 3 * size_of::<usize>()))
            .ok_or(InstallError::Capacity)?;
        let mut admit = budget.reserve(bound).map_err(|_| InstallError::Capacity)?;
        let mut blockers = Vec::with_capacity(count);
        let mut covers = Vec::with_capacity(cover_count);
        assembly.append_solids(root, entities, definitions, &mut blockers, &mut covers)?;
        let bytes = blockers
            .heap_bytes()
            .and_then(|n| n.checked_add(covers.heap_bytes()?))
            .and_then(|n| n.checked_add(size_of::<Self>() + 3 * size_of::<usize>()))
            .ok_or(InstallError::Capacity)?;
        if bytes > admit.bytes() {
            return Err(InstallError::Capacity);
        }
        admit.resize(bytes).map_err(|_| InstallError::Capacity)?;
        Ok(Some(Arc::new(Self {
            blockers,
            covers,
            _storage: budget
                .adopt_record(admit)
                .map_err(|_| InstallError::Capacity)?,
        })))
    }
}
