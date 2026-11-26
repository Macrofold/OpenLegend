//! Share immutable routine policy preparation for actual actor bindings. This
//! derived operation-owned cache contains no sensory progress or world facts.
//! See docs/performance/preparation.md.
use super::sensors::{
    RoutineContactPolicy, RoutineSightPolicy, routine_contact_policy, routine_sight_policy,
};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use crate::simulation::InstalledWorld;
use crate::state::Entity;
use indexmap::{Equivalent, IndexMap};
use std::{
    hash::{Hash, Hasher},
    mem::size_of,
    sync::Arc,
};

pub(crate) struct RoutinePolicy {
    pub sight: Option<RoutineSightPolicy>,
    pub contact: Option<RoutineContactPolicy>,
    _reservation: ByteReservation,
}
pub(crate) struct RoutinePolicyCache {
    installed: Arc<InstalledWorld>,
    values: IndexMap<Option<Vec<String>>, Arc<RoutinePolicy>>,
    budget: ByteBudget,
    reservation: ByteReservation,
}
struct BindingRef<'a>(Option<&'a [String]>);
impl Hash for BindingRef<'_> {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.0.hash(state);
    }
}
impl Equivalent<Option<Vec<String>>> for BindingRef<'_> {
    fn equivalent(&self, key: &Option<Vec<String>>) -> bool {
        self.0 == key.as_deref()
    }
}
fn capacity() -> ReceivedError {
    ReceivedError("Routine sensing policy preparation exceeds native byte allowance.")
}
impl RoutinePolicyCache {
    pub(crate) fn new(
        installed: Arc<InstalledWorld>,
        budget: &ByteBudget,
    ) -> Result<Self, ReceivedError> {
        Ok(Self {
            installed,
            values: IndexMap::new(),
            budget: budget.clone(),
            reservation: budget.reserve(size_of::<Self>()).map_err(|_| capacity())?,
        })
    }
    pub(crate) fn policy(&mut self, entity: &Entity) -> Result<Arc<RoutinePolicy>, ReceivedError> {
        let bindings = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.senses.as_deref());
        if let Some(policy) = self.values.get(&BindingRef(bindings)) {
            return Ok(Arc::clone(policy));
        }
        let capacity_after = if self.values.len() == self.values.capacity() {
            self.values
                .len()
                .checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .ok_or_else(capacity)?
        } else {
            0
        };
        let keys = bindings
            .map_or(Some(0), |bindings| {
                bindings.iter().try_fold(
                    bindings.len().checked_mul(size_of::<String>())?,
                    |sum, id| sum.checked_add(id.len()),
                )
            })
            .ok_or_else(capacity)?;
        self.reservation
            .resize(
                heap_sum([
                    self.reservation.bytes(),
                    map_storage::<Option<Vec<String>>, Arc<RoutinePolicy>>(capacity_after)
                        .ok_or_else(capacity)?,
                    keys,
                ])
                .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let selected = bindings.unwrap_or(&self.installed.default_senses);
        // Fund the temporary canonical family bytes before constructing either
        // key. The retained policy owns its reservation through every Arc reader.
        let canonical = self
            .installed
            .senses
            .values()
            .filter(|definition| selected.iter().any(|id| id == definition.value().id()))
            .try_fold(2usize, |sum, definition| {
                sum.checked_add(definition.canonical().len())?
                    .checked_add(1)
            })
            .ok_or_else(capacity)?;
        let reservation = self
            .budget
            .reserve(
                heap_sum([
                    size_of::<RoutinePolicy>(),
                    2 * size_of::<usize>(),
                    canonical.checked_mul(2).ok_or_else(capacity)?,
                    128,
                ])
                .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let sight = routine_sight_policy(&self.installed, entity);
        let contact = routine_contact_policy(&self.installed, entity);
        let mut policy = RoutinePolicy {
            sight,
            contact,
            _reservation: reservation,
        };
        let retained = heap_sum([
            size_of::<RoutinePolicy>(),
            2 * size_of::<usize>(),
            policy
                .sight
                .as_ref()
                .map_or(0, |sight| sight.key.capacity()),
            policy
                .contact
                .as_ref()
                .map_or(0, |contact| contact.key.capacity()),
        ])
        .ok_or_else(capacity)?;
        policy
            ._reservation
            .resize(retained)
            .map_err(|_| capacity())?;
        self.values
            .try_reserve(usize::from(capacity_after > 0))
            .map_err(|_| capacity())?;
        let key = bindings.map(|bindings| bindings.to_vec());
        let policy = Arc::new(policy);
        self.values.insert(key, Arc::clone(&policy));
        Ok(policy)
    }
}
