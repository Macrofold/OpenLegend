//! Rebuildable inventory indexes. They contain exact live material handles,
//! with a separate subset for dry-weather work. No geometry is cached.
use super::ExposedMaterial;
use crate::{
    execution::ExecutionError,
    host::{ByteBudget, ResidentReservation},
    state::{Entity, EntityHandle},
    values::AttributeValue,
};

#[derive(Clone, Copy, Default)]
pub(crate) enum MaterialPresence {
    #[default]
    Other,
    Dry,
    Wet,
}

impl MaterialPresence {
    pub(crate) fn of(
        item: &Entity,
        exposure: Option<&ExposedMaterial>,
    ) -> Result<Self, ExecutionError> {
        let Some(exposure) = exposure else {
            return Ok(Self::Other);
        };
        let attribute = item
            .stored_attributes()
            .and_then(|attributes| attributes.get(&exposure.law.moisture_attribute));
        match attribute.map(|state| &state.value) {
            Some(AttributeValue::Number(value)) if (0.0..=1.0).contains(value) => {
                Ok(if *value > 0.0 { Self::Wet } else { Self::Dry })
            }
            _ => Err(ExecutionError::Invariant),
        }
    }
}

pub(crate) struct StockExposure {
    materials: Vec<EntityHandle>,
    wet: Vec<EntityHandle>,
    storage: ResidentReservation,
}

impl StockExposure {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            materials: Vec::new(),
            wet: Vec::new(),
            storage: budget.adopt_backing(budget.reserve(0)?)?,
        })
    }

    /// A wetting change and every rollback can fit in the already admitted
    /// material capacity. Ordinary unrelated lots acquire no backing.
    pub(crate) fn prepare_insert(
        &mut self,
        presence: MaterialPresence,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if matches!(presence, MaterialPresence::Other) {
            return Ok(());
        }
        let needed = self
            .materials
            .len()
            .checked_add(1)
            .ok_or(ExecutionError::Capacity)?;
        grow(&mut self.materials, needed, &mut self.storage, budget)?;
        grow(&mut self.wet, needed, &mut self.storage, budget)
    }

    pub(crate) fn insert(&mut self, handle: EntityHandle, presence: MaterialPresence) {
        if !matches!(presence, MaterialPresence::Other) {
            insert(&mut self.materials, handle);
            if matches!(presence, MaterialPresence::Wet) {
                insert(&mut self.wet, handle);
            }
        }
    }

    pub(crate) fn remove(&mut self, handle: EntityHandle) -> MaterialPresence {
        let Ok(position) = find(&self.materials, handle) else {
            return MaterialPresence::Other;
        };
        self.materials.remove(position);
        if let Ok(position) = find(&self.wet, handle) {
            self.wet.remove(position);
            MaterialPresence::Wet
        } else {
            MaterialPresence::Dry
        }
    }

    pub(crate) fn contains(&self, handle: EntityHandle) -> MaterialPresence {
        if find(&self.wet, handle).is_ok() {
            MaterialPresence::Wet
        } else if find(&self.materials, handle).is_ok() {
            MaterialPresence::Dry
        } else {
            MaterialPresence::Other
        }
    }

    pub(crate) fn handles(&self, wet_only: bool) -> &[EntityHandle] {
        if wet_only { &self.wet } else { &self.materials }
    }

    pub(crate) fn set_wet(&mut self, handle: EntityHandle, wet: bool) {
        match (wet, find(&self.wet, handle)) {
            (true, Err(position)) => self.wet.insert(position, handle),
            (false, Ok(position)) => {
                self.wet.remove(position);
            }
            _ => {}
        }
    }
}

// Only custody and dry/wet transitions shift entries. The elapsed phase
// reads compact handles and performs no hash growth or allocation on undo.
fn find(handles: &[EntityHandle], handle: EntityHandle) -> Result<usize, usize> {
    handles.binary_search_by_key(&(handle.slot, handle.generation), |handle| {
        (handle.slot, handle.generation)
    })
}

fn insert(handles: &mut Vec<EntityHandle>, handle: EntityHandle) {
    if let Err(position) = find(handles, handle) {
        handles.insert(position, handle);
    }
}

fn grow(
    set: &mut Vec<EntityHandle>,
    needed: usize,
    storage: &mut ResidentReservation,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let current = set.capacity();
    if current >= needed {
        return Ok(());
    }
    let target = current
        .checked_mul(2)
        .map(|count| count.max(4).max(needed))
        .ok_or(ExecutionError::Capacity)?;
    let bytes = |count: usize| {
        count
            .checked_mul(size_of::<EntityHandle>())
            .ok_or(ExecutionError::Capacity)
    };
    let mut admitted = budget.reserve(bytes(target)?)?;
    let mut replacement = Vec::new();
    replacement
        .try_reserve_exact(target)
        .map_err(|_| ExecutionError::Capacity)?;
    admitted.resize(bytes(replacement.capacity())?)?;
    let growth = admitted.split_off(bytes(replacement.capacity() - current)?)?;
    budget.fund_backing(storage, growth)?;
    replacement.extend_from_slice(set);
    *set = replacement;
    Ok(())
}
