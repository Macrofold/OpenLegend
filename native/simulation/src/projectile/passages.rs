//! Flight-owned receipts for exact animal lives which already saw a passage.
//! Contact never reads these receipts. They disappear with the flight.
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ResidentReservation, retained_size::map_storage};
use crate::identity::MAX_SAFE_INTEGER;
use crate::install::{ImportedCollection, InstallError, rows};
use crate::values::is_safe_record_id;
use indexmap::{Equivalent, IndexMap};

pub(crate) const TABLE: &str = "sim_projectile_passages";
pub(crate) const FIELD: &str = "nearPassObservedLives";

#[derive(Hash, PartialEq, Eq)]
pub(crate) struct PassageLife {
    pub id: String,
    pub life: u64,
}

#[derive(Hash)]
struct LifeRef<'a> {
    id: &'a str,
    life: u64,
}

impl Equivalent<PassageLife> for LifeRef<'_> {
    fn equivalent(&self, value: &PassageLife) -> bool {
        self.id == value.id && self.life == value.life
    }
}

struct Receipt {
    ordinal: u64,
    storage: ResidentReservation,
}

#[derive(Default)]
pub(crate) struct NearPassages {
    receipts: IndexMap<PassageLife, Receipt>,
    backing: Option<ResidentReservation>,
    next: u64,
}

impl NearPassages {
    pub fn contains(&self, id: &str, life: u64) -> bool {
        self.receipts.contains_key(&LifeRef { id, life })
    }

    pub fn entries(&self) -> impl Iterator<Item = (&PassageLife, u64)> {
        self.receipts.iter().map(|(key, row)| (key, row.ordinal))
    }

    pub fn ordinal(&self, id: &str, life: u64) -> Option<u64> {
        self.receipts
            .get(&LifeRef { id, life })
            .map(|row| row.ordinal)
    }

    pub fn next_ordinal(&self) -> u64 {
        self.next
    }

    fn reserve(&mut self, capacity: usize, budget: &ByteBudget) -> Result<(), ExecutionError> {
        if capacity <= self.receipts.capacity() {
            return Ok(());
        }
        let size = |capacity| {
            map_storage::<PassageLife, Receipt>(capacity).ok_or(ExecutionError::Capacity)
        };
        let backing = self.backing.get_or_insert(budget.reserve_backing(0)?);
        let before = backing.bytes();
        budget.resize_backing(backing, size(capacity)?)?;
        if self
            .receipts
            .try_reserve_exact(capacity - self.receipts.len())
            .is_err()
        {
            backing.resize(before)?;
            return Err(ExecutionError::Capacity);
        }
        budget.resize_backing(backing, size(self.receipts.capacity())?)?;
        Ok(())
    }

    pub fn add(&mut self, id: &str, life: u64, budget: &ByteBudget) -> Result<u64, ExecutionError> {
        if !is_safe_record_id(id) || life > MAX_SAFE_INTEGER || self.contains(id, life) {
            return Err(ExecutionError::Invariant);
        }
        let next = self
            .next
            .checked_add(1)
            .filter(|next| *next <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Capacity)?;
        if self.receipts.len() == self.receipts.capacity() {
            let capacity = self
                .receipts
                .capacity()
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?
                .max(4);
            self.reserve(capacity, budget)?;
        }
        let storage = budget.adopt_record(budget.reserve(id.len())?)?;
        let ordinal = self.next;
        self.receipts.insert(
            PassageLife {
                id: id.to_owned(),
                life,
            },
            Receipt { ordinal, storage },
        );
        self.next = next;
        Ok(ordinal)
    }

    pub fn rollback_add(
        &mut self,
        id: &str,
        life: u64,
        ordinal: u64,
    ) -> Result<(), ExecutionError> {
        let key = LifeRef { id, life };
        if self.next != ordinal + 1
            || self
                .receipts
                .get(&key)
                .is_none_or(|row| row.ordinal != ordinal)
        {
            return Err(ExecutionError::Invariant);
        }
        self.receipts.shift_remove(&key);
        self.next = ordinal;
        Ok(())
    }

    pub fn retain_for_retirement(&self, budget: &ByteBudget) -> Result<(), ExecutionError> {
        if let Some(backing) = &self.backing {
            budget.retain_record(backing)?;
        }
        for row in self.receipts.values() {
            budget.retain_record(&row.storage)?;
        }
        Ok(())
    }

    pub fn install(
        parent: &str,
        collection: ImportedCollection,
        budget: &ByteBudget,
    ) -> Result<Self, InstallError> {
        let mut state = Self::default();
        state
            .reserve(collection.rows.len(), budget)
            .map_err(|_| InstallError::Capacity)?;
        state.next = collection.coverage.next_ordinal;
        let mut previous = None;
        for row in collection.rows {
            if previous.is_some_and(|ordinal| ordinal >= row.position) {
                return Err(InstallError::RowPlacement);
            }
            previous = Some(row.position);
            rows::validate_map_row(&row, parent, FIELD, &row.slot, state.next)?;
            let bytes = row
                .slot
                .len()
                .checked_mul(2)
                .ok_or(InstallError::Capacity)?;
            let _parse = budget.reserve(bytes).map_err(|_| InstallError::Capacity)?;
            let (id, life): (String, u64) =
                serde_json::from_str(&row.slot).map_err(|_| InstallError::CurrentFormat)?;
            if !is_safe_record_id(&id)
                || life > MAX_SAFE_INTEGER
                || !row.extra.is_empty()
                || !matches!(serde_json::from_str::<bool>(&row.payload), Ok(true))
                || crate::encoding::json_record(&(&id, life)).ok().as_deref() != Some(&row.slot)
                || state.contains(&id, life)
            {
                return Err(InstallError::CurrentFormat);
            }
            let storage = budget
                .reserve_record(id.capacity())
                .map_err(|_| InstallError::Capacity)?;
            state.receipts.insert(
                PassageLife { id, life },
                Receipt {
                    ordinal: row.position,
                    storage,
                },
            );
        }
        Ok(state)
    }
}
