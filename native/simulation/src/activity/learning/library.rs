//! Immutable learned bodies and private support records have canonical resident
//! custody; only their sparse directory backing belongs to this subowner.
use super::models::{LearningAcquisition, LearningMethod};
use super::*;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use crate::install::rows::{take_collection, validate_map_row, validate_marker};
use crate::install::{InstallError, RowImport};
use crate::records::{ChildShape, SqlCell};
use std::sync::Arc;

pub(in crate::activity) struct LearningLibrary {
    pub methods: IndexMap<String, Arc<LearningMethod>>,
    pub acquisitions: IndexMap<String, IndexMap<String, Arc<LearningAcquisition>>>,
    bytes: usize,
    storage: ResidentReservation,
    budget: ByteBudget,
}
#[derive(Clone, Copy)]
pub(in crate::activity) struct LibraryBefore {
    backing: usize,
    strings: usize,
}
impl LearningLibrary {
    fn backing(&self, actor: Option<&str>) -> Option<usize> {
        heap_sum([
            map_storage::<String, Arc<LearningMethod>>(self.methods.capacity())?,
            map_storage::<String, IndexMap<String, Arc<LearningAcquisition>>>(
                self.acquisitions.capacity(),
            )?,
            actor
                .and_then(|actor| self.acquisitions.get(actor))
                .map_or(Some(0), |owner| {
                    map_storage::<String, Arc<LearningAcquisition>>(owner.capacity())
                })?,
        ])
    }
    fn strings(&self, actor: Option<&str>, method: Option<&str>) -> Option<usize> {
        heap_sum([
            method
                .and_then(|id| self.methods.get_key_value(id))
                .map_or(0, |(key, _)| key.capacity()),
            actor
                .and_then(|id| self.acquisitions.get_key_value(id))
                .map_or(0, |(key, _)| key.capacity()),
            actor
                .and_then(|actor| self.acquisitions.get(actor))
                .and_then(|owner| method.and_then(|method| owner.get_key_value(method)))
                .map_or(0, |(key, _)| key.capacity()),
        ])
    }
    pub fn before(
        &self,
        actor: Option<&str>,
        method: Option<&str>,
    ) -> Result<LibraryBefore, ActivityError> {
        Ok(LibraryBefore {
            backing: self.backing(actor).ok_or(ActivityError::Capacity)?,
            strings: self.strings(actor, method).ok_or(ActivityError::Capacity)?,
        })
    }
    pub fn settle(
        &mut self,
        before: LibraryBefore,
        actor: Option<&str>,
        method: Option<&str>,
        from: &mut ByteReservation,
    ) -> Result<(), ActivityError> {
        let after = self.before(actor, method)?;
        let next = self
            .bytes
            .checked_sub(before.backing)
            .and_then(|n| n.checked_sub(before.strings))
            .and_then(|n| n.checked_add(after.backing))
            .and_then(|n| n.checked_add(after.strings))
            .ok_or(ActivityError::Capacity)?;
        if next > self.storage.bytes() {
            let growth = next - self.storage.bytes();
            self.budget
                .fund_backing(
                    &mut self.storage,
                    from.split_off(growth)
                        .map_err(|_| ActivityError::Capacity)?,
                )
                .map_err(|_| ActivityError::Capacity)?;
        }
        self.storage
            .resize(next)
            .map_err(|_| ActivityError::Capacity)?;
        self.bytes = next;
        Ok(())
    }
    pub fn metadata_growth_bound(
        &self,
        actor: Option<&str>,
        method: &str,
    ) -> Result<usize, ActivityError> {
        let mut bytes = 0usize;
        if !self.methods.contains_key(method) {
            bytes = bytes
                .checked_add(method.len())
                .ok_or(ActivityError::Capacity)?;
            if self.methods.len() == self.methods.capacity() {
                bytes = bytes
                    .checked_add(
                        map_storage::<String, Arc<LearningMethod>>(
                            self.methods
                                .len()
                                .checked_add(1)
                                .and_then(|n| n.max(4).checked_mul(2))
                                .ok_or(ActivityError::Capacity)?,
                        )
                        .ok_or(ActivityError::Capacity)?,
                    )
                    .ok_or(ActivityError::Capacity)?;
            }
        }
        if let Some(actor) = actor {
            if let Some(owner) = self.acquisitions.get(actor) {
                if !owner.contains_key(method) {
                    bytes = bytes
                        .checked_add(method.len())
                        .ok_or(ActivityError::Capacity)?;
                    if owner.len() == owner.capacity() {
                        bytes = bytes
                            .checked_add(
                                map_storage::<String, Arc<LearningAcquisition>>(
                                    owner
                                        .len()
                                        .checked_add(1)
                                        .and_then(|n| n.max(4).checked_mul(2))
                                        .ok_or(ActivityError::Capacity)?,
                                )
                                .ok_or(ActivityError::Capacity)?,
                            )
                            .ok_or(ActivityError::Capacity)?;
                    }
                }
            } else {
                bytes = bytes
                    .checked_add(actor.len())
                    .and_then(|n| n.checked_add(method.len()))
                    .and_then(|n| {
                        n.checked_add(map_storage::<String, Arc<LearningAcquisition>>(4)?)
                    })
                    .ok_or(ActivityError::Capacity)?;
                if self.acquisitions.len() == self.acquisitions.capacity() {
                    bytes = bytes
                        .checked_add(
                            map_storage::<String, IndexMap<String, Arc<LearningAcquisition>>>(
                                self.acquisitions
                                    .len()
                                    .checked_add(1)
                                    .and_then(|n| n.max(4).checked_mul(2))
                                    .ok_or(ActivityError::Capacity)?,
                            )
                            .ok_or(ActivityError::Capacity)?,
                        )
                        .ok_or(ActivityError::Capacity)?;
                }
            }
        }
        Ok(bytes)
    }
}

pub(in crate::activity) fn install_library(
    import: &mut RowImport,
    language: &InstalledLearningLanguage,
    limits: &ActivityLimits,
    budget: &ByteBudget,
) -> Result<LearningLibrary, InstallError> {
    let root = "[\"world\",\"actionExperience\"]";
    let method_rows = take_collection(import, "activity_methods", root, true, true)?;
    if method_rows.rows.len() as u64 > limits.definitions {
        return Err(InstallError::CurrentFormat);
    }
    let mut metadata = budget
        .reserve(
            map_storage::<String, Arc<LearningMethod>>(method_rows.rows.len())
                .ok_or(InstallError::Capacity)?,
        )
        .map_err(|_| InstallError::Capacity)?;
    let mut methods = IndexMap::with_capacity(method_rows.rows.len());
    let _signature_index = budget
        .reserve(
            map_storage::<String, Arc<LearningMethod>>(method_rows.rows.len())
                .and_then(|n| n.checked_add(method_rows.rows.len().checked_mul(64)?))
                .ok_or(InstallError::Capacity)?,
        )
        .map_err(|_| InstallError::Capacity)?;
    let mut signatures: IndexMap<String, Arc<LearningMethod>> =
        IndexMap::with_capacity(method_rows.rows.len());
    for row in method_rows.rows {
        validate_map_row(
            &row,
            root,
            "methods",
            &row.slot,
            method_rows.coverage.next_ordinal,
        )?;
        let _decode = budget
            .reserve(
                crate::experience::encoded_body_bound(&row.payload)
                    .map_err(|_| InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let body: SqlCell =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        let signature = body
            .get("signature")
            .and_then(SqlCell::as_str)
            .ok_or(InstallError::CurrentFormat)?;
        import.validate_activity_method_signature(&row, signature)?;
        if row.extra.len() != 1
            || row.extra[0].as_str()
                != Some(crate::encoding::sha256_hex(signature.as_bytes()).as_str())
            || body.get("id").and_then(SqlCell::as_str) != Some(row.slot.as_str())
        {
            return Err(InstallError::CurrentFormat);
        }
        metadata
            .resize(
                metadata
                    .bytes()
                    .checked_add(row.slot.capacity())
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let record =
            LearningMethod::new(body, language, limits, _decode, budget).map_err(|error| {
                match error {
                    ActivityError::UnsupportedFamily => {
                        InstallError::UnsupportedFamily("unconverted activity method structure")
                    }
                    _ => InstallError::CurrentFormat,
                }
            })?;
        let signature_key = row.extra[0].as_str().ok_or(InstallError::CurrentFormat)?;
        if let Some(prior) = signatures.get(signature_key) {
            if prior.signature() == record.signature() {
                return Err(InstallError::DuplicateRow);
            }
            // This is the actual SQL unique signature-key constraint. A hash
            // collision cannot be published as a second current-format row.
            return Err(InstallError::CurrentFormat);
        }
        signatures.insert(signature_key.to_owned(), Arc::clone(&record));
        if methods.insert(row.slot, record).is_some() {
            return Err(InstallError::DuplicateRow);
        }
    }
    let owners = take_collection(import, "activity_acquisitions_owners", root, true, true)?;
    metadata
        .resize(
            metadata
                .bytes()
                .checked_add(
                    map_storage::<String, IndexMap<String, Arc<LearningAcquisition>>>(
                        owners.rows.len(),
                    )
                    .ok_or(InstallError::Capacity)?,
                )
                .ok_or(InstallError::Capacity)?,
        )
        .map_err(|_| InstallError::Capacity)?;
    let mut acquisitions = IndexMap::with_capacity(owners.rows.len());
    for row in owners.rows {
        validate_map_row(
            &row,
            root,
            "acquisitions",
            &row.slot,
            owners.coverage.next_ordinal,
        )?;
        validate_marker(&row, ChildShape::Object)?;
        let rows = take_collection(import, "activity_acquisitions", &row.id, true, true)?;
        if rows.rows.len() as u64 > limits.acquisitions {
            return Err(InstallError::CurrentFormat);
        }
        metadata
            .resize(
                metadata
                    .bytes()
                    .checked_add(row.slot.capacity())
                    .and_then(|n| {
                        n.checked_add(map_storage::<String, Arc<LearningAcquisition>>(
                            rows.rows.len(),
                        )?)
                    })
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let mut own = IndexMap::with_capacity(rows.rows.len());
        for acquired in rows.rows {
            validate_map_row(
                &acquired,
                &row.id,
                "",
                &acquired.slot,
                rows.coverage.next_ordinal,
            )?;
            if !acquired.extra.is_empty() {
                return Err(InstallError::CurrentFormat);
            }
            let _decode = budget
                .reserve(
                    crate::experience::encoded_body_bound(&acquired.payload)
                        .map_err(|_| InstallError::Capacity)?,
                )
                .map_err(|_| InstallError::Capacity)?;
            let body: SqlCell =
                serde_json::from_str(&acquired.payload).map_err(|_| InstallError::CurrentFormat)?;
            let method = body
                .get("methodId")
                .and_then(SqlCell::as_str)
                .and_then(|id| methods.get(id))
                .ok_or(InstallError::CurrentFormat)?;
            let record = LearningAcquisition::new(
                body, &row.slot, method, language, limits, _decode, budget,
            )
            .map_err(|_| InstallError::CurrentFormat)?;
            metadata
                .resize(
                    metadata
                        .bytes()
                        .checked_add(acquired.slot.capacity())
                        .ok_or(InstallError::Capacity)?,
                )
                .map_err(|_| InstallError::Capacity)?;
            if own.insert(acquired.slot, record).is_some() {
                return Err(InstallError::DuplicateRow);
            }
        }
        if acquisitions.insert(row.slot, own).is_some() {
            return Err(InstallError::DuplicateRow);
        }
    }
    let mut library = LearningLibrary {
        methods,
        acquisitions,
        bytes: 0,
        storage: budget
            .adopt_backing(metadata)
            .map_err(|_| InstallError::Capacity)?,
        budget: budget.clone(),
    };
    let mut bytes = library.backing(None).ok_or(InstallError::Capacity)?;
    for key in library.methods.keys() {
        bytes = bytes
            .checked_add(key.capacity())
            .ok_or(InstallError::Capacity)?;
    }
    for (actor, owner) in &library.acquisitions {
        bytes = bytes
            .checked_add(actor.capacity())
            .and_then(|n| {
                n.checked_add(map_storage::<String, Arc<LearningAcquisition>>(
                    owner.capacity(),
                )?)
            })
            .ok_or(InstallError::Capacity)?;
        for key in owner.keys() {
            bytes = bytes
                .checked_add(key.capacity())
                .ok_or(InstallError::Capacity)?;
        }
    }
    library
        .storage
        .resize(bytes)
        .map_err(|_| InstallError::Capacity)?;
    library.bytes = bytes;
    Ok(library)
}
